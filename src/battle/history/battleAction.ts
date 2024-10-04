import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { isValidValue } from "../../utils/validityCheck"
import { BattleActionSquaddieChange } from "./battleActionSquaddieChange"
import { RollResult } from "../calculator/actionCalculator/rollResult"
import { AttributeTypeAndAmount } from "../../squaddie/attributeModifier"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../action/template/actionEffectSquaddieTemplate"

export const MULTIPLE_ATTACK_PENALTY = -3
export const MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX = 2
export type ActionPointCost = number | "End Turn"

export interface BattleActionActor {
    actorBattleSquaddieId: string
    actorContext?: BattleActionActionContext
}

export interface BattleActionAction {
    actionTemplateId?: string
    isMovement?: boolean
    isEndTurn?: boolean
}

export interface BattleActionEffect {
    movement?: {
        startLocation: HexCoordinate
        endLocation: HexCoordinate
    }
    squaddie?: BattleActionSquaddieChange[]
    endTurn?: boolean
}

export interface BattleActionAnimation {
    completed: boolean
}

export interface BattleAction {
    actor: BattleActionActor
    action: BattleActionAction
    effect: BattleActionEffect
    animation: BattleActionAnimation
}

export interface BattleActionActionContext {
    actingSquaddieModifiers: AttributeTypeAndAmount[]
    actingSquaddieRoll: RollResult
    targetSquaddieModifiers: {
        [squaddieId: string]: AttributeTypeAndAmount[]
    }
}

export const BattleActionActionContextService = {
    new: ({
        actingSquaddieModifiers,
        actingSquaddieRoll,
        targetSquaddieModifiers,
    }: {
        actingSquaddieModifiers?: AttributeTypeAndAmount[]
        actingSquaddieRoll?: RollResult
        targetSquaddieModifiers?: {
            [squaddieId: string]: AttributeTypeAndAmount[]
        }
    }): BattleActionActionContext => ({
        actingSquaddieModifiers: actingSquaddieModifiers ?? [],
        targetSquaddieModifiers: targetSquaddieModifiers ?? {},
        actingSquaddieRoll: actingSquaddieRoll ?? {
            occurred: false,
            rolls: [],
        },
    }),
}

export const BattleActionService = {
    new: ({
        actor,
        action,
        effect,
        animation,
    }: {
        actor: BattleActionActor
        action: BattleActionAction
        effect: BattleActionEffect
        animation?: BattleActionAnimation
    }): BattleAction => {
        return sanitize({
            actor,
            action,
            effect,
            animation,
        })
    },
    isAnimationComplete: (battleAction: BattleAction): boolean => {
        return isAnimationComplete(battleAction)
    },
    setAnimationCompleted: ({
        battleAction,
        animationCompleted,
    }: {
        animationCompleted: boolean
        battleAction: BattleAction
    }) => {
        if (!isValidValue(battleAction)) {
            return
        }
        battleAction.animation = {
            completed: animationCompleted,
        }
    },
    multipleAttackPenaltyMultiplier: (
        battleAction: BattleAction,
        objectRepository: ObjectRepository
    ): number => {
        if (!isValidValue(battleAction?.action.actionTemplateId)) {
            return 0
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            battleAction.action.actionTemplateId
        )

        const rawMAP: number = actionTemplate.actionEffectTemplates
            .filter((e) => e.type === ActionEffectType.SQUADDIE)
            .reduce(
                (accumulator, actionEffectTemplate) =>
                    accumulator +
                    ActionEffectSquaddieTemplateService.getMultipleAttackPenalty(
                        actionEffectTemplate as ActionEffectSquaddieTemplate
                    ),
                0
            )

        return Math.min(rawMAP, MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX)
    },
}

const sanitize = (battleAction: BattleAction): BattleAction => {
    if (
        !isValidValue(battleAction.action.actionTemplateId) &&
        !isValidValue(battleAction.action.isMovement) &&
        !isValidValue(battleAction.action.isEndTurn)
    ) {
        throw new Error(
            `BattleAction cannot sanitize, action must set one of: id, isMovement, isEndTurn`
        )
    }

    if (
        !isValidValue(battleAction.effect.movement) &&
        !isValidValue(battleAction.effect.squaddie) &&
        !isValidValue(battleAction.effect.endTurn)
    ) {
        throw new Error(
            `BattleAction cannot sanitize, effect must set one of: movement, squaddie, endTurn`
        )
    }

    if (!isValidValue(battleAction.animation)) {
        battleAction.animation = {
            completed: false,
        }
    }

    return battleAction
}

const isAnimationComplete = (battleAction: BattleAction) =>
    isValidValue(battleAction) &&
    isValidValue(battleAction.animation) &&
    battleAction.animation.completed
