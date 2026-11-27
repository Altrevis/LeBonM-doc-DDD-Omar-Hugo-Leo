import { DemandeInvalideError } from "../errors.js";
import { StatutReservation } from "../models/StatutReservation.js";
import { exigerObjet } from "./entrees.js";
import { vueReservation } from "../views/json.js";

export class ReservationController {
  constructor(serviceReservation) {
    this.service = serviceReservation;
  }

  #vue(reservation) {
    return vueReservation(reservation, this.service.lignesPour(reservation.id));
  }

  demander(corps) {
    const donnees = exigerObjet(corps);
    return this.#vue(this.service.demander(donnees.clientId, donnees.pharmacieId, donnees.lignes));
  }

  consulter(id, utilisateurId) { return this.#vue(this.service.consulter(id, utilisateurId)); }
  accepter(id, corps) { return this.#vue(this.service.accepter(id, exigerObjet(corps).pharmacienId)); }
  refuser(id, corps) {
    const donnees = exigerObjet(corps);
    return this.#vue(this.service.refuser(id, donnees.pharmacienId, donnees.motifRefus ?? ""));
  }
  annuler(id, corps) { return this.#vue(this.service.annuler(id, exigerObjet(corps).clientId)); }
  retirer(id, corps) { return this.#vue(this.service.marquerRetiree(id, exigerObjet(corps).pharmacienId)); }
  expirer() { return this.service.expirerLesReservations(); }

  listerParPharmacie(pharmacieId, pharmacienId, statut) {
    if (statut !== null && !Object.values(StatutReservation).includes(statut)) {
      throw new DemandeInvalideError(`Statut inconnu : ${statut}.`);
    }
    return this.service.listerPourPharmacie(pharmacieId, pharmacienId, statut)
      .map((reservation) => this.#vue(reservation));
  }
}
