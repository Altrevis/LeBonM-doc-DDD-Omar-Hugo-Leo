export class StockRepository {
  #items = new Map();

  #cle(pharmacieId, presentationId) {
    return `${pharmacieId}::${presentationId}`;
  }

  sauvegarder(stock) {
    this.#items.set(this.#cle(stock.pharmacieId, stock.presentationId), stock);
    return stock;
  }

  trouver(pharmacieId, presentationId) {
    return this.#items.get(this.#cle(pharmacieId, presentationId));
  }

  listerParPresentation(presentationId) {
    return [...this.#items.values()].filter((s) => s.presentationId === presentationId);
  }

  listerParPharmacie(pharmacieId) {
    return [...this.#items.values()].filter((s) => s.pharmacieId === pharmacieId);
  }
}
