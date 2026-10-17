// Strumenti condivisi dalle funzioni Netlify per parlare con Google, senza librerie esterne:
// chiave dell'account di servizio -> token OAuth, Firestore (REST), Firebase Cloud Messaging (HTTP v1)
// e verifica del token di accesso degli utenti (ID token di Firebase Authentication).
//
// Variabile d'ambiente su Netlify (mai nel repository):
//   FIREBASE_SERVICE_ACCOUNT  contenuto del file JSON della chiave dell'account di servizio Firebase
import crypto from "node:crypto";

export const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});

let SA = null;
export function serviceAccount() {
  if (SA) return SA;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try { SA = JSON.parse(raw); } catch { return null; }
  if (!SA.client_email || !SA.private_key || !SA.project_id) SA = null;
  return SA;
}

// ---------- token OAuth dell'account di servizio (valido 1 ora, tenuto in memoria) ----------
let TK = null;
export async function accessToken(sa = serviceAccount()) {
  if (TK && TK.exp > Date.now() + 60e3) return TK.v;
  const now = Math.floor(Date.now() / 1000);
  const enc = o => Buffer.from(JSON.stringify(o)).toString("base64url");
  const head = enc({ alg: "RS256", typ: "JWT" });
  const claim = enc({
    iss: sa.client_email, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
    scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging",
  });
  const sig = crypto.createSign("RSA-SHA256").update(head + "." + claim).sign(sa.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: head + "." + claim + "." + sig }),
  });
  if (!r.ok) throw new Error("oauth " + r.status);
  const d = await r.json();
  TK = { v: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000 };
  return TK.v;
}

// ---------- verifica del token di accesso dell'utente ----------
const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let CERTS = null;
async function certs() {
  if (CERTS && CERTS.exp > Date.now()) return CERTS.v;
  const r = await fetch(CERTS_URL);
  if (!r.ok) throw new Error("certs " + r.status);
  const m = /max-age=(\d+)/.exec(r.headers.get("cache-control") || "");
  CERTS = { v: await r.json(), exp: Date.now() + (m ? +m[1] : 3600) * 1000 };
  return CERTS.v;
}

// Restituisce l'uid se il token è valido per questo progetto, altrimenti null.
export async function verifyUser(req, projectId) {
  const h = req.headers.get("authorization") || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  const parts = tok.split(".");
  if (parts.length !== 3) return null;
  let head, pay;
  try {
    head = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    pay = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch { return null; }
  if (head.alg !== "RS256" || !head.kid) return null;
  const pem = (await certs())[head.kid];
  if (!pem) return null;
  const ok = crypto.createVerify("RSA-SHA256").update(parts[0] + "." + parts[1]).verify(pem, Buffer.from(parts[2], "base64url"));
  if (!ok) return null;
  const now = Math.floor(Date.now() / 1000);
  if (pay.aud !== projectId || pay.iss !== "https://securetoken.google.com/" + projectId) return null;
  if (!(pay.exp > now) || !(pay.iat <= now + 300) || (pay.auth_time && pay.auth_time > now + 300)) return null;
  if (typeof pay.sub !== "string" || !pay.sub || pay.sub.length > 128) return null;
  return pay.sub;
}

// ---------- Firestore (REST) ----------
const FSB = "https://firestore.googleapis.com/v1/";
const root = sa => `projects/${sa.project_id}/databases/(default)/documents`;

export function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, enc(x)])) } };
}
export function dec(v) {
  if (!v || "nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(dec);
  if ("mapValue" in v) return decFields(v.mapValue.fields || {});
  return null;
}
const decFields = f => Object.fromEntries(Object.entries(f).map(([k, x]) => [k, dec(x)]));
const fieldsOf = o => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined).map(([k, x]) => [k, enc(x)]));

async function fs(method, path, body, query = "") {
  const sa = serviceAccount(), tk = await accessToken(sa);
  const r = await fetch(`${FSB}${root(sa)}/${path}${query}`, {
    method, headers: { authorization: "Bearer " + tk, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`firestore ${method} ${r.status}`);
  return r.status === 204 ? {} : r.json();
}

export async function getDoc(path) {
  const d = await fs("GET", path);
  return d ? decFields(d.fields || {}) : null;
}
// Scrive solo i campi indicati (gli altri restano com'erano); crea il documento se manca.
export async function updateDoc(path, obj) {
  const q = "?" + Object.keys(obj).map(k => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&");
  return fs("PATCH", path, { fields: fieldsOf(obj) }, q);
}
export async function deleteDoc(path) { return fs("DELETE", path); }
// Elenca tutti i documenti di una raccolta: [{id, data}]
export async function listDocs(col) {
  const out = []; let page = "";
  do {
    const q = "?pageSize=300" + (page ? "&pageToken=" + encodeURIComponent(page) : "");
    const d = await fs("GET", col, null, q);
    for (const x of (d && d.documents) || []) out.push({ id: x.name.split("/").pop(), data: decFields(x.fields || {}) });
    page = (d && d.nextPageToken) || "";
  } while (page);
  return out;
}

// ---------- Firebase Cloud Messaging ----------
// Invia un messaggio di soli dati: è il service worker dell'app a mostrare la notifica.
// Restituisce "ok", "gone" (token non più valido: va tolto) o "error".
export async function sendPush(token, data) {
  const sa = serviceAccount(), tk = await accessToken(sa);
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST", headers: { authorization: "Bearer " + tk, "content-type": "application/json" },
    body: JSON.stringify({ message: { token, webpush: { headers: { TTL: "21600", Urgency: "normal" }, data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) } } }),
  });
  if (r.ok) return "ok";
  let code = "";
  try { const e = await r.json(); code = JSON.stringify(e.error || {}); } catch { }
  if (r.status === 404 || /UNREGISTERED|registration-token-not-registered/i.test(code)) return "gone";
  if (r.status === 400 && /INVALID_ARGUMENT/.test(code) && /token/i.test(code)) return "gone";
  return "error";
}

// ---------- utilità per date e ore nel fuso dell'utente ----------
export const LINGUE = ["it", "en", "fr", "es", "de"];
export function validTz(tz) {
  if (typeof tz !== "string" || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}
// {d: 'AAAA-MM-GG', min: minuti dalla mezzanotte, wd: 0 = domenica}
export function localNow(tz, now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(now).map(x => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { d: `${p.year}-${p.month}-${p.day}`, min: (+p.hour) * 60 + (+p.minute), wd };
}
export const hm = s => { const m = /^(\d\d):(\d\d)$/.exec(s || ""); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; };
