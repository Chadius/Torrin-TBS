import { GameEngineState } from "../../../gameEngine/gameEngine"
import { BattleSquaddie } from "../../battleSquaddie"
import {
    DIE_SIZE,
    RollModifierType,
    RollResult,
    RollResultService,
} from "./rollResult"
import { AttributeModifier } from "../../../squaddie/attribute/attributeModifier"
import {
    ActionEffectTemplate,
    VersusSquaddieResistance,
} from "../../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { CalculateAgainstArmor } from "./calculateAgainstArmor"
import { CalculatedEffect, DegreeOfSuccessExplanation } from "./calculator"
import { isValidValue } from "../../../utils/objectValidityCheck"
import { DegreeOfSuccess, DegreeOfSuccessService } from "./degreeOfSuccess"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { DamageType, SquaddieService } from "../../../squaddie/squaddieService"
import {
    DamageExplanation,
    DamageExplanationService,
} from "../../history/battleAction/battleActionSquaddieChange"
import {
    BattleActionActorContext,
    BattleActionActorContextService,
} from "../../history/battleAction/battleActionActorContext"
import { BattleActionsDuringTurnService } from "../../history/battleAction/battleActionsDuringTurn"
import { BattleActionService } from "../../history/battleAction/battleAction"
import { AttributeTypeAndAmount } from "../../../squaddie/attribute/attributeType"
import { NumberGeneratorStrategy } from "../../numberGenerator/strategy"
import { BattleActionRecorder } from "../../history/battleAction/battleActionRecorder"
import { ObjectRepository } from "../../objectRepository"

export const CalculatorAttack = {
    getDegreeOfSuccess: ({
        actionEffectTemplate,
        actorContext,
        actorBattleSquaddie,
        targetBattleSquaddie,
        targetSquaddieTemplate,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        targetBattleSquaddie: BattleSquaddie
        targetSquaddieTemplate: SquaddieTemplate
        actorContext: BattleActionActorContext
        actorBattleSquaddie: BattleSquaddie
    }): DegreeOfSuccess =>
        getDegreeOfSuccess({
            actionEffectTemplate,
            actorContext,
            actorBattleSquaddie,
            targetBattleSquaddie,
            targetSquaddieTemplate,
        }),
    getAllPossibleDegreesOfSuccess: ({
        actionEffectTemplate,
        actorContext,
        actorBattleSquaddie,
        targetBattleSquaddie,
        targetSquaddieTemplate,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        targetBattleSquaddie: BattleSquaddie
        targetSquaddieTemplate: SquaddieTemplate
        actorContext: BattleActionActorContext
        actorBattleSquaddie: BattleSquaddie
    }): DegreeOfSuccessExplanation =>
        getAllPossibleDegreesOfSuccess({
            actionEffectTemplate,
            actorContext,
            actorBattleSquaddie,
            targetBattleSquaddie,
            targetSquaddieTemplate,
        }),
    getActingSquaddieModifiersForAttack: (): AttributeTypeAndAmount[] =>
        getActingSquaddieModifiersForAttack(),
    calculateEffectBasedOnDegreeOfSuccess: ({
        actionEffectTemplate,
        actorContext,
        degreeOfSuccess,
        targetSquaddieTemplate,
        targetBattleSquaddie,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        actorContext: BattleActionActorContext
        degreeOfSuccess: DegreeOfSuccess
        targetSquaddieTemplate: SquaddieTemplate
        targetBattleSquaddie: BattleSquaddie
    }): CalculatedEffect =>
        calculateEffectBasedOnDegreeOfSuccess({
            actionEffectTemplate,
            actorContext,
            degreeOfSuccess,
            targetSquaddieTemplate,
            targetBattleSquaddie,
        }),
    getTargetSquaddieModifiers: ({
        actionEffectTemplate,
        targetBattleSquaddie,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        targetBattleSquaddie: BattleSquaddie
    }): AttributeTypeAndAmount[] =>
        getTargetSquaddieModifiers({
            actionEffectTemplate,
            targetBattleSquaddie,
        }),
    getActorContext: ({
        actionEffectTemplate,
        actorSquaddieTemplate,
        numberGenerator,
        objectRepository,
        battleActionRecorder,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        actorSquaddieTemplate: SquaddieTemplate
        battleActionRecorder: BattleActionRecorder
        numberGenerator: NumberGeneratorStrategy
        objectRepository: ObjectRepository
    }): BattleActionActorContext => {
        let actingSquaddieModifiers =
            CalculatorAttack.getActingSquaddieModifiersForAttack()
        let actingSquaddieRoll: RollResult
        actingSquaddieRoll = maybeMakeAttackRoll({
            actionEffectTemplate,
            battleActionRecorder,
            actorSquaddieTemplate,
            numberGenerator,
            objectRepository,
        })

        return BattleActionActorContextService.new({
            actingSquaddieModifiers,
            actingSquaddieRoll,
            targetSquaddieModifiers: {},
        })
    },
    calculateMultipleAttackPenaltyForActionsThisTurn: (
        gameEngineState: GameEngineState
    ): number =>
        calculateMultipleAttackPenaltyForActionsThisTurn(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            gameEngineState.repository
        ),
}

const calculateMultipleAttackPenaltyForActionsThisTurn = (
    battleActionRecorder: BattleActionRecorder,
    objectRepository: ObjectRepository
) => {
    return BattleActionsDuringTurnService.getAll(
        battleActionRecorder.actionsAlreadyAnimatedThisTurn
    ).reduce((mapTotal, battleAction) => {
        return (
            mapTotal +
            BattleActionService.multipleAttackPenaltyMultiplier(
                battleAction,
                objectRepository
            )
        )
    }, 0)
}

const getActingSquaddieModifiersForAttack = (): AttributeTypeAndAmount[] => {
    return [].filter((attribute) => attribute.amount !== 0)
}

const conformToSixSidedDieRoll = (numberGeneratorResult: number): number => {
    const inRangeNumber = numberGeneratorResult % DIE_SIZE
    return inRangeNumber === 0 ? DIE_SIZE : inRangeNumber
}

const maybeMakeAttackRoll = ({
    actionEffectTemplate,
    battleActionRecorder,
    actorSquaddieTemplate,
    numberGenerator,
    objectRepository,
}: {
    actionEffectTemplate: ActionEffectTemplate
    battleActionRecorder: BattleActionRecorder
    actorSquaddieTemplate: SquaddieTemplate
    numberGenerator: NumberGeneratorStrategy
    objectRepository: ObjectRepository
}): RollResult => {
    if (doesActionNeedAnAttackRoll(actionEffectTemplate)) {
        const rollModifiers: {
            [t in RollModifierType]?: number
        } = {
            [RollModifierType.MULTIPLE_ATTACK_PENALTY]:
                calculateMultipleAttackPenaltyForActionsThisTurn(
                    battleActionRecorder,
                    objectRepository
                ),
            [RollModifierType.PROFICIENCY]:
                SquaddieService.getVersusSquaddieResistanceProficiencyBonus({
                    squaddieTemplate: actorSquaddieTemplate,
                    versusSquaddieResistance:
                        actionEffectTemplate.targetConstraints
                            .versusSquaddieResistance,
                }).net,
        }

        const attackRoll = [
            conformToSixSidedDieRoll(numberGenerator.next()),
            conformToSixSidedDieRoll(numberGenerator.next()),
        ]
        return RollResultService.new({
            occurred: true,
            rolls: [...attackRoll],
            rollModifiers,
        })
    }
    return RollResultService.new({
        occurred: false,
        rolls: [],
    })
}

const doesActionNeedAnAttackRoll = (action: ActionEffectTemplate): boolean =>
    TraitStatusStorageService.getStatus(
        action.traits,
        Trait.ALWAYS_SUCCEEDS
    ) !== true

const isActionAgainstArmor = (
    actionEffectTemplate: ActionEffectTemplate
): boolean =>
    actionEffectTemplate.targetConstraints.versusSquaddieResistance ===
    VersusSquaddieResistance.ARMOR

const getTargetSquaddieModifiers = ({
    actionEffectTemplate,
    targetBattleSquaddie,
}: {
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
}): AttributeTypeAndAmount[] => {
    if (isActionAgainstArmor(actionEffectTemplate)) {
        return CalculateAgainstArmor.getTargetSquaddieModifierTotal(
            targetBattleSquaddie
        )
    }

    return []
}

const adjustDegreeOfSuccessBasedOnExtremeRoll = (
    actingSquaddieRoll: RollResult,
    degreeOfSuccess: DegreeOfSuccess
) => {
    if (RollResultService.isMaximumRoll(actingSquaddieRoll)) {
        degreeOfSuccess =
            DegreeOfSuccessService.upgradeByOneStep(degreeOfSuccess)
    }
    if (RollResultService.isMinimumRoll(actingSquaddieRoll)) {
        degreeOfSuccess =
            DegreeOfSuccessService.degradeByOneStep(degreeOfSuccess)
    }
    return degreeOfSuccess
}

const calculateDegreeOfSuccessBasedOnRollTotalVersusTarget = (
    totalAttackRoll: any,
    targetArmorClass: number
): DegreeOfSuccess => {
    let degreeOfSuccess: DegreeOfSuccess = DegreeOfSuccess.FAILURE
    switch (true) {
        case totalAttackRoll >= targetArmorClass + DIE_SIZE:
            degreeOfSuccess = DegreeOfSuccess.CRITICAL_SUCCESS
            break
        case totalAttackRoll >= targetArmorClass:
            degreeOfSuccess = DegreeOfSuccess.SUCCESS
            break
        case totalAttackRoll <= targetArmorClass - DIE_SIZE:
            degreeOfSuccess = DegreeOfSuccess.CRITICAL_FAILURE
            break
    }
    return degreeOfSuccess
}
const compareAttackRollToGetDegreeOfSuccess = ({
    actingSquaddieRoll,
    actionEffectTemplate,
    targetBattleSquaddie,
    targetSquaddieTemplate,
    actingSquaddieModifierTotal,
}: {
    actingSquaddieRoll: RollResult
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    targetSquaddieTemplate: SquaddieTemplate
    actingSquaddieModifierTotal: number
}): DegreeOfSuccess => {
    if (
        TraitStatusStorageService.getStatus(
            actionEffectTemplate.traits,
            Trait.ALWAYS_SUCCEEDS
        )
    ) {
        return DegreeOfSuccess.SUCCESS
    }

    let totalAttackRoll =
        RollResultService.totalAttackRoll(actingSquaddieRoll) +
        actingSquaddieModifierTotal
    let targetArmorClass = SquaddieService.getArmorClass({
        battleSquaddie: targetBattleSquaddie,
        squaddieTemplate: targetSquaddieTemplate,
    }).net
    let degreeOfSuccess = calculateDegreeOfSuccessBasedOnRollTotalVersusTarget(
        totalAttackRoll,
        targetArmorClass
    )
    degreeOfSuccess = adjustDegreeOfSuccessBasedOnExtremeRoll(
        actingSquaddieRoll,
        degreeOfSuccess
    )
    degreeOfSuccess = capCriticalSuccessIfResultCannotCriticallySucceed(
        actionEffectTemplate,
        degreeOfSuccess
    )
    degreeOfSuccess = capCriticalFailureIfResultCannotCriticallyFail(
        actionEffectTemplate,
        degreeOfSuccess
    )

    return degreeOfSuccess
}

const capCriticalSuccessIfResultCannotCriticallySucceed = (
    actionEffectTemplate: ActionEffectTemplate,
    degreeOfSuccess: DegreeOfSuccess
) => {
    const canCriticallySucceed: boolean = !TraitStatusStorageService.getStatus(
        actionEffectTemplate.traits,
        Trait.CANNOT_CRITICALLY_SUCCEED
    )
    if (
        !canCriticallySucceed &&
        degreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS
    ) {
        degreeOfSuccess = DegreeOfSuccess.SUCCESS
    }
    return degreeOfSuccess
}

const capCriticalFailureIfResultCannotCriticallyFail = (
    actionEffectTemplate: ActionEffectTemplate,
    degreeOfSuccess: DegreeOfSuccess
) => {
    const canCriticallyFail: boolean = !TraitStatusStorageService.getStatus(
        actionEffectTemplate.traits,
        Trait.CANNOT_CRITICALLY_FAIL
    )
    if (
        !canCriticallyFail &&
        degreeOfSuccess === DegreeOfSuccess.CRITICAL_FAILURE
    ) {
        degreeOfSuccess = DegreeOfSuccess.FAILURE
    }
    return degreeOfSuccess
}

const getDegreeOfSuccess = ({
    actionEffectTemplate,
    targetBattleSquaddie,
    targetSquaddieTemplate,
    actorContext,
}: {
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    targetSquaddieTemplate: SquaddieTemplate
    actorBattleSquaddie: BattleSquaddie
    actorContext: BattleActionActorContext
}): DegreeOfSuccess => {
    let actingSquaddieModifierTotal: number =
        actorContext.actorAttributeModifiers.reduce(
            (previousValue: number, currentValue: AttributeTypeAndAmount) => {
                return previousValue + currentValue.amount
            },
            0
        )

    let targetSquaddieModifierTotal: number =
        actorContext.targetAttributeModifiers[
            targetBattleSquaddie.battleSquaddieId
        ].reduce(
            (previousValue: number, currentValue: AttributeTypeAndAmount) => {
                return previousValue + currentValue.amount
            },
            0
        )

    return compareAttackRollToGetDegreeOfSuccess({
        actionEffectTemplate,
        targetBattleSquaddie: targetBattleSquaddie,
        targetSquaddieTemplate: targetSquaddieTemplate,
        actingSquaddieRoll: actorContext.actorRoll,
        actingSquaddieModifierTotal:
            actingSquaddieModifierTotal - targetSquaddieModifierTotal,
    })
}

const getAllPossibleDegreesOfSuccess = ({
    actionEffectTemplate,
    targetBattleSquaddie,
    targetSquaddieTemplate,
    actorContext,
}: {
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    targetSquaddieTemplate: SquaddieTemplate
    actorBattleSquaddie: BattleSquaddie
    actorContext: BattleActionActorContext
}): DegreeOfSuccessExplanation => {
    let actorSquaddieModifierTotal: number =
        actorContext.actorAttributeModifiers.reduce(
            (previousValue: number, currentValue: AttributeTypeAndAmount) => {
                return previousValue + currentValue.amount
            },
            0
        )

    const rollModifierTotal = actorContext?.actorRoll?.rollModifiers
        ? Object.values(actorContext.actorRoll.rollModifiers).reduce(
              (sum, currentValue) => sum + currentValue,
              0
          )
        : 0

    actorContext.targetAttributeModifiers[
        targetBattleSquaddie.battleSquaddieId
    ] = getTargetSquaddieModifiers({
        actionEffectTemplate,
        targetBattleSquaddie,
    })

    let targetSquaddieModifierTotal: number =
        actorContext.targetAttributeModifiers[
            targetBattleSquaddie.battleSquaddieId
        ].reduce(
            (previousValue: number, currentValue: AttributeTypeAndAmount) => {
                return previousValue + currentValue.amount
            },
            0
        )

    let targetArmorClass = SquaddieService.getArmorClass({
        battleSquaddie: targetBattleSquaddie,
        squaddieTemplate: targetSquaddieTemplate,
    }).net

    return calculateChanceOfDegreeOfSuccessBasedOnActingSquaddieModifierTotal(
        actorSquaddieModifierTotal +
            rollModifierTotal -
            (targetSquaddieModifierTotal + targetArmorClass)
    )
}

const calculateEffectBasedOnDegreeOfSuccess = ({
    actionEffectTemplate,
    degreeOfSuccess,
    targetSquaddieTemplate,
    targetBattleSquaddie,
}: {
    actionEffectTemplate: ActionEffectTemplate
    actorContext: BattleActionActorContext
    degreeOfSuccess: DegreeOfSuccess
    targetSquaddieTemplate: SquaddieTemplate
    targetBattleSquaddie: BattleSquaddie
}): CalculatedEffect => {
    let damageExplanation: DamageExplanation = DamageExplanationService.new({})

    Object.keys(actionEffectTemplate.damageDescriptions).forEach(
        (damageType: DamageType) => {
            let rawDamageFromAction =
                actionEffectTemplate.damageDescriptions[damageType]
            if (degreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
                rawDamageFromAction *= 2
            }
            if (DegreeOfSuccessService.atBestFailure(degreeOfSuccess)) {
                rawDamageFromAction = 0
            }
            const damageExplanationForThisEffect =
                SquaddieService.calculateDealtDamageToTheSquaddie({
                    squaddieTemplate: targetSquaddieTemplate,
                    battleSquaddie: targetBattleSquaddie,
                    damage: rawDamageFromAction,
                    damageType,
                })
            damageExplanation.net += damageExplanationForThisEffect.net
            damageExplanation.raw += damageExplanationForThisEffect.raw
            damageExplanation.absorbed +=
                damageExplanationForThisEffect.absorbed
        }
    )

    let attributeModifiersToAddToTarget: AttributeModifier[] =
        calculateAttributeModifiers({
            actionEffectTemplate,
        })

    return {
        attributeModifiersToAddToTarget,
        damage: damageExplanation,
        degreeOfSuccess,
        healingReceived: 0,
    }
}

const calculateAttributeModifiers = ({
    actionEffectTemplate,
}: {
    actionEffectTemplate: ActionEffectTemplate
}): AttributeModifier[] => {
    if (!isValidValue(actionEffectTemplate.attributeModifiers)) {
        return []
    }

    return [...actionEffectTemplate.attributeModifiers]
}

const calculateChanceOfDegreeOfSuccessBasedOnActingSquaddieModifierTotal = (
    actingSquaddieModifierTotal: number
): DegreeOfSuccessExplanation => {
    const chanceOutOf36: {
        [actorBonusOverDefender: number]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: number
            [DegreeOfSuccess.SUCCESS]: number
            [DegreeOfSuccess.FAILURE]: number
            [DegreeOfSuccess.CRITICAL_FAILURE]: number
        }
    } = {
        [4]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 35,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 0,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [3]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 35,
            [DegreeOfSuccess.SUCCESS]: 0,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [2]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 33,
            [DegreeOfSuccess.SUCCESS]: 2,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [1]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 30,
            [DegreeOfSuccess.SUCCESS]: 5,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [0]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 26,
            [DegreeOfSuccess.SUCCESS]: 9,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [-1]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 21,
            [DegreeOfSuccess.SUCCESS]: 14,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [-2]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 15,
            [DegreeOfSuccess.SUCCESS]: 20,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [-3]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 10,
            [DegreeOfSuccess.SUCCESS]: 25,
            [DegreeOfSuccess.FAILURE]: 0,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-4]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 6,
            [DegreeOfSuccess.SUCCESS]: 27,
            [DegreeOfSuccess.FAILURE]: 2,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-5]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 3,
            [DegreeOfSuccess.SUCCESS]: 27,
            [DegreeOfSuccess.FAILURE]: 5,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-6]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 25,
            [DegreeOfSuccess.FAILURE]: 9,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-7]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 20,
            [DegreeOfSuccess.FAILURE]: 14,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-8]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 14,
            [DegreeOfSuccess.FAILURE]: 20,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-9]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 9,
            [DegreeOfSuccess.FAILURE]: 25,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-10]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 5,
            [DegreeOfSuccess.FAILURE]: 27,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 3,
        },
        [-11]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 2,
            [DegreeOfSuccess.FAILURE]: 27,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 6,
        },
        [-12]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 0,
            [DegreeOfSuccess.FAILURE]: 25,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 10,
        },
        [-13]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 20,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 15,
        },
        [-14]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 14,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 21,
        },
        [-15]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 9,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 26,
        },
        [-16]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 5,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 30,
        },
        [-17]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 2,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 33,
        },
        [-18]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 0,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 35,
        },
        [-19]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 0,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 35,
        },
    }

    switch (true) {
        case actingSquaddieModifierTotal > 4:
            return {
                [DegreeOfSuccess.CRITICAL_SUCCESS]: 35,
                [DegreeOfSuccess.SUCCESS]: 1,
                [DegreeOfSuccess.FAILURE]: 0,
                [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
                [DegreeOfSuccess.NONE]: undefined,
            }
        case actingSquaddieModifierTotal < -19:
            return {
                [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
                [DegreeOfSuccess.SUCCESS]: 0,
                [DegreeOfSuccess.FAILURE]: 1,
                [DegreeOfSuccess.CRITICAL_FAILURE]: 35,
                [DegreeOfSuccess.NONE]: undefined,
            }
        default:
            return {
                ...chanceOutOf36[actingSquaddieModifierTotal],
                [DegreeOfSuccess.NONE]: undefined,
            }
    }
}
