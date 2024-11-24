import { BattleActionSquaddieChange } from "./battleAction/battleActionSquaddieChange"
import {
    BattleActionActionContext,
    BattleActionActionContextService,
} from "./battleAction/battleActionActionContext"

export interface SquaddieSquaddieResults {
    actingBattleSquaddieId: string
    actingContext: BattleActionActionContext

    targetedBattleSquaddieIds: string[]
    squaddieChanges: BattleActionSquaddieChange[]
}

export const SquaddieSquaddieResultsService = {
    new: ({
        actionContext,
        actingBattleSquaddieId,
        targetedBattleSquaddieIds,
        squaddieChanges,
    }: {
        actionContext: BattleActionActionContext
        actingBattleSquaddieId: string
        targetedBattleSquaddieIds: string[]
        squaddieChanges: BattleActionSquaddieChange[]
    }): SquaddieSquaddieResults => {
        return sanitize({
            actingContext: actionContext,
            actingBattleSquaddieId,
            targetedBattleSquaddieIds,
            squaddieChanges: squaddieChanges,
        })
    },
    sanitize: (result: SquaddieSquaddieResults): SquaddieSquaddieResults => {
        return sanitize(result)
    },
}

const sanitize = (result: SquaddieSquaddieResults): SquaddieSquaddieResults => {
    if (result.actingContext === undefined) {
        result.actingContext = BattleActionActionContextService.new({})
    }

    if (result.actingContext.actorAttributeModifiers === undefined) {
        result.actingContext.actorAttributeModifiers = []
    }

    return result
}
