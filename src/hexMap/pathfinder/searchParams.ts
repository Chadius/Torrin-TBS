import {HexCoordinate} from "../hexGrid";
import {SquaddieMovement} from "../../squaddie/movement";
import {MissionMap} from "../../missionMap/missionMap";

type Options = {
  startLocation?: HexCoordinate;
  stopLocation?: HexCoordinate;
  squaddieMovement?: SquaddieMovement;
  numberOfActions?: number;
  minimumDistanceMoved?: number;
  missionMap: MissionMap;
};

export class SearchParams {
  setup: {
    startLocation?: HexCoordinate;
    missionMap: MissionMap;
  }
  movement: {
    minimumDistanceMoved?: number;
    movementPerAction: number;
    passThroughWalls: boolean;
    crossOverPits: boolean;
  }

  stopConditions: {
    numberOfActions?: number;
    stopLocation?: HexCoordinate;
  }

  constructor(options: Options) {
    this.setup = {
      startLocation: options.startLocation,
      missionMap: options.missionMap,
    };
    this.movement = {
      minimumDistanceMoved: options.minimumDistanceMoved,
      movementPerAction: options.squaddieMovement ? options.squaddieMovement.movementPerAction : 0,
      passThroughWalls: options.squaddieMovement ? options.squaddieMovement.passThroughWalls : false,
      crossOverPits: options.squaddieMovement ? options.squaddieMovement.crossOverPits : false,
    }
    this.stopConditions = {
      numberOfActions: options.numberOfActions,
      stopLocation: options.stopLocation,
    }
  }

  getStartLocation(): HexCoordinate {
    return this.setup.startLocation;
  }

  getMinimumDistanceMoved(): number {
    return this.movement.minimumDistanceMoved;
  }

  getPassThroughWalls(): boolean | undefined {
    return this.movement.passThroughWalls;
  }

  getCrossOverPits(): boolean | undefined {
    return this.movement.crossOverPits;
  }

  getMovementPerAction(): number | undefined {
    return this.movement.movementPerAction;
  }

  getNumberOfActions(): number | undefined {
    return this.stopConditions.numberOfActions;
  }

  getStopLocation(): HexCoordinate | undefined {
    return this.stopConditions.stopLocation;
  }
}
