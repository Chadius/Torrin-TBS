import { ProcessedActionEffect } from "./processedActionEffect"
import { getValidValueOrDefault } from "../../utils/validityCheck"
import { ActionEffectType } from "../template/actionEffectTemplate"
import { ProcessedActionSquaddieEffectService } from "./processedActionSquaddieEffect"
import { BattleAction } from "../../battle/history/battleAction"

export const MULTIPLE_ATTACK_PENALTY = -3
export const MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX = 2

export type ActionPointCost = number | "End Turn"

export interface ProcessedAction {
    actionPointCost: ActionPointCost
    battleAction: BattleAction
    processedActionEffects: ProcessedActionEffect[]
}

export const ProcessedActionService = {
    new: ({
        actionPointCost,
        battleAction,
        processedActionEffects,
    }: {
        actionPointCost: number | "End Turn"
        battleAction: BattleAction
        processedActionEffects?: ProcessedActionEffect[]
    }): ProcessedAction => {
        return sanitize({
            actionPointCost,
            battleAction,
            processedActionEffects,
        })
    },
    multipleAttackPenaltyMultiplier: (
        processedAction: ProcessedAction
    ): number => {
        const getMAPFromProcessedActionEffect = (
            accumulator: number,
            processedActionEffect: ProcessedActionEffect
        ): number => {
            if (processedActionEffect.type !== ActionEffectType.SQUADDIE) {
                return accumulator
            }

            if (
                processedActionEffect.decidedActionEffect.type !==
                ActionEffectType.SQUADDIE
            ) {
                return accumulator
            }

            return (
                accumulator +
                ProcessedActionSquaddieEffectService.getMultipleAttackPenalty(
                    processedActionEffect
                )
            )
        }

        return Math.min(
            processedAction.processedActionEffects.reduce(
                getMAPFromProcessedActionEffect,
                0
            ),
            MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX
        )
    },
}

const sanitize = (processedAction: ProcessedAction): ProcessedAction => {
    processedAction.processedActionEffects = getValidValueOrDefault(
        processedAction.processedActionEffects,
        []
    )
    return processedAction
}
