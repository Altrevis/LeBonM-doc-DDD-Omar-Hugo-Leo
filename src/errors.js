export class LeBonMedocError extends Error {
  constructor(message) {
    super(message);
    this.name = new.target.name;
  }
}
export class DemandeInvalideError extends LeBonMedocError {} 
export class AccesInterditError extends LeBonMedocError {}
export class StockInsuffisantError extends LeBonMedocError {}
export class ReservationExpireeError extends LeBonMedocError {}
export class TransitionInterditeError extends LeBonMedocError {} 
export class OperationDejaEffectueeError extends LeBonMedocError {}
export class EntiteIntrouvableError extends LeBonMedocError {}
