import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { creerApp } from "../src/http/app.js";

const servers = [];

async function demarrerApp() {
  const app = creerApp();
  await new Promise((resolve, reject) => {
    app.once("error", reject);
    app.listen(0, "127.0.0.1", resolve);
  });
  servers.push(app);
  return `http://127.0.0.1:${app.address().port}`;
}

async function requete(baseUrl, route, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

afterEach(() => {
  for (const app of servers.splice(0)) {
    app.close();
    if (typeof app.closeAllConnections === "function") app.closeAllConnections();
  }
});

test("seed loads users and presentations and preserves pharmacy stock links", async () => {
  const baseUrl = await demarrerApp();
  const seed = await requete(baseUrl, "/admin/seed", { method: "POST" });

  assert.equal(seed.status, 200);
  assert.deepEqual(
    {
      pharmacies: seed.body.pharmacies,
      medicaments: seed.body.medicaments,
      presentations: seed.body.presentations,
      utilisateurs: seed.body.utilisateurs,
      reservations: seed.body.reservations,
      lignesReservation: seed.body.lignesReservation,
    },
    {
      pharmacies: 6, medicaments: 12, presentations: 13,
      utilisateurs: 14, reservations: 10, lignesReservation: 10,
    },
  );

  const disponibilites = await requete(baseUrl, "/disponibilites?nom=doliprane");
  assert.equal(disponibilites.status, 200);
  assert.equal(disponibilites.body.length, 3);
  assert.ok(disponibilites.body.every((item) => item.presentation && item.medicament));
});

test("users can be created and pharmacists must reference a real pharmacy", async () => {
  const baseUrl = await demarrerApp();
  await requete(baseUrl, "/admin/seed", { method: "POST" });

  const pharmacist = await requete(baseUrl, "/utilisateurs", {
    method: "POST",
    body: {
      nom: "Pharmacien",
      email: "nouveau@example.test",
      role: "pharmacien",
      pharmacieId: "ph-centre",
    },
  });
  assert.equal(pharmacist.status, 201);
  assert.equal(pharmacist.body.pharmacieId, "ph-centre");
  assert.equal("motDePasse" in pharmacist.body, false);

  const unknownPharmacy = await requete(baseUrl, "/utilisateurs", {
    method: "POST",
    body: {
      nom: "Pharmacien",
      email: "invalide@example.test",
      role: "pharmacien",
      pharmacieId: "ph-inconnue",
    },
  });
  assert.equal(unknownPharmacy.status, 404);
});

test("stock and reservations use a presentation and enforce user roles", async () => {
  const baseUrl = await demarrerApp();
  await requete(baseUrl, "/admin/seed", { method: "POST" });

  const wrongPharmacist = await requete(baseUrl, "/reservations/res-1/accepter", {
    method: "POST",
    body: { pharmacienId: "usr-ph-gare" },
  });
  assert.equal(wrongPharmacist.status, 403);

  const accepted = await requete(baseUrl, "/reservations/res-1/accepter", {
    method: "POST",
    body: { pharmacienId: "usr-ph-centre" },
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.lignes[0].presentationId, "pre-doliprane500");
  assert.equal("pharmacieId" in accepted.body, false);

  const wrongPharmacyList = await requete(
    baseUrl,
    "/pharmacies/ph-centre/reservations?pharmacienId=usr-ph-gare",
  );
  assert.equal(wrongPharmacyList.status, 403);

  const pharmacyList = await requete(
    baseUrl,
    "/pharmacies/ph-centre/reservations?pharmacienId=usr-ph-centre",
  );
  assert.equal(pharmacyList.status, 200);
  assert.ok(pharmacyList.body.some((reservation) => reservation.id === "res-1"));

  const pharmacistReservation = await requete(baseUrl, "/reservations", {
    method: "POST",
    body: {
      clientId: "usr-ph-centre",
      pharmacieId: "ph-centre",
      lignes: [{ presentationId: "pre-spasfon", quantite: 1, unite: "unite" }],
    },
  });
  assert.equal(pharmacistReservation.status, 403);

  const clientReservation = await requete(baseUrl, "/reservations", {
    method: "POST",
    body: {
      clientId: "usr-zoe",
      pharmacieId: "ph-centre",
      lignes: [{ presentationId: "pre-spasfon", quantite: 1, unite: "unite" }],
    },
  });
  assert.equal(clientReservation.status, 201);
  assert.equal(clientReservation.body.pharmacienId, "usr-ph-centre");
  assert.equal(clientReservation.body.lignes[0].quantiteBase, 1);

  const wrongOwner = await requete(baseUrl, `/reservations/${clientReservation.body.id}/annuler`, {
    method: "POST",
    body: { clientId: "usr-alice" },
  });
  assert.equal(wrongOwner.status, 403);

  const cancelled = await requete(baseUrl, `/reservations/${clientReservation.body.id}/annuler`, {
    method: "POST",
    body: { clientId: "usr-zoe" },
  });
  assert.equal(cancelled.status, 200);
});

test("medicament creation accepts description and presentations can receive stock", async () => {
  const baseUrl = await demarrerApp();
  await requete(baseUrl, "/admin/seed", { method: "POST" });

  const medicament = await requete(baseUrl, "/medicaments", {
    method: "POST",
    body: { nom: "Produit test", description: "Test" },
  });
  assert.equal(medicament.status, 201);
  assert.equal(medicament.body.description, "Test");
  assert.equal("forme" in medicament.body, false);

  const presentation = await requete(baseUrl, `/medicaments/${medicament.body.id}/presentations`, {
    method: "POST",
    body: {
      forme: "comprimé",
      dosage: "250 mg",
      uniteBase: "comprime",
      contenanceBoite: 20,
      venteALunite: false,
      prix: 250,
    },
  });
  assert.equal(presentation.status, 201);
  assert.equal(presentation.body.forme, "comprimé");

  const stock = await requete(baseUrl, `/pharmacies/ph-centre/stocks/${presentation.body.id}`, {
    method: "PUT",
    body: { quantiteBase: 50, pharmacienId: "usr-ph-centre" },
  });
  assert.equal(stock.status, 200);
  assert.equal(stock.body.presentationId, presentation.body.id);
  assert.equal(stock.body.disponible, 50);

  const unitSaleForbidden = await requete(baseUrl, "/reservations", {
    method: "POST",
    body: {
      clientId: "usr-zoe",
      pharmacieId: "ph-centre",
      lignes: [{ presentationId: presentation.body.id, quantite: 1, unite: "unite" }],
    },
  });
  assert.equal(unitSaleForbidden.status, 400);

  const multiLineReservation = await requete(baseUrl, "/reservations", {
    method: "POST",
    body: {
      clientId: "usr-zoe",
      pharmacieId: "ph-centre",
      lignes: [
        { presentationId: presentation.body.id, quantite: 2, unite: "boite" },
        { presentationId: "pre-spasfon", quantite: 1, unite: "unite" },
      ],
    },
  });
  assert.equal(multiLineReservation.status, 201);
  assert.ok(multiLineReservation.body.lignes.every((ligne) => !("id" in ligne)));
  assert.deepEqual(
    multiLineReservation.body.lignes.map((ligne) => ligne.quantiteBase),
    [40, 1],
  );

  const duplicatePresentation = await requete(baseUrl, "/reservations", {
    method: "POST",
    body: {
      clientId: "usr-alice",
      pharmacieId: "ph-centre",
      lignes: [
        { presentationId: "pre-doliprane500", quantite: 1, unite: "unite" },
        { presentationId: "pre-doliprane500", quantite: 2, unite: "unite" },
      ],
    },
  });
  assert.equal(duplicatePresentation.status, 400);

  const forbiddenStockUpdate = await requete(
    baseUrl,
    `/pharmacies/ph-centre/stocks/${presentation.body.id}`,
    { method: "PUT", body: { quantiteBase: 5, pharmacienId: "usr-ph-gare" } },
  );
  assert.equal(forbiddenStockUpdate.status, 403);
});

test("an accepted reservation expires and releases stock", async () => {
  const baseUrl = await demarrerApp();
  await requete(baseUrl, "/admin/seed", { method: "POST" });
  await requete(baseUrl, "/admin/horloge", {
    method: "POST",
    body: { avancerHeures: 25 },
  });

  const expired = await requete(baseUrl, "/reservations/res-6/retirer", {
    method: "POST",
    body: { pharmacienId: "usr-ph-croix" },
  });
  assert.equal(expired.status, 410);
  assert.equal(expired.body.erreur.type, "ReservationExpireeError");

  const stock = await requete(baseUrl, "/pharmacies/ph-croix/stocks/pre-smecta", {
    method: "PUT",
    body: { quantiteBase: 2, pharmacienId: "usr-ph-croix" },
  });
  assert.equal(stock.status, 200);
  assert.equal(stock.body.quantiteReserveeBase, 0);
});
