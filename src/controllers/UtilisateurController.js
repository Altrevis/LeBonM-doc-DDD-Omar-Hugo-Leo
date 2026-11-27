import { AccesInterditError } from "../errors.js";
import { Utilisateur } from "../models/Utilisateur.js";
import { RoleEnum } from "../enums/RoleEnum.js";
import { exigerObjet } from "./entrees.js";

export class UtilisateurController {
  constructor(utilisateurs, pharmacies) {
    this.utilisateurs = utilisateurs;
    this.pharmacies = pharmacies;
  }

  creer(corps) {
    const donnees = exigerObjet(corps);
    if (donnees.role === RoleEnum.ADMIN) {
      throw new AccesInterditError("Le rôle administrateur ne peut pas être attribué via cette route.");
    }
    const pharmacieId = donnees.pharmacieId ?? null;
    const utilisateur = new Utilisateur({
      id: this.utilisateurs.prochainId(),
      nom: donnees.nom,
      email: donnees.email,
      role: donnees.role,
      pharmacieId,
    });
    if (utilisateur.role === RoleEnum.PHARMACIEN) this.pharmacies.trouver(pharmacieId);
    return this.utilisateurs.ajouter(utilisateur);
  }
}
