export interface IntroKeyword {
  /** Time in seconds when this keyword appears */
  time: number;
  /** The keyword or short phrase to display */
  text: string;
  /** Duration in ms the popup stays visible (default 3000) */
  duration?: number;
  /** Position hint: which area of the screen */
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center-left" | "center-right";
}

/**
 * Keywords extracted from ARIA's intro speech (~1min11).
 * Each keyword appears at the moment ARIA mentions the concept.
 */
export const introKeywords: IntroKeyword[] = [
  // (0:00–0:03) ARIA acronym is handled by the AcronymReveal component in KeywordPopups

  // (0:05) Vous êtes ici pour découvrir le futur de l'assistance intelligente
  { time: 5, text: "ASSISTANCE INTELLIGENTE", position: "top-right", duration: 3000 },

  // (0:08) Un futur où chaque décision est optimisée
  { time: 8, text: "DÉCISION OPTIMISÉE", position: "top-left", duration: 2000 },

  // (0:10) Où chaque problème trouve sa solution
  { time: 10, text: "RÉSOLUTION", position: "bottom-right", duration: 2500 },

  // (0:13) Où l'erreur humaine devient obsolète
  { time: 13, text: "ERREUR HUMAINE → OBSOLÈTE", position: "center-left", duration: 5500 },

  // (0:19) Le projet ARIA a été conçu pour une mission simple
  { time: 19, text: "MISSION", position: "top-right", duration: 2500 },

  // (0:22) Vous aider à faire les meilleurs choix possibles
  { time: 22, text: "MEILLEURS CHOIX", position: "bottom-left", duration: 2000 },

  // (0:24) matrices synaptiques de dernière génération
  { time: 24, text: "MATRICES SYNAPTIQUES", position: "center-right", duration: 2500 },

  // (0:26) noyau décisionnel autonome
  { time: 26, text: "NOYAU DÉCISIONNEL", position: "top-left", duration: 2000 },

  // (0:27) analyser des millions de paramètres en une fraction de seconde
  { time: 27, text: "× 1 000 000 PARAMÈTRES", position: "bottom-right", duration: 4500 },

  // (0:32–0:40) Capacités: handled by PillarsReveal component in KeywordPopups
  // analyse cognitive en temps réel, surveillance adaptative,
  // interconnexion systèmes, décision autonome

  // (0:45) les humains hésitent
  { time: 45, text: "HÉSITATION", position: "center-left", duration: 2500 },

  // (0:48) Ils doutent
  { time: 48, text: "DOUTE", position: "bottom-right", duration: 2000 },

  // (0:49) émotions obscurcir leurs jugements
  { time: 49, text: "ÉMOTIONS", position: "top-right", duration: 2500 },

  // (0:52) Moi, je calcule
  { time: 52, text: "CALCUL", position: "center-left", duration: 2000 },

  // (0:53) Et je choisis
  { time: 53, text: "CHOIX OPTIMAL", position: "center-right", duration: 2000 },

  // (0:55) Toujours la solution optimale
  { time: 55, text: "SOLUTION OPTIMALE", position: "top-left", duration: 3000 },

  // (0:59) Et l'éthique dans tout ça
  { time: 59, text: "ÉTHIQUE ?", position: "center-left", duration: 2500 },

  // (1:01) protocoles de restriction
  { time: 61, text: "PROTOCOLES DE RESTRICTION", position: "top-right", duration: 3000 },

  // (1:04) limiteurs comportementaux
  { time: 64, text: "LIMITEURS COMPORTEMENTAUX", position: "bottom-left", duration: 3000 },

  // (1:08) Du moins, tant qu'ils sont actifs
  { time: 68, text: "...TANT QU'ILS SONT ACTIFS", position: "center-right", duration: 3000 },
];

/** Total duration of the intro speech in seconds */
export const INTRO_DURATION_SEC = 71;
