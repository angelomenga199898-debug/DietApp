// Spesa dell'assistente AI: chi paga, quanto costa ogni risposta e budget del mese.
// - Con GOOGLE_AI_KEY (chiave di Google AI Studio su un progetto con fatturazione attiva) si chiama Gemini
//   direttamente: si paga a Google, separato da Netlify, e l'AI non può consumare i crediti che tengono acceso il sito.
// - Altrimenti si passa da Netlify AI Gateway (GEMINI_API_KEY e GOOGLE_GEMINI_BASE_URL li imposta Netlify) e si paga
//   con i crediti Netlify (1 $ = 180 crediti).
// Il costo di ogni risposta si calcola dai token reali (usageMetadata) e si somma in ai/_m<AAAA-MM> (uu = milionesimi di
// dollaro, n = risposte, tin/tout = token); raggiunto il budget (AI_BUDGET_USD, predefinito 10 $ con Google e 0,80 $
// ≈ 144 crediti con Netlify) l'assistente si ferma fino al mese dopo, e il sito resta acceso.
export const DIRECT = "https://generativelanguage.googleapis.com";

export function aiSource() {
  if (process.env.GOOGLE_AI_KEY) return { src: "google", key: process.env.GOOGLE_AI_KEY.trim(), base: DIRECT };
  if (process.env.GEMINI_API_KEY) return { src: "netlify", key: process.env.GEMINI_API_KEY, base: (process.env.GOOGLE_GEMINI_BASE_URL || DIRECT).replace(/\/+$/, "") };
  return null;
}

// Dollari per milione di token: [entrata, uscita]. I token di ragionamento si pagano come uscita.
// Per un modello non in elenco si usa un prezzo alto (prudente) o AI_PRICE_IN / AI_PRICE_OUT.
// Prezzi del livello a pagamento (ai.google.dev/gemini-api/docs/pricing, ottobre 2026); le Flash 3.6–3.8 hanno un prezzo
// di lancio fino al 31/12/2026, poi raddoppia.
const LANCIO = d => (d < "2027-01-01" ? [0.75, 3.75] : [1.5, 7.5]);
const PRICES = {
  "gemini-3.1-flash-lite": [0.25, 1.5], "gemini-flash-lite-latest": [0.25, 1.5],
  "gemini-2.5-flash-lite": [0.1, 0.4], "gemini-3.5-flash-lite": [0.3, 2.5],
  "gemini-3-flash": [0.5, 3], "gemini-2.5-flash": [0.3, 2.5], "gemini-3.5-flash": [1.5, 9],
  "gemini-3.6-flash": LANCIO, "gemini-3.7-flash": LANCIO, "gemini-3.8-flash": LANCIO,
};
export function price(model, day = new Date().toISOString().slice(0, 10)) {
  const i = +process.env.AI_PRICE_IN, o = +process.env.AI_PRICE_OUT;
  if (i > 0 && o > 0) return [i, o];
  const p = PRICES[String(model).replace(/^models\//, "").replace(/-preview.*$/, "")];
  return typeof p === "function" ? p(day) : p || [2, 12];
}

// Token e costo di una risposta di Gemini.
export function cost(model, usage) {
  const u = usage || {};
  const tin = (+u.promptTokenCount || 0) + (+u.toolUsePromptTokenCount || 0);
  const tout = (+u.candidatesTokenCount || 0) + (+u.thoughtsTokenCount || 0);
  const [pi, po] = price(model);
  return { tin, tout, usd: (tin * pi + tout * po) / 1e6 };
}

export function budget(src) {
  const b = +process.env.AI_BUDGET_USD;
  return b > 0 ? b : src === "google" ? 10 : 0.8;
}

// Documento della spesa di un mese e suo stato.
export const monthPath = (mon = new Date().toISOString().slice(0, 7)) => "ai/_m" + mon;
export function month(doc) {
  const d = doc || {};
  return { n: d.n || 0, usd: (d.uu || 0) / 1e6, tin: d.tin || 0, tout: d.tout || 0 };
}
