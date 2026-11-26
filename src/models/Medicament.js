import { DemandeInvalideError } from "../errors.js";

export class Medicament {
  constructor({ id, nom, description = null, ordonnanceRequise = false }) {
    if (!id || !nom || !String(nom).trim()) {
      throw new DemandeInvalideError("Un médicament doit avoir un identifiant et un nom.");
    }
    if (typeof ordonnanceRequise !== "boolean") {
      throw new DemandeInvalideError("ordonnanceRequise doit être un booléen.");
    }
    Object.assign(this, { id, nom: String(nom).trim(), description, ordonnanceRequise });
    Object.freeze(this);
  }
}
