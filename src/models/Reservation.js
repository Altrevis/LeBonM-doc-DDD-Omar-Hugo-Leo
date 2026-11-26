import { OperationDejaEffectueeError, TransitionInterditeError } from "../errors.js";
import { StatutReservation, TRANSITIONS_AUTORISEES, STATUTS_ACTIFS } from "./StatutReservation.js";

export class Reservation {
  constructor({ id, clientId, pharmacienId, creeLe, expireLe = null }) {
    Object.assign(this, {
      id,
      clientId,
      pharmacienId,
      creeLe,
      expireLe,
      motifRefus: null,
    });
    this.statut = StatutReservation.EN_ATTENTE;
  }

  get estActive() {
    return STATUTS_ACTIFS.includes(this.statut);
  }

  estExpiree(maintenant) {
    return this.estActive && this.expireLe !== null && maintenant >= this.expireLe;
  }

  verifierTransitionDeStatut(nouveauStatut) {
    if (nouveauStatut === this.statut) {
      throw new OperationDejaEffectueeError(
        `Réservation ${this.id} déjà au statut « ${this.statut} ».`);
    }
    if (!TRANSITIONS_AUTORISEES[this.statut].includes(nouveauStatut)) {
      throw new TransitionInterditeError(
        `Transition interdite : ${this.statut} -> ${nouveauStatut} (réservation ${this.id}).`);
    }
  }

  changerStatut(nouveauStatut, maintenant) {
    this.verifierTransitionDeStatut(nouveauStatut);
    this.statut = nouveauStatut;
  }
}
