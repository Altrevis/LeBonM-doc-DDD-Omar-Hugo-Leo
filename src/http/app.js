import http from "node:http";
import { Repository } from "../repositories/Repository.js";
import { StockRepository } from "../repositories/StockRepository.js";
import { StockService } from "../services/StockService.js";
import { ReservationService } from "../services/ReservationService.js";
import { PharmacieController } from "../controllers/PharmacieController.js";
import { ReservationController } from "../controllers/ReservationController.js";
import { exigerObjet } from "../controllers/entrees.js";
import { chargerDonnees } from "../data/chargerDonnees.js";
import { jeuDeDonnees } from "../data/jeuDeDonnees.js";
import { DemandeInvalideError } from "../errors.js";
import { envoyer, reponseErreur, vueErreur, vueStock } from "../views/json.js";

function creerEtat() {
  const pharmacies = new Repository("Pharmacie", "ph-");
  const medicaments = new Repository("Médicament", "med-");
  const stocks = new StockRepository();
  const reservations = new Repository("Réservation", "res-");
  const etat = { decalageMs: 0, pharmacies, medicaments, stocks, reservations };
  etat.stockService = new StockService(stocks, medicaments, pharmacies);
  // Horloge décalable (/admin/horloge) pour tester l'expiration depuis Postman.
  etat.reservationService = new ReservationService(reservations, stocks, pharmacies,
    () => new Date(Date.now() + etat.decalageMs));
  etat.pharmacieCtrl = new PharmacieController(pharmacies, medicaments, etat.stockService);
  etat.reservationCtrl = new ReservationController(etat.reservationService);
  return etat;
}

const ROUTES = [
  ["GET", /^\/sante$/, () => ({ status: 200, body: { statut: "ok" } })],

  //Pharmacies, médicaments, stocks, recherche
  ["POST", /^\/pharmacies$/, (c) => ({ status: 201, body: c.e.pharmacieCtrl.creerPharmacie(c.body) })],
  ["POST", /^\/medicaments$/, (c) => ({ status: 201, body: c.e.pharmacieCtrl.creerMedicament(c.body) })],
  ["PUT", /^\/pharmacies\/([^/]+)\/stocks\/([^/]+)$/, (c) => ({
    status: 200, body: vueStock(c.e.pharmacieCtrl.definirStock(c.p[0], c.p[1], c.body)) })],
  ["GET", /^\/disponibilites$/, (c) => ({ status: 200, body: c.e.pharmacieCtrl.rechercher(c.query.get("nom")) })],

  //Réservations
  ["POST", /^\/reservations$/, (c) => ({ status: 201, body: c.e.reservationCtrl.demander(c.body) })],
  ["GET", /^\/reservations\/([^/]+)$/, (c) => ({ status: 200, body: c.e.reservationCtrl.consulter(c.p[0]) })],
  ["POST", /^\/reservations\/([^/]+)\/accepter$/, (c) => ({ status: 200, body: c.e.reservationCtrl.accepter(c.p[0]) })],
  ["POST", /^\/reservations\/([^/]+)\/refuser$/, (c) => ({ status: 200, body: c.e.reservationCtrl.refuser(c.p[0], c.body) })],
  ["POST", /^\/reservations\/([^/]+)\/annuler$/, (c) => ({ status: 200, body: c.e.reservationCtrl.annuler(c.p[0]) })],
  ["POST", /^\/reservations\/([^/]+)\/retirer$/, (c) => ({ status: 200, body: c.e.reservationCtrl.retirer(c.p[0]) })],
  ["GET", /^\/pharmacies\/([^/]+)\/reservations$/, (c) => ({
    status: 200, body: c.e.reservationCtrl.listerParPharmacie(c.p[0], c.query.get("statut")) })],

  //Outils de test (à retirer en production)
  ["POST", /^\/admin\/reset$/, (c) => { c.app.etat = creerEtat(); return { status: 200, body: { reinitialise: true } }; }],
  ["POST", /^\/admin\/seed$/, (c) => {
    c.app.etat = creerEtat();
    const e = c.app.etat;
    const creees = chargerDonnees(e, jeuDeDonnees);
    return { status: 200, body: {
      pharmacies: e.pharmacies.lister().length,
      medicaments: e.medicaments.lister().length,
      reservations: Object.keys(creees).length,
      idsReservations: Object.fromEntries(Object.entries(creees).map(([k, r]) => [k, r.id])),
    } };
  }],
  ["POST", /^\/admin\/horloge$/, (c) => {
    const h = exigerObjet(c.body).avancerHeures;
    if (typeof h !== "number" || !Number.isFinite(h)) throw new DemandeInvalideError("avancerHeures (nombre) attendu.");
    c.e.decalageMs += h * 3600 * 1000;
    return { status: 200, body: { maintenant: new Date(Date.now() + c.e.decalageMs).toISOString() } };
  }],
  ["POST", /^\/admin\/expirer$/, (c) => ({ status: 200, body: { expirees: c.e.reservationCtrl.expirer().map((r) => r.id) } })],
];

const lireCorps = (req) => new Promise((resolve, reject) => {
  let data = "";
  req.on("data", (chunk) => (data += chunk));
  req.on("end", () => resolve(data));
  req.on("error", reject);
});

export function creerApp() {
  const app = { etat: creerEtat() };

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const brut = await lireCorps(req);
      let body = null;
      if (brut.trim()) {
        try { body = JSON.parse(brut); } catch { throw new DemandeInvalideError("JSON invalide."); }
      }
      const chemin = url.pathname.replace(/\/+$/, "") || "/";
      const candidates = ROUTES.filter(([, re]) => re.test(chemin));
      if (candidates.length === 0) {
        return envoyer(res, 404, vueErreur("RouteIntrouvable", `Route inconnue : ${req.method} ${chemin}`));
      }
      const route = candidates.find(([m]) => m === req.method);
      if (!route) {
        return envoyer(res, 405, vueErreur("MethodeNonAutorisee", `${req.method} non autorisé sur ${chemin}`));
      }
      const p = route[1].exec(chemin).slice(1).map(decodeURIComponent);
      const { status, body: reponse } = route[2]({ app, e: app.etat, p, query: url.searchParams, body });
      envoyer(res, status, reponse);
    } catch (e) {
      const r = reponseErreur(e);
      if (r) return envoyer(res, r.status, r.body);
      console.error(e);
      envoyer(res, 500, vueErreur("ErreurInterne", "Erreur interne."));
    }
  });
}
