import {Trait, TraitStatusStorage} from "../trait/traitStatusStorage";

export type SquaddieMovementRequiredOptions = {
  movementPerAction: number;
  traits: TraitStatusStorage;
}

export class SquaddieMovement {
  movementPerAction: number;
  passThroughWalls: boolean = false;
  crossOverPits: boolean = false;

  constructor(options: SquaddieMovementRequiredOptions) {
    this.movementPerAction = options.movementPerAction;
    this.passThroughWalls = options.traits.getStatus(Trait.PASS_THROUGH_WALLS);
    this.crossOverPits = options.traits.getStatus(Trait.CROSS_OVER_PITS);
  }
}
