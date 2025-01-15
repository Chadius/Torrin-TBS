import {
    InBattleAttributes,
    InBattleAttributesService,
} from "../../stats/inBattleAttributes"
import { DegreeOfSuccess } from "../../calculator/actionCalculator/degreeOfSuccess"
import { isValidValue } from "../../../utils/validityCheck"

export interface DamageExplanation {
    raw: number
    absorbed: number
    net: number
    willKo: boolean
}

export const DamageExplanationService = {
    new: ({
        raw,
        absorbed,
        net,
        willKo,
    }: {
        raw?: number
        absorbed?: number
        net?: number
        willKo?: boolean
    }): DamageExplanation => ({
        raw: raw ?? 0,
        absorbed: absorbed ?? 0,
        net: net ?? 0,
        willKo: willKo ?? false,
    }),
}

export interface BattleActionSquaddieChange {
    battleSquaddieId: string
    attributesBefore: InBattleAttributes
    attributesAfter: InBattleAttributes
    damage: DamageExplanation
    healingReceived: number
    actorDegreeOfSuccess: DegreeOfSuccess
    chanceOfDegreeOfSuccess?: number
}

export const BattleActionSquaddieChangeService = {
    new: ({
        battleSquaddieId,
        attributesBefore,
        attributesAfter,
        damageExplanation,
        healingReceived,
        actorDegreeOfSuccess,
        chanceOfDegreeOfSuccess,
    }: {
        battleSquaddieId: string
        attributesBefore?: InBattleAttributes
        attributesAfter?: InBattleAttributes
        damageExplanation?: DamageExplanation
        healingReceived?: number
        actorDegreeOfSuccess?: DegreeOfSuccess
        chanceOfDegreeOfSuccess?: number
    }): BattleActionSquaddieChange =>
        newBattleActionSquaddieChange({
            battleSquaddieId,
            attributesBefore,
            attributesAfter,
            damageExplanation,
            healingReceived,
            actorDegreeOfSuccess,
            chanceOfDegreeOfSuccess,
        }),
    isSquaddieHindered: (result: BattleActionSquaddieChange): boolean => {
        return result.damage.net > 0
    },
    isSquaddieHelped: (result: BattleActionSquaddieChange): boolean => {
        return result.healingReceived > 0
    },
    clone: (original: BattleActionSquaddieChange): BattleActionSquaddieChange =>
        newBattleActionSquaddieChange({
            battleSquaddieId: original.battleSquaddieId,
            attributesBefore: InBattleAttributesService.clone(
                original.attributesBefore
            ),
            attributesAfter: InBattleAttributesService.clone(
                original.attributesAfter
            ),
            damageExplanation: original.damage,
            healingReceived: original.healingReceived,
            actorDegreeOfSuccess: original.actorDegreeOfSuccess,
            chanceOfDegreeOfSuccess: original.chanceOfDegreeOfSuccess,
        }),
}

const newBattleActionSquaddieChange = ({
    battleSquaddieId,
    attributesBefore,
    attributesAfter,
    damageExplanation,
    healingReceived,
    actorDegreeOfSuccess,
    chanceOfDegreeOfSuccess,
}: {
    battleSquaddieId: string
    attributesBefore?: InBattleAttributes
    attributesAfter?: InBattleAttributes
    damageExplanation?: DamageExplanation
    healingReceived?: number
    actorDegreeOfSuccess?: DegreeOfSuccess
    chanceOfDegreeOfSuccess?: number
}): BattleActionSquaddieChange => ({
    battleSquaddieId,
    attributesBefore: isValidValue(attributesBefore)
        ? attributesBefore
        : undefined,
    attributesAfter: isValidValue(attributesAfter)
        ? attributesAfter
        : undefined,
    damage: damageExplanation ?? DamageExplanationService.new({}),
    healingReceived: healingReceived ?? 0,
    actorDegreeOfSuccess: actorDegreeOfSuccess ?? DegreeOfSuccess.NONE,
    chanceOfDegreeOfSuccess,
})
