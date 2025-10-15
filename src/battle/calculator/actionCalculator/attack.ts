import { BattleSquaddie } from "../../battleSquaddie"
import {
    DIE_SIZE,
    RollModifierEnum,
    TRollModifier,
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
import {
    DegreeOfSuccess,
    DegreeOfSuccessAndSuccessBonus,
    DegreeOfSuccessService,
    TDegreeOfSuccess,
} from "./degreeOfSuccess"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { SquaddieService, TDamage } from "../../../squaddie/squaddieService"
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
import { AttributeTypeAndAmount } from "../../../squaddie/attribute/attribute"
import { NumberGeneratorStrategy } from "../../numberGenerator/strategy"
import { BattleActionRecorder } from "../../history/battleAction/battleActionRecorder"
import { ObjectRepository } from "../../objectRepository"
import { GameEngineState } from "../../../gameEngine/gameEngineState/gameEngineState"

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
    }): DegreeOfSuccessAndSuccessBonus =>
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
        degreeOfSuccess: TDegreeOfSuccess
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
    ): number => {
        if (gameEngineState.repository == undefined) return 0
        return calculateMultipleAttackPenaltyForActionsThisTurn(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            gameEngineState.repository
        )
    },
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
    return []
}

const conformToSixSidedDieRoll = (
    numberGeneratorResult: number | undefined
): number => {
    const inRangeNumber = (numberGeneratorResult ?? 0) % DIE_SIZE
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
            [t in TRollModifier]?: number
        } = {
            [RollModifierEnum.MULTIPLE_ATTACK_PENALTY]:
                calculateMultipleAttackPenaltyForActionsThisTurn(
                    battleActionRecorder,
                    objectRepository
                ),
            [RollModifierEnum.PROFICIENCY]:
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
    !TraitStatusStorageService.getStatus(action.traits, Trait.ALWAYS_SUCCEEDS)

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
    degreeOfSuccess: TDegreeOfSuccess
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
): TDegreeOfSuccess => {
    let degreeOfSuccess: TDegreeOfSuccess = DegreeOfSuccess.FAILURE
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
const compareAttackRollToGetDegreeOfSuccessAndSuccess = ({
    actingSquaddieRoll,
    actionEffectTemplate,
    targetBattleSquaddie,
    targetSquaddieTemplate,
    modifierDifference,
}: {
    actingSquaddieRoll: RollResult
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    targetSquaddieTemplate: SquaddieTemplate
    modifierDifference: number
}): DegreeOfSuccessAndSuccessBonus => {
    if (
        TraitStatusStorageService.getStatus(
            actionEffectTemplate.traits,
            Trait.ALWAYS_SUCCEEDS
        )
    ) {
        return {
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            successBonus: undefined,
        }
    }

    let totalAttackRoll =
        RollResultService.totalAttackRoll(actingSquaddieRoll) +
        modifierDifference
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

    return {
        degreeOfSuccess,
        successBonus:
            modifierDifference -
            targetArmorClass +
            RollResultService.getSumOfRollModifiers(actingSquaddieRoll),
    }
}

const capCriticalSuccessIfResultCannotCriticallySucceed = (
    actionEffectTemplate: ActionEffectTemplate,
    degreeOfSuccess: TDegreeOfSuccess
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
    degreeOfSuccess: TDegreeOfSuccess
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
}): DegreeOfSuccessAndSuccessBonus => {
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

    const modifierDifference =
        actingSquaddieModifierTotal - targetSquaddieModifierTotal
    return compareAttackRollToGetDegreeOfSuccessAndSuccess({
        actionEffectTemplate,
        targetBattleSquaddie: targetBattleSquaddie,
        targetSquaddieTemplate: targetSquaddieTemplate,
        actingSquaddieRoll: actorContext.actorRoll,
        modifierDifference: modifierDifference,
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

    return RollResultService.calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus(
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
    degreeOfSuccess: TDegreeOfSuccess
    targetSquaddieTemplate: SquaddieTemplate
    targetBattleSquaddie: BattleSquaddie
}): CalculatedEffect => {
    let damageExplanation: DamageExplanation = DamageExplanationService.new({})

    Object.keys(actionEffectTemplate.damageDescriptions)
        .map((k) => k as TDamage)
        .forEach((damageType: TDamage) => {
            let rawDamageFromAction =
                actionEffectTemplate.damageDescriptions[damageType] ?? 0
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
            if (damageExplanationForThisEffect.willKo) {
                damageExplanation.willKo = true
            }
        })

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
