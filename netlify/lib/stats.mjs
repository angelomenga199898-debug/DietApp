// Statistiche d'uso per l'amministratore: solo numeri complessivi, niente dati personali o sulla salute.
// - Con l'account: piani/{uid} tiene att (ultimo giorno in cui l'app ha chiesto il piano, cioè l'ha aperta), v (versione),
//   lg (lingua), dm ('app' installata o 'web'), os ('android', 'ios', 'altro'). Si scrive al massimo una volta al giorno,
//   dentro /api/piano {op:"stato"}, e si cancella con l'account (push.mjs {op:"forget"}). L'amministratore ha adm: true ed è escluso.
// - Senza account: /api/stat somma in stats/_d<giorno> le aperture del giorno (osp, una per telefono: lo decide l'app)
//   e i telefoni nuovi (ospn), senza alcun identificativo.
// - stats/_d<giorno> = {d, acc (account attivi quel giorno), osp, ospn}.
import { getDoc, updateDoc, incDoc, listDocs, LINGUE } from "./google.mjs";
import { planState, addDays, today, listCodes } from "./piani.mjs";
import { month, monthPath } from "./spesa.mjs";

export const osOf = ua => /Android/i.test(ua || "") ? "android" : /iPhone|iPad|iPod/.test(ua || "") ? "ios" : "altro";
export const metaOf = (b, ua) => ({
  v: /^\d{1,2}(\.\d{1,2}){0,2}$/.test(String((b && b.v) || "")) ? String(b.v) : "?",
  lg: LINGUE.includes(b && b.lg) ? b.lg : "?",
  dm: b && b.dm === "app" ? "app" : "web",
  os: osOf(ua),
});

// Segna l'account come attivo oggi (una volta al giorno). doc = piani/{uid} già letto da planOf.
export async function markActive(uid, doc, b, ua, admin, day = today()) {
  const m = metaOf(b, ua);
  if (doc && doc.att === day && doc.v === m.v && doc.dm === m.dm) return false;
  const first = !doc || doc.att !== day;
  await updateDoc("piani/" + uid, { att: day, ...m, ...(admin ? { adm: true } : {}) });
  if (first && !admin) await incDoc("stats/_d" + day, { acc: 1 }, { d: day });
  return true;
}

// Apertura di chi usa l'app senza account (una al giorno per telefono). Al massimo STAT_MAX_DAY al giorno.
export async function guestPing(b, day = today()) {
  const MAX = +process.env.STAT_MAX_DAY || 20000, g = await getDoc("stats/_d" + day);
  if (g && (g.osp || 0) >= MAX) return false;
  await incDoc("stats/_d" + day, { osp: 1, ...(b && b.nw ? { ospn: 1 } : {}) }, { d: day });
  return true;
}

const count = (L, f) => L.reduce((o, x) => { const k = f(x); o[k] = (o[k] || 0) + 1; return o; }, {});

// Riepilogo per la pagina Statistiche. me = uid dell'amministratore che la apre (escluso dai conteggi).
export async function summary(me, day = today()) {
  const D = n => addDays(day, -n);
  const [piani, stats, push, ai, codici, m] = await Promise.all([
    listDocs("piani"), listDocs("stats"), listDocs("push"), listDocs("ai"), listCodes(), getDoc(monthPath()),
  ]);
  const U = piani.filter(x => x.id !== me && !x.data.adm).map(x => x.data);
  const nuovi = n => U.filter(u => (u.prova_da || "") >= D(n - 1)).length;
  const attivi = n => U.filter(u => (u.att || "") >= D(n - 1)).length;
  const base = U.filter(u => u.prova_da && u.prova_da <= D(7)), act30 = U.filter(u => (u.att || "") >= D(29));
  const S = Object.fromEntries(stats.filter(x => x.id.startsWith("_d")).map(x => [x.id.slice(2), x.data]));
  const giorni = Array.from({ length: 30 }, (_, i) => {
    const d = D(29 - i), s = S[d] || {};
    return { d, acc: s.acc || 0, osp: s.osp || 0, ospn: s.ospn || 0, nuovi: U.filter(u => u.prova_da === d).length };
  });
  const sum = (n, k) => giorni.slice(-n).reduce((t, g) => t + g[k], 0);
  const mm = month(m);
  return {
    day,
    account: { tot: U.length, nuovi: { oggi: nuovi(1), d7: nuovi(7), d30: nuovi(30) }, attivi: { oggi: attivi(1), d7: attivi(7), d30: attivi(30) } },
    restano: { base: base.length, attivi: base.filter(u => (u.att || "") >= D(6)).length },
    ospiti: { oggi: (S[day] || {}).osp || 0, nuovi7: sum(7, "ospn"), nuovi30: sum(30, "ospn") },
    dal: Object.keys(S).sort()[0] || null,
    piani: count(U, u => planState(u, false, day).plan),
    notifiche: push.filter(x => x.id !== me && (x.data.toks || []).length).length,
    ai: { oggi: ai.filter(x => !x.id.startsWith("_") && x.id !== me && x.data.d === day).reduce((t, x) => t + (x.data.n || 0), 0), mese: mm.n || 0 },
    codici: { usati: codici.reduce((t, c) => t + (c.usati || 0), 0), attivi: codici.filter(c => c.attivo !== false).length },
    dispositivi: { os: count(act30, u => u.os || "?"), dm: count(act30, u => u.dm || "?"), lg: count(act30, u => u.lg || "?"), v: count(act30, u => u.v || "?") },
    giorni,
  };
}
