// Richieste all'assistente al giorno: Free AI_FREE_DAY (predefinito 0 = assistente bloccato), Prova AI_MAX_DAY (20),
// Pro quelle del codice regalo usato (piani/{uid}.pro_max), altrimenti AI_MAX_DAY. L'amministratore ha AI_MAX_DAY.
export const aiDefault = () => +process.env.AI_MAX_DAY || 20;
export const aiLimit = (plan, doc) => {
  if (plan === "free") return Math.max(0, +process.env.AI_FREE_DAY || 0);
  if (plan === "pro" && doc && doc.pro_max > 0) return Math.round(doc.pro_max);
  return aiDefault();
};
