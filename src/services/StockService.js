import { DemandeInvalideError } from "../errors.js";
import { Stock } from "../models/Stock.js";

const normaliser = (s) =>
  String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export class StockService {
  constructor(stocks, medicaments, pharmacies) {
    this.stocks = stocks;
    this.medicaments = medicaments;
    this.pharmacies = pharmacies;
  }

  definirStock(pharmacieId, medicamentId, quantite) {
    const pharmacie = this.pharmacies.trouver(pharmacieId);
    this.medicaments.trouver(medicamentId);
    if (!pharmacie.partenaire) {
      throw new DemandeInvalideError(`La pharmacie ${pharmacie.nom} n'est pas partenaire.`);
    }
    if (!Number.isInteger(quantite) || quantite < 0) {
      throw new DemandeInvalideError(`Quantité invalide : ${quantite}.`);
    }
    const existant = this.stocks.trouver(pharmacieId, medicamentId);
    if (existant) {
      if (quantite < existant.quantiteReservee) {
        throw new DemandeInvalideError(
          `Impossible de descendre à ${quantite} : ${existant.quantiteReservee} unité(s) déjà réservée(s).`);
      }
      existant.quantiteTotale = quantite;
      return existant;
    }
    return this.stocks.sauvegarder(new Stock({ pharmacieId, medicamentId, quantiteTotale: quantite }));
  }

  rechercherDisponibilites(nomMedicament) {
    const terme = normaliser(nomMedicament ?? "");
    if (!terme) throw new DemandeInvalideError("Le nom du médicament à rechercher est vide.");

    const resultats = [];
    for (const medicament of this.medicaments.lister()) {
      if (!normaliser(medicament.nom).includes(terme)) continue;
      for (const stock of this.stocks.listerParMedicament(medicament.id)) {
        const pharmacie = this.pharmacies.trouver(stock.pharmacieId);
        if (pharmacie.partenaire && stock.quantiteDisponible > 0) {
          resultats.push({ pharmacie, medicament, quantiteDisponible: stock.quantiteDisponible });
        }
      }
    }
    return resultats;
  }
}
