import { DemandeInvalideError } from "../errors.js";
import { Pharmacie } from "../models/Pharmacie.js";
import { Medicament } from "../models/Medicament.js";
import { Presentation } from "../models/Presentation.js";
import { exigerObjet } from "./entrees.js";

export class PharmacieController {
  constructor(pharmacies, medicaments, presentations, stockService) {
    this.pharmacies = pharmacies;
    this.medicaments = medicaments;
    this.presentations = presentations;
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
      id: this.medicaments.prochainId(),
      nom: b.nom,
      description: b.description,
      ordonnanceRequise: b.ordonnanceRequise === true,
    }));
  }

  creerPresentation(medicamentId, corps) {
    const medicament = this.medicaments.trouver(medicamentId);
    const b = exigerObjet(corps);
    return this.presentations.ajouter(new Presentation({
      id: this.presentations.prochainId(),
      medicamentId: medicament.id,
      forme: b.forme,
      dosage: b.dosage,
      uniteBase: b.uniteBase,
      contenanceBoite: b.contenanceBoite,
      venteALunite: b.venteALunite,
      prix: b.prix,
    }));
  }

  definirStock(pharmacieId, presentationId, corps) {
    const b = exigerObjet(corps);
    return this.stockService.definirStock(pharmacieId, presentationId, b.quantiteBase, b.pharmacienId);
  }

  rechercher(nomMedicament) {
    return this.stockService.rechercherDisponibilites(nomMedicament);
  }
}
