// /api/piano: piano dell'utente (prova / free / pro), codici regalo e, per l'amministratore, gestione dei codici.
// POST con "Authorization: Bearer <ID token>":
//   {op:"stato"}                 -> {plan, fino, giorni, admin, ai: {used, max}} (+ spesa dell'AI del mese per l'amministratore)
//   {op:"codice", codice}        -> usa un codice regalo
//   {op:"crea", codice, giorni, ai, usi, scade, nota}  {op:"lista"}  {op:"attiva", codice, on}   (solo amministratore)
import { json, serviceAccount, verifyToken, getDoc } from "../lib/google.mjs";
import { planOf, redeem, isAdmin, createCode, listCodes, setActive } from "../lib/piani.mjs";
import { aiLimit } from "../lib/limiti.mjs";
import { aiSource, budget, month, monthPath } from "../lib/spesa.mjs";

export const config = { path: "/api/piano" };

export default async (req) => {
  if (req.method !== "POST") return json({ err: "method" }, 405);
  const sa = serviceAccount();
  if (!sa) return json({ err: "config" }, 503);
  let tok;
  try { tok = await verifyToken(req); } catch { return json({ err: "auth" }, 503); }
  if (!tok) return json({ err: "auth" }, 401);
  const uid = tok.sub;
  let b;
  try { b = await req.json(); } catch { return json({ err: "body" }, 400); }
  try {
    if (b.op === "stato") {
      const p = await planOf(uid, tok), u = await getDoc("ai/" + uid), day = new Date().toISOString().slice(0, 10);
      const { doc, ...st } = p;
      const out = { ok: true, ...st, ai: { used: u && u.d === day ? u.n || 0 : 0, max: aiLimit(st.plan, st.admin ? null : doc) } };
      if (st.admin) {
        const src = aiSource(), m = month(await getDoc(monthPath()));
        out.spesa = { ...m, usd: Math.round(m.usd * 1e4) / 1e4, budget: budget(src && src.src), src: src ? src.src : null, mese: new Date().toISOString().slice(0, 7) };
      }
      return json(out);
    }
    if (b.op === "codice") {
      const r = await redeem(uid, tok, b.codice);
      return r.err ? json({ err: r.err }, r.err === "server" ? 502 : 400) : json({ ok: true, giorni: r.giorni, ...r.stato, ai: { max: aiLimit(r.stato.plan, r.stato.admin ? null : r.doc) } });
    }
    if (["crea", "lista", "attiva"].includes(b.op)) {
      if (!isAdmin(tok)) return json({ err: "admin" }, 403);
      if (b.op === "lista") return json({ ok: true, codici: await listCodes() });
      const r = b.op === "crea" ? await createCode(b) : await setActive(b.codice, b.on);
      return r.err ? json({ err: r.err }, 400) : json(r);
    }
    return json({ err: "op" }, 400);
  } catch (e) {
    console.error("piano", e.message);
    return json({ err: "server" }, 502);
  }
};
