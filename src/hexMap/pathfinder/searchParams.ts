import {HexCoordinate} from "../hexGrid";
import {SquaddieMovement} from "../../squaddie/movement";
import {MissionMap} from "../../missionMap/missionMap";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {Trait, TraitStatusStorage} from "../../trait/traitStatusStorage";

export type SearchParamsOptions = {
  startLocation?: HexCoordinate;
  stopLocation?: HexCoordinate;
  squaddieMovement?: SquaddieMovement;
  squaddieAffiliation?: SquaddieAffiliation;
  numberOfActions?: number;
  minimumDistanceMoved?: number;
  missionMap: MissionMap;
};

export class SearchParams {
  setup: {
    startLocation?: HexCoordinate;
    missionMap: MissionMap;
    affiliation?: SquaddieAffiliation;
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

  constructor(options: SearchParamsOptions) {
    this.setup = {
      startLocation: options.startLocation,
      missionMap: options.missionMap,
      affiliation: options.squaddieAffiliation ? options.squaddieAffiliation : undefined,
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

  hasSquaddieAffiliation(): boolean {
    return this.setup.affiliation !== undefined && this.setup.affiliation !== SquaddieAffiliation.UNKNOWN;
  }
  getSquaddieAffiliation(): SquaddieAffiliation {
    return this.setup.affiliation;
  }

  getSearchParamsOptions(): SearchParamsOptions {
    return {
      minimumDistanceMoved: this.movement.minimumDistanceMoved,
      missionMap: this.setup.missionMap,
      numberOfActions: this.stopConditions.numberOfActions,
      squaddieAffiliation: this.setup.affiliation,
      squaddieMovement: new SquaddieMovement({
        movementPerAction: this.movement.movementPerAction,
        traits: new TraitStatusStorage({
          [Trait.PASS_THROUGH_WALLS] : this.movement.passThroughWalls,
          [Trait.CROSS_OVER_PITS] : this.movement.crossOverPits,
        })
      }),
      startLocation: this.setup.startLocation,
      stopLocation: this.stopConditions.stopLocation,
    }
  }
}
