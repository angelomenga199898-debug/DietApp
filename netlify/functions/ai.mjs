// /api/ai: assistente di DietApp con Google Gemini. Chi paga lo decide lib/spesa.mjs: con GOOGLE_AI_KEY si chiama
// Google direttamente (fatturazione Google), altrimenti Netlify AI Gateway (crediti Netlify).
// Modalità: parse (testo -> pasti), photo (foto del piatto -> pasti), chat (coach), week (commento della settimana).
// Limiti: per piano (vedi lib/limiti.mjs: Prova e Pro AI_MAX_DAY = 20 al giorno, Free AI_FREE_DAY = 0), contati in ai/{uid},
// e budget del mese in dollari (AI_BUDGET_USD, vedi lib/spesa.mjs) calcolato dai token reali in ai/_m<AAAA-MM>; AI_MAX_MONTH,
// se impostato, limita anche il numero di richieste del mese. Modelli (vedi modelOf): per la foto, dove serve riconoscere
// piatti e porzioni, AI_MODEL_PHOTO, predefinito gemini-3.8-flash; per il resto AI_MODEL, predefinito gemini-3.1-flash-lite
// (nel testo la precisione viene soprattutto dai valori del database). Ragionamento per modalità (Gemini 3 e successivi):
// AI_THINK_PARSE, AI_THINK_PHOTO, AI_THINK_CHAT, AI_THINK_WEEK = minimal, low, medium o high (vedi THINK).
import { json, serviceAccount, verifyToken, getDoc, updateDoc, incDoc, LINGUE } from "../lib/google.mjs";
import { planOf } from "../lib/piani.mjs";
import { aiLimit } from "../lib/limiti.mjs";
import { aiSource, cost, budget, month, monthPath } from "../lib/spesa.mjs";

export const config = { path: "/api/ai" };

const LN = { it: "italiano", en: "English", fr: "français", es: "español", de: "Deutsch" };
const MIMES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const isDate = s => typeof s === "string" && /^\d{4}-\d\d-\d\d$/.test(s);
const str = (s, n) => (typeof s === "string" ? s.slice(0, n) : "");

const ITEM = { type: "OBJECT", properties: { t: { type: "STRING" }, n: { type: "STRING" }, nm: { type: "STRING" }, r: { type: "INTEGER", nullable: true }, q: { type: "NUMBER" }, u: { type: "STRING", format: "enum", enum: ["g", "ml", "pz"] }, k: { type: "NUMBER" }, p: { type: "NUMBER" }, c: { type: "NUMBER" }, g: { type: "NUMBER" } }, required: ["n", "nm", "q", "u", "k", "p", "c", "g"] };
const UNITS = ["g", "ml", "pz"];
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

// Alimenti del database di DietApp che corrispondono alle parole dell'utente (li sceglie l'app): valori di etichette e
// tabelle ufficiali, così le stime restano coerenti con il resto dell'app.
const refs = b => b.ref && b.ref.length ? `
Valori di riferimento dal database di DietApp (tabelle ufficiali ed etichette), numerati, scelti perché corrispondono a parole dell’utente. Quando un alimento è proprio uno di questi (stesso alimento, stessa variante e stessa cottura) metti il suo numero in r, copia il suo nome in nm e calcola k, p, c e g da questi valori per la quantità q; se nessuno corrisponde esattamente, r = 0 e stima tu. Ignora quelli che non c’entrano:
${b.ref.map((r, i) => i + 1 + ". " + r).join("\n")}` : "";

// Regole comuni a testo e foto: gli errori più frequenti sono varianti più leggere del reale e condimenti dimenticati.
const PREC = `
Precisione, che è la cosa più importante:
- Se l’utente non dice la variante, scegli la più comune in Italia, non la più leggera, e scrivi l’ipotesi in note. Esempio: “tonno” in scatola senza altro = tonno sott’olio d’oliva sgocciolato (circa 190 kcal per 100 g); una scatoletta da 80 g contiene circa 55 g di tonno sgocciolato.
- Grassi di cottura e condimenti: verdure, carne, pesce o uova in padella, trifolati, saltati, fritti, al forno o gratinati di solito hanno olio o burro. Se l’utente non dice “senza olio”, aggiungi l’olio come voce a parte (nm “Olio extravergine d’oliva”, in g): circa 10 g a porzione in padella o al forno e per condire un’insalata, 5 g per le grigliate spennellate. Niente olio per cibi crudi, lessati, al vapore o alla griglia senza condimento, e non aggiungerlo se la voce lo comprende già (es. zucchine trifolate, verdure fritte, piatti pronti).
- Pasta, riso, cereali e legumi secchi: se l’utente non dice “cotti”, il peso è da crudo.
- Prima di rispondere controlla ogni voce: k deve essere vicino a 4×p + 4×c + 9×g e le kcal per 100 g devono essere plausibili per quell’alimento. Le stime sbagliano quasi sempre per difetto (olio, salse e porzioni dimenticati): nel dubbio tra due valori plausibili scegli il più alto.`;

export function prompt(mode, b) {
  const L = LN[b.lg] || LN.it;
  if (mode === "parse") return `Sei l’assistente di DietApp, un diario alimentare. Oggi è ${b.today}. Data di default: ${b.date}. Dal messaggio dell’utente estrai pasti, allenamenti e altri dati della giornata e rispondi solo con JSON secondo lo schema.
- items: un elemento per alimento o piatto. n = nome con quantità (es. "Pasta al pomodoro, 120 g"); nm = solo il nome, senza quantità; q e u = la quantità come numero e unità (u = "g" per i cibi, "ml" per le bevande, "pz" per quello che si conta a pezzi come uova, fette o biscotti); k, p e c, g valgono per tutta la quantità q. t = ora HH:MM se indicata, altrimenti vuoto; k = kcal; p, c, g = grammi di proteine, carboidrati e grassi. Dai una stima centrale realistica in base a quantità, cottura e condimenti; se manca la quantità usa una porzione normale e scrivilo in note.
- wo: allenamenti. s = uno di questi codici: ${SPORT}; altrimenti il nome dello sport (la sala pesi è pesi). min, km e rpe (fatica da 1 a 10) se indicati, altrimenti null. Vuoto se il testo non parla di allenamenti.
- steps (passi), w (peso in kg), water (litri), sleep (ore): solo se nominati, altrimenti null.
- date: AAAA-MM-GG del giorno di cui parla il testo (ieri, lunedì…), altrimenti la data di default.
- closed: true solo se il testo dice che la giornata è finita o chiusa.
- note: ipotesi e incertezze, brevissime.
${PREC}
Scrivi n, nm e note in ${L}. Non dare consigli medici.${refs(b)}`;
  if (mode === "photo") return `Sei l’assistente di DietApp, un diario alimentare. Guardi la foto di un pasto e stimi cosa contiene. Rispondi solo con JSON secondo lo schema.
- food: false se nella foto non ci sono cibi o bevande; allora items è vuoto e in note spieghi che serve la foto di un pasto.
- items: un elemento per alimento visibile. n = nome con quantità stimata (es. "Riso basmati, ~150 g"); nm = solo il nome, senza quantità; q e u = la quantità stimata come numero e unità (u = "g" per i cibi, "ml" per le bevande, "pz" per quello che si conta a pezzi come uova, fette o biscotti); k, p e c, g valgono per tutta la quantità q. k = kcal; p, c, g = grammi di proteine, carboidrati e grassi; t vuoto. Stima centrale realistica, contando i condimenti visibili o probabili (olio, burro, salse).
- Se l’utente ha scritto dei dettagli, hanno la precedenza su quello che vedi.
- note: le incertezze principali (es. olio non visibile), brevissime.
${PREC}
Scrivi n, nm e note in ${L}. Non dare consigli medici.${refs(b)}`;
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
  if ((mode === "parse" || mode === "photo") && Array.isArray(b.ref)) {
    o.ref = b.ref.slice(0, 30).map(r => str(r, 200).replace(/\s+/g, " ").trim()).filter(Boolean);
  }
  if (mode === "photo") {
    // JPEG ridotto dall'app (di solito) o, se il telefono non sa aprire la foto (es. HEIC), il file originale fino a ~4 MB.
    if (typeof b.img !== "string" || b.img.length < 100 || b.img.length > 5_600_000 || !/^[A-Za-z0-9+/=]+$/.test(b.img)) return { err: "img" };
    o.img = b.img;
    o.mime = MIMES.includes(b.mime) ? b.mime : "image/jpeg";
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

// Ragionamento: alto per il testo (modello economico), medio per la foto (modello più forte, che costa di più per token).
// I token di ragionamento si pagano come risposta e contano in maxOutputTokens, che quindi lascia spazio anche a loro.
export const THINK = { parse: "high", photo: "medium", chat: "low", week: "low" };
const LEVELS = ["minimal", "low", "medium", "high"];
// Gemini 3 e successivi: livelli di ragionamento e niente temperature (Google consiglia di lasciarla al valore predefinito,
// dalla 3.6 viene ignorata e in futuro darà errore).
const NEW = m => /^(models\/)?gemini-([3-9]|\d\d)/.test(m || "");
export const PHOTO_MODEL = "gemini-3.8-flash", BASE_MODEL = "gemini-3.1-flash-lite";
export const modelOf = mode => (mode === "photo" ? process.env.AI_MODEL_PHOTO || PHOTO_MODEL : process.env.AI_MODEL || BASE_MODEL);
export function thinkLevel(mode, model) {
  if (!NEW(model)) return null;
  const e = process.env["AI_THINK_" + mode.toUpperCase()];
  return LEVELS.includes(e) ? e : THINK[mode];
}

export function request(o, model = modelOf(o.mode)) {
  const gen = { maxOutputTokens: { parse: 16384, photo: 16384, chat: 3072, week: 3072 }[o.mode] };
  if (!NEW(model)) gen.temperature = o.mode === "chat" ? 0.5 : 0.2;
  const th = thinkLevel(o.mode, model);
  if (th) gen.thinkingConfig = { thinkingLevel: th };
  if (SCHEMA[o.mode]) { gen.responseMimeType = "application/json"; gen.responseSchema = SCHEMA[o.mode]; }
  let contents;
  if (o.mode === "chat") contents = o.msgs.map(m => ({ role: m.r === "a" ? "model" : "user", parts: [{ text: m.t }] }));
  else if (o.mode === "photo") contents = [{ role: "user", parts: [{ inlineData: { mimeType: o.mime || "image/jpeg", data: o.img } }, { text: o.text ? "Dettagli dell’utente: " + o.text : "Nessun dettaglio dall’utente." }] }];
  else if (o.mode === "week") contents = [{ role: "user", parts: [{ text: "Commenta la mia settimana." }] }];
  else contents = [{ role: "user", parts: [{ text: o.text }] }];
  return { systemInstruction: { parts: [{ text: prompt(o.mode, o) }] }, contents, generationConfig: gen };
}

// Restituisce {text, usage}; con testo vuoto lancia un errore che porta comunque usage (i token si pagano lo stesso).
export async function gemini(model, body, src = aiSource()) {
  const r = await fetch(`${src.base}/v1beta/models/${model}:generateContent`, {
    method: "POST", headers: { "x-goog-api-key": src.key, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) { const t = await r.text().catch(() => ""); throw new Error(`gemini ${r.status} ${t.slice(0, 300)}`); }
  const d = await r.json(), c = (d.candidates || [])[0], usage = d.usageMetadata || null;
  const text = ((c && c.content && c.content.parts) || []).map(p => (p.thought ? "" : p.text || "")).join("").trim();
  if (!text) throw Object.assign(new Error("gemini vuoto " + ((c && c.finishReason) || (d.promptFeedback && d.promptFeedback.blockReason) || "")), { usage });
  return { text, usage };
}

const n0 = v => (Number.isFinite(+v) && +v >= 0 ? Math.round(+v * 10) / 10 : 0);
const nn = v => (v == null || !Number.isFinite(+v) ? null : +v);
// quantità modificabile in app: nm (nome senza quantità), q e u (g, ml o pz) solo se validi
const qty = i => { const q = n0(i && i.q), u = i && i.u, nm = str(i && i.nm, 100).trim(); return q > 0 && q <= 10000 && UNITS.includes(u) && nm ? { nm, q: Math.round(q * 100) / 100, u } : {}; };
const ref = (i, nr) => { const r = Math.round(+(i && i.r)); return r >= 1 && r <= nr ? { r } : {}; };
const items = (a, nr = 0) => (Array.isArray(a) ? a : []).slice(0, 30).map(i => ({ t: /^\d\d:\d\d$/.test(i && i.t) ? i.t : "", n: str(i && i.n, 120), ...qty(i), ...ref(i, nr), k: Math.round(n0(i && i.k)), p: n0(i && i.p), c: n0(i && i.c), g: n0(i && i.g) })).filter(i => i.n);

// Toglie dal risultato del modello tutto ciò che non serve all'app.
export function tidy(mode, text, o) {
  if (mode === "chat") return { text: text.slice(0, 3000) };
  let d;
  try { d = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch { throw new Error("json"); }
  if (mode === "week") return { title: str(d.title, 80), points: (Array.isArray(d.points) ? d.points : []).slice(0, 5).map(x => str(x, 300)).filter(Boolean), tip: str(d.tip, 300) };
  if (mode === "photo") return { date: o.date, closed: false, items: d.food === false ? [] : items(d.items, (o.ref || []).length), wo: [], note: str(d.note, 400), food: d.food !== false };
  return {
    date: isDate(d.date) ? d.date : o.date, closed: d.closed === true, items: items(d.items, (o.ref || []).length),
    wo: (Array.isArray(d.wo) ? d.wo : []).slice(0, 10).map(w => ({ s: str(w && w.s, 40), min: nn(w && w.min), km: nn(w && w.km), rpe: nn(w && w.rpe) })).filter(w => w.s),
    steps: nn(d.steps), w: nn(d.w), water: nn(d.water), sleep: nn(d.sleep), note: str(d.note, 400),
  };
}

export default async (req) => {
  if (req.method !== "POST") return json({ err: "method" }, 405);
  const sa = serviceAccount();
  if (!sa) return json({ err: "config" }, 503);
  const src = aiSource();
  if (!src) { console.error("AI non configurata: manca GOOGLE_AI_KEY (Google diretto) e l'AI Gateway di Netlify non ha impostato GEMINI_API_KEY"); return json({ err: "gateway" }, 503); }
  let tok;
  try { tok = await verifyToken(req); } catch { return json({ err: "auth" }, 503); }
  if (!tok) return json({ err: "auth" }, 401);
  const uid = tok.sub;
  let b;
  try { b = await req.json(); } catch { return json({ err: "body" }, 400); }
  const o = input(b);
  if (o.err) return json({ err: o.err }, 400);

  const MAXM = +process.env.AI_MAX_MONTH || 0;
  const day = new Date().toISOString().slice(0, 10), mon = day.slice(0, 7);
  try {
    const [p, u, g] = await Promise.all([planOf(uid, tok), getDoc("ai/" + uid), getDoc(monthPath(mon))]);
    const used = u && u.d === day ? u.n || 0 : 0, gm = month(g), MAXD = aiLimit(p.plan, p.admin ? null : p.doc);
    if (MAXD <= 0) return json({ err: "plan", plan: p.plan, used, max: 0 }, 403);
    if (used >= MAXD) return json({ err: "limit", used, max: MAXD }, 429);
    if (gm.usd >= budget(src.src) || (MAXM && gm.n >= MAXM)) return json({ err: "cap", used, max: MAXD }, 429);
    const model = modelOf(o.mode);
    // Ogni risposta (anche se poi non va bene) si somma alla spesa del mese.
    const spend = usage => {
      const c = cost(model, usage);
      return incDoc(monthPath(mon), { n: 1, uu: c.usd * 1e6, tin: c.tin, tout: c.tout }, { src: src.src, model });
    };
    let res, out;
    try { res = await gemini(model, request(o, model), src); }
    catch (e) { if (e.usage) await spend(e.usage).catch(() => {}); console.error("ai", o.mode, e.message); return json({ err: "ai", used, max: MAXD }, 502); }
    await spend(res.usage).catch(e => console.error("ai spesa", e.message));
    try { out = tidy(o.mode, res.text, o); }
    catch (e) { console.error("ai", o.mode, e.message); return json({ err: "ai", used, max: MAXD }, 502); }
    await updateDoc("ai/" + uid, { d: day, n: used + 1 });
    return json({ ok: true, data: out, used: used + 1, max: MAXD });
  } catch (e) {
    console.error("ai", e.message);
    return json({ err: "server" }, 502);
  }
};
