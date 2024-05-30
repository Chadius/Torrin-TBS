import { DecidedActionEffect } from "./decidedActionEffect"
import { getValidValueOrDefault, isValidValue } from "../../utils/validityCheck"
import { DecidedActionSquaddieEffectService } from "./decidedActionSquaddieEffect"
import { ActionEffectType } from "../template/actionEffectTemplate"
import { DecidedActionMovementEffectService } from "./decidedActionMovementEffect"
import { DecidedActionEndTurnEffectService } from "./decidedActionEndTurnEffect"

export interface DecidedAction {
    actionPointCost: number
    actionTemplateName: string
    actionTemplateId: string
    battleSquaddieId: string
    actionEffects: DecidedActionEffect[]
}

export const DecidedActionService = {
    new: ({
        actionPointCost,
        actionTemplateName,
        actionTemplateId,
        battleSquaddieId,
        actionEffects,
    }: {
        actionPointCost?: number
        actionTemplateName?: string
        actionTemplateId?: string
        battleSquaddieId: string
        actionEffects?: DecidedActionEffect[]
    }): DecidedAction => {
        return sanitize({
            actionPointCost,
            actionTemplateName,
            actionTemplateId,
            battleSquaddieId,
            actionEffects,
        })
    },
    areDecisionsRequired: (decidedAction: DecidedAction): boolean => {
        if (decidedAction.actionEffects.length === 0) {
            return false
        }

        const mostRecentDecidedActionEffect: DecidedActionEffect =
            decidedAction.actionEffects[decidedAction.actionEffects.length - 1]
        switch (mostRecentDecidedActionEffect.type) {
            case ActionEffectType.SQUADDIE:
                return DecidedActionSquaddieEffectService.areDecisionsRequired(
                    mostRecentDecidedActionEffect
                )
            case ActionEffectType.MOVEMENT:
                return DecidedActionMovementEffectService.areDecisionsRequired(
                    mostRecentDecidedActionEffect
                )
            case ActionEffectType.END_TURN:
                return DecidedActionEndTurnEffectService.areDecisionsRequired(
                    mostRecentDecidedActionEffect
                )
        }
    },
    getMultipleAttackPenalty: (decidedAction: DecidedAction): number => {
        const getMAPFromDecidedActionEffect = (
            accumulator: number,
            decidedActionEffect: DecidedActionEffect
        ): number => {
            if (decidedActionEffect.type !== ActionEffectType.SQUADDIE) {
                return accumulator
            }

            return (
                accumulator +
                DecidedActionSquaddieEffectService.getMultipleAttackPenalty(
                    decidedActionEffect
                )
            )
        }

        return decidedAction.actionEffects.reduce(
            getMAPFromDecidedActionEffect,
            0
        )
    },
}

const sanitize = (action: DecidedAction): DecidedAction => {
    if (!isValidValue(action.battleSquaddieId)) {
        throw new Error(
            "DecidedAction cannot sanitize, missing battleSquaddieId"
        )
    }
    action.actionPointCost = getValidValueOrDefault(action.actionPointCost, 1)
    action.actionEffects = getValidValueOrDefault(action.actionEffects, [])
    return action
}
