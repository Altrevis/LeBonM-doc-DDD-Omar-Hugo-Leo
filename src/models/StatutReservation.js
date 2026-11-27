export const StatutReservation = Object.freeze({
  EN_ATTENTE: "en_attente", 
  ACCEPTEE: "acceptee",     
  REFUSEE: "refusee",       
  ANNULEE: "annulee",       
  EXPIREE: "expiree",       
  RETIREE: "retiree",       
});

const { EN_ATTENTE, ACCEPTEE, REFUSEE, ANNULEE, EXPIREE, RETIREE } = StatutReservation;

export const TRANSITIONS_AUTORISEES = Object.freeze({
  [EN_ATTENTE]: [ACCEPTEE, REFUSEE, ANNULEE, EXPIREE],
  [ACCEPTEE]: [RETIREE, ANNULEE, EXPIREE],
  [REFUSEE]: [],
  [ANNULEE]: [],
  [EXPIREE]: [],
  [RETIREE]: [],
});

export const STATUTS_ACTIFS = Object.freeze([EN_ATTENTE, ACCEPTEE]);
