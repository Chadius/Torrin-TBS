import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { HexCoordinate } from "../hexCoordinate/hexCoordinate"
import { TargetingShapeGenerator } from "../../battle/targeting/targetingShapeGenerator"
import { isValidValue } from "../../utils/validityCheck"
import { SnakeShapeGenerator } from "../../battle/targeting/snakeShapeGenerator"

export interface SearchSetup {
    startLocation: HexCoordinate
    affiliation: SquaddieAffiliation
}

export interface SearchMovement {
    minimumDistanceMoved?: number
    maximumDistanceMoved?: number
    movementPerAction?: number
    passThroughWalls: boolean
    crossOverPits: boolean
    canStopOnSquaddies: boolean
    ignoreTerrainCost: boolean
    shapeGenerator: TargetingShapeGenerator
}

export interface SearchStopCondition {
    numberOfActions: number | undefined
    stopLocation: HexCoordinate | undefined
}

export interface SearchParameters {
    ignoreTerrainCost: boolean
    startLocations: HexCoordinate[]
    shapeGenerator: TargetingShapeGenerator
    minimumDistanceMoved: number
    maximumDistanceMoved: number
    passThroughWalls: boolean | undefined
    passOverPits: boolean | undefined
    movementPerAction: number | undefined
    numberOfActions: number | undefined
    stopLocations: HexCoordinate[]
    squaddieAffiliation: SquaddieAffiliation
    canStopOnSquaddies: boolean
}

export const SearchParametersHelper = {
    newUsingSearchSetupMovementStop: ({
        setup,
        movement,
        stopCondition,
    }: {
        setup: SearchSetup
        movement: SearchMovement
        stopCondition: SearchStopCondition
    }): SearchParameters => {
        return {
            startLocations: [setup.startLocation],
            squaddieAffiliation: setup.affiliation,
            ignoreTerrainCost: movement.ignoreTerrainCost,
            shapeGenerator: movement.shapeGenerator,
            minimumDistanceMoved: movement.minimumDistanceMoved,
            maximumDistanceMoved: movement.maximumDistanceMoved,
            passThroughWalls: movement.passThroughWalls,
            passOverPits: movement.crossOverPits,
            movementPerAction: movement.movementPerAction,
            canStopOnSquaddies: movement.canStopOnSquaddies,
            numberOfActions: stopCondition.numberOfActions,
            stopLocations: [stopCondition.stopLocation],
        }
    },
    new: ({
        startLocations,
        squaddieAffiliation,
        ignoreTerrainCost,
        shapeGenerator,
        minimumDistanceMoved,
        maximumDistanceMoved,
        canPassThroughWalls,
        canPassOverPits,
        movementPerAction,
        canStopOnSquaddies,
        numberOfActions,
        stopLocations,
    }: {
        startLocations?: HexCoordinate[]
        squaddieAffiliation?: SquaddieAffiliation
        ignoreTerrainCost?: boolean
        shapeGenerator?: TargetingShapeGenerator
        minimumDistanceMoved?: number
        maximumDistanceMoved?: number
        canPassThroughWalls?: boolean
        canPassOverPits?: boolean
        movementPerAction?: number
        canStopOnSquaddies?: boolean
        numberOfActions?: number
        stopLocations?: HexCoordinate[]
    }): SearchParameters => {
        return {
            startLocations: isValidValue(startLocations) ? startLocations : [],
            squaddieAffiliation: isValidValue(squaddieAffiliation)
                ? squaddieAffiliation
                : SquaddieAffiliation.UNKNOWN,
            ignoreTerrainCost: isValidValue(ignoreTerrainCost)
                ? ignoreTerrainCost
                : false,
            shapeGenerator: isValidValue(shapeGenerator)
                ? shapeGenerator
                : new SnakeShapeGenerator(),
            minimumDistanceMoved: isValidValue(minimumDistanceMoved)
                ? minimumDistanceMoved
                : undefined,
            maximumDistanceMoved: isValidValue(maximumDistanceMoved)
                ? maximumDistanceMoved
                : undefined,
            passThroughWalls: isValidValue(canPassThroughWalls)
                ? canPassThroughWalls
                : false,
            passOverPits: isValidValue(canPassOverPits)
                ? canPassOverPits
                : false,
            movementPerAction: isValidValue(movementPerAction)
                ? movementPerAction
                : undefined,
            canStopOnSquaddies: isValidValue(canStopOnSquaddies)
                ? canStopOnSquaddies
                : false,
            numberOfActions: isValidValue(numberOfActions)
                ? numberOfActions
                : undefined,
            stopLocations: isValidValue(stopLocations) ? stopLocations : [],
        }
    },
}
