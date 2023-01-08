import {SquaddieResource} from "./resource";

type RequiredOptions = {
  name: string;
  id: string;
  resources: SquaddieResource;
}
export class SquaddieID {
  name: string;
  id: string;
  resources: SquaddieResource;

  constructor(options: RequiredOptions) {
    this.name = options.name;
    this.id = options.id;
    this.resources = options.resources;
  }
}
