import { DemandeInvalideError } from "../errors.js";

export class Medicament {
  constructor({ id, nom, dosage = "", forme = "", surOrdonnance = false }) {
    if (!id || !nom || !String(nom).trim()) {
      throw new DemandeInvalideError("Un médicament doit avoir un identifiant et un nom.");
    }
    Object.assign(this, { id, nom: String(nom).trim(), dosage, forme, surOrdonnance });
    Object.freeze(this);
  }
}
