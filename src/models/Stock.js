import { DemandeInvalideError, StockInsuffisantError } from "../errors.js";

function verifierQuantitePositive(q) {
  if (!Number.isInteger(q) || q <= 0) {
    throw new DemandeInvalideError(`Quantité invalide : ${q} (entier strictement positif attendu).`);
  }
}

export class Stock {
  constructor({ pharmacieId, presentationId, quantiteBase = 0, quantiteReserveeBase = 0 }) {
    if (!Number.isInteger(quantiteBase) || quantiteBase < 0 ||
        !Number.isInteger(quantiteReserveeBase) || quantiteReserveeBase < 0 ||
        quantiteReserveeBase > quantiteBase) {
      throw new DemandeInvalideError("Stock incohérent : 0 <= réservé <= total requis.");
    }
    Object.assign(this, { pharmacieId, presentationId, quantiteBase, quantiteReserveeBase });
  }

  get disponible() {
    return this.quantiteBase - this.quantiteReserveeBase;
  }

  reserver(quantite) {
    verifierQuantitePositive(quantite);
    if (quantite > this.disponible) {
      throw new StockInsuffisantError(
        `Stock insuffisant : ${quantite} demandé(s), ${this.disponible} disponible(s).`);
    }
    this.quantiteReserveeBase += quantite;
  }

  liberer(quantite) {
    verifierQuantitePositive(quantite);
    if (quantite > this.quantiteReserveeBase) {
      throw new DemandeInvalideError("Impossible de libérer plus que la quantité réservée.");
    }
    this.quantiteReserveeBase -= quantite;
  }

  retirer(quantite) {
    verifierQuantitePositive(quantite);
    if (quantite > this.quantiteReserveeBase) {
      throw new DemandeInvalideError("Impossible de retirer plus que la quantité réservée.");
    }
    this.quantiteReserveeBase -= quantite;
    this.quantiteBase -= quantite;
  }
}
