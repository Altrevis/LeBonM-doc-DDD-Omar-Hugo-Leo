export class Pharmacie {
  constructor({ id, nom, adresse, partenaire = true }) {
    Object.assign(this, { id, nom, adresse, partenaire });
  }
}
