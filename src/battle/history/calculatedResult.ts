import { getValidValueOrDefault } from "../../utils/objectValidityCheck"
import { BattleActionSquaddieChange } from "./battleAction/battleActionSquaddieChange"
import { BattleActionActorContext } from "./battleAction/battleActionActorContext"

export type ActionEffectChange = {
    actorContext: BattleActionActorContext
    squaddieChanges: BattleActionSquaddieChange[]
}

export const ActionEffectChangesService = {
    new: ({
        actorContext,
        squaddieChanges,
    }: {
        actorContext: BattleActionActorContext
        squaddieChanges: BattleActionSquaddieChange[]
    }): ActionEffectChange => ({
        actorContext,
        squaddieChanges,
    }),
}

export interface CalculatedResult {
    actorBattleSquaddieId: string
    changesPerEffect: ActionEffectChange[]
}

export const CalculatedResultService = {
    new: ({
        actorBattleSquaddieId,
        changesPerEffect,
    }: {
        actorBattleSquaddieId: string
        changesPerEffect: ActionEffectChange[]
    }): CalculatedResult => {
        return sanitize({
            actorBattleSquaddieId: actorBattleSquaddieId,
            changesPerEffect,
        })
    },
    sanitize: (result: CalculatedResult): CalculatedResult => {
        return sanitize(result)
    },
}

const sanitize = (result: CalculatedResult): CalculatedResult => {
    result.changesPerEffect = getValidValueOrDefault(
        result.changesPerEffect,
        []
    )

    return result
}
