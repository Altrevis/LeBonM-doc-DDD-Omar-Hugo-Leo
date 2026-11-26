import { DemandeInvalideError } from "../errors.js";
import { RoleEnum } from "../enums/RoleEnum.js";

export class Utilisateur {
  constructor({ id, nom, email, role, pharmacieId = null }) {
    if (!id || !nom || !String(nom).trim() || !email || !String(email).trim()) {
      throw new DemandeInvalideError("Un utilisateur doit avoir un identifiant, un nom et un courriel.");
    }
    if (!Object.values(RoleEnum).includes(role)) {
      throw new DemandeInvalideError(`Rôle invalide : ${role}.`);
    }

    if (role === RoleEnum.PHARMACIEN && (typeof pharmacieId !== "string" || !pharmacieId.trim())) {
      throw new DemandeInvalideError("Un pharmacien doit être associé à une pharmacie.");
    }
    if (role !== RoleEnum.PHARMACIEN && pharmacieId !== null) {
      throw new DemandeInvalideError("Seul un pharmacien peut être associé à une pharmacie.");
    }

    Object.assign(this, {
      id,
      nom: String(nom).trim(),
      email: String(email).trim(),
      role,
      pharmacieId,
    });
  }
}