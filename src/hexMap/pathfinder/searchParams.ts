import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {HexCoordinate} from "../hexCoordinate/hexCoordinate";
import {TargetingShapeGenerator} from "../../battle/targeting/targetingShapeGenerator";
import {isValidValue} from "../../utils/validityCheck";
import {SnakeShapeGenerator} from "../../battle/targeting/snakeShapeGenerator";

export interface SearchSetup {
    startLocation: HexCoordinate;
    affiliation: SquaddieAffiliation;
}

export interface SearchMovement {
    minimumDistanceMoved?: number;
    maximumDistanceMoved?: number;
    movementPerAction?: number;
    passThroughWalls: boolean;
    crossOverPits: boolean;
    canStopOnSquaddies: boolean;
    ignoreTerrainPenalty: boolean;
    shapeGenerator: TargetingShapeGenerator;
}

export interface SearchStopCondition {
    numberOfActions: number | undefined;
    stopLocation: HexCoordinate | undefined;
}

export interface SearchParameters {
    ignoreTerrainPenalty: boolean;
    startLocations: HexCoordinate[];
    shapeGenerator: TargetingShapeGenerator;
    minimumDistanceMoved: number;
    maximumDistanceMoved: number;
    passThroughWalls: boolean | undefined;
    crossOverPits: boolean | undefined;
    movementPerAction: number | undefined;
    numberOfActions: number | undefined;
    stopLocations: HexCoordinate[];
    squaddieAffiliation: SquaddieAffiliation;
    canStopOnSquaddies: boolean;
}

export const SearchParametersHelper = {
    newUsingSearchSetupMovementStop: ({
                                          setup,
                                          movement,
                                          stopCondition,
                                      }: {
        setup: SearchSetup,
        movement: SearchMovement,
        stopCondition: SearchStopCondition,
    }): SearchParameters => {
        return {
            startLocations: [setup.startLocation],
            squaddieAffiliation: setup.affiliation,
            ignoreTerrainPenalty: movement.ignoreTerrainPenalty,
            shapeGenerator: movement.shapeGenerator,
            minimumDistanceMoved: movement.minimumDistanceMoved,
            maximumDistanceMoved: movement.maximumDistanceMoved,
            passThroughWalls: movement.passThroughWalls,
            crossOverPits: movement.crossOverPits,
            movementPerAction: movement.movementPerAction,
            canStopOnSquaddies: movement.canStopOnSquaddies,
            numberOfActions: stopCondition.numberOfActions,
            stopLocations: [stopCondition.stopLocation],
        }
    },
    new: ({
              startLocations,
              squaddieAffiliation,
              ignoreTerrainPenalty,
              shapeGenerator,
              minimumDistanceMoved,
              maximumDistanceMoved,
              canPassThroughWalls,
              canPassThroughPits,
              movementPerAction,
              canStopOnSquaddies,
              numberOfActions,
              stopLocations,
          }: {
        startLocations?: HexCoordinate[],
        squaddieAffiliation?: SquaddieAffiliation,
        ignoreTerrainPenalty?: boolean,
        shapeGenerator?: TargetingShapeGenerator,
        minimumDistanceMoved?: number,
        maximumDistanceMoved?: number,
        canPassThroughWalls?: boolean,
        canPassThroughPits?: boolean,
        movementPerAction?: number,
        canStopOnSquaddies?: boolean,
        numberOfActions?: number,
        stopLocations?: HexCoordinate[],
    }): SearchParameters => {
        return {
            startLocations: isValidValue(startLocations) ? startLocations : [],
            squaddieAffiliation: isValidValue(squaddieAffiliation) ? squaddieAffiliation : SquaddieAffiliation.UNKNOWN,
            ignoreTerrainPenalty: isValidValue(ignoreTerrainPenalty) ? ignoreTerrainPenalty : false,
            shapeGenerator: isValidValue(shapeGenerator) ? shapeGenerator : new SnakeShapeGenerator(),
            minimumDistanceMoved: isValidValue(minimumDistanceMoved) ? minimumDistanceMoved : undefined,
            maximumDistanceMoved: isValidValue(maximumDistanceMoved) ? maximumDistanceMoved : undefined,
            passThroughWalls: isValidValue(canPassThroughWalls) ? canPassThroughWalls : false,
            crossOverPits: isValidValue(canPassThroughPits) ? canPassThroughPits : false,
            movementPerAction: isValidValue(movementPerAction) ? movementPerAction : undefined,
            canStopOnSquaddies: isValidValue(canStopOnSquaddies) ? canStopOnSquaddies : false,
            numberOfActions: isValidValue(numberOfActions) ? numberOfActions : undefined,
            stopLocations: isValidValue(stopLocations) ? stopLocations : [],
        }
    }
}
