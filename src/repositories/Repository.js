import { EntiteIntrouvableError } from "../errors.js";

export class Repository {
  #items = new Map();
  #seq = 0;

  constructor(nomEntite, prefixeId) {
    this.nomEntite = nomEntite;
    this.prefixeId = prefixeId;
  }

  prochainId() {
    return `${this.prefixeId}${++this.#seq}`;
  }

  ajouter(item) {
    this.#items.set(item.id, item);
    return item;
  }

  trouver(id) {
    const item = this.#items.get(id);
    if (!item) throw new EntiteIntrouvableError(`${this.nomEntite} introuvable : ${id}.`);
    return item;
  }

  lister() {
    return [...this.#items.values()];
  }
}
