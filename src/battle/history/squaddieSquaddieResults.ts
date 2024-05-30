import { ActionResultPerSquaddie } from "./actionResultPerSquaddie"
import { RollResult } from "../actionCalculator/rollResult"
import { ATTACK_MODIFIER } from "../modifierConstants"

export interface SquaddieSquaddieResults {
    actingSquaddieModifiers: { [modifier in ATTACK_MODIFIER]?: number }
    actingBattleSquaddieId: string
    targetedBattleSquaddieIds: string[]
    actingSquaddieRoll: RollResult
    resultPerTarget: {
        [battleId: string]: ActionResultPerSquaddie
    }
}

export const SquaddieSquaddieResultsService = {
    new: ({
        actingSquaddieModifiers,
        actingBattleSquaddieId,
        targetedBattleSquaddieIds,
        actingSquaddieRoll,
        resultPerTarget,
    }: {
        actingSquaddieModifiers: { [modifier in ATTACK_MODIFIER]?: number }
        actingBattleSquaddieId: string
        targetedBattleSquaddieIds: string[]
        actingSquaddieRoll: RollResult
        resultPerTarget: {
            [_: string]: ActionResultPerSquaddie
        }
    }): SquaddieSquaddieResults => {
        return sanitize({
            actingSquaddieModifiers,
            actingBattleSquaddieId,
            targetedBattleSquaddieIds,
            actingSquaddieRoll,
            resultPerTarget,
        })
    },
    sanitize: (result: SquaddieSquaddieResults): SquaddieSquaddieResults => {
        return sanitize(result)
    },
}

const sanitize = (result: SquaddieSquaddieResults): SquaddieSquaddieResults => {
    if (result.actingSquaddieModifiers === undefined) {
        result.actingSquaddieModifiers = {}
    }

    return result
}
