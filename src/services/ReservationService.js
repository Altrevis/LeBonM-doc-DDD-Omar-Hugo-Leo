import {
  DemandeInvalideError, OperationDejaEffectueeError,
  ReservationExpireeError, StockInsuffisantError,
} from "../errors.js";
import { Reservation } from "../models/Reservation.js";
import { StatutReservation as S } from "../models/StatutReservation.js";

export class ReservationService {
  static DELAI_RETRAIT_HEURES = 24;

  constructor(reservations, stocks, pharmacies, horloge = () => new Date()) {
    this.reservations = reservations;
    this.stocks = stocks;
    this.pharmacies = pharmacies;
    this.horloge = horloge;
  }

  #echeance(depuis) {
    return new Date(depuis.getTime() + ReservationService.DELAI_RETRAIT_HEURES * 3600 * 1000);
  }

  #stockDe(reservation) {
    return this.stocks.trouver(reservation.pharmacieId, reservation.medicamentId);
  }

  #exigerNonExpiree(reservation, maintenant) {
    if (reservation.estExpiree(maintenant)) {
      this.#expirer(reservation, maintenant);
      throw new ReservationExpireeError(`La réservation ${reservation.id} a expiré.`);
    }
  }

  #expirer(reservation, maintenant) {
    const etaitAcceptee = reservation.statut === S.ACCEPTEE;
    reservation.changerStatut(S.EXPIREE, maintenant);
    if (etaitAcceptee) this.#stockDe(reservation).liberer(reservation.quantite);
  }

  demander(utilisateurId, pharmacieId, medicamentId, quantite) {
    if (!utilisateurId) throw new DemandeInvalideError("Utilisateur manquant.");
    if (!Number.isInteger(quantite) || quantite <= 0) {
      throw new DemandeInvalideError(`Quantité invalide : ${quantite}.`);
    }
    const pharmacie = this.pharmacies.trouver(pharmacieId);
    if (!pharmacie.partenaire) {
      throw new DemandeInvalideError(`La pharmacie ${pharmacie.nom} n'est pas partenaire.`);
    }

    const doublon = this.reservations.lister().find((r) =>
      r.estActive && r.utilisateurId === utilisateurId &&
      r.pharmacieId === pharmacieId && r.medicamentId === medicamentId);
    if (doublon) {
      throw new OperationDejaEffectueeError(
        `Une réservation active existe déjà pour ce médicament dans cette pharmacie (${doublon.id}).`);
    }

    const stock = this.stocks.trouver(pharmacieId, medicamentId);
    const disponible = stock ? stock.quantiteDisponible : 0;
    if (quantite > disponible) {
      throw new StockInsuffisantError(
        `Stock insuffisant : ${quantite} demandé(s), ${disponible} disponible(s).`);
    }

    const maintenant = this.horloge();
    return this.reservations.ajouter(new Reservation({
      id: this.reservations.prochainId(),
      utilisateurId, pharmacieId, medicamentId, quantite,
      creeLe: maintenant,
      expireLe: this.#echeance(maintenant),
    }));
  }

  accepter(reservationId) {
    const r = this.reservations.trouver(reservationId);
    const maintenant = this.horloge();
    r.verifierTransitionDeStatut(S.ACCEPTEE);
    this.#exigerNonExpiree(r, maintenant);
    const stock = this.#stockDe(r);
    if (!stock) throw new StockInsuffisantError("Stock insuffisant : médicament plus référencé.");
    stock.reserver(r.quantite);
    r.changerStatut(S.ACCEPTEE, maintenant);
    r.expireLe = this.#echeance(maintenant);
    return r;
  }

  refuser(reservationId, motif = "") {
    const r = this.reservations.trouver(reservationId);
    const maintenant = this.horloge();
    r.verifierTransitionDeStatut(S.REFUSEE);
    this.#exigerNonExpiree(r, maintenant);
    r.changerStatut(S.REFUSEE, maintenant);
    r.motif = motif;
    return r;
  }

  annuler(reservationId) {
    const r = this.reservations.trouver(reservationId);
    const maintenant = this.horloge();
    r.verifierTransitionDeStatut(S.ANNULEE);
    this.#exigerNonExpiree(r, maintenant);
    const etaitAcceptee = r.statut === S.ACCEPTEE;
    r.changerStatut(S.ANNULEE, maintenant);
    if (etaitAcceptee) this.#stockDe(r).liberer(r.quantite);
    return r;
  }

  marquerRetiree(reservationId) {
    const r = this.reservations.trouver(reservationId);
    const maintenant = this.horloge();
    r.verifierTransitionDeStatut(S.RETIREE);
    this.#exigerNonExpiree(r, maintenant);
    this.#stockDe(r).retirer(r.quantite);
    r.changerStatut(S.RETIREE, maintenant);
    return r;
  }

  expirerLesReservations() {
    const maintenant = this.horloge();
    const expirees = [];
    for (const r of this.reservations.lister()) {
      if (r.estExpiree(maintenant)) {
        this.#expirer(r, maintenant);
        expirees.push(r);
      }
    }
    return expirees;
  }

  consulter(reservationId) {
    return this.reservations.trouver(reservationId);
  }

  listerPourPharmacie(pharmacieId, statut = null) {
    this.pharmacies.trouver(pharmacieId);
    return this.reservations.lister()
      .filter((r) => r.pharmacieId === pharmacieId && (statut === null || r.statut === statut));
  }

}
