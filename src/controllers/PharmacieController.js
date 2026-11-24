import { DemandeInvalideError } from "../errors.js";
import { Pharmacie } from "../models/Pharmacie.js";
import { Medicament } from "../models/Medicament.js";
import { exigerObjet } from "./entrees.js";

export class PharmacieController {
  constructor(pharmacies, medicaments, stockService) {
    this.pharmacies = pharmacies;
    this.medicaments = medicaments;
    this.stockService = stockService;
  }

  creerPharmacie(corps) {
    const b = exigerObjet(corps);
    if (b.partenaire !== undefined && typeof b.partenaire !== "boolean") {
      throw new DemandeInvalideError("partenaire doit être un booléen.");
    }
    return this.pharmacies.ajouter(new Pharmacie({
      id: this.pharmacies.prochainId(), nom: b.nom, adresse: b.adresse, partenaire: b.partenaire ?? true }));
  }

  creerMedicament(corps) {
    const b = exigerObjet(corps);
    return this.medicaments.ajouter(new Medicament({
      id: this.medicaments.prochainId(), nom: b.nom, dosage: b.dosage, forme: b.forme, surOrdonnance: b.surOrdonnance === true }));
  }

  definirStock(pharmacieId, medicamentId, corps) {
    return this.stockService.definirStock(pharmacieId, medicamentId, exigerObjet(corps).quantite);
  }

  rechercher(nomMedicament) {
    return this.stockService.rechercherDisponibilites(nomMedicament);
  }
}
