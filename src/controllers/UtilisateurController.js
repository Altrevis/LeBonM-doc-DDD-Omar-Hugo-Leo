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
    const b = exigerObjet(corps);
    if (b.role === RoleEnum.ADMIN) {
      throw new AccesInterditError("Le rôle administrateur ne peut pas être attribué via cette route.");
    }
    const pharmacieId = b.pharmacieId ?? null;
    const utilisateur = new Utilisateur({
      id: this.utilisateurs.prochainId(),
      nom: b.nom,
      email: b.email,
      role: b.role,
      pharmacieId,
    });
    if (utilisateur.role === RoleEnum.PHARMACIEN) this.pharmacies.trouver(pharmacieId);
    return this.utilisateurs.ajouter(utilisateur);
  }
}
