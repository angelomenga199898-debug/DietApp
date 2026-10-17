// /api/ai: assistente di DietApp. Il modello si raggiunge con Netlify AI Gateway (si paga con i crediti
// Netlify, nessuna chiave da gestire: Netlify imposta GEMINI_API_KEY e GOOGLE_GEMINI_BASE_URL).
// Modalità: parse (testo -> pasti), photo (foto del piatto -> pasti), chat (coach), week (commento della settimana).
// Limiti: per piano (vedi lib/limiti.mjs: Prova e Pro AI_MAX_DAY = 20 al giorno, Free AI_FREE_DAY = 0) e AI_MAX_MONTH
// in tutto al mese (predefinito 1500), contati in ai/{uid} e ai/_mese. Modelli: AI_MODEL (predefinito gemini-3.1-flash-lite)
// e AI_MODEL_PHOTO (predefinito come AI_MODEL).
import { json, serviceAccount, verifyToken, getDoc, updateDoc, LINGUE } from "../lib/google.mjs";
import { planOf } from "../lib/piani.mjs";
import { aiLimit } from "../lib/limiti.mjs";

export const config = { path: "/api/ai" };

const LN = { it: "italiano", en: "English", fr: "français", es: "español", de: "Deutsch" };
const isDate = s => typeof s === "string" && /^\d{4}-\d\d-\d\d$/.test(s);
const str = (s, n) => (typeof s === "string" ? s.slice(0, n) : "");

const ITEM = { type: "OBJECT", properties: { t: { type: "STRING" }, n: { type: "STRING" }, k: { type: "NUMBER" }, p: { type: "NUMBER" }, c: { type: "NUMBER" }, g: { type: "NUMBER" } }, required: ["n", "k", "p", "c", "g"] };
const NUMN = { type: "NUMBER", nullable: true };
export const SCHEMA = {
  parse: {
    type: "OBJECT", required: ["date", "closed", "items", "wo", "note"], properties: {
      date: { type: "STRING" }, closed: { type: "BOOLEAN" }, items: { type: "ARRAY", items: ITEM },
      wo: { type: "ARRAY", items: { type: "OBJECT", properties: { s: { type: "STRING" }, min: NUMN, km: NUMN, rpe: NUMN }, required: ["s"] } },
      steps: NUMN, w: NUMN, water: NUMN, sleep: NUMN, note: { type: "STRING" },
    },
  },
  photo: { type: "OBJECT", required: ["food", "items", "note"], properties: { food: { type: "BOOLEAN" }, items: { type: "ARRAY", items: ITEM }, note: { type: "STRING" } } },
  week: { type: "OBJECT", required: ["title", "points", "tip"], properties: { title: { type: "STRING" }, points: { type: "ARRAY", items: { type: "STRING" } }, tip: { type: "STRING" } } },
};

const SPORT = "pesi, corsa, camminata, bici, nuoto, calcio, padel, tennis, basket, pallavolo, hiit, boxe, yoga, cardio, vogatore, trekking, danza";
const SAFE = "Non fare diagnosi e non dare consigli medici, sui farmaci o sugli integratori. Per malattie, sintomi, gravidanza, allattamento, o se l’utente descrive un rapporto difficile con il cibo, consiglia con gentilezza di parlarne con un medico o un professionista. Non suggerire mai di mangiare meno del minimo di kcal indicato nei dati (o di 1200 kcal se manca) né di perdere più dell’1% del peso a settimana.";

export function prompt(mode, b) {
  const L = LN[b.lg] || LN.it;
  if (mode === "parse") return `Sei l’assistente di DietApp, un diario alimentare. Oggi è ${b.today}. Data di default: ${b.date}. Dal messaggio dell’utente estrai pasti, allenamenti e altri dati della giornata e rispondi solo con JSON secondo lo schema.
- items: un elemento per alimento o piatto. n = nome con quantità (es. "Pasta al pomodoro, 120 g"); t = ora HH:MM se indicata, altrimenti vuoto; k = kcal; p, c, g = grammi di proteine, carboidrati e grassi. Dai una stima centrale realistica in base a quantità, cottura e condimenti; se manca la quantità usa una porzione normale e scrivilo in note.
- wo: allenamenti. s = uno di questi codici: ${SPORT}; altrimenti il nome dello sport (la sala pesi è pesi). min, km e rpe (fatica da 1 a 10) se indicati, altrimenti null. Vuoto se il testo non parla di allenamenti.
- steps (passi), w (peso in kg), water (litri), sleep (ore): solo se nominati, altrimenti null.
- date: AAAA-MM-GG del giorno di cui parla il testo (ieri, lunedì…), altrimenti la data di default.
- closed: true solo se il testo dice che la giornata è finita o chiusa.
- note: ipotesi e incertezze, brevissime.
Scrivi n e note in ${L}. Non dare consigli medici.`;
  if (mode === "photo") return `Sei l’assistente di DietApp, un diario alimentare. Guardi la foto di un pasto e stimi cosa contiene. Rispondi solo con JSON secondo lo schema.
- food: false se nella foto non ci sono cibi o bevande; allora items è vuoto e in note spieghi che serve la foto di un pasto.
- items: un elemento per alimento visibile. n = nome con quantità stimata (es. "Riso basmati, ~150 g"); k = kcal; p, c, g = grammi di proteine, carboidrati e grassi; t vuoto. Stima centrale realistica, contando i condimenti visibili o probabili (olio, burro, salse).
- Se l’utente ha scritto dei dettagli, hanno la precedenza su quello che vedi.
- note: le incertezze principali (es. olio non visibile), brevissime.
Scrivi n e note in ${L}. Non dare consigli medici.`;
  if (mode === "chat") return `Sei il coach di DietApp, un diario alimentare per adulti che vogliono dimagrire o mantenere il peso. Rispondi in ${L}, in modo amichevole, concreto e breve (al massimo 120 parole), usando i dati dell’utente qui sotto quando servono. Puoi usare elenchi con "- " e **grassetto**, nient’altro.
- Calorie consumate e deficit sono stime dell’app: trattali come indicativi.
- ${SAFE}
- Se la domanda non riguarda alimentazione, movimento, peso o l’uso dell’app, rispondi che puoi aiutare solo su questi temi.
Dati dell’utente:
${b.ctx}`;
  if (mode === "week") return `Sei il coach di DietApp. Commenta la settimana dell’utente usando i dati qui sotto e rispondi solo con JSON secondo lo schema, in ${L}.
- title: titolo breve (al massimo 6 parole), può avere un’emoji.
- points: da 3 a 5 osservazioni concrete basate sui numeri (calorie rispetto all’obiettivo, proteine, passi, allenamenti, peso, giornate chiuse), una frase ciascuna.
- tip: un solo consiglio pratico per la prossima settimana.
Tono incoraggiante ma onesto. ${SAFE}
Dati dell’utente:
${b.ctx}`;
  return null;
}

// Controlla e normalizza la richiesta. Restituisce {err} oppure i dati puliti.
export function input(b, today = new Date().toISOString().slice(0, 10)) {
  const mode = b && b.mode;
  if (!["parse", "photo", "chat", "week"].includes(mode)) return { err: "mode" };
  const o = { mode, lg: LINGUE.includes(b.lg) ? b.lg : "it" };
  const near = d => isDate(d) && Math.abs(Date.parse(d) - Date.parse(today)) <= 2 * 864e5;
  o.today = near(b.today) ? b.today : today;
  o.date = isDate(b.date) ? b.date : o.today;
  o.text = str(b.text, 2000).trim();
  if (mode === "parse" && !o.text) return { err: "text" };
  if (mode === "photo") {
    if (typeof b.img !== "string" || b.img.length < 100 || b.img.length > 1_600_000 || !/^[A-Za-z0-9+/=]+$/.test(b.img)) return { err: "img" };
    o.img = b.img;
  }
  if (mode === "chat" || mode === "week") {
    o.ctx = str(b.ctx, 9000);
    if (!o.ctx) return { err: "ctx" };
  }
  if (mode === "chat") {
    const ms = Array.isArray(b.msgs) ? b.msgs.slice(-12) : [];
    o.msgs = ms.map(m => ({ r: m && m.r === "a" ? "a" : "u", t: str(m && m.t, 2000).trim() })).filter(m => m.t);
    if (!o.msgs.length || o.msgs[o.msgs.length - 1].r !== "u") return { err: "msgs" };
  }
  return o;
}

export function request(o) {
  const gen = { temperature: o.mode === "chat" ? 0.5 : 0.2, maxOutputTokens: { parse: 2048, photo: 1536, chat: 700, week: 900 }[o.mode] };
  if (SCHEMA[o.mode]) { gen.responseMimeType = "application/json"; gen.responseSchema = SCHEMA[o.mode]; }
  let contents;
  if (o.mode === "chat") contents = o.msgs.map(m => ({ role: m.r === "a" ? "model" : "user", parts: [{ text: m.t }] }));
  else if (o.mode === "photo") contents = [{ role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: o.img } }, { text: o.text ? "Dettagli dell’utente: " + o.text : "Nessun dettaglio dall’utente." }] }];
  else if (o.mode === "week") contents = [{ role: "user", parts: [{ text: "Commenta la mia settimana." }] }];
  else contents = [{ role: "user", parts: [{ text: o.text }] }];
  return { systemInstruction: { parts: [{ text: prompt(o.mode, o) }] }, contents, generationConfig: gen };
}

export async function gemini(model, body) {
  const key = process.env.GEMINI_API_KEY;
  const base = (process.env.GOOGLE_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com").replace(/\/+$/, "");
  const r = await fetch(`${base}/v1beta/models/${model}:generateContent`, {
    method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) { const t = await r.text().catch(() => ""); throw new Error(`gemini ${r.status} ${t.slice(0, 300)}`); }
  const d = await r.json(), c = (d.candidates || [])[0];
  const text = ((c && c.content && c.content.parts) || []).map(p => (p.thought ? "" : p.text || "")).join("").trim();
  if (!text) throw new Error("gemini vuoto " + ((c && c.finishReason) || (d.promptFeedback && d.promptFeedback.blockReason) || ""));
  return text;
}

const n0 = v => (Number.isFinite(+v) && +v >= 0 ? Math.round(+v * 10) / 10 : 0);
const nn = v => (v == null || !Number.isFinite(+v) ? null : +v);
const items = a => (Array.isArray(a) ? a : []).slice(0, 30).map(i => ({ t: /^\d\d:\d\d$/.test(i && i.t) ? i.t : "", n: str(i && i.n, 120), k: Math.round(n0(i && i.k)), p: n0(i && i.p), c: n0(i && i.c), g: n0(i && i.g) })).filter(i => i.n);

// Toglie dal risultato del modello tutto ciò che non serve all'app.
export function tidy(mode, text, o) {
  if (mode === "chat") return { text: text.slice(0, 3000) };
  let d;
  try { d = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch { throw new Error("json"); }
  if (mode === "week") return { title: str(d.title, 80), points: (Array.isArray(d.points) ? d.points : []).slice(0, 5).map(x => str(x, 300)).filter(Boolean), tip: str(d.tip, 300) };
  if (mode === "photo") return { date: o.date, closed: false, items: d.food === false ? [] : items(d.items), wo: [], note: str(d.note, 400), food: d.food !== false };
  return {
    date: isDate(d.date) ? d.date : o.date, closed: d.closed === true, items: items(d.items),
    wo: (Array.isArray(d.wo) ? d.wo : []).slice(0, 10).map(w => ({ s: str(w && w.s, 40), min: nn(w && w.min), km: nn(w && w.km), rpe: nn(w && w.rpe) })).filter(w => w.s),
    steps: nn(d.steps), w: nn(d.w), water: nn(d.water), sleep: nn(d.sleep), note: str(d.note, 400),
  };
}

export default async (req) => {
  if (req.method !== "POST") return json({ err: "method" }, 405);
  const sa = serviceAccount();
  if (!sa || !process.env.GEMINI_API_KEY) return json({ err: "config" }, 503);
  let tok;
  try { tok = await verifyToken(req, sa.project_id); } catch { return json({ err: "auth" }, 503); }
  if (!tok) return json({ err: "auth" }, 401);
  const uid = tok.sub;
  let b;
  try { b = await req.json(); } catch { return json({ err: "body" }, 400); }
  const o = input(b);
  if (o.err) return json({ err: o.err }, 400);

  const MAXM = +process.env.AI_MAX_MONTH || 1500;
  const day = new Date().toISOString().slice(0, 10), mon = day.slice(0, 7);
  try {
    const [p, u, g] = await Promise.all([planOf(uid, tok), getDoc("ai/" + uid), getDoc("ai/_mese")]);
    const used = u && u.d === day ? u.n || 0 : 0, gm = g && g.m === mon ? g.n || 0 : 0, MAXD = aiLimit(p.plan);
    if (MAXD <= 0) return json({ err: "plan", plan: p.plan, used, max: 0 }, 403);
    if (used >= MAXD) return json({ err: "limit", used, max: MAXD }, 429);
    if (gm >= MAXM) return json({ err: "cap", used, max: MAXD }, 429);
    const model = (o.mode === "photo" && process.env.AI_MODEL_PHOTO) || process.env.AI_MODEL || "gemini-3.1-flash-lite";
    let out;
    try { out = tidy(o.mode, await gemini(model, request(o)), o); }
    catch (e) { console.error("ai", o.mode, e.message); return json({ err: "ai", used, max: MAXD }, 502); }
    await Promise.all([updateDoc("ai/" + uid, { d: day, n: used + 1 }), updateDoc("ai/_mese", { m: mon, n: gm + 1 })]);
    return json({ ok: true, data: out, used: used + 1, max: MAXD });
  } catch (e) {
    console.error("ai", e.message);
    return json({ err: "server" }, 502);
  }
};
