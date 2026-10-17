// Promemoria sul telefono: Netlify la esegue ogni 15 minuti (solo sul sito pubblicato).
// Per ogni utente con le notifiche attive (raccolta push) guarda l'ora nel suo fuso e, se è il momento:
//   - mattina dei giorni di pesata, se il peso di oggi non c'è ancora;
//   - sera, se la giornata non è chiusa (con la serie di giorni se c'è);
//   - una volta per ogni nuova versione dell'app, di giorno.
// Ogni promemoria parte al massimo una volta al giorno (sw / se), nelle 3 ore dopo l'orario scelto.
// Chi non apre l'app da 14 giorni non riceve più promemoria (solo le novità).
import { serviceAccount, listDocs, getDoc, updateDoc, sendPush, localNow, hm, validTz } from "../lib/google.mjs";
import { tx } from "../lib/testi.mjs";
import { VERSION } from "../lib/versione.mjs";

export const config = { schedule: "*/15 * * * *" };

const WIN = 180, QUIET = 14 * 864e5;

// Cosa potrebbe partire adesso per questo utente (prima di guardare la giornata).
export function due(p, now = new Date()) {
  if (!validTz(p.tz) || !(p.toks || []).length) return { L: null, k: [] };
  const L = localNow(p.tz, now), on = p.on || {}, k = [];
  const inWin = t => { const s = hm(t); return s != null && L.min >= s && L.min < s + WIN; };
  const active = now - (p.u || 0) < QUIET;
  if (active && on.w !== false && (p.wd || []).includes(L.wd) && p.sw !== L.d && inWin(p.m || "08:00")) k.push("w");
  if (active && on.e !== false && p.se !== L.d && inWin(p.e || "21:00")) k.push("e");
  if (on.n !== false && p.ver && p.ver !== VERSION && L.min >= 9 * 60 && L.min < 21 * 60 + 30) k.push("n");
  return { L, k };
}

// Testo della notifica (o null se non serve) dato il giorno salvato nell'account.
export function message(kind, p, day, lg = p.lg || "it") {
  const dd = day && !day._del ? day : null;
  if (kind === "w") return dd && dd.w > 0 ? null : { title: tx(lg, "weighT"), body: tx(lg, "weighB"), act: "weigh", tag: "weigh" };
  if (kind === "e") {
    if (dd && dd.closed) return null;
    if (!dd || !(dd.meals || []).length) return { title: tx(lg, "emptyT"), body: tx(lg, "emptyB"), act: "add", tag: "eve" };
    return { title: tx(lg, "openT"), body: p.st >= 2 ? tx(lg, "openS", { n: p.st }) : tx(lg, "openB"), act: "today", tag: "eve" };
  }
  if (kind === "n") return { title: tx(lg, "newsT", { v: VERSION }), body: tx(lg, "newsB"), act: "news", tag: "news" };
  return null;
}

export async function runUser(uid, p, now = new Date()) {
  const { L, k } = due(p, now);
  if (!k.length) return 0;
  let day;
  if (k.includes("w") || k.includes("e")) day = await getDoc(`users/${uid}/days/${L.d}`);
  const up = {}, msgs = [];
  for (const kind of k) {
    const m = message(kind, p, day);
    if (kind === "w") up.sw = L.d;
    if (kind === "e") up.se = L.d;
    if (kind === "n") up.ver = VERSION;
    if (m) msgs.push(m);
  }
  let sent = 0, toks = p.toks || [];
  for (const m of msgs) {
    const keep = [];
    for (const t of toks) {
      const r = await sendPush(t.t, m);
      if (r === "ok") sent++;
      if (r !== "gone") keep.push(t);
    }
    if (keep.length !== toks.length) { toks = keep; up.toks = keep; }
  }
  await updateDoc("push/" + uid, up);
  return sent;
}

export default async () => {
  if (!serviceAccount()) { console.log("promemoria: FIREBASE_SERVICE_ACCOUNT mancante"); return; }
  const all = await listDocs("push"), now = new Date();
  let n = 0;
  for (let i = 0; i < all.length; i += 8) {
    const r = await Promise.allSettled(all.slice(i, i + 8).map(x => runUser(x.id, x.data, now)));
    r.forEach((x, j) => { if (x.status === "fulfilled") n += x.value; else console.error("promemoria", all[i + j].id.slice(0, 6), x.reason && x.reason.message); });
  }
  console.log(`promemoria: ${all.length} utenti, ${n} notifiche`);
};
