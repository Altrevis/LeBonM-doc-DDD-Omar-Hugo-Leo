export class StockRepository {
  #elements = new Map();

  #cle(pharmacieId, presentationId) {
    return `${pharmacieId}::${presentationId}`;
  }

  sauvegarder(stock) {
    this.#elements.set(this.#cle(stock.pharmacieId, stock.presentationId), stock);
    return stock;
  }

  trouver(pharmacieId, presentationId) {
    return this.#elements.get(this.#cle(pharmacieId, presentationId));
  }

  listerParPresentation(presentationId) {
    return [...this.#elements.values()].filter((stock) => stock.presentationId === presentationId);
  }

  listerParPharmacie(pharmacieId) {
    return [...this.#elements.values()].filter((stock) => stock.pharmacieId === pharmacieId);
  }
}
