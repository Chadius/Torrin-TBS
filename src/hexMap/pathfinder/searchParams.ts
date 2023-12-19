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
    startLocation: HexCoordinate;
    shapeGenerator: TargetingShapeGenerator;
    minimumDistanceMoved: number;
    maximumDistanceMoved: number;
    passThroughWalls: boolean | undefined;
    crossOverPits: boolean | undefined;
    movementPerAction: number | undefined;
    numberOfActions: number | undefined;
    stopLocation: HexCoordinate | undefined;
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
            startLocation: setup.startLocation,
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
            stopLocation: stopCondition.stopLocation,
        }
    },
    new: ({
              startLocation,
              squaddieAffiliation,
              ignoreTerrainPenalty,
              shapeGenerator,
              minimumDistanceMoved,
              maximumDistanceMoved,
              passThroughWalls,
              crossOverPits,
              movementPerAction,
              canStopOnSquaddies,
              numberOfActions,
              stopLocation,
          }: {
        startLocation?: HexCoordinate,
        squaddieAffiliation?: SquaddieAffiliation,
        ignoreTerrainPenalty?: boolean,
        shapeGenerator?: TargetingShapeGenerator,
        minimumDistanceMoved?: number,
        maximumDistanceMoved?: number,
        passThroughWalls?: boolean,
        crossOverPits?: boolean,
        movementPerAction?: number,
        canStopOnSquaddies?: boolean,
        numberOfActions?: number,
        stopLocation?: HexCoordinate,
    }): SearchParameters => {
        return {
            startLocation: isValidValue(startLocation) ? startLocation : undefined,
            squaddieAffiliation: isValidValue(squaddieAffiliation) ? squaddieAffiliation : SquaddieAffiliation.UNKNOWN,
            ignoreTerrainPenalty: isValidValue(ignoreTerrainPenalty) ? ignoreTerrainPenalty : false,
            shapeGenerator: isValidValue(shapeGenerator) ? shapeGenerator : new SnakeShapeGenerator(),
            minimumDistanceMoved: isValidValue(minimumDistanceMoved) ? minimumDistanceMoved : undefined,
            maximumDistanceMoved: isValidValue(maximumDistanceMoved) ? maximumDistanceMoved : undefined,
            passThroughWalls: isValidValue(passThroughWalls) ? passThroughWalls : false,
            crossOverPits: isValidValue(crossOverPits) ? crossOverPits : false,
            movementPerAction: isValidValue(movementPerAction) ? movementPerAction : undefined,
            canStopOnSquaddies: isValidValue(canStopOnSquaddies) ? canStopOnSquaddies : false,
            numberOfActions: isValidValue(numberOfActions) ? numberOfActions : undefined,
            stopLocation: isValidValue(stopLocation) ? stopLocation : undefined,
        }
    }
}
