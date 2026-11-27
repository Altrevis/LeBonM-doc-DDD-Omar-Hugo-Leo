import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { creerApplication } from "../src/http/app.js";

const serveurs = [];

async function demarrerApplication() {
  const serveur = creerApplication();
  await new Promise((resoudre, rejeter) => {
    serveur.once("error", rejeter);
    serveur.listen(0, "127.0.0.1", resoudre);
  });
  serveurs.push(serveur);
  return `http://127.0.0.1:${serveur.address().port}`;
}

async function requete(adresseDeBase, route, { methode = "GET", corps } = {}) {
  const reponse = await fetch(`${adresseDeBase}${route}`, {
    method: methode,
    headers: corps === undefined ? {} : { "content-type": "application/json" },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  return { statut: reponse.status, corps: await reponse.json() };
}

afterEach(() => {
  for (const serveur of serveurs.splice(0)) {
    serveur.close();
    if (typeof serveur.closeAllConnections === "function") serveur.closeAllConnections();
  }
});

test("seed loads users and presentations and preserves pharmacy stock links", async () => {
  const adresseDeBase = await demarrerApplication();
  const chargement = await requete(adresseDeBase, "/admin/seed", { methode: "POST" });

  assert.equal(chargement.statut, 200);
  assert.deepEqual(
    {
      pharmacies: chargement.corps.pharmacies,
      medicaments: chargement.corps.medicaments,
      presentations: chargement.corps.presentations,
      utilisateurs: chargement.corps.utilisateurs,
      reservations: chargement.corps.reservations,
      lignesReservation: chargement.corps.lignesReservation,
    },
    {
      pharmacies: 6, medicaments: 12, presentations: 13,
      utilisateurs: 15, reservations: 10, lignesReservation: 10,
    },
  );

  const disponibilites = await requete(adresseDeBase, "/disponibilites?nom=doliprane");
  assert.equal(disponibilites.statut, 200);
  assert.equal(disponibilites.corps.length, 3);
  assert.ok(disponibilites.corps.every((disponibilite) => disponibilite.presentation && disponibilite.medicament));
});

test("users can be created and pharmacists must reference a real pharmacy", async () => {
  const adresseDeBase = await demarrerApplication();
  await requete(adresseDeBase, "/admin/seed", { methode: "POST" });

  const pharmacien = await requete(adresseDeBase, "/utilisateurs", {
    methode: "POST",
    corps: {
      nom: "Pharmacien",
      email: "nouveau@example.test",
      role: "pharmacien",
      pharmacieId: "ph-centre",
    },
  });
  assert.equal(pharmacien.statut, 201);
  assert.equal(pharmacien.corps.pharmacieId, "ph-centre");
  assert.equal("motDePasse" in pharmacien.corps, false);

  const pharmacieInconnue = await requete(adresseDeBase, "/utilisateurs", {
    methode: "POST",
    corps: {
      nom: "Pharmacien",
      email: "invalide@example.test",
      role: "pharmacien",
      pharmacieId: "ph-inconnue",
    },
  });
  assert.equal(pharmacieInconnue.statut, 404);

  const attributionRoleAdministrateur = await requete(adresseDeBase, "/utilisateurs", {
    methode: "POST",
    corps: {
      nom: "Admin",
      email: "admin2@example.test",
      role: "admin",
    },
  });
  assert.equal(attributionRoleAdministrateur.statut, 403);
});

test("only an administrator can create pharmacies", async () => {
  const adresseDeBase = await demarrerApplication();
  await requete(adresseDeBase, "/admin/seed", { methode: "POST" });

  const administrateurManquant = await requete(adresseDeBase, "/pharmacies", {
    methode: "POST",
    corps: { nom: "Nouvelle pharmacie", adresse: "1 rue du Test" },
  });
  assert.equal(administrateurManquant.statut, 400);

  const demandeClient = await requete(adresseDeBase, "/pharmacies", {
    methode: "POST",
    corps: { adminId: "usr-alice", nom: "Nouvelle pharmacie", adresse: "1 rue du Test" },
  });
  assert.equal(demandeClient.statut, 403);

  const demandeAdministrateur = await requete(adresseDeBase, "/pharmacies", {
    methode: "POST",
    corps: { adminId: "usr-admin", nom: "Nouvelle pharmacie", adresse: "1 rue du Test" },
  });
  assert.equal(demandeAdministrateur.statut, 201);
  assert.equal(demandeAdministrateur.corps.nom, "Nouvelle pharmacie");
});

test("stock and reservations use a presentation and enforce user roles", async () => {
  const adresseDeBase = await demarrerApplication();
  await requete(adresseDeBase, "/admin/seed", { methode: "POST" });

  const mauvaisPharmacien = await requete(adresseDeBase, "/reservations/res-1/accepter", {
    methode: "POST",
    corps: { pharmacienId: "usr-ph-gare" },
  });
  assert.equal(mauvaisPharmacien.statut, 403);

  const acceptee = await requete(adresseDeBase, "/reservations/res-1/accepter", {
    methode: "POST",
    corps: { pharmacienId: "usr-ph-centre" },
  });
  assert.equal(acceptee.statut, 200);
  assert.equal(acceptee.corps.lignes[0].presentationId, "pre-doliprane500");
  assert.equal("pharmacieId" in acceptee.corps, false);

  const listeMauvaisePharmacie = await requete(
    adresseDeBase,
    "/pharmacies/ph-centre/reservations?pharmacienId=usr-ph-gare",
  );
  assert.equal(listeMauvaisePharmacie.statut, 403);

  const listePharmacie = await requete(
    adresseDeBase,
    "/pharmacies/ph-centre/reservations?pharmacienId=usr-ph-centre",
  );
  assert.equal(listePharmacie.statut, 200);
  assert.ok(listePharmacie.corps.some((reservation) => reservation.id === "res-1"));

  const reservationParPharmacien = await requete(adresseDeBase, "/reservations", {
    methode: "POST",
    corps: {
      clientId: "usr-ph-centre",
      pharmacieId: "ph-centre",
      lignes: [{ presentationId: "pre-spasfon", quantite: 1, unite: "unite" }],
    },
  });
  assert.equal(reservationParPharmacien.statut, 403);

  const reservationClient = await requete(adresseDeBase, "/reservations", {
    methode: "POST",
    corps: {
      clientId: "usr-zoe",
      pharmacieId: "ph-centre",
      lignes: [{ presentationId: "pre-spasfon", quantite: 1, unite: "unite" }],
    },
  });
  assert.equal(reservationClient.statut, 201);
  assert.equal(reservationClient.corps.pharmacienId, "usr-ph-centre");
  assert.equal(reservationClient.corps.lignes[0].quantiteBase, 1);

  const mauvaisProprietaire = await requete(adresseDeBase, `/reservations/${reservationClient.corps.id}/annuler`, {
    methode: "POST",
    corps: { clientId: "usr-alice" },
  });
  assert.equal(mauvaisProprietaire.statut, 403);

  const annulee = await requete(adresseDeBase, `/reservations/${reservationClient.corps.id}/annuler`, {
    methode: "POST",
    corps: { clientId: "usr-zoe" },
  });
  assert.equal(annulee.statut, 200);
});

test("medicament creation accepts description and presentations can receive stock", async () => {
  const adresseDeBase = await demarrerApplication();
  await requete(adresseDeBase, "/admin/seed", { methode: "POST" });

  const medicament = await requete(adresseDeBase, "/medicaments", {
    methode: "POST",
    corps: { nom: "Produit test", description: "Test" },
  });
  assert.equal(medicament.statut, 201);
  assert.equal(medicament.corps.description, "Test");
  assert.equal("forme" in medicament.corps, false);

  const presentation = await requete(adresseDeBase, `/medicaments/${medicament.corps.id}/presentations`, {
    methode: "POST",
    corps: {
      forme: "comprimé",
      dosage: "250 mg",
      uniteBase: "comprime",
      contenanceBoite: 20,
      venteALunite: false,
      prix: 250,
    },
  });
  assert.equal(presentation.statut, 201);
  assert.equal(presentation.corps.forme, "comprimé");

  const stock = await requete(adresseDeBase, `/pharmacies/ph-centre/stocks/${presentation.corps.id}`, {
    methode: "PUT",
    corps: { quantiteBase: 50, pharmacienId: "usr-ph-centre" },
  });
  assert.equal(stock.statut, 200);
  assert.equal(stock.corps.presentationId, presentation.corps.id);
  assert.equal(stock.corps.disponible, 50);

  const venteUniteInterdite = await requete(adresseDeBase, "/reservations", {
    methode: "POST",
    corps: {
      clientId: "usr-zoe",
      pharmacieId: "ph-centre",
      lignes: [{ presentationId: presentation.corps.id, quantite: 1, unite: "unite" }],
    },
  });
  assert.equal(venteUniteInterdite.statut, 400);

  const reservationMultiLignes = await requete(adresseDeBase, "/reservations", {
    methode: "POST",
    corps: {
      clientId: "usr-zoe",
      pharmacieId: "ph-centre",
      lignes: [
        { presentationId: presentation.corps.id, quantite: 2, unite: "boite" },
        { presentationId: "pre-spasfon", quantite: 1, unite: "unite" },
      ],
    },
  });
  assert.equal(reservationMultiLignes.statut, 201);
  assert.ok(reservationMultiLignes.corps.lignes.every((ligne) => !("id" in ligne)));
  assert.deepEqual(
    reservationMultiLignes.corps.lignes.map((ligne) => ligne.quantiteBase),
    [40, 1],
  );

  const presentationEnDouble = await requete(adresseDeBase, "/reservations", {
    methode: "POST",
    corps: {
      clientId: "usr-alice",
      pharmacieId: "ph-centre",
      lignes: [
        { presentationId: "pre-doliprane500", quantite: 1, unite: "unite" },
        { presentationId: "pre-doliprane500", quantite: 2, unite: "unite" },
      ],
    },
  });
  assert.equal(presentationEnDouble.statut, 400);

  const modificationStockInterdite = await requete(
    adresseDeBase,
    `/pharmacies/ph-centre/stocks/${presentation.corps.id}`,
    { methode: "PUT", corps: { quantiteBase: 5, pharmacienId: "usr-ph-gare" } },
  );
  assert.equal(modificationStockInterdite.statut, 403);
});

test("an accepted reservation expires and releases stock", async () => {
  const adresseDeBase = await demarrerApplication();
  await requete(adresseDeBase, "/admin/seed", { methode: "POST" });
  await requete(adresseDeBase, "/admin/horloge", {
    methode: "POST",
    corps: { avancerHeures: 25 },
  });

  const expiree = await requete(adresseDeBase, "/reservations/res-6/retirer", {
    methode: "POST",
    corps: { pharmacienId: "usr-ph-croix" },
  });
  assert.equal(expiree.statut, 410);
  assert.equal(expiree.corps.erreur.type, "ReservationExpireeError");

  const stock = await requete(adresseDeBase, "/pharmacies/ph-croix/stocks/pre-smecta", {
    methode: "PUT",
    corps: { quantiteBase: 2, pharmacienId: "usr-ph-croix" },
  });
  assert.equal(stock.statut, 200);
  assert.equal(stock.corps.quantiteReserveeBase, 0);
});
