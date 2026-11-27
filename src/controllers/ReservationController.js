import { DemandeInvalideError } from "../errors.js";
import { StatutReservation } from "../models/StatutReservation.js";
import { exigerObjet } from "./entrees.js";
import { vueReservation } from "../views/json.js";

export class ReservationController {
  constructor(serviceReservation) {
    this.service = serviceReservation;
  }

  demander(corps) {
    const donnees = exigerObjet(corps);
    return vueReservation(this.service.demander(donnees.clientId, donnees.pharmacieId, donnees.lignes));
  }

  consulter(id, utilisateurId) { return vueReservation(this.service.consulter(id, utilisateurId)); }
  accepter(id, corps) { return vueReservation(this.service.accepter(id, exigerObjet(corps).pharmacienId)); }
  refuser(id, corps) {
    const donnees = exigerObjet(corps);
    return vueReservation(this.service.refuser(id, donnees.pharmacienId, donnees.motifRefus ?? ""));
  }
  annuler(id, corps) { return vueReservation(this.service.annuler(id, exigerObjet(corps).clientId)); }
  retirer(id, corps) { return vueReservation(this.service.marquerRetiree(id, exigerObjet(corps).pharmacienId)); }
  expirer() { return this.service.expirerLesReservations(); }

  listerParPharmacie(pharmacieId, pharmacienId, statut) {
    if (statut !== null && !Object.values(StatutReservation).includes(statut)) {
      throw new DemandeInvalideError(`Statut inconnu : ${statut}.`);
    }
    return this.service.listerPourPharmacie(pharmacieId, pharmacienId, statut)
      .map((reservation) => vueReservation(reservation));
  }
}
