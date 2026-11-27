import {
  AccesInterditError, DemandeInvalideError, OperationDejaEffectueeError,
  ReservationExpireeError, StockInsuffisantError,
} from "../errors.js";
import { RoleEnum } from "../enums/RoleEnum.js";
import { UniteDemandee } from "../enums/UniteDemandee.js";
import { Reservation } from "../models/Reservation.js";
import { StatutReservation } from "../models/StatutReservation.js";

export class ReservationService {
  static DELAI_RETRAIT_HEURES = 24;

  constructor(reservations, stocks, pharmacies, presentations, utilisateurs, horloge = () => new Date()) {
    this.reservations = reservations;
    this.stocks = stocks;
    this.pharmacies = pharmacies;
    this.presentations = presentations;
    this.utilisateurs = utilisateurs;
    this.horloge = horloge;
  }

  #echeance(depuis) {
    return new Date(depuis.getTime() + ReservationService.DELAI_RETRAIT_HEURES * 3600 * 1000);
  }

  #utilisateur(utilisateurId) {
    if (!utilisateurId) throw new DemandeInvalideError("Utilisateur manquant.");
    return this.utilisateurs.trouver(utilisateurId);
  }

  #exigerClient(clientId) {
    const client = this.#utilisateur(clientId);
    if (client.role !== RoleEnum.CLIENT) {
      throw new AccesInterditError("Cette opération est réservée aux clients.");
    }
    return client;
  }

  #pharmacieIdDe(reservation) {
    return this.utilisateurs.trouver(reservation.pharmacienId).pharmacieId;
  }

  #stockDe(reservation, ligne) {
    return this.stocks.trouver(this.#pharmacieIdDe(reservation), ligne.presentationId);
  }

  #stocksDesLignes(reservation) {
    return reservation.lignes.map((ligne) => ({
      ligne,
      stock: this.#stockDe(reservation, ligne),
    }));
  }

  #exigerPharmacienPour(pharmacienId, reservation) {
    const pharmacien = this.#utilisateur(pharmacienId);
    if (pharmacien.role !== RoleEnum.PHARMACIEN ||
        pharmacien.id !== reservation.pharmacienId ||
        pharmacien.pharmacieId !== this.#pharmacieIdDe(reservation)) {
      throw new AccesInterditError("Seul le pharmacien affecté à cette réservation peut agir.");
    }
    return pharmacien;
  }

  #quantiteBase(presentation, quantite, unite) {
    if (!Number.isInteger(quantite) || quantite <= 0) {
      throw new DemandeInvalideError(`Quantité invalide : ${quantite}.`);
    }
    if (unite === UniteDemandee.UNITE) {
      if (!presentation.venteALunite) {
        throw new DemandeInvalideError("Cette présentation ne peut pas être vendue à l'unité.");
      }
      return quantite;
    }
    if (unite === UniteDemandee.BOITE) {
      if (presentation.contenanceBoite === null) {
        throw new DemandeInvalideError("La contenance de la boîte est requise pour convertir la quantité.");
      }
      const quantiteBase = quantite * presentation.contenanceBoite;
      if (!Number.isSafeInteger(quantiteBase)) {
        throw new DemandeInvalideError("La quantité demandée est trop élevée.");
      }
      return quantiteBase;
    }
    throw new DemandeInvalideError(`Unité demandée invalide : ${unite}.`);
  }

  #pharmacienDe(pharmacieId) {
    const pharmacien = this.utilisateurs.lister().find((utilisateur) =>
      utilisateur.role === RoleEnum.PHARMACIEN && utilisateur.pharmacieId === pharmacieId);
    if (!pharmacien) {
      throw new DemandeInvalideError(`Aucun pharmacien n'est affecté à la pharmacie ${pharmacieId}.`);
    }
    return pharmacien;
  }

  #exigerAucunDoublonActif(nouvelle) {
    const doublon = this.reservations.lister().some((reservation) =>
      reservation.estActive &&
      reservation.clientId === nouvelle.clientId &&
      reservation.pharmacienId === nouvelle.pharmacienId &&
      nouvelle.lignes.some((ligne) => reservation.contientPresentation(ligne.presentationId)));
    if (doublon) {
      throw new OperationDejaEffectueeError("Une réservation active existe déjà pour une présentation demandée.");
    }
  }

  #exigerNonExpiree(reservation, maintenant) {
    if (reservation.estExpiree(maintenant)) {
      this.#expirer(reservation, maintenant);
      throw new ReservationExpireeError(`La réservation ${reservation.id} a expiré.`);
    }
  }

  #expirer(reservation, maintenant) {
    const etaitAcceptee = reservation.statut === StatutReservation.ACCEPTEE;
    reservation.expirer(maintenant);
    if (etaitAcceptee) {
      for (const { ligne, stock } of this.#stocksDesLignes(reservation)) {
        if (!stock) throw new StockInsuffisantError("Stock de présentation introuvable.");
        stock.liberer(ligne.quantiteBase);
      }
    }
  }

  demander(clientId, pharmacieId, lignesDemandees) {
    const client = this.#exigerClient(clientId);
    if (!Array.isArray(lignesDemandees)) {
      throw new DemandeInvalideError("Les lignes de la réservation doivent être fournies sous forme de liste.");
    }
    const pharmacie = this.pharmacies.trouver(pharmacieId);
    if (!pharmacie.partenaire) {
      throw new DemandeInvalideError(`La pharmacie ${pharmacie.nom} n'est pas partenaire.`);
    }
    const pharmacien = this.#pharmacienDe(pharmacieId);

    const lignes = lignesDemandees.map((demande) => {
      if (!demande || typeof demande !== "object" || Array.isArray(demande)) {
        throw new DemandeInvalideError("Chaque ligne doit être un objet.");
      }
      const presentation = this.presentations.trouver(demande.presentationId);
      const quantiteBase = this.#quantiteBase(presentation, demande.quantite, demande.unite);
      const stock = this.stocks.trouver(pharmacieId, presentation.id);
      const disponible = stock ? stock.disponible : 0;
      if (quantiteBase > disponible) {
        throw new StockInsuffisantError(
          `Stock insuffisant : ${quantiteBase} ${presentation.uniteBase} demandé(s), ${disponible} disponible(s).`);
      }
      return {
        presentationId: presentation.id,
        quantite: demande.quantite,
        unite: demande.unite,
        quantiteBase,
      };
    });

    const maintenant = this.horloge();
    const reservation = new Reservation({
      id: this.reservations.prochainId(),
      clientId: client.id,
      pharmacienId: pharmacien.id,
      creeLe: maintenant,
      expireLe: this.#echeance(maintenant),
      lignes,
    });
    this.#exigerAucunDoublonActif(reservation);
    return this.reservations.ajouter(reservation);
  }

  accepter(reservationId, pharmacienId) {
    const reservation = this.reservations.trouver(reservationId);
    this.#exigerPharmacienPour(pharmacienId, reservation);
    const maintenant = this.horloge();
    reservation.verifierTransitionDeStatut(StatutReservation.ACCEPTEE);
    this.#exigerNonExpiree(reservation, maintenant);
    const lignesAvecStocks = this.#stocksDesLignes(reservation);
    for (const { ligne, stock } of lignesAvecStocks) {
      if (!stock || ligne.quantiteBase > stock.disponible) {
        throw new StockInsuffisantError("Stock insuffisant pour une présentation de la réservation.");
      }
    }
    for (const { ligne, stock } of lignesAvecStocks) stock.reserver(ligne.quantiteBase);
    reservation.accepter(maintenant, this.#echeance(maintenant));
    return reservation;
  }

  refuser(reservationId, pharmacienId, motifRefus = "") {
    const reservation = this.reservations.trouver(reservationId);
    this.#exigerPharmacienPour(pharmacienId, reservation);
    const maintenant = this.horloge();
    reservation.verifierTransitionDeStatut(StatutReservation.REFUSEE);
    this.#exigerNonExpiree(reservation, maintenant);
    reservation.refuser(maintenant, motifRefus);
    return reservation;
  }

  annuler(reservationId, clientId) {
    const reservation = this.reservations.trouver(reservationId);
    const client = this.#exigerClient(clientId);
    if (reservation.clientId !== client.id) {
      throw new AccesInterditError("Un client ne peut annuler que ses propres réservations.");
    }
    const maintenant = this.horloge();
    reservation.verifierTransitionDeStatut(StatutReservation.ANNULEE);
    this.#exigerNonExpiree(reservation, maintenant);
    const etaitAcceptee = reservation.statut === StatutReservation.ACCEPTEE;
    reservation.annuler(maintenant);
    if (etaitAcceptee) {
      for (const { ligne, stock } of this.#stocksDesLignes(reservation)) {
        if (!stock) throw new StockInsuffisantError("Stock de présentation introuvable.");
        stock.liberer(ligne.quantiteBase);
      }
    }
    return reservation;
  }

  marquerRetiree(reservationId, pharmacienId) {
    const reservation = this.reservations.trouver(reservationId);
    this.#exigerPharmacienPour(pharmacienId, reservation);
    const maintenant = this.horloge();
    reservation.verifierTransitionDeStatut(StatutReservation.RETIREE);
    this.#exigerNonExpiree(reservation, maintenant);
    const lignesAvecStocks = this.#stocksDesLignes(reservation);
    for (const { ligne, stock } of lignesAvecStocks) {
      if (!stock || ligne.quantiteBase > stock.quantiteReserveeBase) {
        throw new StockInsuffisantError("Quantité réservée introuvable pour une présentation.");
      }
    }
    for (const { ligne, stock } of lignesAvecStocks) stock.retirer(ligne.quantiteBase);
    reservation.marquerRetiree(maintenant);
    return reservation;
  }

  expirerLesReservations() {
    const maintenant = this.horloge();
    const expirees = [];
    for (const reservation of this.reservations.lister()) {
      if (reservation.estExpiree(maintenant)) {
        this.#expirer(reservation, maintenant);
        expirees.push(reservation);
      }
    }
    return expirees;
  }

  consulter(reservationId, utilisateurId) {
    const reservation = this.reservations.trouver(reservationId);
    const utilisateur = this.#utilisateur(utilisateurId);
    const estProprietaire = utilisateur.role === RoleEnum.CLIENT &&
      reservation.clientId === utilisateur.id;
    const estPharmacienAffecte = utilisateur.role === RoleEnum.PHARMACIEN &&
      reservation.pharmacienId === utilisateur.id;
    if (!estProprietaire && !estPharmacienAffecte) {
      throw new AccesInterditError("Vous ne pouvez pas consulter cette réservation.");
    }
    return reservation;
  }

  listerPourPharmacie(pharmacieId, pharmacienId, statut = null) {
    this.pharmacies.trouver(pharmacieId);
    const pharmacien = this.#utilisateur(pharmacienId);
    if (pharmacien.role !== RoleEnum.PHARMACIEN || pharmacien.pharmacieId !== pharmacieId) {
      throw new AccesInterditError("Ce pharmacien n'est pas affecté à cette pharmacie.");
    }
    return this.reservations.lister().filter((reservation) =>
      this.#pharmacieIdDe(reservation) === pharmacieId &&
      (statut === null || reservation.statut === statut));
  }
}
