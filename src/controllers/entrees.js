import { DemandeInvalideError } from "../errors.js";

export function exigerObjet(corps) {
  if (corps === null || typeof corps !== "object" || Array.isArray(corps)) {
    throw new DemandeInvalideError("Corps JSON (objet) attendu.");
  }
  return corps;
}
