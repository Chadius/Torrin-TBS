import { TSquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"

export interface SearchLimit {
    ignoreTerrainCost: boolean
    crossOverPits: boolean
    passThroughWalls: boolean
    minimumDistance?: number
    maximumDistance?: number
    maximumMovementCost?: number
    squaddieAffiliation?: TSquaddieAffiliation
    canStopOnSquaddies: boolean
}

export const SearchLimitService = {
    targeting: () => ({
        ...targetingSearchLimit,
    }),
    landBasedMovement: () => ({ ...landBasedMovementSearchLimit }),
    new: ({
        baseSearchLimit,
        ignoreTerrainCost,
        crossOverPits,
        passThroughWalls,
        minimumDistance,
        maximumDistance,
        maximumMovementCost,
        squaddieAffiliation,
        canStopOnSquaddies,
    }: {
        baseSearchLimit: SearchLimit
        ignoreTerrainCost?: boolean
        crossOverPits?: boolean
        passThroughWalls?: boolean
        minimumDistance?: number
        maximumDistance?: number
        maximumMovementCost?: number
        squaddieAffiliation?: TSquaddieAffiliation
        canStopOnSquaddies?: boolean
    }): SearchLimit => {
        let baseValue = baseSearchLimit ?? {}

        return {
            ...baseValue,
            ignoreTerrainCost:
                [ignoreTerrainCost, baseSearchLimit?.ignoreTerrainCost].find(
                    (x) => x != undefined
                ) ?? false,
            crossOverPits:
                [crossOverPits, baseSearchLimit?.crossOverPits].find(
                    (x) => x != undefined
                ) ?? false,
            passThroughWalls:
                [passThroughWalls, baseSearchLimit?.passThroughWalls].find(
                    (x) => x != undefined
                ) ?? false,
            minimumDistance,
            maximumDistance,
            maximumMovementCost,
            squaddieAffiliation,
            canStopOnSquaddies:
                [canStopOnSquaddies, baseSearchLimit?.canStopOnSquaddies].find(
                    (x) => x != undefined
                ) ?? false,
        }
    },
}

const targetingSearchLimit: SearchLimit = {
    ignoreTerrainCost: true,
    crossOverPits: true,
    passThroughWalls: false,
    canStopOnSquaddies: true,
}

const landBasedMovementSearchLimit: SearchLimit = {
    ignoreTerrainCost: false,
    crossOverPits: false,
    passThroughWalls: false,
    canStopOnSquaddies: false,
}
