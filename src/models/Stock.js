import { DemandeInvalideError, StockInsuffisantError } from "../errors.js";

function verifierQuantitePositive(q) {
  if (!Number.isInteger(q) || q <= 0) {
    throw new DemandeInvalideError(`Quantité invalide : ${q} (entier strictement positif attendu).`);
  }
}

export class Stock {
  constructor({ pharmacieId, medicamentId, quantiteTotale = 0, quantiteReservee = 0 }) {
    if (!Number.isInteger(quantiteTotale) || quantiteTotale < 0 ||
        !Number.isInteger(quantiteReservee) || quantiteReservee < 0 ||
        quantiteReservee > quantiteTotale) {
      throw new DemandeInvalideError("Stock incohérent : 0 <= réservé <= total requis.");
    }
    Object.assign(this, { pharmacieId, medicamentId, quantiteTotale, quantiteReservee });
  }

  get quantiteDisponible() {
    return this.quantiteTotale - this.quantiteReservee;
  }

  reserver(quantite) {
    verifierQuantitePositive(quantite);
    if (quantite > this.quantiteDisponible) {
      throw new StockInsuffisantError(
        `Stock insuffisant : ${quantite} demandé(s), ${this.quantiteDisponible} disponible(s).`);
    }
    this.quantiteReservee += quantite;
  }

  liberer(quantite) {
    verifierQuantitePositive(quantite);
    if (quantite > this.quantiteReservee) {
      throw new DemandeInvalideError("Impossible de libérer plus que la quantité réservée.");
    }
    this.quantiteReservee -= quantite;
  }

  retirer(quantite) {
    verifierQuantitePositive(quantite);
    if (quantite > this.quantiteReservee) {
      throw new DemandeInvalideError("Impossible de retirer plus que la quantité réservée.");
    }
    this.quantiteReservee -= quantite;
    this.quantiteTotale -= quantite;
  }
}
