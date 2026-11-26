export class Pharmacie {
  constructor({ id, nom, adresse, partenaire = true, horaires = null }) {
    Object.assign(this, { id, nom, adresse, partenaire, horaires });
  }
}
