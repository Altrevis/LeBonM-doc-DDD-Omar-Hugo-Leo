import { AccesInterditError, DemandeInvalideError } from "../errors.js";
import { RoleEnum } from "../enums/RoleEnum.js";
import { Stock } from "../models/Stock.js";

const normaliser = (texte) =>
  String(texte).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export class StockService {
  constructor(stocks, presentations, medicaments, pharmacies, utilisateurs) {
    this.stocks = stocks;
    this.presentations = presentations;
    this.medicaments = medicaments;
    this.pharmacies = pharmacies;
    this.utilisateurs = utilisateurs;
  }

  definirStock(pharmacieId, presentationId, quantiteBase, pharmacienId) {
    const pharmacie = this.pharmacies.trouver(pharmacieId);
    if (!pharmacienId) throw new DemandeInvalideError("Pharmacien manquant.");
    const pharmacien = this.utilisateurs.trouver(pharmacienId);
    if (pharmacien.role !== RoleEnum.PHARMACIEN || pharmacien.pharmacieId !== pharmacieId) {
      throw new AccesInterditError("Seul un pharmacien affecté à cette pharmacie peut modifier son stock.");
    }
    const presentation = this.presentations.trouver(presentationId);
    this.medicaments.trouver(presentation.medicamentId);
    if (!pharmacie.partenaire) {
      throw new DemandeInvalideError(`La pharmacie ${pharmacie.nom} n'est pas partenaire.`);
    }
    if (!Number.isInteger(quantiteBase) || quantiteBase < 0) {
      throw new DemandeInvalideError(`Quantité de base invalide : ${quantiteBase}.`);
    }
    const existant = this.stocks.trouver(pharmacieId, presentationId);
    if (existant) {
      if (quantiteBase < existant.quantiteReserveeBase) {
        throw new DemandeInvalideError(
          `Impossible de descendre à ${quantiteBase} : ${existant.quantiteReserveeBase} unité(s) déjà réservée(s).`);
      }
      existant.quantiteBase = quantiteBase;
      return existant;
    }
    return this.stocks.sauvegarder(new Stock({ pharmacieId, presentationId, quantiteBase }));
  }

  rechercherDisponibilites(nomMedicament) {
    const terme = normaliser(nomMedicament ?? "");
    if (!terme) throw new DemandeInvalideError("Le nom du médicament à rechercher est vide.");

    const resultats = [];
    for (const presentation of this.presentations.lister()) {
      const medicament = this.medicaments.trouver(presentation.medicamentId);
      if (!normaliser(medicament.nom).includes(terme)) continue;
      for (const stock of this.stocks.listerParPresentation(presentation.id)) {
        const pharmacie = this.pharmacies.trouver(stock.pharmacieId);
        if (pharmacie.partenaire && stock.disponible > 0) {
          resultats.push({ pharmacie, medicament, presentation, disponible: stock.disponible });
        }
      }
    }
    return resultats;
  }
}
