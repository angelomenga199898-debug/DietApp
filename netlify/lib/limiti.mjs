// Richieste all'assistente al giorno per piano: Free AI_FREE_DAY (predefinito 0 = assistente bloccato), Prova e Pro AI_MAX_DAY (20).
export const aiLimit = plan => (plan === "free" ? Math.max(0, +process.env.AI_FREE_DAY || 0) : +process.env.AI_MAX_DAY || 20);
