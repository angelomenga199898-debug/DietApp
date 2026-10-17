// /api/push: l'app registra qui il telefono per le notifiche e le preferenze dei promemoria.
// Documento push/{uid} (leggibile e scrivibile solo da qui, con l'account di servizio):
//   toks [{t: token FCM, at}], tz, lg, on {w: pesata, e: sera, n: novità}, m e e (orari "HH:MM"),
//   wd (giorni di pesata, 0 = domenica), st (giorni di fila), ver (ultima versione annunciata),
//   sw / se (data dell'ultimo promemoria di pesata / della sera), u.
// Operazioni (POST, con "Authorization: Bearer <ID token>"):
//   {op:"on", tok, tz, lg, on, m, e, wd, st}  registra o aggiorna   {op:"off", tok}  toglie il telefono
//   {op:"test", tok}  manda una notifica di prova                     {op:"forget"}   cancella push, contatori AI e piano (eliminazione account)
import { json, serviceAccount, verifyUser, getDoc, updateDoc, deleteDoc, sendPush, validTz, hm, LINGUE } from "../lib/google.mjs";
import { tx } from "../lib/testi.mjs";
import { VERSION } from "../lib/versione.mjs";

export const config = { path: "/api/push" };

const okTok = t => typeof t === "string" && t.length > 20 && t.length < 4096;

export function clean(b) {
  const o = {};
  if (validTz(b.tz)) o.tz = b.tz;
  o.lg = LINGUE.includes(b.lg) ? b.lg : "it";
  const on = b.on || {};
  o.on = { w: on.w !== false, e: on.e !== false, n: on.n !== false };
  o.m = hm(b.m) != null ? b.m : "08:00";
  o.e = hm(b.e) != null ? b.e : "21:00";
  o.wd = Array.isArray(b.wd) ? [...new Set(b.wd.map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6))] : [];
  o.st = Number.isInteger(b.st) && b.st >= 0 && b.st < 100000 ? b.st : 0;
  return o;
}

export default async (req) => {
  if (req.method !== "POST") return json({ err: "method" }, 405);
  const sa = serviceAccount();
  if (!sa) return json({ err: "config" }, 503);
  let uid;
  try { uid = await verifyUser(req, sa.project_id); } catch { return json({ err: "auth" }, 503); }
  if (!uid) return json({ err: "auth" }, 401);
  let b;
  try { b = await req.json(); } catch { return json({ err: "body" }, 400); }
  const path = "push/" + uid;
  try {
    if (b.op === "forget") {
      await deleteDoc(path); await deleteDoc("ai/" + uid); await deleteDoc("piani/" + uid);
      return json({ ok: true });
    }
    if (!okTok(b.tok)) return json({ err: "tok" }, 400);
    const cur = (await getDoc(path)) || {};
    const toks = (cur.toks || []).filter(x => x && x.t && x.t !== b.tok);
    if (b.op === "off") {
      if (toks.length) await updateDoc(path, { toks, u: Date.now() }); else await deleteDoc(path);
      return json({ ok: true });
    }
    if (b.op === "test") {
      const lg = LINGUE.includes(b.lg) ? b.lg : (cur.lg || "it");
      const r = await sendPush(b.tok, { title: tx(lg, "testT"), body: tx(lg, "testB"), act: "today", tag: "test" });
      return json({ ok: r === "ok", r });
    }
    if (b.op === "on") {
      const o = clean(b);
      if (!o.tz) return json({ err: "tz" }, 400);
      toks.unshift({ t: b.tok, at: Date.now() });
      const up = { ...o, toks: toks.slice(0, 5), u: Date.now() };
      if (!cur.ver) up.ver = VERSION; // la prima volta non annunciamo la versione che ha già
      await updateDoc(path, up);
      return json({ ok: true });
    }
    return json({ err: "op" }, 400);
  } catch (e) {
    console.error("push", e.message);
    return json({ err: "server" }, 502);
  }
};
