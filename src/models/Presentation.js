import { DemandeInvalideError } from "../errors.js";
import { UniteBase } from "../enums/UniteBase.js";

export class Presentation {
  constructor({
    id,
    medicamentId,
    forme = "",
    dosage = "",
    uniteBase,
    contenanceBoite = null,
    venteALunite,
    prix = null,
  }) {
    if (!id || !medicamentId) {
      throw new DemandeInvalideError("Une présentation doit avoir un identifiant et un médicament.");
    }
    if (typeof forme !== "string" || typeof dosage !== "string" || !Object.values(UniteBase).includes(uniteBase)) {
      throw new DemandeInvalideError("Forme, dosage et unité de base invalides.");
    }
    if (contenanceBoite !== null && (!Number.isInteger(contenanceBoite) || contenanceBoite <= 0)) {
      throw new DemandeInvalideError("La contenance de la boîte doit être un entier positif.");
    }
    if (typeof venteALunite !== "boolean") {
      throw new DemandeInvalideError("venteALunite doit être un booléen.");
    }
    if (prix !== null && (!Number.isInteger(prix) || prix < 0)) {
      throw new DemandeInvalideError("Le prix doit être un entier positif ou nul.");
    }
    Object.assign(this, { id, medicamentId, forme, dosage, uniteBase, contenanceBoite, venteALunite, prix });
    Object.freeze(this);
  }
}