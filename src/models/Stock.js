import { DemandeInvalideError, StockInsuffisantError } from "../errors.js";

function verifierQuantitePositive(quantite) {
  if (!Number.isInteger(quantite) || quantite <= 0) {
    throw new DemandeInvalideError(`Quantité invalide : ${quantite} (entier strictement positif attendu).`);
  }
}

function verifierQuantiteBase(quantiteBase) {
  if (!Number.isInteger(quantiteBase) || quantiteBase < 0) {
    throw new DemandeInvalideError(`Quantité de base invalide : ${quantiteBase}.`);
  }
}

export class Stock {
  #quantiteBase;
  #quantiteReserveeBase;

  constructor({ pharmacieId, presentationId, quantiteBase = 0, quantiteReserveeBase = 0 }) {
    verifierQuantiteBase(quantiteBase);
    if (!Number.isInteger(quantiteReserveeBase) || quantiteReserveeBase < 0 ||
        quantiteReserveeBase > quantiteBase) {
      throw new DemandeInvalideError("Stock incohérent : 0 <= réservé <= total requis.");
    }
    this.#quantiteBase = quantiteBase;
    this.#quantiteReserveeBase = quantiteReserveeBase;
    Object.assign(this, { pharmacieId, presentationId });
    Object.freeze(this);
  }

  get quantiteBase() {
    return this.#quantiteBase;
  }

  get quantiteReserveeBase() {
    return this.#quantiteReserveeBase;
  }

  get disponible() {
    return this.#quantiteBase - this.#quantiteReserveeBase;
  }

  ajuster(nouvelleQuantiteBase) {
    verifierQuantiteBase(nouvelleQuantiteBase);
    if (nouvelleQuantiteBase < this.#quantiteReserveeBase) {
      throw new DemandeInvalideError(
        `Impossible de descendre à ${nouvelleQuantiteBase} : ${this.#quantiteReserveeBase} unité(s) déjà réservée(s).`);
    }
    this.#quantiteBase = nouvelleQuantiteBase;
  }

  reserver(quantite) {
    verifierQuantitePositive(quantite);
    if (quantite > this.disponible) {
      throw new StockInsuffisantError(
        `Stock insuffisant : ${quantite} demandé(s), ${this.disponible} disponible(s).`);
    }
    this.#quantiteReserveeBase += quantite;
  }

  liberer(quantite) {
    verifierQuantitePositive(quantite);
    if (quantite > this.#quantiteReserveeBase) {
      throw new DemandeInvalideError("Impossible de libérer plus que la quantité réservée.");
    }
    this.#quantiteReserveeBase -= quantite;
  }

  retirer(quantite) {
    verifierQuantitePositive(quantite);
    if (quantite > this.#quantiteReserveeBase) {
      throw new DemandeInvalideError("Impossible de retirer plus que la quantité réservée.");
    }
    this.#quantiteReserveeBase -= quantite;
    this.#quantiteBase -= quantite;
  }
}
