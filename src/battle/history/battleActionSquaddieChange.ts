import { InBattleAttributes } from "../stats/inBattleAttributes"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { isValidValue } from "../../utils/validityCheck"

export interface BattleActionSquaddieChange {
    battleSquaddieId: string
    attributesBefore: InBattleAttributes
    attributesAfter: InBattleAttributes
    damageTaken: number
    healingReceived: number
    actorDegreeOfSuccess: DegreeOfSuccess
}

export const BattleActionSquaddieChangeService = {
    new: ({
        battleSquaddieId,
        attributesBefore,
        attributesAfter,
        damageTaken,
        healingReceived,
        actorDegreeOfSuccess,
    }: {
        battleSquaddieId: string
        attributesBefore?: InBattleAttributes
        attributesAfter?: InBattleAttributes
        damageTaken?: number
        healingReceived?: number
        actorDegreeOfSuccess?: DegreeOfSuccess
    }): BattleActionSquaddieChange => ({
        battleSquaddieId,
        attributesBefore: isValidValue(attributesBefore)
            ? attributesBefore
            : undefined,
        attributesAfter: isValidValue(attributesAfter)
            ? attributesAfter
            : undefined,
        damageTaken: damageTaken ?? 0,
        healingReceived: healingReceived ?? 0,
        actorDegreeOfSuccess: actorDegreeOfSuccess ?? DegreeOfSuccess.NONE,
    }),
    isSquaddieHindered: (result: BattleActionSquaddieChange): boolean => {
        return result.damageTaken > 0
    },
    isSquaddieHelped: (result: BattleActionSquaddieChange): boolean => {
        return result.healingReceived > 0
    },
}
