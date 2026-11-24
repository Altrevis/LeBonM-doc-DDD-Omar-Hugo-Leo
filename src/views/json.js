import {
  DemandeInvalideError, EntiteIntrouvableError, LeBonMedocError, OperationDejaEffectueeError,
  ReservationExpireeError, StockInsuffisantError, TransitionInterditeError,
} from "../errors.js";

const CODES = new Map([
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
  pharmacieId: s.pharmacieId, medicamentId: s.medicamentId,
  quantiteTotale: s.quantiteTotale, quantiteReservee: s.quantiteReservee,
  quantiteDisponible: s.quantiteDisponible,
});

export const vueErreur = (type, message) => ({ erreur: { type, message } });

export function reponseErreur(e) {
  if (!(e instanceof LeBonMedocError)) return null;
  const status = [...CODES].find(([cls]) => e instanceof cls)?.[1] ?? 400;
  return { status, body: vueErreur(e.name, e.message) };
}
