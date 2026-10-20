// /api/stat: conteggio anonimo delle aperture di chi usa DietApp senza account (una al giorno per telefono, lo decide
// l'app) e dei telefoni nuovi. Riceve {nw: 1 la prima volta}; nessun identificativo, nessun dato dell'utente.
// Somma in stats/_d<giorno> (vedi lib/stats.mjs), al massimo STAT_MAX_DAY aperture al giorno.
import { json, serviceAccount } from "../lib/google.mjs";
import { guestPing } from "../lib/stats.mjs";

export const config = { path: "/api/stat" };

export default async (req) => {
  if (req.method !== "POST") return json({ err: "method" }, 405);
  if (!serviceAccount()) return new Response(null, { status: 204 });
  let b = {};
  try { b = JSON.parse((await req.text()).slice(0, 500) || "{}"); } catch { return json({ err: "body" }, 400); }
  try { await guestPing({ nw: b && b.nw ? 1 : 0 }); } catch (e) { console.error("stat", e.message); }
  return new Response(null, { status: 204 });
};
