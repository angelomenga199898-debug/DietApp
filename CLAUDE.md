# DietApp – istruzioni per gli aggiornamenti

App web installabile (PWA) statica, pubblicata da Netlify a partire dalla cartella `public/` (vedi `netlify.toml`). Ogni push su `main` viene pubblicato automaticamente; gli utenti ricevono la nuova versione alla prossima apertura con internet.

## Come si modifica
1. Modifica i sorgenti in `src/`:
   - `app_template.html`: interfaccia e logica (segnaposto `/*FOODS*/`, `/*SPLASHCSS*/`, `<!--SPLASH-->`, `<!--HEAD-->`, `<!--TAIL-->`).
   - `foods*.js`: database alimenti. Formato: `[nome, kcal, proteine, carboidrati, grassi (per 100 g/ml), unità, grammi per unità, sinonimi]`; grammi = -1 significa valori per porzione intera.
2. Aumenta la versione in `src/VERSION` (serve a rinnovare la cache del service worker).
3. Esegui `python3 src/build.py` dalla radice: rigenera `public/index.html` e `public/sw.js`.
4. Prova la pagina (es. Playwright su `public/index.html`), poi commit e push.

## Regole importanti
- Non rinominare il sito né cambiare dominio: i dati degli utenti sono nel localStorage legato all'indirizzo (chiave `tracker_dieta_v1`).
- Ogni cambio di formato dei dati deve passare da `migrate()` e restare compatibile con i dati esistenti.
- Nessun dato personale nel repository (è pubblico).
- La ricerca online usa Open Food Facts (ODbL): mantenere l'attribuzione nel Profilo e il limite di una ricerca ogni ~7 secondi.
