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

