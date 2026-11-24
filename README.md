# LeBonMedoc

Recherche et réservation de médicaments dans des pharmacies partenaires.
Le service ne fait ni diagnostic, ni prescription, ni délivrance : la délivrance reste sous la responsabilité du pharmacien.

## Structure (MVC)
```
src/models/        Pharmacie, Medicament, Stock, Reservation, StatutReservation
src/services/      Règles métier (StockService, ReservationService)
src/controllers/   Validation des entrées + appel des services
src/views/json.js  Réponses JSON, erreur métier -> code HTTP
src/repositories/  Stockage en mémoire
src/http/app.js    Routes
data/              Jeu de données
postman/           Collection Postman
docs/conception.md Règles, états, journal d'évolution
```

## Lancer
```
npm start    # API sur http://localhost:3000
```

## Postman
Importer `postman/LeBonMedoc.postman_collection.json` et lancer toute la collection (Collection Runner). Le dossier 0 appelle `POST /admin/seed` qui charge `data/jeu-de-donnees.json`. La collection est rejouable. De plus, ajouter dans New environnement (Variable = baseUrl / Value = http://localhost3000)

Les routes `/admin/*` (reset, seed, horloge, expirer) servent uniquement aux tests.

## Routes
| Méthode | Route | Codes |
|---|---|---|
| POST | /pharmacies, /medicaments | 201, 400 |
| PUT | /pharmacies/:id/stocks/:medId `{quantite}` | 200, 400, 404 |
| GET | /disponibilites?nom= | 200, 400 |
| POST | /reservations | 201, 400, 404, 409 |
| GET | /reservations/:id | 200, 404 |
| POST | /reservations/:id/accepter, refuser `{motif}`, annuler, retirer | 200, 404, 409, 410 |
| GET | /pharmacies/:id/reservations?statut= | 200, 400, 404 |

Erreurs : `{ "erreur": { "type", "message" } }` — 400 demande invalide, 404 introuvable, 409 stock insuffisant / opération répétée / transition interdite, 410 réservation expirée.
