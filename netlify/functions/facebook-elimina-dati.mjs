// Richiesta di eliminazione dati da Facebook (Data Deletion Request Callback).
// Meta chiama questo indirizzo quando una persona chiede di eliminare i dati di DietApp
// dalle impostazioni di Facebook. Verifichiamo la firma con la chiave segreta dell'app,
// troviamo l'account Firebase collegato a quel profilo Facebook e lo eliminiamo con tutti i dati.
//
// Variabili d'ambiente su Netlify (mai nel repository):
//   FB_APP_SECRET            chiave segreta dell'app Meta
//   FIREBASE_SERVICE_ACCOUNT contenuto del file JSON della chiave dell'account di servizio Firebase
import crypto from "node:crypto";

const SITE = "https://silly-speculoos-c6bcdb.netlify.app";
const b64u = s => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
const enc = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

export function parseSigned(sr, secret) {
  const [sig, payload] = String(sr || "").split(".");
  if (!sig || !payload) return null;
  const exp = crypto.createHmac("sha256", secret).update(payload).digest();
  const got = b64u(sig);
  if (got.length !== exp.length || !crypto.timingSafeEqual(got, exp)) return null;
  const data = JSON.parse(b64u(payload).toString("utf8"));
  if (String(data.algorithm || "").toUpperCase() !== "HMAC-SHA256" || !data.user_id) return null;
  return data;
}

async function token(sa) {
  const now = Math.floor(Date.now() / 1000);
  const head = enc({ alg: "RS256", typ: "JWT" });
  const claim = enc({
    iss: sa.client_email, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit",
  });
  const sig = crypto.createSign("RSA-SHA256").update(head + "." + claim).sign(sa.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: head + "." + claim + "." + sig }),
  });
  if (!r.ok) throw new Error("token " + r.status);
  return (await r.json()).access_token;
}

async function api(tk, url, body) {
  const r = await fetch(url, { method: "POST", headers: { authorization: "Bearer " + tk, "content-type": "application/json" }, body: JSON.stringify(body || {}) });
  if (!r.ok && r.status !== 404) throw new Error(url.split("/").pop() + " " + r.status);
  return r.status === 404 ? {} : r.json();
}

// Cancella users/{uid}, le sue sottoraccolte (giorni) e l'utente di Firebase Authentication.
export async function wipeFacebookUser(fbId, sa) {
  const P = sa.project_id, tk = await token(sa);
  const IDT = `https://identitytoolkit.googleapis.com/v1/projects/${P}`;
  const ROOT = `projects/${P}/databases/(default)/documents`, FS = "https://firestore.googleapis.com/v1/";
  const found = await api(tk, `${IDT}/accounts:lookup`, { federatedUserId: [{ providerId: "facebook.com", rawId: String(fbId) }] });
  const users = found.users || [];
  for (const u of users) {
    const userDoc = `${ROOT}/users/${u.localId}`;
    const writes = [];
    const cols = await api(tk, `${FS}${userDoc}:listCollectionIds`, { pageSize: 100 });
    for (const c of cols.collectionIds || []) {
      let page = "";
      do {
        const q = new URLSearchParams({ pageSize: "300", "mask.fieldPaths": "__name__" });
        if (page) q.set("pageToken", page);
        const r = await fetch(`${FS}${userDoc}/${c}?${q}`, { headers: { authorization: "Bearer " + tk } });
        if (!r.ok) throw new Error("list " + r.status);
        const d = await r.json();
        for (const doc of d.documents || []) writes.push({ delete: doc.name });
        page = d.nextPageToken || "";
      } while (page);
    }
    writes.push({ delete: userDoc });
    for (let i = 0; i < writes.length; i += 400) await api(tk, `${FS}${ROOT}:commit`, { writes: writes.slice(i, i + 400) });
    await api(tk, `${IDT}/accounts:delete`, { localId: u.localId });
  }
  return users.length;
}

export default async (req) => {
  if (req.method !== "POST") return Response.redirect(SITE + "/elimina-dati.html", 302);
  const secret = process.env.FB_APP_SECRET, saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!secret || !saRaw) return json({ error: "configurazione mancante" }, 500);
  let data;
  try { data = parseSigned(new URLSearchParams(await req.text()).get("signed_request"), secret); } catch { data = null; }
  if (!data) return json({ error: "richiesta non valida" }, 400);
  const code = "DA" + crypto.createHash("sha256").update(String(data.user_id) + ":" + secret).digest("hex").slice(0, 10).toUpperCase();
  try {
    const n = await wipeFacebookUser(data.user_id, JSON.parse(saRaw));
    console.log("eliminazione", code, "account trovati:", n);
  } catch (e) {
    console.error("eliminazione non riuscita", code, e.message);
    return json({ error: "eliminazione non riuscita, riprova" }, 500);
  }
  return json({ url: `${SITE}/elimina-dati.html?codice=${code}`, confirmation_code: code });
};

export const config = { path: "/api/facebook-elimina-dati" };
