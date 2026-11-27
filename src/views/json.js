import {
  AccesInterditError, DemandeInvalideError, EntiteIntrouvableError, LeBonMedocError, OperationDejaEffectueeError,
  ReservationExpireeError, StockInsuffisantError, TransitionInterditeError,
} from "../errors.js";

const CODES = new Map([
  [AccesInterditError, 403],
  [DemandeInvalideError, 400],
  [EntiteIntrouvableError, 404],
  [StockInsuffisantError, 409],
  [OperationDejaEffectueeError, 409],
  [TransitionInterditeError, 409],
  [ReservationExpireeError, 410],
]);

export function envoyer(reponse, statut, corps) {
  reponse.writeHead(statut, { "Content-Type": "application/json; charset=utf-8" });
  reponse.end(JSON.stringify(corps));
}

export const vueStock = (stock) => ({
  pharmacieId: stock.pharmacieId, presentationId: stock.presentationId,
  quantiteBase: stock.quantiteBase, quantiteReserveeBase: stock.quantiteReserveeBase,
  disponible: stock.disponible,
});

export const vueUtilisateur = (utilisateur) => ({
  id: utilisateur.id,
  nom: utilisateur.nom,
  email: utilisateur.email,
  role: utilisateur.role,
  pharmacieId: utilisateur.pharmacieId,
});

export const vueReservation = (reservation, lignes) => ({
  id: reservation.id,
  statut: reservation.statut,
  creeLe: reservation.creeLe,
  expireLe: reservation.expireLe,
  motifRefus: reservation.motifRefus,
  clientId: reservation.clientId,
  pharmacienId: reservation.pharmacienId,
  lignes,
});

export const vueErreur = (type, message) => ({ erreur: { type, message } });

export function reponseErreur(erreur) {
  if (!(erreur instanceof LeBonMedocError)) return null;
  const statut = [...CODES].find(([classeErreur]) => erreur instanceof classeErreur)?.[1] ?? 400;
  return { statut, corps: vueErreur(erreur.name, erreur.message) };
}
