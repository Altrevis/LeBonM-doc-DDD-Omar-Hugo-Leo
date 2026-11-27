import assert from "node:assert/strict";
import { test } from "node:test";
import { UniteDemandee } from "../src/enums/UniteDemandee.js";
import {
  DemandeInvalideError, OperationDejaEffectueeError, ReservationExpireeError, TransitionInterditeError,
} from "../src/errors.js";
import { Reservation } from "../src/models/Reservation.js";
import { StatutReservation } from "../src/models/StatutReservation.js";
import { Stock } from "../src/models/Stock.js";

const HEURE = 3600 * 1000;
const debut = new Date("2026-01-01T08:00:00Z");
const apres = (heures) => new Date(debut.getTime() + heures * HEURE);

function ligne(presentationId, quantite = 1) {
  return { presentationId, quantite, unite: UniteDemandee.UNITE, quantiteBase: quantite };
}

function creerReservation(lignes = [ligne("pre-1"), ligne("pre-2", 3)]) {
  return new Reservation({
    id: "res-1", clientId: "usr-client", pharmacienId: "usr-pharmacien",
    creeLe: debut, expireLe: apres(24), lignes,
  });
}

test("a reservation owns its lines and rejects an empty or duplicated list", () => {
  assert.throws(() => creerReservation([]), DemandeInvalideError);
  assert.throws(() => creerReservation([ligne("pre-1"), ligne("pre-1", 2)]), DemandeInvalideError);

  const reservation = creerReservation();
  assert.deepEqual(reservation.lignes.map((l) => [l.reservationId, l.presentationId]),
    [["res-1", "pre-1"], ["res-1", "pre-2"]]);
  assert.ok(reservation.lignes.every((l) => !("id" in l)));
  assert.ok(reservation.contientPresentation("pre-2"));

  reservation.lignes.push(ligne("pre-3"));
  assert.equal(reservation.lignes.length, 2);
  assert.throws(() => { reservation.lignes[0].quantite = 99; }, TypeError);
});

test("a reservation changes state only through its methods", () => {
  const reservation = creerReservation();
  assert.throws(() => { reservation.statut = StatutReservation.RETIREE; }, TypeError);
  assert.throws(() => { reservation.expireLe = apres(100); }, TypeError);

  reservation.accepter(apres(1), apres(25));
  assert.equal(reservation.statut, StatutReservation.ACCEPTEE);
  assert.deepEqual(reservation.expireLe, apres(25));
  assert.throws(() => reservation.accepter(apres(2), apres(26)), OperationDejaEffectueeError);
  assert.throws(() => reservation.refuser(apres(2), "motif"), TransitionInterditeError);

  reservation.marquerRetiree(apres(2));
  assert.equal(reservation.statut, StatutReservation.RETIREE);
});

test("a reservation past its deadline can only expire", () => {
  const reservation = creerReservation();
  assert.throws(() => reservation.expirer(apres(1)), TransitionInterditeError);
  assert.throws(() => reservation.accepter(apres(25), apres(49)), ReservationExpireeError);

  reservation.expirer(apres(25));
  assert.equal(reservation.statut, StatutReservation.EXPIREE);
  assert.equal(reservation.estActive, false);
});

test("a stock is adjusted through its root and never drops below reserved units", () => {
  const stock = new Stock({ pharmacieId: "ph-1", presentationId: "pre-1", quantiteBase: 10 });
  stock.reserver(4);

  assert.throws(() => stock.ajuster(3), DemandeInvalideError);
  assert.throws(() => stock.ajuster(-1), DemandeInvalideError);
  assert.throws(() => { stock.quantiteBase = 100; }, TypeError);

  stock.ajuster(6);
  assert.deepEqual([stock.quantiteBase, stock.quantiteReserveeBase, stock.disponible], [6, 4, 2]);
});
