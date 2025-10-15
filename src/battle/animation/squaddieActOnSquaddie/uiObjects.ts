import {
    DiceRollAnimation,
    DiceRollAnimationService,
} from "../attackRollAnimation/diceRollAnimation"
import {
    ModifierDisplayColumn,
    ModifierDisplayColumnData,
    ModifierDisplayColumnPosition,
    ModifierDisplayColumnService,
    TModifierDisplayColumnPosition,
} from "../modifierDisplay/modifierDisplayColumn"
import {
    AttackRollThermometer,
    AttackRollThermometerService,
} from "../attackRollThermometer/attackRollThermometer"
import {
    SquaddieActionAnimationDrawState,
    SquaddieActionAnimationDrawStateService,
} from "../actionAnimation/animationPlanner/squaddieActionAnimationDrawState/squaddieActionAnimationDrawState"
import { ActionEffectChange } from "../../history/calculatedResult"
import { DegreeOfSuccess } from "../../calculator/actionCalculator/degreeOfSuccess"
import { RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { GOLDEN_RATIO, WINDOW_SPACING } from "../../../ui/constants"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { isValidValue } from "../../../utils/objectValidityCheck"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import {
    AttributeTypeAndAmount,
    AttributeTypeService,
} from "../../../squaddie/attribute/attribute"
import {
    RollModifierTypeService,
    TRollModifier,
} from "../../calculator/actionCalculator/rollResult"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { BattleAction } from "../../history/battleAction/battleAction"
import { SquaddieActionAnimationPlanService } from "../actionAnimation/animationPlanner/squaddieActionAnimationPlanService"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import {
    ActionNameDisplay,
    ActionNameDisplayService,
} from "../actionAnimation/actionNameDisplay"
import {
    ActionResultDisplay,
    ActionResultDisplayService,
} from "../actionAnimation/actionResultDisplay"
import { HitPointMeter } from "../actionAnimation/hitPointMeter"
import { BattleActionSquaddieChange } from "../../history/battleAction/battleActionSquaddieChange"
import { SquaddieService } from "../../../squaddie/squaddieService"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../graphicsConstants"

const Layout = {
    diceRollAnimationLayout: {
        drawArea: {
            startColumn: 4,
            endColumn: 8,
            top: ScreenDimensions.SCREEN_HEIGHT / GOLDEN_RATIO + 40,
            height: 40,
        },
    },
    attackRollThermometerLayout: {
        drawArea: {
            startColumn: 4,
            endColumn: 8,
            top: ScreenDimensions.SCREEN_HEIGHT / GOLDEN_RATIO,
            height: 32,
        },
    },
}

export interface SquaddieActOnSquaddieUIObjects {
    results: ActionEffectChange
    actionToShow: BattleAction
    squaddieActionAnimationDrawState: SquaddieActionAnimationDrawState
    diceRollAnimation: DiceRollAnimation | undefined
    modifierDisplayColumns:
        | {
              [p in TModifierDisplayColumnPosition]:
                  | ModifierDisplayColumn
                  | undefined
          }
        | undefined
    attackRollThermometer: AttackRollThermometer | undefined
    actionNameDisplay: ActionNameDisplay | undefined
    targetHitPointMeters: {
        [battleSquaddieId: string]: HitPointMeter
    }
    actionResultDisplays: {
        [battleSquaddieId: string]: ActionResultDisplay
    }
}

export const SquaddieActOnSquaddieUIObjectsService = {
    new: ({
        results,
        actionTemplateId,
        repository,
        resourceHandler,
        actionToShow,
        graphicsContext,
    }: {
        results: ActionEffectChange
        actionTemplateId: string | undefined
        repository: ObjectRepository
        resourceHandler: ResourceHandler
        actionToShow: BattleAction
        graphicsContext: GraphicsBuffer
    }): SquaddieActOnSquaddieUIObjects => {
        const attackRollThermometer = newAttackRollThermometerAnimation({
            actionTemplateId,
            repository,
            results,
        })
        const resultDisplayContext = calculateContextForResultDisplays({
            actionToShow,
            repository,
            attackRollThermometer,
        })

        return {
            diceRollAnimation: newDiceRollAnimation(results),
            attackRollThermometer,
            modifierDisplayColumns: newModifierDisplays(results),
            squaddieActionAnimationDrawState: newSquaddieAnimation({
                repository,
                resourceHandler,
                actionToShow,
            }),
            results,
            actionNameDisplay: newActionNameDisplay({
                attackRollThermometer,
                actionTemplateId,
                repository,
                graphicsContext,
            }),
            targetHitPointMeters: newTargetHitPointMeters({
                context: Object.fromEntries(
                    Object.entries(resultDisplayContext).map(
                        ([battleSquaddieId, resultDisplayInfo]) => {
                            return [
                                battleSquaddieId,
                                resultDisplayInfo.targetHitPointMeter,
                            ]
                        }
                    )
                ),
            }),
            actionResultDisplays: newActionResultDisplays({
                context: Object.fromEntries(
                    Object.entries(resultDisplayContext).map(
                        ([battleSquaddieId, resultDisplayInfo]) => {
                            return [
                                battleSquaddieId,
                                resultDisplayInfo.actionResultDisplay,
                            ]
                        }
                    )
                ),
                graphicsContext,
            }),
            actionToShow,
        }
    },
    initializeAnimation: ({
        uiObjects,
    }: {
        uiObjects: SquaddieActOnSquaddieUIObjects
    }) => {
        if (uiObjects == undefined) {
            throw new Error(
                "[SquaddieActOnSquaddieUIObjects.initializeAnimation] uiObjects must be defined"
            )
        }

        if (uiObjects.attackRollThermometer == undefined) return
        if (uiObjects.results.squaddieChanges == undefined) return
        if (uiObjects.results.actorContext == undefined) return
        AttackRollThermometerService.beginRollingAnimation({
            thermometer: uiObjects.attackRollThermometer,
            rolls: [
                uiObjects.results.actorContext.actorRoll.rolls[0],
                uiObjects.results.actorContext.actorRoll.rolls[1],
            ],
            degreeOfSuccess:
                uiObjects.results.squaddieChanges[0].actorDegreeOfSuccess,
        })
    },
    draw: ({
        uiObjects,
        graphicsContext,
        startedShowingResults,
    }: {
        uiObjects: SquaddieActOnSquaddieUIObjects
        graphicsContext: GraphicsBuffer
        startedShowingResults: boolean
    }) => {
        if (uiObjects == undefined) {
            throw new Error(
                "[SquaddieActOnSquaddieUIObjects.draw] uiObjects must be defined"
            )
        }

        DiceRollAnimationService.draw({
            graphicsBuffer: graphicsContext,
            diceRollAnimation: uiObjects.diceRollAnimation,
        })
        AttackRollThermometerService.draw({
            graphicsBuffer: graphicsContext,
            thermometer: uiObjects.attackRollThermometer,
        })
        drawModifierDisplays({ uiObjects, graphicsContext })

        if (uiObjects.actionNameDisplay) {
            ActionNameDisplayService.draw(
                uiObjects.actionNameDisplay,
                graphicsContext
            )
        }

        if (startedShowingResults) {
            Object.values(uiObjects.actionResultDisplays).forEach((display) =>
                ActionResultDisplayService.draw(display, graphicsContext)
            )
        }
        Object.values(uiObjects.targetHitPointMeters).forEach((t) =>
            t.draw(graphicsContext)
        )
    },
    updateHitPointMeters: (uiObjects?: SquaddieActOnSquaddieUIObjects) => {
        if (uiObjects == undefined) return
        if (uiObjects.actionToShow == undefined) return

        uiObjects.actionToShow.effect.squaddie?.forEach((change) => {
            const battleSquaddieId = change.battleSquaddieId
            const hitPointMeter =
                uiObjects.targetHitPointMeters[battleSquaddieId]
            const hitPointChange: number =
                change.healingReceived - change.damage.net
            hitPointMeter.changeHitPoints(hitPointChange)
        })
    },
    getTimeAnimationStarted: (uiObjects?: SquaddieActOnSquaddieUIObjects) => {
        if (uiObjects == undefined) return undefined
        return uiObjects.squaddieActionAnimationDrawState
            ?.timestampAnimationStarted
    },
    getTimeToShowResults: (uiObjects?: SquaddieActOnSquaddieUIObjects) => {
        if (uiObjects == undefined) return undefined
        if (
            uiObjects.squaddieActionAnimationDrawState?.animationPlan ==
            undefined
        )
            return undefined
        return SquaddieActionAnimationPlanService.getTimeToShowResults({
            animationPlan:
                uiObjects.squaddieActionAnimationDrawState.animationPlan,
        })
    },
}

const newDiceRollAnimation = (results: ActionEffectChange) => {
    if (results.squaddieChanges == undefined) return undefined
    if (results.actorContext == undefined) return undefined

    const degreeOfSuccess =
        results?.squaddieChanges[0]?.actorDegreeOfSuccess ??
        DegreeOfSuccess.NONE

    return DiceRollAnimationService.new({
        degreeOfSuccess,
        rollResult: results.actorContext.actorRoll,
        drawArea: RectAreaService.new({
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            startColumn: Layout.diceRollAnimationLayout.drawArea.startColumn,
            endColumn: Layout.diceRollAnimationLayout.drawArea.endColumn,
            top: Layout.diceRollAnimationLayout.drawArea.top,
            height: Layout.diceRollAnimationLayout.drawArea.height,
        }),
    })
}

const newAttackRollThermometerAnimation = ({
    actionTemplateId,
    repository,
    results,
}: {
    actionTemplateId: string | undefined
    repository: ObjectRepository
    results: ActionEffectChange
}) => {
    if (actionTemplateId == undefined) return undefined
    if (results.squaddieChanges == undefined) return undefined
    if (results.actorContext == undefined) return undefined

    if (!isValidValue(results?.squaddieChanges[0])) {
        return undefined
    }

    const degreeOfSuccess =
        results?.squaddieChanges[0]?.actorDegreeOfSuccess ??
        DegreeOfSuccess.NONE

    if (degreeOfSuccess === DegreeOfSuccess.NONE) {
        return undefined
    }

    const actionTemplate = ObjectRepositoryService.getActionTemplateById(
        repository,
        actionTemplateId
    )
    if (!actionTemplate) return undefined
    const actionEffectTemplate = actionTemplate.actionEffectTemplates[0]
    if (!actionEffectTemplate) return undefined

    return AttackRollThermometerService.new({
        successBonus: results.squaddieChanges[0].successBonus ?? 0,
        tryToShowCriticalSuccess: !TraitStatusStorageService.getStatus(
            actionEffectTemplate.traits,
            Trait.CANNOT_CRITICALLY_SUCCEED
        ),
        tryToShowCriticalFailure: !TraitStatusStorageService.getStatus(
            actionEffectTemplate.traits,
            Trait.CANNOT_CRITICALLY_FAIL
        ),
        drawArea: RectAreaService.new({
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            startColumn:
                Layout.attackRollThermometerLayout.drawArea.startColumn,
            endColumn: Layout.attackRollThermometerLayout.drawArea.endColumn,
            top: Layout.attackRollThermometerLayout.drawArea.top,
            height: Layout.attackRollThermometerLayout.drawArea.height,
        }),
    })
}

const newModifierDisplays = (results: ActionEffectChange) => {
    const convertAttributeTypesAndAmountsToModifierDisplayColumnData = (
        attributeModifiers: AttributeTypeAndAmount[]
    ): ModifierDisplayColumnData[] =>
        attributeModifiers
            ? attributeModifiers.map((attributeModifier) => ({
                  amount: attributeModifier.amount,
                  description: AttributeTypeService.readableName(
                      attributeModifier.type
                  ),
              }))
            : []

    const convertRollModifiersToModifierDisplayColumnData = (rollModifiers: {
        [t in TRollModifier]?: number
    }): ModifierDisplayColumnData[] =>
        Object.entries(rollModifiers).map(([rollModifierType, amount]) => {
            return {
                amount,
                description: RollModifierTypeService.readableName({
                    type: rollModifierType as TRollModifier,
                    abbreviate: false,
                }),
            }
        })

    const modifierDisplayColumns:
        | {
              [p in TModifierDisplayColumnPosition]:
                  | ModifierDisplayColumn
                  | undefined
          }
        | undefined = {
        [ModifierDisplayColumnPosition.LEFT]: undefined,
        [ModifierDisplayColumnPosition.RIGHT]: undefined,
    }

    const leftColumnRollModifierDisplayColumnData =
        Object.keys(results.actorContext?.actorRoll?.rollModifiers || {})
            .length > 0
            ? convertRollModifiersToModifierDisplayColumnData(
                  results.actorContext?.actorRoll?.rollModifiers || {}
              )
            : []

    const leftColumnAttributeModifierDisplayColumnData =
        results.actorContext?.actorAttributeModifiers != undefined &&
        results.actorContext?.actorAttributeModifiers.length > 0
            ? convertAttributeTypesAndAmountsToModifierDisplayColumnData(
                  results.actorContext?.actorAttributeModifiers || {}
              )
            : []

    if (
        leftColumnRollModifierDisplayColumnData.length > 0 ||
        leftColumnAttributeModifierDisplayColumnData.length > 0
    ) {
        modifierDisplayColumns[ModifierDisplayColumnPosition.LEFT] =
            ModifierDisplayColumnService.new({
                modifiers: [
                    ...leftColumnRollModifierDisplayColumnData,
                    ...leftColumnAttributeModifierDisplayColumnData,
                ],
                position: ModifierDisplayColumnPosition.LEFT,
                sortOrderLeastToGreatest: false,
            })
    }

    const rightColumnAttributeModifierDisplayColumnData =
        Object.values(results.actorContext?.targetAttributeModifiers ?? {})
            .length > 0 &&
        Object.values(results.actorContext?.targetAttributeModifiers ?? {})[0]
            .length > 0
            ? convertAttributeTypesAndAmountsToModifierDisplayColumnData(
                  results.actorContext?.targetAttributeModifiers
                      ? Object.values(
                            results.actorContext?.targetAttributeModifiers
                        )[0]
                      : []
              )
            : []
    if (rightColumnAttributeModifierDisplayColumnData.length > 0) {
        modifierDisplayColumns[ModifierDisplayColumnPosition.RIGHT] =
            ModifierDisplayColumnService.new({
                modifiers: rightColumnAttributeModifierDisplayColumnData,
                position: ModifierDisplayColumnPosition.RIGHT,
                sortOrderLeastToGreatest: false,
            })
    }

    return modifierDisplayColumns
}

const newSquaddieAnimation = ({
    repository,
    resourceHandler,
    actionToShow,
}: {
    repository: ObjectRepository
    resourceHandler: ResourceHandler
    actionToShow: BattleAction
}) => {
    const animationPlan =
        SquaddieActionAnimationPlanService.createAnimationPlan({
            repository,
            battleAction: actionToShow,
        })

    return SquaddieActionAnimationDrawStateService.new({
        resourceHandler,
        animationPlan,
        repository,
    })
}

const drawModifierDisplays = ({
    uiObjects,
    graphicsContext,
}: {
    uiObjects: SquaddieActOnSquaddieUIObjects
    graphicsContext: GraphicsBuffer
}) => {
    if (uiObjects == undefined) {
        throw new Error(
            "[SquaddieActOnSquaddieUIObjects.drawModifierDisplays] uiObjects must be defined"
        )
    }

    if (uiObjects.modifierDisplayColumns == undefined) return
    if (uiObjects.modifierDisplayColumns[ModifierDisplayColumnPosition.LEFT]) {
        ModifierDisplayColumnService.draw({
            modifierDisplay:
                uiObjects.modifierDisplayColumns[
                    ModifierDisplayColumnPosition.LEFT
                ],
            graphicsBuffer: graphicsContext,
        })
    }
    if (uiObjects.modifierDisplayColumns[ModifierDisplayColumnPosition.RIGHT]) {
        ModifierDisplayColumnService.draw({
            modifierDisplay:
                uiObjects.modifierDisplayColumns[
                    ModifierDisplayColumnPosition.RIGHT
                ],
            graphicsBuffer: graphicsContext,
        })
    }
}

const newActionNameDisplay = ({
    attackRollThermometer,
    actionTemplateId,
    repository,
    graphicsContext,
}: {
    attackRollThermometer: AttackRollThermometer | undefined
    actionTemplateId: string | undefined
    repository: ObjectRepository
    graphicsContext: GraphicsBuffer
}) => {
    if (actionTemplateId == undefined) return undefined
    if (attackRollThermometer == undefined) return undefined

    const actionTemplate = ObjectRepositoryService.getActionTemplateById(
        repository,
        actionTemplateId
    )
    if (!actionTemplate) return

    return ActionNameDisplayService.new({
        actionName: actionTemplate.name,
        left:
            RectAreaService.left(attackRollThermometer.drawArea) -
            WINDOW_SPACING.SPACING1,
        bottom: RectAreaService.top(attackRollThermometer.drawArea),
        graphicsContext,
    })
}

const calculateContextForResultDisplays = ({
    actionToShow,
    repository,
    attackRollThermometer,
}: {
    actionToShow: BattleAction
    repository: ObjectRepository
    attackRollThermometer: AttackRollThermometer | undefined
}): {
    [_: string]: {
        targetHitPointMeter: {
            hitPointMeterLeft: number
            displayedHitPointsBeforeChange: number
            maxHitPoints: number
            hue: number
            bottom: number
        }
        actionResultDisplay: {
            hitPointMeterLeft: number
            damageTaken: number
            damageAbsorbed: number
            healingReceived: number
            top: number
            hue: number
        }
    }
} => {
    if (actionToShow == undefined) return {}

    return Object.fromEntries(
        actionToShow.effect?.squaddie?.map(
            (change: BattleActionSquaddieChange) => {
                const battleSquaddieId = change.battleSquaddieId
                const {
                    battleSquaddie: targetBattle,
                    squaddieTemplate: targetTemplate,
                } = ObjectRepositoryService.getSquaddieByBattleId(
                    repository,
                    battleSquaddieId
                )

                let {
                    currentHitPoints: displayedHitPointsBeforeChange,
                    maxHitPoints,
                } = SquaddieService.getHitPoints({
                    battleSquaddie: targetBattle,
                    squaddieTemplate: targetTemplate,
                })

                displayedHitPointsBeforeChange -= change.healingReceived
                displayedHitPointsBeforeChange += change.damage.net

                const attackRollThermometerDrawArea =
                    attackRollThermometer?.drawArea ??
                    RectAreaService.new({
                        screenWidth: ScreenDimensions.SCREEN_WIDTH,
                        startColumn: 5,
                        endColumn: 6,
                        top: Layout.attackRollThermometerLayout.drawArea.top,
                        height: Layout.attackRollThermometerLayout.drawArea
                            .height,
                    })

                const hitPointMeterLeft =
                    RectAreaService.left(attackRollThermometerDrawArea) +
                    RectAreaService.width(attackRollThermometerDrawArea) /
                        GOLDEN_RATIO +
                    WINDOW_SPACING.SPACING1
                const hitPointMeterTop =
                    RectAreaService.top(attackRollThermometerDrawArea) - 30

                return [
                    battleSquaddieId,
                    {
                        targetHitPointMeter: {
                            hitPointMeterLeft,
                            displayedHitPointsBeforeChange,
                            maxHitPoints,
                            hue: HUE_BY_SQUADDIE_AFFILIATION[
                                targetTemplate.squaddieId.affiliation
                            ],
                            bottom:
                                RectAreaService.top(
                                    attackRollThermometerDrawArea
                                ) - WINDOW_SPACING.SPACING1,
                        },
                        actionResultDisplay: {
                            hitPointMeterLeft,
                            damageTaken: change.damage.net,
                            damageAbsorbed: change.damage.absorbed,
                            healingReceived: change.healingReceived,
                            top: hitPointMeterTop - 30,
                            hue: HUE_BY_SQUADDIE_AFFILIATION[
                                targetTemplate.squaddieId.affiliation
                            ],
                        },
                    },
                ]
            }
        ) || []
    )
}

const newActionResultDisplays = ({
    context,
    graphicsContext,
}: {
    context: {
        [_: string]: {
            hitPointMeterLeft: number
            damageTaken: number
            damageAbsorbed: number
            healingReceived: number
            top: number
            hue: number
        }
    }
    graphicsContext: GraphicsBuffer
}): {
    [battleSquaddieId: string]: ActionResultDisplay
} => {
    return Object.fromEntries(
        Object.entries(context).map(([battleSquaddieId, info]) => {
            return [
                battleSquaddieId,
                ActionResultDisplayService.new({
                    damageTaken: info.damageTaken,
                    damageAbsorbed: info.damageAbsorbed,
                    healingReceived: info.healingReceived,
                    left: info.hitPointMeterLeft,
                    top: info.top,
                    hue: info.hue,
                    graphicsContext,
                }),
            ]
        })
    )
}

const newTargetHitPointMeters = ({
    context,
}: {
    context: {
        [_: string]: {
            hitPointMeterLeft: number
            displayedHitPointsBeforeChange: number
            maxHitPoints: number
            hue: number
            bottom: number
        }
    }
}): {
    [battleSquaddieId: string]: HitPointMeter
} => {
    return Object.fromEntries(
        Object.entries(context).map(([battleSquaddieId, info]) => {
            return [
                battleSquaddieId,
                new HitPointMeter({
                    currentHitPoints: info.displayedHitPointsBeforeChange,
                    maxHitPoints: info.maxHitPoints,
                    left: info.hitPointMeterLeft,
                    bottom: info.bottom,
                    hue: info.hue,
                }),
            ]
        })
    )
}
