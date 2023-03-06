import {SquaddieResource} from "./resource";
import {TraitStatusStorage} from "../trait/traitStatusStorage";

export enum SquaddieAffiliation {
  UNKNOWN = "UNKNOWN",
  PLAYER = "PLAYER",
  ENEMY = "ENEMY",
  ALLY = "ALLY",
  "NONE" = "NONE",
}

type RequiredOptions = {
  name: string;
  id: string;
  resources: SquaddieResource;
  traits: TraitStatusStorage;
  affiliation: SquaddieAffiliation;
}

export class SquaddieID {
  name: string;
  id: string;
  resources: SquaddieResource;
  traits: TraitStatusStorage;
  affiliation: SquaddieAffiliation;

  constructor(options: RequiredOptions) {
    this.name = options.name;
    this.id = options.id;
    this.resources = options.resources;
    this.traits = options.traits;
    this.affiliation = options.affiliation;
  }
}
