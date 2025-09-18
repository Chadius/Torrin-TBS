import { ChallengeModifierSetting } from "../../challengeModifier/challengeModifierSetting"
import { ObjectRepository } from "../../objectRepository"

export interface CalculatorContext {
    challengeModifierSetting?: ChallengeModifierSetting
    actorBattleSquaddieId?: string
    objectRepository?: ObjectRepository
}

export const CalculatorContextService = {
    new: ({
        actorBattleSquaddieId,
        objectRepository,
        challengeModifierSetting,
    }: {
        actorBattleSquaddieId?: string
        objectRepository?: ObjectRepository
        challengeModifierSetting?: ChallengeModifierSetting
    }): CalculatorContext => {
        return sanitize({
            actorBattleSquaddieId,
            objectRepository,
            challengeModifierSetting,
        })
    },
    sanitize: (context: CalculatorContext): CalculatorContext =>
        sanitize(context),
}

const sanitize = (context: Partial<CalculatorContext>): CalculatorContext => {
    if (context.actorBattleSquaddieId && !context.objectRepository) {
        throw new Error(
            "CalculatorContextService.sanitize needs an objectRepository if an actorBattleSquaddie is provided"
        )
    }
    return {
        actorBattleSquaddieId: context.actorBattleSquaddieId,
        objectRepository: context.objectRepository,
        challengeModifierSetting: context.challengeModifierSetting,
    }
}
