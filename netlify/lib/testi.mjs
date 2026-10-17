// Testi delle notifiche sul telefono, nelle 5 lingue dell'app.
// {n} = giorni di fila, {v} = versione.
export const TXT = {
  it: {
    weighT: "⚖️ Oggi è giorno di pesata", weighB: "Pesati a digiuno, dopo il bagno, e segna il peso in DietApp.",
    emptyT: "🍽️ Com’è andata oggi?", emptyB: "Non hai ancora segnato niente: aggiungi i pasti di oggi finché te li ricordi.",
    openT: "✅ Chiudi la giornata", openB: "Controlla i pasti di oggi e chiudi la giornata.", openS: "Chiudi la giornata per non perdere la serie di {n} giorni 🔥",
    newsT: "🎉 DietApp {v} è arrivata", newsB: "Apri l’app per scoprire le novità.",
    testT: "🔔 Notifiche attive", testB: "Funziona! Ti avviseremo così nei giorni e negli orari che hai scelto.",
  },
  en: {
    weighT: "⚖️ It’s weigh-in day", weighB: "Weigh yourself before eating, after the bathroom, and log it in DietApp.",
    emptyT: "🍽️ How did today go?", emptyB: "You haven’t logged anything yet: add today’s meals while you remember them.",
    openT: "✅ Close your day", openB: "Check today’s meals and close the day.", openS: "Close the day to keep your {n}-day streak 🔥",
    newsT: "🎉 DietApp {v} is here", newsB: "Open the app to see what’s new.",
    testT: "🔔 Notifications on", testB: "It works! We’ll remind you like this on the days and times you chose.",
  },
  fr: {
    weighT: "⚖️ C’est le jour de la pesée", weighB: "Pèse-toi à jeun, après être passé aux toilettes, et note ton poids dans DietApp.",
    emptyT: "🍽️ Comment s’est passée ta journée ?", emptyB: "Tu n’as encore rien noté : ajoute les repas d’aujourd’hui tant que tu t’en souviens.",
    openT: "✅ Clôture ta journée", openB: "Vérifie les repas d’aujourd’hui et clôture la journée.", openS: "Clôture la journée pour garder ta série de {n} jours 🔥",
    newsT: "🎉 DietApp {v} est arrivée", newsB: "Ouvre l’app pour découvrir les nouveautés.",
    testT: "🔔 Notifications activées", testB: "Ça marche ! On te le rappellera ainsi les jours et aux heures que tu as choisis.",
  },
  es: {
    weighT: "⚖️ Hoy toca pesarse", weighB: "Pésate en ayunas, después de ir al baño, y apunta el peso en DietApp.",
    emptyT: "🍽️ ¿Qué tal hoy?", emptyB: "Aún no has anotado nada: añade las comidas de hoy mientras las recuerdas.",
    openT: "✅ Cierra el día", openB: "Revisa las comidas de hoy y cierra el día.", openS: "Cierra el día para no perder tu racha de {n} días 🔥",
    newsT: "🎉 Ya está aquí DietApp {v}", newsB: "Abre la app para ver las novedades.",
    testT: "🔔 Notificaciones activadas", testB: "¡Funciona! Te avisaremos así los días y a las horas que has elegido.",
  },
  de: {
    weighT: "⚖️ Heute ist Wiegetag", weighB: "Wiege dich nüchtern nach dem Toilettengang und trage dein Gewicht in DietApp ein.",
    emptyT: "🍽️ Wie war dein Tag?", emptyB: "Du hast noch nichts eingetragen: Füge die heutigen Mahlzeiten hinzu, solange du sie noch weißt.",
    openT: "✅ Schließe deinen Tag ab", openB: "Prüfe die heutigen Mahlzeiten und schließe den Tag ab.", openS: "Schließe den Tag ab, um deine Serie von {n} Tagen zu halten 🔥",
    newsT: "🎉 DietApp {v} ist da", newsB: "Öffne die App, um die Neuigkeiten zu sehen.",
    testT: "🔔 Mitteilungen aktiv", testB: "Es klappt! Wir erinnern dich so an den Tagen und zu den Uhrzeiten, die du gewählt hast.",
  },
};
export const tx = (lg, k, o = {}) => (TXT[lg] || TXT.it)[k].replace(/\{(\w+)\}/g, (m, x) => (x in o ? o[x] : m));
