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

export function envoyer(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

export const vueStock = (s) => ({
  pharmacieId: s.pharmacieId, presentationId: s.presentationId,
  quantiteBase: s.quantiteBase, quantiteReserveeBase: s.quantiteReserveeBase,
  disponible: s.disponible,
});

export const vueUtilisateur = (u) => ({
  id: u.id,
  nom: u.nom,
  email: u.email,
  role: u.role,
  pharmacieId: u.pharmacieId,
});

export const vueReservation = (r, lignes) => ({
  id: r.id,
  statut: r.statut,
  creeLe: r.creeLe,
  expireLe: r.expireLe,
  motifRefus: r.motifRefus,
  clientId: r.clientId,
  pharmacienId: r.pharmacienId,
  lignes,
});

export const vueErreur = (type, message) => ({ erreur: { type, message } });

export function reponseErreur(e) {
  if (!(e instanceof LeBonMedocError)) return null;
  const status = [...CODES].find(([cls]) => e instanceof cls)?.[1] ?? 400;
  return { status, body: vueErreur(e.name, e.message) };
}
