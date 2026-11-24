export const StatutReservation = Object.freeze({
  EN_ATTENTE: "en_attente", 
  ACCEPTEE: "acceptee",     
  REFUSEE: "refusee",       
  ANNULEE: "annulee",       
  EXPIREE: "expiree",       
  RETIREE: "retiree",       
});

const S = StatutReservation;

export const TRANSITIONS_AUTORISEES = Object.freeze({
  [S.EN_ATTENTE]: [S.ACCEPTEE, S.REFUSEE, S.ANNULEE, S.EXPIREE],
  [S.ACCEPTEE]: [S.RETIREE, S.ANNULEE, S.EXPIREE],
  [S.REFUSEE]: [],
  [S.ANNULEE]: [],
  [S.EXPIREE]: [],
  [S.RETIREE]: [],
});

export const STATUTS_ACTIFS = Object.freeze([S.EN_ATTENTE, S.ACCEPTEE]);
