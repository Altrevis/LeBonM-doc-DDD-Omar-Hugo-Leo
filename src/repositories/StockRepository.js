export class StockRepository {
  #items = new Map();

  #cle(pharmacieId, medicamentId) {
    return `${pharmacieId}::${medicamentId}`;
  }

  sauvegarder(stock) {
    this.#items.set(this.#cle(stock.pharmacieId, stock.medicamentId), stock);
    return stock;
  }

  // Retourne undefined si aucun stock n'est référencé pour ce couple.
  trouver(pharmacieId, medicamentId) {
    return this.#items.get(this.#cle(pharmacieId, medicamentId));
  }

  listerParMedicament(medicamentId) {
    return [...this.#items.values()].filter((s) => s.medicamentId === medicamentId);
  }

  listerParPharmacie(pharmacieId) {
    return [...this.#items.values()].filter((s) => s.pharmacieId === pharmacieId);
  }
}
