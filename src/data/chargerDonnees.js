import { Pharmacie } from "../models/Pharmacie.js";
import { Medicament } from "../models/Medicament.js";
import { Presentation } from "../models/Presentation.js";
import { Utilisateur } from "../models/Utilisateur.js";
import { RoleEnum } from "../enums/RoleEnum.js";

export function chargerDonnees({
  pharmacies, medicaments, presentations, utilisateurs, stockService, reservationService,
}, donnees) {
  for (const p of donnees.pharmacies) pharmacies.ajouter(new Pharmacie(p));
  for (const m of donnees.medicaments) medicaments.ajouter(new Medicament(m));
  for (const u of donnees.utilisateurs) {
    if (u.role === RoleEnum.PHARMACIEN) pharmacies.trouver(u.pharmacieId);
    utilisateurs.ajouter(new Utilisateur(u));
  }
  for (const p of donnees.presentations) {
    medicaments.trouver(p.medicamentId);
    presentations.ajouter(new Presentation(p));
  }
  for (const s of donnees.stocks) {
    const pharmacien = utilisateurs.lister().find((u) =>
      u.role === RoleEnum.PHARMACIEN && u.pharmacieId === s.pharmacieId);
    if (!pharmacien) {
      throw new Error(`Aucun pharmacien affecté à la pharmacie ${s.pharmacieId} dans le jeu de données.`);
    }
    stockService.definirStock(s.pharmacieId, s.presentationId, s.quantiteBase, pharmacien.id);
  }

  const creees = {};
  for (const r of donnees.reservations) {
    const res = reservationService.demander(r.clientId, r.pharmacieId, r.lignes);
    switch (r.etat) {
      case "en_attente": break;
      case "acceptee": reservationService.accepter(res.id, res.pharmacienId); break;
      case "refusee": reservationService.refuser(res.id, res.pharmacienId, r.motifRefus ?? ""); break;
      case "annulee": reservationService.annuler(res.id, r.clientId); break;
      case "retiree":
        reservationService.accepter(res.id, res.pharmacienId);
        reservationService.marquerRetiree(res.id, res.pharmacienId);
        break;
      default: throw new Error(`État de réservation inconnu dans le jeu de données : ${r.etat}`);
    }
    creees[r.cle] = res;
  }
  return creees;
}
