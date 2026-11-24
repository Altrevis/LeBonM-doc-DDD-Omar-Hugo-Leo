import { DemandeInvalideError } from "../errors.js";
import { StatutReservation } from "../models/StatutReservation.js";
import { exigerObjet } from "./entrees.js";

export class ReservationController {
  constructor(reservationService) {
    this.service = reservationService;
  }

  demander(corps) {
    const b = exigerObjet(corps);
    return this.service.demander(b.utilisateurId, b.pharmacieId, b.medicamentId, b.quantite);
  }

  consulter(id) { return this.service.consulter(id); }
  accepter(id) { return this.service.accepter(id); }
  refuser(id, corps) { return this.service.refuser(id, corps?.motif ?? ""); }
  annuler(id) { return this.service.annuler(id); }
  retirer(id) { return this.service.marquerRetiree(id); }
  expirer() { return this.service.expirerLesReservations(); }

  listerParPharmacie(pharmacieId, statut) {
    if (statut !== null && !Object.values(StatutReservation).includes(statut)) {
      throw new DemandeInvalideError(`Statut inconnu : ${statut}.`);
    }
    return this.service.listerPourPharmacie(pharmacieId, statut);
  }
}
