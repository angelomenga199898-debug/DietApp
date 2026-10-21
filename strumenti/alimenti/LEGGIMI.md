# Ampliamento del database alimenti (foods7.js, versione 3.6)

- `scelte/c*.txt`: voci scelte da Ciqual 2020 (ANSES, Licence Ouverte / Etalab), `scelte/u*.txt` da USDA FoodData Central SR Legacy (dominio pubblico). Formato: `id|it|en|fr|es|de|unità|grammi per unità|sinonimi`; i valori si prendono dalle tabelle originali.
- `scelte/x*.txt`: prodotti tipici e integratori con valori medi di etichetta. Formato come sopra più `|kcal|proteine|carboidrati|grassi` per 100 g.
- `recipes.py`: piatti italiani calcolati dalla ricetta (ingredienti crudi per una porzione e peso del piatto finito).
- `gen2.py`: genera `src/foods7.js` e aggiunge i nomi tradotti a `src/i18n/foods_<lingua>.json`. Si aspetta le tabelle Ciqual e USDA convertite in `/home/claude/fooddata/work` (non nel repository).
