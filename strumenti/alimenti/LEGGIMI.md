# Ampliamento del database alimenti (foods7.js, versione 3.6)

- `scelte/c*.txt`: voci scelte da Ciqual 2020 (ANSES, Licence Ouverte / Etalab), `scelte/u*.txt` da USDA FoodData Central SR Legacy (dominio pubblico). Formato: `id|it|en|fr|es|de|unità|grammi per unità|sinonimi`; i valori si prendono dalle tabelle originali.
- `scelte/x*.txt`: prodotti tipici e integratori con valori medi di etichetta. Formato come sopra più `|kcal|proteine|carboidrati|grassi` per 100 g.
- `recipes.py`: piatti italiani calcolati dalla ricetta (ingredienti crudi per una porzione e peso del piatto finito).
- `gen2.py`: genera `src/foods7.js` e aggiunge i nomi tradotti a `src/i18n/foods_<lingua>.json`. Si aspetta le tabelle Ciqual e USDA convertite in `/home/claude/fooddata/work` (non nel repository).
- `marche/raw.txt`: prodotti di marca con i valori in etichetta per 100 g (o 100 ml per le bevande), presi dal sito del produttore o dalla scheda del prodotto nei supermercati online; accanto a ogni riga c'è l'indirizzo della fonte. `marche/build_x.py` aggiunge nomi tradotti, unità e sinonimi e scrive `scelte/x20.txt` (righe `xb`, e `xa` per gli alcolici, per i quali il controllo kcal ≈ 4p+4c+9g non vale). Le etichette cambiano nel tempo: per aggiornare un prodotto si corregge la riga in `raw.txt` e si rilancia.
