import { EntiteIntrouvableError } from "../errors.js";

export class Repository {
  #elements = new Map();
  #compteur = 0;

  constructor(nomEntite, prefixeId) {
    this.nomEntite = nomEntite;
    this.prefixeId = prefixeId;
  }

  prochainId() {
    return `${this.prefixeId}${++this.#compteur}`;
  }

  ajouter(element) {
    this.#elements.set(element.id, element);
    return element;
  }

  trouver(id) {
    const element = this.#elements.get(id);
    if (!element) throw new EntiteIntrouvableError(`${this.nomEntite} introuvable : ${id}.`);
    return element;
  }

  lister() {
    return [...this.#elements.values()];
  }
}
