import { TEAMS } from "./flags.js";

export const SUPPORTED_LOCALES = ["en", "es", "fr", "pt-PT", "pt-BR", "de", "nl", "nb"];

export const LOCALE_NAMES = {
  en: "English",
  es: "Español",
  fr: "Français",
  "pt-PT": "Português (Portugal)",
  "pt-BR": "Português (Brasil)",
  de: "Deutsch",
  nl: "Nederlands",
  nb: "Norsk bokmål",
};

const teamCodes = TEAMS.map((team) => team.code);
const teams = (names) => Object.fromEntries(teamCodes.map((code, index) => [code, names[index]]));

// Machine-assisted translations. All non-English catalogs require fluent-speaker review.
const teamNames = {
  en: teams(["Algeria","Argentina","Australia","Austria","Belgium","Bosnia-Herzegovina","Brazil","Canada","Cape Verde Islands","Colombia","Congo DR","Croatia","Curaçao","Czechia","Ecuador","Egypt","England","France","Germany","Ghana","Haiti","Iran","Iraq","Ivory Coast","Japan","Jordan","Mexico","Morocco","Netherlands","New Zealand","Norway","Panama","Paraguay","Portugal","Qatar","Saudi Arabia","Scotland","Senegal","South Africa","South Korea","Spain","Sweden","Switzerland","Tunisia","Turkey","United States","Uruguay","Uzbekistan"]),
  es: teams(["Argelia","Argentina","Australia","Austria","Bélgica","Bosnia-Herzegovina","Brasil","Canadá","Cabo Verde","Colombia","RD del Congo","Croacia","Curazao","Chequia","Ecuador","Egipto","Inglaterra","Francia","Alemania","Ghana","Haití","Irán","Irak","Costa de Marfil","Japón","Jordania","México","Marruecos","Países Bajos","Nueva Zelanda","Noruega","Panamá","Paraguay","Portugal","Catar","Arabia Saudita","Escocia","Senegal","Sudáfrica","Corea del Sur","España","Suecia","Suiza","Túnez","Turquía","Estados Unidos","Uruguay","Uzbekistán"]),
  fr: teams(["Algérie","Argentine","Australie","Autriche","Belgique","Bosnie-Herzégovine","Brésil","Canada","Cap-Vert","Colombie","RD Congo","Croatie","Curaçao","Tchéquie","Équateur","Égypte","Angleterre","France","Allemagne","Ghana","Haïti","Iran","Irak","Côte d’Ivoire","Japon","Jordanie","Mexique","Maroc","Pays-Bas","Nouvelle-Zélande","Norvège","Panama","Paraguay","Portugal","Qatar","Arabie saoudite","Écosse","Sénégal","Afrique du Sud","Corée du Sud","Espagne","Suède","Suisse","Tunisie","Turquie","États-Unis","Uruguay","Ouzbékistan"]),
  "pt-PT": teams(["Argélia","Argentina","Austrália","Áustria","Bélgica","Bósnia-Herzegovina","Brasil","Canadá","Cabo Verde","Colômbia","RD Congo","Croácia","Curaçau","Chéquia","Equador","Egito","Inglaterra","França","Alemanha","Gana","Haiti","Irão","Iraque","Costa do Marfim","Japão","Jordânia","México","Marrocos","Países Baixos","Nova Zelândia","Noruega","Panamá","Paraguai","Portugal","Catar","Arábia Saudita","Escócia","Senegal","África do Sul","Coreia do Sul","Espanha","Suécia","Suíça","Tunísia","Turquia","Estados Unidos","Uruguai","Uzbequistão"]),
  "pt-BR": teams(["Argélia","Argentina","Austrália","Áustria","Bélgica","Bósnia-Herzegovina","Brasil","Canadá","Cabo Verde","Colômbia","RD Congo","Croácia","Curaçao","Tchéquia","Equador","Egito","Inglaterra","França","Alemanha","Gana","Haiti","Irã","Iraque","Costa do Marfim","Japão","Jordânia","México","Marrocos","Países Baixos","Nova Zelândia","Noruega","Panamá","Paraguai","Portugal","Catar","Arábia Saudita","Escócia","Senegal","África do Sul","Coreia do Sul","Espanha","Suécia","Suíça","Tunísia","Turquia","Estados Unidos","Uruguai","Uzbequistão"]),
  de: teams(["Algerien","Argentinien","Australien","Österreich","Belgien","Bosnien-Herzegowina","Brasilien","Kanada","Kap Verde","Kolumbien","DR Kongo","Kroatien","Curaçao","Tschechien","Ecuador","Ägypten","England","Frankreich","Deutschland","Ghana","Haiti","Iran","Irak","Elfenbeinküste","Japan","Jordanien","Mexiko","Marokko","Niederlande","Neuseeland","Norwegen","Panama","Paraguay","Portugal","Katar","Saudi-Arabien","Schottland","Senegal","Südafrika","Südkorea","Spanien","Schweden","Schweiz","Tunesien","Türkei","Vereinigte Staaten","Uruguay","Usbekistan"]),
  nl: teams(["Algerije","Argentinië","Australië","Oostenrijk","België","Bosnië-Herzegovina","Brazilië","Canada","Kaapverdië","Colombia","DR Congo","Kroatië","Curaçao","Tsjechië","Ecuador","Egypte","Engeland","Frankrijk","Duitsland","Ghana","Haïti","Iran","Irak","Ivoorkust","Japan","Jordanië","Mexico","Marokko","Nederland","Nieuw-Zeeland","Noorwegen","Panama","Paraguay","Portugal","Qatar","Saoedi-Arabië","Schotland","Senegal","Zuid-Afrika","Zuid-Korea","Spanje","Zweden","Zwitserland","Tunesië","Turkije","Verenigde Staten","Uruguay","Oezbekistan"]),
  nb: teams(["Algerie","Argentina","Australia","Østerrike","Belgia","Bosnia-Hercegovina","Brasil","Canada","Kapp Verde","Colombia","DR Kongo","Kroatia","Curaçao","Tsjekkia","Ecuador","Egypt","England","Frankrike","Tyskland","Ghana","Haiti","Iran","Irak","Elfenbenskysten","Japan","Jordan","Mexico","Marokko","Nederland","New Zealand","Norge","Panama","Paraguay","Portugal","Qatar","Saudi-Arabia","Skottland","Senegal","Sør-Afrika","Sør-Korea","Spania","Sverige","Sveits","Tunisia","Tyrkia","USA","Uruguay","Usbekistan"]),
};

const ui = {
  en: ["Custom Calendar Subscription","source code","source data","Favourite teams","Filter teams…","Big games","both teams are ranked in the top","by odds of winning the tournament","all 32 knockout games","use BBC “As It Stands” projected knockout teams","home openers of the 3 host nations","Competitive games","odds for each team winning the match are within","percentage points","Options","Language","show emoji flags","use FIFA three-letter country code","Your calendar subscription URL:","Copy URL","Subscribe","Example Matches in Feed","Select teams or enable a rule.","No matches yet for these settings.","Copied","increase","decrease"],
  es: ["Suscripción de calendario personalizada","código fuente","fuentes de datos","Equipos favoritos","Filtrar equipos…","Grandes partidos","ambos equipos están clasificados entre los primeros","por probabilidades de ganar el torneo","los 32 partidos eliminatorios","usar las proyecciones “Así está” de la BBC","debut como local de los 3 países anfitriones","Partidos competitivos","las probabilidades de victoria de cada equipo difieren en","puntos porcentuales","Opciones","Idioma","mostrar banderas emoji","usar el código FIFA de tres letras","URL de suscripción a tu calendario:","Copiar URL","Suscribirse","Ejemplos de partidos del calendario","Selecciona equipos o activa una regla.","Todavía no hay partidos para esta configuración.","Copiado","aumentar","disminuir"],
  fr: ["Abonnement calendrier personnalisé","code source","sources de données","Équipes favorites","Filtrer les équipes…","Grands matchs","les deux équipes sont classées parmi les","selon leurs chances de gagner le tournoi","les 32 matchs à élimination directe","utiliser les projections « En l’état » de la BBC","premier match à domicile des 3 pays hôtes","Matchs équilibrés","l’écart entre les chances de victoire des équipes est inférieur à","points de pourcentage","Options","Langue","afficher les drapeaux emoji","utiliser le code pays FIFA à trois lettres","URL d’abonnement à votre calendrier :","Copier l’URL","S’abonner","Exemples de matchs du calendrier","Sélectionnez des équipes ou activez une règle.","Aucun match pour ces paramètres pour le moment.","Copié","augmenter","diminuer"],
  "pt-PT": ["Subscrição de calendário personalizada","código-fonte","fontes de dados","Equipas favoritas","Filtrar equipas…","Grandes jogos","ambas as equipas estão classificadas entre as primeiras","pelas probabilidades de vencer o torneio","os 32 jogos a eliminar","usar as projeções “Como está” da BBC","estreias em casa dos 3 países anfitriões","Jogos equilibrados","as probabilidades de vitória de cada equipa diferem em","pontos percentuais","Opções","Idioma","mostrar bandeiras emoji","usar o código FIFA de três letras","URL de subscrição do calendário:","Copiar URL","Subscrever","Exemplos de jogos no calendário","Selecione equipas ou ative uma regra.","Ainda não há jogos para estas definições.","Copiado","aumentar","diminuir"],
  "pt-BR": ["Assinatura de calendário personalizada","código-fonte","fontes de dados","Times favoritos","Filtrar times…","Grandes jogos","os dois times estão classificados entre os primeiros","pelas probabilidades de vencer o torneio","os 32 jogos eliminatórios","usar as projeções “Como está” da BBC","estreias em casa dos 3 países-sede","Jogos equilibrados","as probabilidades de vitória de cada time diferem em","pontos percentuais","Opções","Idioma","mostrar bandeiras emoji","usar o código FIFA de três letras","URL de assinatura do seu calendário:","Copiar URL","Assinar","Exemplos de jogos no calendário","Selecione times ou ative uma regra.","Ainda não há jogos para estas configurações.","Copiado","aumentar","diminuir"],
  de: ["Benutzerdefiniertes Kalenderabonnement","Quellcode","Datenquellen","Lieblingsteams","Teams filtern…","Topspiele","beide Teams gehören zu den besten","nach ihren Chancen auf den Turniersieg","alle 32 K.-o.-Spiele","BBC-Prognosen „Aktueller Stand“ verwenden","Heimauftakt der 3 Gastgeberländer","Ausgeglichene Spiele","die Siegchancen beider Teams liegen innerhalb von","Prozentpunkten","Optionen","Sprache","Emoji-Flaggen anzeigen","dreistelligen FIFA-Ländercode verwenden","Deine Kalender-Abonnement-URL:","URL kopieren","Abonnieren","Beispielspiele im Kalender","Wähle Teams aus oder aktiviere eine Regel.","Noch keine Spiele für diese Einstellungen.","Kopiert","erhöhen","verringern"],
  nl: ["Aangepast kalenderabonnement","broncode","gegevensbronnen","Favoriete teams","Teams filteren…","Topwedstrijden","beide teams staan in de top","op basis van hun kans om het toernooi te winnen","alle 32 knock-outwedstrijden","BBC-prognoses ‘Huidige stand’ gebruiken","thuisopeners van de 3 gastlanden","Gelijkwaardige wedstrijden","de winstkansen van beide teams liggen binnen","procentpunten","Opties","Taal","emoji-vlaggen tonen","drieletterige FIFA-landcode gebruiken","URL van je kalenderabonnement:","URL kopiëren","Abonneren","Voorbeeldwedstrijden in de kalender","Selecteer teams of schakel een regel in.","Nog geen wedstrijden voor deze instellingen.","Gekopieerd","verhogen","verlagen"],
  nb: ["Tilpasset kalenderabonnement","kildekode","datakilder","Favorittlag","Filtrer lag…","Storkamper","begge lag er rangert blant de","etter sannsynlighet for å vinne turneringen","alle 32 sluttspillkamper","bruk BBCs «Slik står det»-prognoser","hjemmeåpningene til de 3 vertslandene","Jevne kamper","vinnersjansene til hvert lag er innenfor","prosentpoeng","Alternativer","Språk","vis emoji-flagg","bruk FIFA-landkode på tre bokstaver","URL for kalenderabonnementet ditt:","Kopier URL","Abonner","Eksempelkamper i kalenderen","Velg lag eller aktiver en regel.","Ingen kamper for disse innstillingene ennå.","Kopiert","øk","reduser"],
};

const uiKeys = ["subtitle","sourceCode","sourceData","favourites","filterTeams","bigGames","rankBefore","rankAfter","knockout","bbc","openers","competitiveGames","competitiveBefore","percentagePoints","options","language","flags","code","subscriptionUrl","copyUrl","subscribe","examples","selectPrompt","noMatches","copied","increase","decrease"];

const feed = {
  en: { calendarName:"World Cup 2026", versus:"vs.", tbd:"TBD", included:"Included", winProbability:"Win probability", draw:"draw", final:"Final", group:"Group", groupStage:"Group Stage", stages:["Round of 32","Round of 16","Round of 8","Semi-final","Third-place play-off","Final"], reasons:["knockout game","host opener","favourite team","big game","competitive game"] },
  es: { calendarName:"Mundial 2026", versus:"vs.", tbd:"Por definir", included:"Incluido", winProbability:"Probabilidad de victoria", draw:"empate", final:"Final", group:"Grupo", groupStage:"Fase de grupos", stages:["Ronda de 32","Octavos de final","Cuartos de final","Semifinal","Partido por el tercer puesto","Final"], reasons:["partido eliminatorio","debut del anfitrión","equipo favorito","gran partido","partido competitivo"] },
  fr: { calendarName:"Coupe du monde 2026", versus:"c.", tbd:"À déterminer", included:"Inclus", winProbability:"Probabilité de victoire", draw:"nul", final:"Score final", group:"Groupe", groupStage:"Phase de groupes", stages:["Seizièmes de finale","Huitièmes de finale","Quarts de finale","Demi-finale","Match pour la troisième place","Finale"], reasons:["match à élimination directe","premier match de l’hôte","équipe favorite","grand match","match équilibré"] },
  "pt-PT": { calendarName:"Mundial 2026", versus:"vs.", tbd:"Por definir", included:"Incluído", winProbability:"Probabilidade de vitória", draw:"empate", final:"Resultado final", group:"Grupo", groupStage:"Fase de grupos", stages:["Dezasseis avos de final","Oitavos de final","Quartos de final","Meia-final","Jogo do terceiro lugar","Final"], reasons:["jogo a eliminar","estreia do anfitrião","equipa favorita","grande jogo","jogo equilibrado"] },
  "pt-BR": { calendarName:"Copa do Mundo 2026", versus:"x", tbd:"A definir", included:"Incluído", winProbability:"Probabilidade de vitória", draw:"empate", final:"Placar final", group:"Grupo", groupStage:"Fase de grupos", stages:["Segunda fase","Oitavas de final","Quartas de final","Semifinal","Disputa do terceiro lugar","Final"], reasons:["jogo eliminatório","estreia do anfitrião","time favorito","grande jogo","jogo equilibrado"] },
  de: { calendarName:"Fußball-WM 2026", versus:"gegen", tbd:"Noch offen", included:"Enthalten", winProbability:"Siegwahrscheinlichkeit", draw:"Unentschieden", final:"Endstand", group:"Gruppe", groupStage:"Gruppenphase", stages:["Sechzehntelfinale","Achtelfinale","Viertelfinale","Halbfinale","Spiel um Platz drei","Finale"], reasons:["K.-o.-Spiel","Heimauftakt des Gastgebers","Lieblingsteam","Topspiel","ausgeglichenes Spiel"] },
  nl: { calendarName:"WK 2026", versus:"tegen", tbd:"Nog te bepalen", included:"Opgenomen", winProbability:"Winstkans", draw:"gelijkspel", final:"Eindstand", group:"Groep", groupStage:"Groepsfase", stages:["Laatste 32","Achtste finale","Kwartfinale","Halve finale","Wedstrijd om de derde plaats","Finale"], reasons:["knock-outwedstrijd","thuisopener gastland","favoriet team","topwedstrijd","gelijkwaardige wedstrijd"] },
  nb: { calendarName:"VM 2026", versus:"mot", tbd:"Ikke avgjort", included:"Inkludert", winProbability:"Vinnersannsynlighet", draw:"uavgjort", final:"Sluttresultat", group:"Gruppe", groupStage:"Gruppespill", stages:["Sekstendelsfinale","Åttedelsfinale","Kvartfinale","Semifinale","Bronsefinale","Finale"], reasons:["sluttspillkamp","vertsnasjonens hjemmeåpning","favorittlag","storkamp","jevn kamp"] },
};

const stageKeys = ["Round of 32","Round of 16","Round of 8","Semi-final","Third-place play-off","Final"];
const reasonKeys = ["knockout","hostOpener","favourite","bigGame","competitive"];

export const CATALOGS = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [
  locale,
  {
    ui: Object.fromEntries(uiKeys.map((key, index) => [key, ui[locale][index]])),
    teams: teamNames[locale],
    stages: Object.fromEntries(stageKeys.map((key, index) => [key, feed[locale].stages[index]])),
    reasons: Object.fromEntries(reasonKeys.map((key, index) => [key, feed[locale].reasons[index]])),
    feed: Object.fromEntries(Object.entries(feed[locale]).filter(([key]) => !["stages", "reasons"].includes(key))),
  },
]));

export function resolveLocale(raw) {
  if (!raw) return null;
  const tag = String(raw).trim().replace(/_/g, "-");
  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === tag.toLowerCase());
  if (exact) return exact;
  const lower = tag.toLowerCase();
  if (lower === "no" || lower.startsWith("no-") || lower.startsWith("nb-")) return "nb";
  if (lower.startsWith("pt-br")) return "pt-BR";
  if (lower === "pt" || lower.startsWith("pt-")) return "pt-PT";
  const base = lower.split("-")[0];
  return ["en", "es", "fr", "de", "nl"].includes(base) ? base : null;
}

export function localeFromAcceptLanguage(header) {
  const candidates = String(header || "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = Number((params.find((param) => param.trim().startsWith("q=")) || "q=1").split("=")[1]);
      return { tag, q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((candidate) => candidate.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const candidate of candidates) {
    const locale = resolveLocale(candidate.tag);
    if (locale) return locale;
  }
  return "en";
}

export function requestLocale(url, acceptLanguage = "") {
  if (url.searchParams.has("lang")) return resolveLocale(url.searchParams.get("lang")) || "en";
  return localeFromAcceptLanguage(acceptLanguage);
}

export function catalog(locale) {
  return CATALOGS[resolveLocale(locale) || "en"];
}

export function teamName(code, locale = "en", fallback = code) {
  return catalog(locale).teams[code] || CATALOGS.en.teams[code] || fallback;
}

export function stageName(stage, locale = "en") {
  const c = catalog(locale);
  const groupStage = /^Group Stage(.*)$/.exec(stage || "");
  if (groupStage) return `${c.feed.groupStage}${groupStage[1]}`;
  const group = /^Group (.+)$/.exec(stage || "");
  if (group) return `${c.feed.group} ${group[1]}`;
  return c.stages[stage] || stage;
}

export function formatTemplate(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

export function reasonLabel(reason, locale = "en") {
  return formatTemplate(catalog(locale).reasons[reason.id] || CATALOGS.en.reasons[reason.id] || reason.id, reason.values);
}

export function probabilityLines(fixture, odds, locale = "en") {
  if (!odds || !fixture.home || !fixture.away) return [];
  const c = catalog(locale);
  return [
    `${teamName(fixture.home.code, locale, fixture.home.name)}: ${odds.homePct}%`,
    `${teamName(fixture.away.code, locale, fixture.away.name)}: ${odds.awayPct}%`,
    `${c.feed.draw}: ${odds.drawPct}%`,
  ];
}
