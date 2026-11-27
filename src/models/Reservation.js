import {
  DemandeInvalideError, OperationDejaEffectueeError, ReservationExpireeError, TransitionInterditeError,
} from "../errors.js";
import { LigneReservation } from "./LigneReservation.js";
import { StatutReservation, TRANSITIONS_AUTORISEES, STATUTS_ACTIFS } from "./StatutReservation.js";

export class Reservation {
  #statut = StatutReservation.EN_ATTENTE;
  #expireLe;
  #motifRefus = null;
  #lignes;

  constructor({ id, clientId, pharmacienId, creeLe, expireLe = null, lignes }) {
    if (!id || !clientId || !pharmacienId) {
      throw new DemandeInvalideError("Une réservation doit avoir un identifiant, un client et un pharmacien.");
    }
    if (!Array.isArray(lignes) || lignes.length === 0) {
      throw new DemandeInvalideError("Une réservation doit contenir au moins une ligne.");
    }
    const presentationsVues = new Set();
    this.#lignes = lignes.map((ligne) => {
      const { presentationId, quantite, unite, quantiteBase } = ligne ?? {};
      if (presentationsVues.has(presentationId)) {
        throw new DemandeInvalideError("Une présentation ne peut apparaître qu'une fois par réservation.");
      }
      presentationsVues.add(presentationId);
      return new LigneReservation({ reservationId: id, presentationId, quantite, unite, quantiteBase });
    });
    this.#expireLe = expireLe;
    Object.assign(this, { id, clientId, pharmacienId, creeLe });
    Object.freeze(this);
  }

  get statut() {
    return this.#statut;
  }

  get expireLe() {
    return this.#expireLe;
  }

  get motifRefus() {
    return this.#motifRefus;
  }

  get lignes() {
    return [...this.#lignes];
  }

  get estActive() {
    return STATUTS_ACTIFS.includes(this.#statut);
  }

  contientPresentation(presentationId) {
    return this.#lignes.some((ligne) => ligne.presentationId === presentationId);
  }

  estExpiree(maintenant) {
    return this.estActive && this.#expireLe !== null && maintenant >= this.#expireLe;
  }

  verifierTransitionDeStatut(nouveauStatut) {
    if (nouveauStatut === this.#statut) {
      throw new OperationDejaEffectueeError(
        `Réservation ${this.id} déjà au statut « ${this.#statut} ».`);
    }
    if (!TRANSITIONS_AUTORISEES[this.#statut].includes(nouveauStatut)) {
      throw new TransitionInterditeError(
        `Transition interdite : ${this.#statut} -> ${nouveauStatut} (réservation ${this.id}).`);
    }
  }

  accepter(maintenant, nouvelleEcheance) {
    this.#passerA(StatutReservation.ACCEPTEE, maintenant);
    this.#expireLe = nouvelleEcheance;
  }

  refuser(maintenant, motifRefus = "") {
    this.#passerA(StatutReservation.REFUSEE, maintenant);
    this.#motifRefus = motifRefus;
  }

  annuler(maintenant) {
    this.#passerA(StatutReservation.ANNULEE, maintenant);
  }

  marquerRetiree(maintenant) {
    this.#passerA(StatutReservation.RETIREE, maintenant);
  }

  expirer(maintenant) {
    this.verifierTransitionDeStatut(StatutReservation.EXPIREE);
    if (!this.estExpiree(maintenant)) {
      throw new TransitionInterditeError(`La réservation ${this.id} n'a pas encore atteint son échéance.`);
    }
    this.#statut = StatutReservation.EXPIREE;
  }

  #passerA(nouveauStatut, maintenant) {
    this.verifierTransitionDeStatut(nouveauStatut);
    if (this.estExpiree(maintenant)) {
      throw new ReservationExpireeError(`La réservation ${this.id} a expiré.`);
    }
    this.#statut = nouveauStatut;
  }
}
