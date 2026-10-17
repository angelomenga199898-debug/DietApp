# DietApp – istruzioni per gli aggiornamenti

App web installabile (PWA) statica, pubblicata da Netlify a partire dalla cartella `public/` (vedi `netlify.toml`). Ogni push su `main` viene pubblicato automaticamente; gli utenti ricevono la nuova versione alla prossima apertura con internet.

## Come si modifica
1. Modifica i sorgenti in `src/`:
   - `app_template.html`: interfaccia e logica (segnaposto `/*FOODS*/`, `/*SPLASHCSS*/`, `<!--SPLASH-->`, `<!--HEAD-->`, `<!--TAIL-->`).
   - `foods*.js`: database alimenti. Formato: `[nome, kcal, proteine, carboidrati, grassi (per 100 g/ml), unità, grammi per unità, sinonimi]`; grammi = -1 significa valori per porzione intera.
2. Aumenta la versione in `src/VERSION` (serve a rinnovare la cache del service worker) e aggiungi le novità in `CHANGELOG`.
3. Esegui `python3 src/build.py` dalla radice: rigenera `public/index.html` e `public/sw.js`.
4. Prova la pagina (es. Playwright su `public/index.html`), poi commit e push.

## Componenti dell'interfaccia
- Navigazione da app: ogni livello aperto (scheda diversa da Oggi, pagina, foglio, avviso, procedura guidata) si registra con `pushL(chiusura)`; il tasto indietro di Android/`back()` chiude l'ultimo. Per chiudere un livello da codice usare `dropL(f)` o le funzioni dedicate (`closeSheet`, `closeAlert`); `closeAll()` torna alla base.
- Pagine a scorrimento: `openPage(id, titolo, html, {act})`; le Impostazioni sono costruite da `setHTML()` (aggiornare con `refreshSettings()`). I campi con `data-cfg`, `data-tog`, `data-ntog` si salvano da soli.
- Centro notifiche: `notify(chiave_unica, {type, icon, bg, title, text, act})` con type tra weigh, backup, goals, tips, news; `act` è una chiave di `ACT`. I controlli giornalieri sono in `checks()`.
- Traguardi: elenco `ACH` e condizioni in `achCheck()`.
- Novità: aggiungere una voce in cima a `CHANGELOG` a ogni versione pubblicata (viene mostrata agli utenti dopo l'aggiornamento). `VERSION` viene da `src/VERSION`.
- `FEEDBACK_EMAIL`: se valorizzato, nelle Impostazioni compare "Invia un suggerimento".
- Attività: allenamenti in `days[data].wo` = `[{s: sport, min, rpe, st: sottotipo, km, lap, lv, dp, ex: [{n, sets: [{r, kg}], rec}], kw: kcal orologio, nt}]`. Sport in `SP` (nome, icona, colore, MET, tipo); stima calorie in `woMET`/`woKcal`; i passi fatti durante corsa e camminata si tolgono con `woSteps` per non contarli due volte. Le righe incollate segnano gli allenamenti con `p:1`, l'assistente con `ai:1`. Schede in `S.wtpl`.
- Corpo: il peso resta in `days[data].w` (serve al calcolo del consumo); misure e bilancia smart in `S.body[data]` = `{vita, fia, pet, bra, cos, col, bf, mm, acq, vis}`. Massa grassa con la formula US Navy in `navy()`, serie in `bfSeries()`, pagina disegnata da `corpo()`.
- Storie (pallini in alto in Home): elenco `STORIES` (`id, n, ic, bg, col, key(), pages()`); una storia torna "nuova" quando cambia `key()` (visti in `S.sts`). Pagina = `{t: titolo, ts: emoji, sub, items: [{h: html, s: emoji}], act: [etichetta, funzione]}`; visualizzatore `openStory(id, elemento)` / `storyClose()`.
- Account (Firebase): attivi se esiste `src/firebase.json` (`config`, `providers`, `required`). La libreria arriva da gstatic (versione in `build.py`, salvata dal service worker per l'offline); l'accesso usa il reindirizzamento passando dal nostro dominio (`public/_redirects` inoltra `/__/auth/*` a Firebase). Il telefono resta la copia principale: `syncPull`/`syncPush` con `users/{uid}` (campi in `MAINK`) e `users/{uid}/days/{data}`; nulla va online prima del consenso (`S.consent`). Con `required:false` l'account si attiva da Impostazioni dopo 5 tocchi sulla versione (funzioni in prova).
- Pagine pubbliche: `src/pagine/*.html` (informativa privacy ed eliminazione dati, richieste da Meta e dagli store) diventano `public/privacy.html` e `public/elimina-dati.html`; `/*STYLE*/` = `src/pagine/stile.css`, `/*CONTACT*/` = `CONTACT_EMAIL` del template. Se cambia l’informativa in app (`pgPrivacy`), aggiornare anche queste.
- Eliminazione dati da Facebook: funzione Netlify `netlify/functions/facebook-elimina-dati.mjs` su `/api/facebook-elimina-dati` (URL di callback in Meta). Verifica la firma con `FB_APP_SECRET` e cancella account e dati con `FIREBASE_SERVICE_ACCOUNT` (variabili d'ambiente su Netlify, mai nel repository). Senza dipendenze npm.
- `alertBox({icon, bg, title, text, buttons:[{label, fn, danger}], vib})`: avviso a scheda dal basso con icona tonda oscillante (stile dell'app). Il primo pulsante è quello principale (lime con riflesso).
- Fogli dal basso (`sheet`) e avvisi (`alertBox`) si chiudono anche trascinandoli in giù: `swipeClose()`; gli stili temporanei si azzerano con `swReset()`/`alReset()`.
- `note(testo, errore, {label, fn})`: messaggio breve in basso, con eventuale pulsante (es. Annulla).
- Classi: `cta` (pulsante lime), `shine` (riflesso animato), `danger` (rosso). Le animazioni rispettano `prefers-reduced-motion`.

## Regole importanti
- Netlify (piano gratuito a crediti): ogni pubblicazione su `main` costa 15 crediti su 300 al mese (circa 20 pubblicazioni). Raggruppare le modifiche e fare push su `main` solo quando una versione è pronta; finiti i crediti le pubblicazioni si bloccano e poi il sito va in pausa fino al mese successivo.
- Il service worker non deve mai salvare né mostrare risposte di errore del server (`r.ok`): se il sito non risponde, l'app installata si apre dalla copia salvata.
- Non rinominare il sito né cambiare dominio: i dati degli utenti sono nel localStorage legato all'indirizzo (chiave `tracker_dieta_v1`).
- Ogni cambio di formato dei dati deve passare da `migrate()` e restare compatibile con i dati esistenti.
- Nessun dato personale nel repository (è pubblico).
- La ricerca online usa Open Food Facts (ODbL): mantenere l'attribuzione nel Profilo e il limite di una ricerca ogni ~7 secondi.
