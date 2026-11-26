import { DemandeInvalideError } from "../errors.js";
import { RoleEnum } from "../enums/RoleEnum.js";

export class Utilisateur {
  constructor({ id, nom, prenom, email, motDePasse, role, pharmacie_id = null }) {
    if (!Object.values(RoleEnum).includes(role)) {
      throw new DemandeInvalideError(`Rôle invalide : ${role}.`);
    }

    if (role === RoleEnum.PHARMACIEN && (typeof pharmacie_id !== "string" || !pharmacie_id.trim())) {
      throw new DemandeInvalideError("Un pharmacien doit être associé à une pharmacie.");
    }
    if (role === RoleEnum.CLIENT && pharmacie_id !== null) {
      throw new DemandeInvalideError("Un client ne peut pas être associé à une pharmacie.");
    }

    Object.assign(this, { id, nom, prenom, email, motDePasse, role, pharmacie_id });
  }
}