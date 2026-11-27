import http from "node:http";
import { Repository } from "../repositories/Repository.js";
import { StockRepository } from "../repositories/StockRepository.js";
import { LigneReservationRepository } from "../repositories/LigneReservationRepository.js";
import { StockService } from "../services/StockService.js";
import { ReservationService } from "../services/ReservationService.js";
import { PharmacieController } from "../controllers/PharmacieController.js";
import { ReservationController } from "../controllers/ReservationController.js";
import { UtilisateurController } from "../controllers/UtilisateurController.js";
import { exigerObjet } from "../controllers/entrees.js";
import { chargerDonnees } from "../data/chargerDonnees.js";
import { jeuDeDonnees } from "../data/jeuDeDonnees.js";
import { DemandeInvalideError } from "../errors.js";
import { envoyer, reponseErreur, vueErreur, vueStock, vueUtilisateur } from "../views/json.js";

function creerEtat() {
  const pharmacies = new Repository("Pharmacie", "ph-");
  const medicaments = new Repository("Médicament", "med-");
  const presentations = new Repository("Présentation", "pre-");
  const utilisateurs = new Repository("Utilisateur", "usr-");
  const stocks = new StockRepository();
  const reservations = new Repository("Réservation", "res-");
  const lignesReservation = new LigneReservationRepository();
  const etat = {
    decalageMillisecondes: 0, pharmacies, medicaments, presentations, utilisateurs, stocks, reservations, lignesReservation,
  };
  etat.serviceStock = new StockService(stocks, presentations, medicaments, pharmacies, utilisateurs);
  // Horloge décalable (/admin/horloge) pour tester l'expiration depuis Postman.
  etat.serviceReservation = new ReservationService(
    reservations, lignesReservation, stocks, pharmacies, presentations, utilisateurs,
    () => new Date(Date.now() + etat.decalageMillisecondes));
  etat.controleurPharmacie = new PharmacieController(
    pharmacies, medicaments, presentations, etat.serviceStock, utilisateurs);
  etat.controleurReservation = new ReservationController(etat.serviceReservation);
  etat.controleurUtilisateur = new UtilisateurController(utilisateurs, pharmacies);
  return etat;
}

const ROUTES = [
  ["GET", /^\/sante$/, () => ({ statut: 200, corps: { statut: "ok" } })],

  //Pharmacies, médicaments, stocks, recherche
  ["POST", /^\/pharmacies$/, (contexte) => ({ statut: 201, corps: contexte.etat.controleurPharmacie.creerPharmacie(contexte.corps) })],
  ["POST", /^\/medicaments$/, (contexte) => ({ statut: 201, corps: contexte.etat.controleurPharmacie.creerMedicament(contexte.corps) })],
  ["POST", /^\/medicaments\/([^/]+)\/presentations$/, (contexte) => ({
    statut: 201, corps: contexte.etat.controleurPharmacie.creerPresentation(contexte.parametresChemin[0], contexte.corps) })],
  ["POST", /^\/utilisateurs$/, (contexte) => ({
    statut: 201, corps: vueUtilisateur(contexte.etat.controleurUtilisateur.creer(contexte.corps)) })],
  ["PUT", /^\/pharmacies\/([^/]+)\/stocks\/([^/]+)$/, (contexte) => ({
    statut: 200, corps: vueStock(contexte.etat.controleurPharmacie.definirStock(contexte.parametresChemin[0], contexte.parametresChemin[1], contexte.corps)) })],
  ["GET", /^\/disponibilites$/, (contexte) => ({ statut: 200, corps: contexte.etat.controleurPharmacie.rechercher(contexte.parametresRequete.get("nom")) })],

  //Réservations
  ["POST", /^\/reservations$/, (contexte) => ({ statut: 201, corps: contexte.etat.controleurReservation.demander(contexte.corps) })],
  ["GET", /^\/reservations\/([^/]+)$/, (contexte) => ({
    statut: 200, corps: contexte.etat.controleurReservation.consulter(contexte.parametresChemin[0], contexte.parametresRequete.get("clientId")) })],
  ["POST", /^\/reservations\/([^/]+)\/accepter$/, (contexte) => ({
    statut: 200, corps: contexte.etat.controleurReservation.accepter(contexte.parametresChemin[0], contexte.corps) })],
  ["POST", /^\/reservations\/([^/]+)\/refuser$/, (contexte) => ({
    statut: 200, corps: contexte.etat.controleurReservation.refuser(contexte.parametresChemin[0], contexte.corps) })],
  ["POST", /^\/reservations\/([^/]+)\/annuler$/, (contexte) => ({
    statut: 200, corps: contexte.etat.controleurReservation.annuler(contexte.parametresChemin[0], contexte.corps) })],
  ["POST", /^\/reservations\/([^/]+)\/retirer$/, (contexte) => ({
    statut: 200, corps: contexte.etat.controleurReservation.retirer(contexte.parametresChemin[0], contexte.corps) })],
  ["GET", /^\/pharmacies\/([^/]+)\/reservations$/, (contexte) => ({
    statut: 200, corps: contexte.etat.controleurReservation.listerParPharmacie(
      contexte.parametresChemin[0], contexte.parametresRequete.get("pharmacienId"), contexte.parametresRequete.get("statut")) })],

  //Outils de test (à retirer en production)
  ["POST", /^\/admin\/reset$/, (contexte) => { contexte.application.etat = creerEtat(); return { statut: 200, corps: { reinitialise: true } }; }],
  ["POST", /^\/admin\/seed$/, (contexte) => {
    contexte.application.etat = creerEtat();
    const etat = contexte.application.etat;
    const creees = chargerDonnees(etat, jeuDeDonnees);
    return { statut: 200, corps: {
      pharmacies: etat.pharmacies.lister().length,
      medicaments: etat.medicaments.lister().length,
      presentations: etat.presentations.lister().length,
      utilisateurs: etat.utilisateurs.lister().length,
      reservations: Object.keys(creees).length,
      lignesReservation: etat.lignesReservation.lister().length,
      idsReservations: Object.fromEntries(Object.entries(creees).map(([cle, reservation]) => [cle, reservation.id])),
    } };
  }],
  ["POST", /^\/admin\/horloge$/, (contexte) => {
    const heures = exigerObjet(contexte.corps).avancerHeures;
    if (typeof heures !== "number" || !Number.isFinite(heures)) throw new DemandeInvalideError("avancerHeures (nombre) attendu.");
    contexte.etat.decalageMillisecondes += heures * 3600 * 1000;
    return { statut: 200, corps: { maintenant: new Date(Date.now() + contexte.etat.decalageMillisecondes).toISOString() } };
  }],
  ["POST", /^\/admin\/expirer$/, (contexte) => ({ statut: 200, corps: { expirees: contexte.etat.controleurReservation.expirer().map((reservation) => reservation.id) } })],
];

const lireCorps = (requete) => new Promise((resoudre, rejeter) => {
  let donnees = "";
  requete.on("data", (morceau) => (donnees += morceau));
  requete.on("end", () => resoudre(donnees));
  requete.on("error", rejeter);
});

export function creerApplication() {
  const application = { etat: creerEtat() };

  return http.createServer(async (requete, reponse) => {
    try {
      const adresse = new URL(requete.url, "http://localhost");
      const brut = await lireCorps(requete);
      let corpsRequete = null;
      if (brut.trim()) {
        try { corpsRequete = JSON.parse(brut); } catch { throw new DemandeInvalideError("JSON invalide."); }
      }
      const chemin = adresse.pathname.replace(/\/+$/, "") || "/";
      const routesCandidates = ROUTES.filter(([, motif]) => motif.test(chemin));
      if (routesCandidates.length === 0) {
        return envoyer(reponse, 404, vueErreur("RouteIntrouvable", `Route inconnue : ${requete.method} ${chemin}`));
      }
      const route = routesCandidates.find(([methode]) => methode === requete.method);
      if (!route) {
        return envoyer(reponse, 405, vueErreur("MethodeNonAutorisee", `${requete.method} non autorisé sur ${chemin}`));
      }
      const parametresChemin = route[1].exec(chemin).slice(1).map(decodeURIComponent);
      const { statut, corps: corpsReponse } = route[2]({
        application,
        etat: application.etat,
        parametresChemin,
        parametresRequete: adresse.searchParams,
        corps: corpsRequete,
      });
      envoyer(reponse, statut, corpsReponse);
    } catch (erreur) {
      const reponseEchec = reponseErreur(erreur);
      if (reponseEchec) return envoyer(reponse, reponseEchec.statut, reponseEchec.corps);
      console.error(erreur);
      envoyer(reponse, 500, vueErreur("ErreurInterne", "Erreur interne."));
    }
  });
}
