export type SquaddieMovementRequiredOptions = {
  movementPerAction: number;
  passThroughWalls: boolean;
  crossOverPits: boolean;
}

export class SquaddieMovement {
  movementPerAction: number;
  passThroughWalls: boolean = false;
  crossOverPits: boolean = false;

  constructor(options: SquaddieMovementRequiredOptions) {
    this.movementPerAction = options.movementPerAction;
    this.passThroughWalls = options.passThroughWalls;
    this.crossOverPits = options.crossOverPits;
  }
}
