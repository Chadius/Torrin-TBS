import { RollResult } from "../actionCalculator/rollResult"
import { ATTACK_MODIFIER } from "../modifierConstants"
import { BattleActionSquaddieChange } from "./battleActionSquaddieChange"

export interface SquaddieSquaddieResults {
    actingSquaddieModifiers: { [modifier in ATTACK_MODIFIER]?: number }
    actingSquaddieRoll: RollResult
    actingBattleSquaddieId: string

    targetedBattleSquaddieIds: string[]
    squaddieChanges: BattleActionSquaddieChange[]
}

export const SquaddieSquaddieResultsService = {
    new: ({
        actingSquaddieModifiers,
        actingBattleSquaddieId,
        targetedBattleSquaddieIds,
        actingSquaddieRoll,
        squaddieChanges,
    }: {
        actingSquaddieModifiers: { [modifier in ATTACK_MODIFIER]?: number }
        actingBattleSquaddieId: string
        targetedBattleSquaddieIds: string[]
        actingSquaddieRoll: RollResult
        squaddieChanges: BattleActionSquaddieChange[]
    }): SquaddieSquaddieResults => {
        return sanitize({
            actingSquaddieModifiers,
            actingBattleSquaddieId,
            targetedBattleSquaddieIds,
            actingSquaddieRoll,
            squaddieChanges: squaddieChanges,
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
