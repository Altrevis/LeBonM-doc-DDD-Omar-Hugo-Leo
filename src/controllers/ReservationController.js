import { DemandeInvalideError } from "../errors.js";
import { StatutReservation } from "../models/StatutReservation.js";
import { exigerObjet } from "./entrees.js";
import { vueReservation } from "../views/json.js";

export class ReservationController {
  constructor(reservationService) {
    this.service = reservationService;
  }

  #vue(reservation) {
    return vueReservation(reservation, this.service.lignesPour(reservation.id));
  }

  demander(corps) {
    const b = exigerObjet(corps);
    return this.#vue(this.service.demander(b.clientId, b.pharmacieId, b.lignes));
  }

  consulter(id, utilisateurId) { return this.#vue(this.service.consulter(id, utilisateurId)); }
  accepter(id, corps) { return this.#vue(this.service.accepter(id, exigerObjet(corps).pharmacienId)); }
  refuser(id, corps) {
    const b = exigerObjet(corps);
    return this.#vue(this.service.refuser(id, b.pharmacienId, b.motifRefus ?? ""));
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
