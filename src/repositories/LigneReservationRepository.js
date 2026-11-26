import { OperationDejaEffectueeError } from "../errors.js";

export class LigneReservationRepository {
  #items = new Map();

  #cle(reservationId, presentationId) {
    return JSON.stringify([reservationId, presentationId]);
  }

  ajouter(ligne) {
    const cle = this.#cle(ligne.reservationId, ligne.presentationId);
    if (this.#items.has(cle)) {
      throw new OperationDejaEffectueeError(
        `La présentation ${ligne.presentationId} existe déjà dans la réservation ${ligne.reservationId}.`);
    }
    this.#items.set(cle, ligne);
    return ligne;
  }

  lister() {
    return [...this.#items.values()];
  }
}
