import {HexCoordinate} from "../hexGrid";
import {SquaddieMovement} from "../../squaddie/movement";

type Options = {
  startLocation?: HexCoordinate;
  squaddieMovement?: SquaddieMovement;
  numberOfActions?: number;
  minimumDistanceMoved?: number;
};

export class SearchParams {
  startLocation?: HexCoordinate;
  squaddieMovement?: SquaddieMovement;
  numberOfActions?: number;
  minimumDistanceMoved?: number;

  constructor(options: Options) {
    this.startLocation = options.startLocation;
    this.squaddieMovement = options.squaddieMovement;
    this.minimumDistanceMoved = options.minimumDistanceMoved;
    this.numberOfActions = options.numberOfActions;
  }

  getStartLocation(): HexCoordinate {
    return this.startLocation;
  }

  getMinimumDistanceMoved(): number {
    return this.minimumDistanceMoved;
  }

  getPassThroughWalls(): boolean | undefined {
    return this.squaddieMovement.passThroughWalls;
  }

  getCrossOverPits(): boolean | undefined {
    return this.squaddieMovement.crossOverPits;
  }

  getMovementPerAction(): number | undefined {
    return this.squaddieMovement.movementPerAction;
  }
}
