import { readFileSync } from "node:fs";

export const jeuDeDonnees = JSON.parse(
  readFileSync(new URL("../../data/jeu-de-donnees.json", import.meta.url), "utf8"));
