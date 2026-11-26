import assert from "node:assert/strict";
import { test } from "node:test";
import { UniteDemandee } from "../src/enums/UniteDemandee.js";
import { OperationDejaEffectueeError } from "../src/errors.js";
import { LigneReservation } from "../src/models/LigneReservation.js";
import { LigneReservationRepository } from "../src/repositories/LigneReservationRepository.js";

function creerLigne(reservationId, presentationId) {
  return new LigneReservation({
    reservationId,
    presentationId,
    quantite: 1,
    unite: UniteDemandee.UNITE,
    quantiteBase: 1,
  });
}

test("line reservation keys are unique per reservation and presentation without a separate id", () => {
  const lignes = new LigneReservationRepository();
  const premiere = creerLigne("res-1", "pre-1");

  lignes.ajouter(premiere);
  assert.equal("id" in premiere, false);
  assert.throws(
    () => lignes.ajouter(creerLigne("res-1", "pre-1")),
    OperationDejaEffectueeError,
  );
  assert.equal(lignes.ajouter(creerLigne("res-2", "pre-1")).reservationId, "res-2");
});
