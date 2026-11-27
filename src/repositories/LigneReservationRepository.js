import { OperationDejaEffectueeError } from "../errors.js";

export class LigneReservationRepository {
  #elements = new Map();

  #cle(reservationId, presentationId) {
    return JSON.stringify([reservationId, presentationId]);
  }

  ajouter(ligne) {
    const cle = this.#cle(ligne.reservationId, ligne.presentationId);
    if (this.#elements.has(cle)) {
      throw new OperationDejaEffectueeError(
        `La présentation ${ligne.presentationId} existe déjà dans la réservation ${ligne.reservationId}.`);
    }
    this.#elements.set(cle, ligne);
    return ligne;
  }

  lister() {
    return [...this.#elements.values()];
  }
}
