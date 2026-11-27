import { AccesInterditError, DemandeInvalideError } from "../errors.js";
import { RoleEnum } from "../enums/RoleEnum.js";
import { Pharmacie } from "../models/Pharmacie.js";
import { Medicament } from "../models/Medicament.js";
import { Presentation } from "../models/Presentation.js";
import { exigerObjet } from "./entrees.js";

export class PharmacieController {
  constructor(pharmacies, medicaments, presentations, serviceStock, utilisateurs) {
    this.pharmacies = pharmacies;
    this.medicaments = medicaments;
    this.presentations = presentations;
    this.serviceStock = serviceStock;
    this.utilisateurs = utilisateurs;
  }

  creerPharmacie(corps) {
    const donnees = exigerObjet(corps);
    if (!donnees.adminId) throw new DemandeInvalideError("Administrateur manquant.");
    const administrateur = this.utilisateurs.trouver(donnees.adminId);
    if (administrateur.role !== RoleEnum.ADMIN) {
      throw new AccesInterditError("Seul un administrateur peut créer une pharmacie.");
    }
    if (donnees.partenaire !== undefined && typeof donnees.partenaire !== "boolean") {
      throw new DemandeInvalideError("partenaire doit être un booléen.");
    }
    return this.pharmacies.ajouter(new Pharmacie({
      id: this.pharmacies.prochainId(), nom: donnees.nom, adresse: donnees.adresse, partenaire: donnees.partenaire ?? true }));
  }

  creerMedicament(corps) {
    const donnees = exigerObjet(corps);
    return this.medicaments.ajouter(new Medicament({
      id: this.medicaments.prochainId(),
      nom: donnees.nom,
      description: donnees.description,
      ordonnanceRequise: donnees.ordonnanceRequise === true,
    }));
  }

  creerPresentation(medicamentId, corps) {
    const medicament = this.medicaments.trouver(medicamentId);
    const donnees = exigerObjet(corps);
    return this.presentations.ajouter(new Presentation({
      id: this.presentations.prochainId(),
      medicamentId: medicament.id,
      forme: donnees.forme,
      dosage: donnees.dosage,
      uniteBase: donnees.uniteBase,
      contenanceBoite: donnees.contenanceBoite,
      venteALunite: donnees.venteALunite,
      prix: donnees.prix,
    }));
  }

  definirStock(pharmacieId, presentationId, corps) {
    const donnees = exigerObjet(corps);
    return this.serviceStock.definirStock(pharmacieId, presentationId, donnees.quantiteBase, donnees.pharmacienId);
  }

  rechercher(nomMedicament) {
    return this.serviceStock.rechercherDisponibilites(nomMedicament);
  }
}
