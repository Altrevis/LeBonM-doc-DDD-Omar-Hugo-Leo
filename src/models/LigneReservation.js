import { DemandeInvalideError } from "../errors.js";
import { UniteDemandee } from "../enums/UniteDemandee.js";

export class LigneReservation {
  constructor({ reservationId, presentationId, quantite, unite, quantiteBase }) {
    if (!reservationId || !presentationId) {
      throw new DemandeInvalideError("Une ligne doit référencer sa réservation et sa présentation.");
    }
    if (!Number.isInteger(quantite) || quantite <= 0 ||
        !Number.isInteger(quantiteBase) || quantiteBase <= 0) {
      throw new DemandeInvalideError("Les quantités de la ligne doivent être des entiers positifs.");
    }
    if (!Object.values(UniteDemandee).includes(unite)) {
      throw new DemandeInvalideError(`Unité demandée invalide : ${unite}.`);
    }
    Object.assign(this, { reservationId, presentationId, quantite, unite, quantiteBase });
    Object.freeze(this);
  }
}
