import { Pharmacie } from "../models/Pharmacie.js";
import { Medicament } from "../models/Medicament.js";

export function chargerDonnees({ pharmacies, medicaments, stockService, reservationService }, donnees) {
  for (const p of donnees.pharmacies) pharmacies.ajouter(new Pharmacie(p));
  for (const m of donnees.medicaments) medicaments.ajouter(new Medicament(m));
  for (const s of donnees.stocks) stockService.definirStock(s.pharmacie, s.medicament, s.quantite);

  const creees = {};
  for (const r of donnees.reservations) {
    const res = reservationService.demander(r.utilisateur, r.pharmacie, r.medicament, r.quantite);
    switch (r.etat) {
      case "en_attente": break;
      case "acceptee": reservationService.accepter(res.id); break;
      case "refusee": reservationService.refuser(res.id, r.motif ?? ""); break;
      case "annulee": reservationService.annuler(res.id); break;
      case "retiree": reservationService.accepter(res.id); reservationService.marquerRetiree(res.id); break;
      default: throw new Error(`État de réservation inconnu dans le jeu de données : ${r.etat}`);
    }
    creees[r.cle] = res;
  }
  return creees;
}
