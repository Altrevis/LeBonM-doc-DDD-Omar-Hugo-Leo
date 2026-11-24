import { OperationDejaEffectueeError, TransitionInterditeError } from "../errors.js";
import { StatutReservation, TRANSITIONS_AUTORISEES, STATUTS_ACTIFS } from "./StatutReservation.js";

export class Reservation {
  constructor({ id, utilisateurId, pharmacieId, medicamentId, quantite, creeLe, expireLe = null }) {
    Object.assign(this, { id, utilisateurId, pharmacieId, medicamentId, quantite, creeLe, expireLe });
    this.statut = StatutReservation.EN_ATTENTE;
    this.motif = "";
    this.historique = [{ de: null, vers: this.statut, le: creeLe }];
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
    this.historique.push({ de: this.statut, vers: nouveauStatut, le: maintenant });
    this.statut = nouveauStatut;
  }
}
