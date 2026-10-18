// /api/log: segnalazione anonima degli errori dell'app, per correggerli senza che l'utente debba descriverli.
// Riceve {m: messaggio, s: punto del codice, w: dove (window, promise, aiPhoto…), v: versione, lg: lingua, dm: app o web}
// e li somma per giorno in errori/<AAAA-MM-GG>_<impronta> (n = quante volte, uas = browser e sistemi, lgs = lingue).
// Niente account, indirizzi IP o dati dell'utente; testi ripuliti da email e numeri lunghi. Al massimo ERR_MAX_DAY
// segnalazioni al giorno in tutto (errori/_g<giorno>). L'amministratore le legge da /api/piano {op:"errori"}.
import crypto from "node:crypto";
import { json, serviceAccount, getDoc, incDoc, LINGUE } from "../lib/google.mjs";

export const config = { path: "/api/log" };

export const clean = (s, n) => String(s || "")
  .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "<email>").replace(/\b(?:eyJ|AIza)[\w-]{10,}/g, "<chiave>").replace(/\d{7,}/g, "<n>")
  .replace(/(https?:\/\/[^\s?#)]+)[?#][^\s)]*/g, "$1").replace(/\s+/g, " ").trim().slice(0, n);

// "Android 14 · Chrome 141", "iOS 18.6 · Safari", "Windows · Edge 141"…
export function device(ua) {
  ua = String(ua || "");
  const os = /Android ([\d.]+)/.exec(ua) ? "Android " + /Android ([\d.]+)/.exec(ua)[1].split(".")[0]
    : /(iPhone|iPad).*? OS (\d+)[_.](\d+)/.exec(ua) ? "iOS " + /OS (\d+)[_.](\d+)/.exec(ua).slice(1).join(".")
    : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "?";
  const br = [[/SamsungBrowser\/(\d+)/, "Samsung"], [/Edg\/(\d+)/, "Edge"], [/Firefox\/(\d+)/, "Firefox"], [/CriOS\/(\d+)/, "Chrome"], [/Chrome\/(\d+)/, "Chrome"], [/Version\/([\d.]+).*Safari/, "Safari"]]
    .map(([r, n]) => { const m = r.exec(ua); return m && n + " " + m[1].split(".")[0]; }).find(Boolean) || "?";
  return os + " · " + br;
}

export default async (req) => {
  if (req.method !== "POST") return json({ err: "method" }, 405);
  if (!serviceAccount()) return new Response(null, { status: 204 });
  let b;
  try { b = JSON.parse((await req.text()).slice(0, 4000)); } catch { return json({ err: "body" }, 400); }
  const m = clean(b && b.m, 240);
  if (!m) return json({ err: "m" }, 400);
  const s = clean(b.s, 300), w = clean(b.w, 40) || "?", v = clean(b.v, 12) || "?";
  const lg = LINGUE.includes(b.lg) ? b.lg : "?", dm = b.dm === "app" ? "app" : "web";
  const day = new Date().toISOString().slice(0, 10), MAX = +process.env.ERR_MAX_DAY || 2000;
  try {
    const g = await getDoc("errori/_g" + day);
    if (g && g.n >= MAX) return new Response(null, { status: 204 });
    const id = crypto.createHash("sha1").update([m, s, w, v].join("|")).digest("hex").slice(0, 12);
    await Promise.all([
      incDoc(`errori/${day}_${id}`, { n: 1 }, { d: day, m, s, w, v, dm, ultimo: new Date().toISOString() }, { uas: [device(req.headers.get("user-agent"))], lgs: [lg] }),
      incDoc("errori/_g" + day, { n: 1 }, { d: day }),
    ]);
  } catch (e) { console.error("log", e.message); }
  return new Response(null, { status: 204 });
};
