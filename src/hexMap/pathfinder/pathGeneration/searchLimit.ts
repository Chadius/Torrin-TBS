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
            ignoreTerrainCost: [
                ignoreTerrainCost,
                baseSearchLimit?.ignoreTerrainCost,
                false,
            ].find((x) => x != undefined),
            crossOverPits: [
                crossOverPits,
                baseSearchLimit?.crossOverPits,
                false,
            ].find((x) => x != undefined),
            passThroughWalls: [
                passThroughWalls,
                baseSearchLimit?.passThroughWalls,
                false,
            ].find((x) => x != undefined),
            minimumDistance,
            maximumDistance,
            maximumMovementCost,
            squaddieAffiliation,
            canStopOnSquaddies: [
                canStopOnSquaddies,
                baseSearchLimit?.canStopOnSquaddies,
                false,
            ].find((x) => x != undefined),
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
