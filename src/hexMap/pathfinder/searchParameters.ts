import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { HexCoordinate } from "../hexCoordinate/hexCoordinate"
import { getValidValueOrDefault } from "../../utils/validityCheck"
import { CoordinateGeneratorShape } from "../../battle/targeting/coordinateGenerator"

export interface SearchParameters {
    pathGenerators: {
        startCoordinates: HexCoordinate[]
        coordinateGeneratorShape: CoordinateGeneratorShape
    }
    pathContinueConstraints: {
        squaddieAffiliation: {
            searchingSquaddieAffiliation: SquaddieAffiliation
            canCrossThroughUnfriendlySquaddies: boolean
        }
        ignoreTerrainCost: boolean
        passThroughWalls: boolean
        passOverPits: boolean
    }
    pathStopConstraints: {
        canStopOnSquaddies: boolean
    }
    pathSizeConstraints: {
        movementPerAction?: number
        numberOfActions?: number
        minimumDistanceMoved: number
        maximumDistanceMoved: number
    }
    goal: {
        stopCoordinates: HexCoordinate[]
    }
}

export const SearchParametersService = {
    new: ({
        pathGenerators,
        pathSizeConstraints,
        pathContinueConstraints,
        pathStopConstraints,
        goal,
    }: {
        pathGenerators?: {
            startCoordinates?: HexCoordinate[]
            coordinateGeneratorShape?: CoordinateGeneratorShape
        }
        pathStopConstraints?: {
            canStopOnSquaddies?: boolean
        }
        pathContinueConstraints?: {
            squaddieAffiliation?: {
                searchingSquaddieAffiliation?: SquaddieAffiliation
                canCrossThroughUnfriendlySquaddies?: boolean
            }
            ignoreTerrainCost?: boolean
            canPassThroughWalls?: boolean
            canPassOverPits?: boolean
        }
        pathSizeConstraints?: {
            movementPerAction?: number
            numberOfActions?: number
            minimumDistanceMoved?: number
            maximumDistanceMoved?: number
        }
        goal: {
            stopCoordinates?: HexCoordinate[]
        }
    }): SearchParameters => {
        return {
            pathGenerators: {
                startCoordinates: getValidValueOrDefault(
                    pathGenerators?.startCoordinates,
                    []
                ),
                coordinateGeneratorShape: getValidValueOrDefault(
                    pathGenerators?.coordinateGeneratorShape,
                    CoordinateGeneratorShape.BLOOM
                ),
            },
            pathContinueConstraints: {
                squaddieAffiliation: {
                    searchingSquaddieAffiliation: getValidValueOrDefault(
                        pathContinueConstraints?.squaddieAffiliation
                            ?.searchingSquaddieAffiliation,
                        SquaddieAffiliation.UNKNOWN
                    ),
                    canCrossThroughUnfriendlySquaddies: getValidValueOrDefault(
                        pathContinueConstraints?.squaddieAffiliation
                            ?.canCrossThroughUnfriendlySquaddies,
                        false
                    ),
                },
                ignoreTerrainCost: getValidValueOrDefault(
                    pathContinueConstraints?.ignoreTerrainCost,
                    false
                ),
                passThroughWalls: getValidValueOrDefault(
                    pathContinueConstraints?.canPassThroughWalls,
                    false
                ),
                passOverPits: getValidValueOrDefault(
                    pathContinueConstraints?.canPassOverPits,
                    false
                ),
            },
            pathStopConstraints: {
                canStopOnSquaddies: getValidValueOrDefault(
                    pathStopConstraints?.canStopOnSquaddies,
                    false
                ),
            },
            pathSizeConstraints: {
                movementPerAction: pathSizeConstraints?.movementPerAction,
                numberOfActions: pathSizeConstraints?.numberOfActions,
                minimumDistanceMoved: pathSizeConstraints?.minimumDistanceMoved,
                maximumDistanceMoved: pathSizeConstraints?.maximumDistanceMoved,
            },
            goal: {
                stopCoordinates: getValidValueOrDefault(
                    goal.stopCoordinates,
                    []
                ),
            },
        }
    },
}
