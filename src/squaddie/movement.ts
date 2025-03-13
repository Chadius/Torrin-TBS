import {
    Trait,
    TraitStatusStorage,
    TraitStatusStorageService,
} from "../trait/traitStatusStorage"
import { getValidValueOrDefault, isValidValue } from "../utils/validityCheck"

export interface SquaddieMovement {
    movementPerAction: number
    passThroughWalls: boolean
    crossOverPits: boolean
    ignoreTerrainCost: boolean
}

export const SquaddieMovementService = {
    new: ({
        movementPerAction,
        traits,
    }: {
        movementPerAction?: number
        traits?: TraitStatusStorage
    }): SquaddieMovement => {
        return createNewSquaddieMovementWithTraits({
            movementPerAction,
            traits,
        })
    },
    sanitize: (data: SquaddieMovement): SquaddieMovement => {
        return sanitize(data)
    },
}

const createNewSquaddieMovementWithTraits = ({
    movementPerAction,
    traits,
}: {
    movementPerAction?: number
    traits?: TraitStatusStorage
}): SquaddieMovement => {
    let newMovement: number = 2
    if (movementPerAction || movementPerAction === 0) {
        newMovement = movementPerAction
    }

    let passThroughWalls = false
    let crossOverPits = false
    let ignoreTerrainCost = false

    if (traits) {
        passThroughWalls = TraitStatusStorageService.getStatus(
            traits,
            Trait.PASS_THROUGH_WALLS
        )
        crossOverPits = TraitStatusStorageService.getStatus(
            traits,
            Trait.CROSS_OVER_PITS
        )
        ignoreTerrainCost = TraitStatusStorageService.getStatus(
            traits,
            Trait.HUSTLE
        )
    }

    return {
        movementPerAction: newMovement,
        crossOverPits,
        passThroughWalls,
        ignoreTerrainCost,
    }
}

const sanitize = (data: SquaddieMovement): SquaddieMovement => {
    data.movementPerAction = isValidValue(data.movementPerAction)
        ? data.movementPerAction
        : 0
    data.passThroughWalls = getValidValueOrDefault(data.passThroughWalls, false)
    data.crossOverPits = getValidValueOrDefault(data.crossOverPits, false)
    data.ignoreTerrainCost = getValidValueOrDefault(
        data.ignoreTerrainCost,
        false
    )
    return data
}
