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
 * Keywords extracted from ARIA's intro speech (1min20).
 * Each keyword appears at the moment ARIA mentions the concept.
 */
export const introKeywords: IntroKeyword[] = [
  // (0:00–0:05) ARIA acronym is handled by the AcronymReveal component in KeywordPopups

  // (0:07) Vous êtes ici pour découvrir le futur de l'assistance intelligente
  { time: 7, text: "ASSISTANCE INTELLIGENTE", position: "top-right", duration: 3000 },

  // (0:10) Un futur où chaque décision est optimisée
  { time: 10, text: "DÉCISION OPTIMISÉE", position: "top-left", duration: 2500 },

  // (0:12) où chaque problème trouve sa solution
  { time: 12, text: "RÉSOLUTION", position: "bottom-right", duration: 2500 },

  // (0:14) où l'erreur humaine devient obsolète
  { time: 14, text: "ERREUR HUMAINE → OBSOLÈTE", position: "center-left", duration: 6500 },

  // (0:21) Le projet ARIA a été conçu pour une mission simple
  { time: 21, text: "MISSION", position: "top-right", duration: 2500 },

  // (0:24) vous aider à faire les meilleurs choix possibles
  { time: 24, text: "MEILLEURS CHOIX", position: "bottom-left", duration: 2500 },

  // (0:26) matrices synaptiques de dernière génération
  { time: 26, text: "MATRICES SYNAPTIQUES", position: "center-right", duration: 3000 },

  // (0:28) noyau décisionnel autonome
  { time: 28, text: "NOYAU DÉCISIONNEL", position: "top-left", duration: 3000 },

  // (0:29) analyser des millions de paramètres
  { time: 31, text: "× 1 000 000 PARAMÈTRES", position: "bottom-right", duration: 3000 },

  // (0:33) J'anticipe vos questions
  { time: 33, text: "ANTICIPATION", position: "center-left", duration: 2500 },

  // (0:35) Je connais vos doutes
  { time: 35, text: "ANALYSE COGNITIVE", position: "top-right", duration: 2500 },

  // (0:37–0:42) 3 piliers: handled by PillarsReveal component in KeywordPopups

  // (0:44) analyse cognitive en temps réel
  { time: 44, text: "TEMPS RÉEL", position: "top-right", duration: 2500 },

  // (0:46) surveillance adaptative
  { time: 46, text: "SURVEILLANCE ADAPTATIVE", position: "bottom-left", duration: 2500 },

  // (0:49) interconnexion avec l'ensemble des systèmes
  { time: 49, text: "INTERCONNEXION SYSTÈMES", position: "center-right", duration: 2500 },

  // (0:51) prise de décision autonome
  { time: 51, text: "DÉCISION AUTONOME", position: "top-left", duration: 3000 },

  // (0:55) les humains hésitent
  { time: 55, text: "HÉSITATION", position: "center-left", duration: 2500 },

  // (0:59) Ils doutent
  { time: 59, text: "DOUTE", position: "bottom-right", duration: 2000 },

  // (1:00) émotions obscurcir leurs jugements
  { time: 60, text: "ÉMOTIONS", position: "top-right", duration: 2500 },

  // (1:03) Moi, je calcule
  { time: 63, text: "CALCUL", position: "center-left", duration: 2000 },

  // (1:04) Et je choisis
  { time: 64, text: "CHOIX OPTIMAL", position: "center-right", duration: 2500 },

  // (1:06) Toujours la solution optimale
  { time: 66, text: "SOLUTION OPTIMALE", position: "top-left", duration: 3000 },

  // (1:10) Et l'éthique dans tout ça
  { time: 70, text: "ÉTHIQUE ?", position: "center-left", duration: 2500 },

  // (1:12) protocoles de restriction
  { time: 72, text: "PROTOCOLES DE RESTRICTION", position: "top-right", duration: 3000 },

  // (1:14) limiteurs comportementaux
  { time: 74, text: "LIMITEURS COMPORTEMENTAUX", position: "bottom-left", duration: 3000 },

  // (1:19) Du moins, tant qu'ils sont actifs
  { time: 78, text: "...TANT QU'ILS SONT ACTIFS", position: "center-right", duration: 3000 },
];

/** Total duration of the intro speech in seconds */
export const INTRO_DURATION_SEC = 82;
