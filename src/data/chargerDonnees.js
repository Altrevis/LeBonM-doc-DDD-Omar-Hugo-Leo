import { Pharmacie } from "../models/Pharmacie.js";
import { Medicament } from "../models/Medicament.js";
import { Presentation } from "../models/Presentation.js";
import { Utilisateur } from "../models/Utilisateur.js";
import { RoleEnum } from "../enums/RoleEnum.js";

export function chargerDonnees({
  pharmacies, medicaments, presentations, utilisateurs, serviceStock, serviceReservation,
}, donnees) {
  for (const pharmacie of donnees.pharmacies) pharmacies.ajouter(new Pharmacie(pharmacie));
  for (const medicament of donnees.medicaments) medicaments.ajouter(new Medicament(medicament));
  for (const utilisateur of donnees.utilisateurs) {
    if (utilisateur.role === RoleEnum.PHARMACIEN) pharmacies.trouver(utilisateur.pharmacieId);
    utilisateurs.ajouter(new Utilisateur(utilisateur));
  }
  for (const presentation of donnees.presentations) {
    medicaments.trouver(presentation.medicamentId);
    presentations.ajouter(new Presentation(presentation));
  }
  for (const stock of donnees.stocks) {
    const pharmacien = utilisateurs.lister().find((utilisateur) =>
      utilisateur.role === RoleEnum.PHARMACIEN && utilisateur.pharmacieId === stock.pharmacieId);
    if (!pharmacien) {
      throw new Error(`Aucun pharmacien affecté à la pharmacie ${stock.pharmacieId} dans le jeu de données.`);
    }
    serviceStock.definirStock(stock.pharmacieId, stock.presentationId, stock.quantiteBase, pharmacien.id);
  }

  const creees = {};
  for (const donneesReservation of donnees.reservations) {
    const reservation = serviceReservation.demander(
      donneesReservation.clientId, donneesReservation.pharmacieId, donneesReservation.lignes);
    switch (donneesReservation.etat) {
      case "en_attente": break;
      case "acceptee": serviceReservation.accepter(reservation.id, reservation.pharmacienId); break;
      case "refusee":
        serviceReservation.refuser(reservation.id, reservation.pharmacienId, donneesReservation.motifRefus ?? "");
        break;
      case "annulee": serviceReservation.annuler(reservation.id, donneesReservation.clientId); break;
      case "retiree":
        serviceReservation.accepter(reservation.id, reservation.pharmacienId);
        serviceReservation.marquerRetiree(reservation.id, reservation.pharmacienId);
        break;
      default: throw new Error(`État de réservation inconnu dans le jeu de données : ${donneesReservation.etat}`);
    }
    creees[donneesReservation.cle] = reservation;
  }
  return creees;
}
