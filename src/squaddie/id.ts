import {SquaddieResource} from "./resource";
import {TraitStatusStorage} from "../trait/traitStatusStorage";

type RequiredOptions = {
  name: string;
  id: string;
  resources: SquaddieResource;
  traits: TraitStatusStorage;
}
export class SquaddieID {
  name: string;
  id: string;
  resources: SquaddieResource;
  traits: TraitStatusStorage;

  constructor(options: RequiredOptions) {
    this.name = options.name;
    this.id = options.id;
    this.resources = options.resources;
    this.traits = options.traits;
  }
}
