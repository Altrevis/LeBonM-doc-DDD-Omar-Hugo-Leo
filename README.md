# LeBonMedoc

Recherche et réservation de médicaments dans des pharmacies partenaires.
Le service ne fait ni diagnostic, ni prescription, ni délivrance : la délivrance reste sous la responsabilité du pharmacien.

## Structure (MVC)
```
src/models/        Utilisateur, Pharmacie, Medicament, Presentation, Stock, Reservation, LigneReservation
src/enums/         Rôles, statuts et unités
src/services/      Règles métier (StockService, ReservationService)
src/controllers/   Validation des entrées + appel des services
src/views/json.js  Réponses JSON, erreur métier -> code HTTP
src/repositories/  Stockage en mémoire
src/http/app.js    Routes
data/              Jeu de données
postman/           Collection Postman
```

## Lancer
```
npm start    # API sur http://localhost:3000
```

## Postman
Importer `postman/LeBonMedoc.postman_collection.json` et lancer toute la collection (Collection Runner). La première requête appelle `POST /admin/seed`, qui charge `data/jeu-de-donnees.json`. La collection est rejouable. Définir la variable `baseUrl` à `http://localhost:3000`.

Les routes `/admin/*` (reset, seed, horloge, expirer) servent uniquement aux tests.
Les `clientId`, `pharmacienId` et `adminId` transmis aux routes servent à simuler l'acteur dans ce prototype ; ils ne remplacent pas une authentification. Le compte administrateur de démonstration (`usr-admin`) est chargé par le seed. La route publique de création d'utilisateur ne permet pas d'attribuer le rôle `admin`.
À la création d'une réservation, le client sélectionne une pharmacie ; le système affecte un pharmacien de cette pharmacie. La pharmacie est ensuite déduite du pharmacien affecté et n'est pas stockée sur la réservation.
La `forme` décrit chaque présentation, et non le médicament en général. Les lignes d'une réservation concernent toutes cette pharmacie ; une présentation ne peut apparaître qu'une fois par réservation, identifiée par le couple réservation-présentation. Le stock est compté en `uniteBase` (`comprime`, `gelule`, `sachet`, `ml`, `g`, `dose`). `disponible` est calculé à partir de `quantiteBase - quantiteReserveeBase`, pas stocké séparément. Une ligne peut demander `boite` ou `unite` : une boîte est convertie avec `contenanceBoite`, et la vente à l'unité exige `venteALunite: true`.
Les contenances et prix absents du jeu de données restent à `null` ; aucune valeur commerciale n'est inventée.

## Routes
| Méthode | Route | Codes |
|---|---|---|
| POST | /utilisateurs `{nom, email, role, pharmacieId?}` | 201, 400, 403, 404 |
| POST | /pharmacies `{adminId, nom, adresse, partenaire?}` | 201, 400, 403, 404 |
| POST | /medicaments `{nom, description?, ordonnanceRequise?}` | 201, 400 |
| POST | /medicaments/:id/presentations `{forme?, dosage?, uniteBase, contenanceBoite?, venteALunite, prix?}` | 201, 400, 404 |
| PUT | /pharmacies/:id/stocks/:presentationId `{quantiteBase, pharmacienId}` | 200, 400, 403, 404 |
| GET | /disponibilites?nom= | 200, 400 |
| POST | /reservations `{clientId, pharmacieId, lignes: [{presentationId, quantite, unite}]}` | 201, 400, 403, 404, 409 |
| GET | /reservations/:id?clientId= | 200, 400, 403, 404 |
| POST | /reservations/:id/accepter, refuser `{pharmacienId, motifRefus?}`, retirer `{pharmacienId}` | 200, 400, 403, 404, 409, 410 |
| POST | /reservations/:id/annuler `{clientId}` | 200, 400, 403, 404, 409, 410 |
| GET | /pharmacies/:id/reservations?pharmacienId=&statut= | 200, 400, 403, 404 |

Erreurs : `{ "erreur": { "type", "message" } }` — 400 demande invalide, 403 rôle ou pharmacie non autorisé, 404 introuvable, 409 stock insuffisant / opération répétée / transition interdite, 410 réservation expirée.
