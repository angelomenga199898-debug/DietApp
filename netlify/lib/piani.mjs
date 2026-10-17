// Piani di DietApp: prova, free, pro. Documento piani/{uid} (solo server):
//   prova_da  'AAAA-MM-GG'  primo giorno in cui il server ha visto l'utente: da lì PROVA_GIORNI (7) giorni di prova
//   pro_fino  'AAAA-MM-GG'  ultimo giorno di Pro (codici regalo; in futuro anche pagamenti)
//   codici    [codice…]     codici regalo già usati      tent {d, n}  tentativi sbagliati di oggi
// Codici regalo: codici/{CODICE} = {giorni, usi (0 = illimitati), usati, scade 'AAAA-MM-GG' o "", attivo, nota, creato}.
// L'amministratore (ADMIN_EMAILS su Netlify, altrimenti CONTACT_EMAIL dell'app) è sempre Pro e gestisce i codici.
import { getDoc, getDocT, updateDoc, updateDocIf, listDocs } from "./google.mjs";
import { ADMIN_EMAIL } from "./versione.mjs";

export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
export const isDate = s => typeof s === "string" && /^\d{4}-\d\d-\d\d$/.test(s) && !isNaN(Date.parse(s));

export function isAdmin(tok) {
  const list = (process.env.ADMIN_EMAILS || ADMIN_EMAIL || "").toLowerCase().split(/[\s,;]+/).filter(Boolean);
  return !!(tok && tok.email && tok.email_verified === true && list.includes(String(tok.email).toLowerCase()));
}

// Stato del piano a partire dal documento (puro, per le prove).
export function planState(doc, admin, day = today()) {
  const PG = +process.env.PROVA_GIORNI || 7;
  const d = doc || {};
  if (admin) return { plan: "pro", fino: "", giorni: null, admin: true };
  if (isDate(d.pro_fino) && d.pro_fino >= day) return { plan: "pro", fino: d.pro_fino, giorni: daysBetween(day, d.pro_fino) + 1, admin: false };
  if (isDate(d.prova_da)) {
    const end = addDays(d.prova_da, PG - 1);
    if (day <= end) return { plan: "prova", fino: end, giorni: daysBetween(day, end) + 1, admin: false };
  }
  return { plan: "free", fino: isDate(d.pro_fino) ? d.pro_fino : "", giorni: 0, admin: false };
}

// Legge il piano dell'utente; la prima volta fa partire la prova.
export async function planOf(uid, tok) {
  let doc = await getDoc("piani/" + uid);
  if (!doc || !doc.prova_da) {
    const up = { prova_da: today() };
    await updateDoc("piani/" + uid, up);
    doc = { ...(doc || {}), ...up };
  }
  return { ...planState(doc, isAdmin(tok)), doc };
}

export const normCode = c => String(c || "").trim().toUpperCase().replace(/\s+/g, "");
export const okCode = c => /^[A-Z0-9-]{4,24}$/.test(c);

// Usa un codice regalo. Restituisce {ok, stato} oppure {err}: codice, scaduto, esaurito, gia, troppi.
export async function redeem(uid, tok, raw) {
  const code = normCode(raw), day = today();
  const p = await planOf(uid, tok), doc = p.doc;
  const tent = doc.tent && doc.tent.d === day ? doc.tent.n || 0 : 0;
  if (tent >= 10) return { err: "troppi" };
  const fail = async err => { await updateDoc("piani/" + uid, { tent: { d: day, n: tent + 1 } }); return { err }; };
  if (!okCode(code)) return fail("codice");
  if ((doc.codici || []).includes(code)) return { err: "gia" };
  for (let i = 0; i < 4; i++) {
    const c = await getDocT("codici/" + code);
    if (!c || c.data.attivo === false) return fail("codice");
    const k = c.data;
    if (isDate(k.scade) && k.scade < day) return { err: "scaduto" };
    if (k.usi > 0 && (k.usati || 0) >= k.usi) return { err: "esaurito" };
    // prima segniamo l'uso sul codice (solo se nessuno l'ha usato nel frattempo), poi diamo il Pro
    if (!(await updateDocIf("codici/" + code, { usati: (k.usati || 0) + 1 }, c.t))) continue;
    const g = Math.max(1, Math.min(3660, Math.round(+k.giorni || 0)));
    const from = isDate(doc.pro_fino) && doc.pro_fino >= day ? addDays(doc.pro_fino, 1) : day;
    const pro_fino = addDays(from, g - 1);
    await updateDoc("piani/" + uid, { pro_fino, codici: [...(doc.codici || []), code].slice(-50) });
    return { ok: true, giorni: g, stato: planState({ ...doc, pro_fino }, isAdmin(tok)) };
  }
  return { err: "server" };
}

// ---------- amministratore ----------
export function codeInput(b) {
  const code = normCode(b.codice);
  if (!okCode(code)) return { err: "codice" };
  const giorni = Math.round(+b.giorni);
  if (!(giorni >= 1 && giorni <= 3660)) return { err: "giorni" };
  const usi = Math.round(+b.usi || 0);
  if (!(usi >= 0 && usi <= 100000)) return { err: "usi" };
  const scade = b.scade ? String(b.scade) : "";
  if (scade && !isDate(scade)) return { err: "scade" };
  return { code, giorni, usi, scade, nota: String(b.nota || "").slice(0, 80) };
}
export async function createCode(b) {
  const o = codeInput(b);
  if (o.err) return o;
  const ok = await updateDocIf("codici/" + o.code, { giorni: o.giorni, usi: o.usi, usati: 0, scade: o.scade, nota: o.nota, attivo: true, creato: Date.now() }, null);
  return ok ? { ok: true, codice: o.code } : { err: "esiste" };
}
export async function listCodes() {
  const all = await listDocs("codici");
  return all.map(x => ({ codice: x.id, giorni: x.data.giorni, usi: x.data.usi || 0, usati: x.data.usati || 0, scade: x.data.scade || "", nota: x.data.nota || "", attivo: x.data.attivo !== false, creato: x.data.creato || 0 }))
    .sort((a, b) => b.creato - a.creato);
}
export async function setActive(raw, on) {
  const code = normCode(raw);
  if (!okCode(code) || !(await getDoc("codici/" + code))) return { err: "codice" };
  await updateDoc("codici/" + code, { attivo: !!on });
  return { ok: true };
}
