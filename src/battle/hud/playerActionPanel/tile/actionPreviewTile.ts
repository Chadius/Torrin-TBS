import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../../../gameEngine/gameEngine"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "./actionTilePosition"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import { TextBox, TextBoxService } from "../../../../ui/textBox/textBox"
import { getResultOrThrowError } from "../../../../utils/ResultOrError"
import { BattleActionDecisionStepService } from "../../../actionDecision/battleActionDecisionStep"
import { RollModifierType } from "../../../calculator/actionCalculator/rollResult"
import { CalculatorAttack } from "../../../calculator/actionCalculator/attack"
import { RectArea, RectAreaService } from "../../../../ui/rectArea"
import {
    GOLDEN_RATIO,
    HORIZONTAL_ALIGN,
    WINDOW_SPACING,
} from "../../../../ui/constants"
import { SquaddieTemplate } from "../../../../campaign/squaddieTemplate"
import { ActionCalculator } from "../../../calculator/actionCalculator/calculator"
import {
    ActionEffectChange,
    CalculatedResult,
} from "../../../history/calculatedResult"
import { DegreeOfSuccess } from "../../../calculator/actionCalculator/degreeOfSuccess"
import {
    Blackboard,
    BlackboardService,
} from "../../../../utils/blackboard/blackboard"
import { BehaviorTreeTask } from "../../../../utils/behaviorTree/task"
import { SequenceComposite } from "../../../../utils/behaviorTree/composite/sequence/sequence"
import { InverterDecorator } from "../../../../utils/behaviorTree/decorator/inverter/inverter"
import { ExecuteAllComposite } from "../../../../utils/behaviorTree/composite/executeAll/executeAll"
import { DrawTextBoxesAction } from "../../../../ui/textBox/behaviorTreeTask"
import { ScreenDimensions } from "../../../../utils/graphics/graphicsConfig"
import { TextHandlingService } from "../../../../utils/graphics/textHandlingService"
import { UntilFailDecorator } from "../../../../utils/behaviorTree/decorator/untilFail/untilFail"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
} from "../../../history/battleAction/battleActionSquaddieChange"
import { ActionTemplate } from "../../../../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../../../../action/template/actionEffectTemplate"
import {
    AttributeModifierService,
    AttributeTypeAndAmount,
} from "../../../../squaddie/attributeModifier"
import { InBattleAttributesService } from "../../../stats/inBattleAttributes"

export interface ActionPreviewTile {
    forecast: CalculatedResult
    blackboard: Blackboard
    drawBehaviorTree: BehaviorTreeTask
}

const shortWidth = ScreenDimensions.SCREEN_WIDTH / 6 / (GOLDEN_RATIO + 1)
const longWidth = ScreenDimensions.SCREEN_WIDTH / 6 / GOLDEN_RATIO

interface ActionPreviewTileLayout {
    topRowOffset: number
    targetName: {
        height: number
        width: number
        fontColor: number[]
        margin: number[]
        fontSizeRange: {
            preferred: number
            minimum: number
        }
        linesOfTextRange: { minimum: number }
    }
    degreesOfSuccess: {
        height: number
        rowOrder: {
            degreeOfSuccess: DegreeOfSuccess
            suffix: string
            showEvenIfNoEffect: boolean
            showChanceOfSuccess: boolean
        }[]
    }
    chancesOfDegreesOfSuccess: {
        width: number
        fontSize: number
        fontColor: number[]
        margin: number[]
    }
    effectsOfDegreesOfSuccess: {
        width: number
        fontSize: number
        fontColor: number[]
        margin: number[]
        horizAlign: HORIZONTAL_ALIGN
    }
}

interface ActionPreviewTileContext {
    horizontalPosition: ActionTilePosition.ACTION_PREVIEW
    squaddieAffiliation: SquaddieAffiliation
    rollModifiers: { [r in RollModifierType]?: number }
    forecast: CalculatedResult
    squaddieNamesByBattleSquaddieId: { [battleSquaddieId: string]: string }
    actionTemplate: ActionTemplate
}

interface ActionPreviewTileUIObjects {
    graphicsContext: GraphicsBuffer
    infoTextBox: TextBox
    chancesOfDegreesOfSuccessTextBoxes: {
        degreeOfSuccess: DegreeOfSuccess
        textBox: TextBox
    }[]
    effectsOfDegreesOfSuccessTextBoxes: {
        degreeOfSuccess: DegreeOfSuccess
        textBox: TextBox
    }[]
    targetNameTextBox: TextBox
}

export const ActionPreviewTileService = {
    new: ({
        gameEngineState,
        objectRepository,
    }: {
        gameEngineState: GameEngineState
        objectRepository: ObjectRepository
    }): ActionPreviewTile => {
        const battleSquaddieId = BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ).battleSquaddieId

        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieId
            )
        )

        const forecast = ActionCalculator.forecastResults({
            gameEngineState,
        })

        const blackboard: Blackboard = BlackboardService.new()
        const layout: ActionPreviewTileLayout = {
            topRowOffset: 38,
            degreesOfSuccess: {
                height: 18,
                rowOrder: [
                    {
                        degreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
                        suffix: "crit",
                        showEvenIfNoEffect: true,
                        showChanceOfSuccess: true,
                    },
                    {
                        degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        suffix: "hit",
                        showEvenIfNoEffect: true,
                        showChanceOfSuccess: true,
                    },
                    {
                        degreeOfSuccess: DegreeOfSuccess.FAILURE,
                        suffix: "miss",
                        showEvenIfNoEffect: false,
                        showChanceOfSuccess: true,
                    },
                    {
                        degreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
                        suffix: "botch",
                        showEvenIfNoEffect: true,
                        showChanceOfSuccess: true,
                    },
                    {
                        degreeOfSuccess: DegreeOfSuccess.NONE,
                        suffix: "",
                        showEvenIfNoEffect: false,
                        showChanceOfSuccess: false,
                    },
                ],
            },
            chancesOfDegreesOfSuccess: {
                fontSize: 16,
                width: shortWidth,
                fontColor: [0, 0, 192 - 128],
                margin: [0, 0, 0, WINDOW_SPACING.SPACING1],
            },
            effectsOfDegreesOfSuccess: {
                fontSize: 16,
                width: longWidth,
                fontColor: [0, 0, 192 - 128],
                margin: [
                    0,
                    WINDOW_SPACING.SPACING2,
                    0,
                    WINDOW_SPACING.SPACING1,
                ],
                horizAlign: HORIZONTAL_ALIGN.RIGHT,
            },
            targetName: {
                height: 34,
                width: longWidth,
                fontColor: [0, 0, 192 - 96],
                margin: [
                    WINDOW_SPACING.SPACING1,
                    0,
                    WINDOW_SPACING.SPACING1,
                    WINDOW_SPACING.SPACING2,
                ],
                fontSizeRange: {
                    preferred: 18,
                    minimum: 8,
                },
                linesOfTextRange: { minimum: 1 },
            },
        }
        const context = createActionPreviewTileContext({
            squaddieTemplate: squaddieTemplate,
            gameEngineState: gameEngineState,
            forecast: forecast,
        })

        BlackboardService.add<ActionPreviewTileLayout>(
            blackboard,
            "layout",
            layout
        )

        BlackboardService.add<ActionPreviewTileContext>(
            blackboard,
            "context",
            context
        )

        const uiObjects: ActionPreviewTileUIObjects = {
            infoTextBox: undefined,
            graphicsContext: undefined,
            chancesOfDegreesOfSuccessTextBoxes: undefined,
            effectsOfDegreesOfSuccessTextBoxes: undefined,
            targetNameTextBox: undefined,
        }
        BlackboardService.add<ActionPreviewTileUIObjects>(
            blackboard,
            "uiObjects",
            uiObjects
        )
        const drawBehaviorTree = createDrawingBehaviorTree(blackboard)

        return {
            forecast,
            blackboard,
            drawBehaviorTree,
        }
    },
    draw: ({
        tile,
        graphicsContext,
    }: {
        tile: ActionPreviewTile
        graphicsContext: GraphicsBuffer
    }) => {
        const uiObjects = BlackboardService.get<ActionPreviewTileUIObjects>(
            tile.blackboard,
            "uiObjects"
        )
        uiObjects.graphicsContext = graphicsContext

        const context = BlackboardService.get<ActionPreviewTileContext>(
            tile.blackboard,
            "context"
        )

        ActionTilePositionService.drawBackground({
            squaddieAffiliation: context.squaddieAffiliation,
            graphicsContext,
            horizontalPosition: context.horizontalPosition,
        })

        tile.drawBehaviorTree.run()
    },
}

const createDrawingBehaviorTree = (blackboard: Blackboard) => {
    const createTargetNameTextBoxTree = new SequenceComposite(blackboard, [
        new InverterDecorator(
            blackboard,
            new DoesUIObjectExistCondition(blackboard, "targetName")
        ),
        new CreateTargetNameTextBoxesAction(blackboard),
    ])
    const createChancesOfDegreesOfSuccessTextBoxesTree = new SequenceComposite(
        blackboard,
        [
            new InverterDecorator(
                blackboard,
                new DoesUIObjectExistCondition(
                    blackboard,
                    "chancesOfDegreesOfSuccessTextBoxes"
                )
            ),
            new UntilFailDecorator(
                blackboard,
                new CreateNextChancesOfDegreesOfSuccessTextBoxAction(blackboard)
            ),
        ]
    )
    const createEffectsOfDegreesOfSuccessTextBoxesTree = new SequenceComposite(
        blackboard,
        [
            new InverterDecorator(
                blackboard,
                new DoesUIObjectExistCondition(
                    blackboard,
                    "effectsOfDegreesOfSuccessTextBoxes"
                )
            ),
            new UntilFailDecorator(
                blackboard,
                new CreateNextEffectsOfDegreesOfSuccessTextBoxAction(blackboard)
            ),
        ]
    )
    const drawTextBoxTree = new SequenceComposite(blackboard, [
        new DoesUIObjectExistCondition(blackboard, "graphicsContext"),
        new DrawTextBoxesAction(
            blackboard,
            (blackboard: Blackboard) => {
                const uiObjects =
                    BlackboardService.get<ActionPreviewTileUIObjects>(
                        blackboard,
                        "uiObjects"
                    )
                return [
                    ...uiObjects.chancesOfDegreesOfSuccessTextBoxes.map(
                        (a) => a.textBox
                    ),
                    ...uiObjects.effectsOfDegreesOfSuccessTextBoxes.map(
                        (a) => a.textBox
                    ),
                    uiObjects.targetNameTextBox,
                ].filter((x) => x)
            },
            (blackboard: Blackboard) => {
                const uiObjects =
                    BlackboardService.get<ActionPreviewTileUIObjects>(
                        blackboard,
                        "uiObjects"
                    )
                return uiObjects.graphicsContext
            }
        ),
    ])

    const drawBehaviorTree: BehaviorTreeTask = new ExecuteAllComposite(
        blackboard,
        [
            createTargetNameTextBoxTree,
            createChancesOfDegreesOfSuccessTextBoxesTree,
            createEffectsOfDegreesOfSuccessTextBoxesTree,
            drawTextBoxTree,
        ]
    )
    return drawBehaviorTree
}

const createActionPreviewTileContext = ({
    squaddieTemplate,
    gameEngineState,
    forecast,
}: {
    squaddieTemplate: SquaddieTemplate
    gameEngineState: GameEngineState
    forecast: CalculatedResult
}) => {
    let rollModifiers: { [r in RollModifierType]?: number } = {
        [RollModifierType.TIER]: squaddieTemplate.attributes.tier,
    }
    let multipleAttackPenalty =
        CalculatorAttack.calculateMultipleAttackPenaltyForActionsThisTurn(
            gameEngineState
        )
    if (multipleAttackPenalty !== 0) {
        rollModifiers[RollModifierType.MULTIPLE_ATTACK_PENALTY] =
            multipleAttackPenalty
    }

    const squaddieNamesByBattleSquaddieId: {
        [battleSquaddieId: string]: string
    } = {}
    forecast.changesPerEffect.forEach((effect) => {
        effect.squaddieChanges.forEach((squaddieChange) => {
            const { squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    squaddieChange.battleSquaddieId
                )
            )
            squaddieNamesByBattleSquaddieId[squaddieChange.battleSquaddieId] =
                squaddieTemplate.squaddieId.name
        })
    })

    const actionTemplateId = BattleActionDecisionStepService.getAction(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    ).actionTemplateId
    const actionTemplate = ObjectRepositoryService.getActionTemplateById(
        gameEngineState.repository,
        actionTemplateId
    )

    const context: ActionPreviewTileContext = {
        horizontalPosition: ActionTilePosition.ACTION_PREVIEW,
        squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
        rollModifiers,
        forecast,
        squaddieNamesByBattleSquaddieId,
        actionTemplate,
    }
    return context
}

class DoesUIObjectExistCondition implements BehaviorTreeTask {
    blackboard: Blackboard
    uiObjectKey: string

    constructor(blackboard: Blackboard, uiObjectKey: string) {
        this.blackboard = blackboard
        this.uiObjectKey = uiObjectKey
    }

    run(): boolean {
        const uiObjects = BlackboardService.get<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects"
        )
        return (
            uiObjects[this.uiObjectKey as keyof typeof uiObjects] !== undefined
        )
    }

    clone(): BehaviorTreeTask {
        return new DoesUIObjectExistCondition(this.blackboard, this.uiObjectKey)
    }
}

class CreateTargetNameTextBoxesAction implements BehaviorTreeTask {
    blackboard: Blackboard

    constructor(blackboard: Blackboard) {
        this.blackboard = blackboard
    }

    run(): boolean {
        const uiObjects = BlackboardService.get<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects"
        )

        let context: ActionPreviewTileContext = BlackboardService.get(
            this.blackboard,
            "context"
        )

        const targetBattleSquaddieId =
            context.forecast.changesPerEffect[0].squaddieChanges[0]
                .battleSquaddieId

        const targetName =
            context.squaddieNamesByBattleSquaddieId[targetBattleSquaddieId]
        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )
        const layoutConstants = BlackboardService.get<ActionPreviewTileLayout>(
            this.blackboard,
            "layout"
        ).targetName

        const textInfo = TextHandlingService.fitTextWithinSpace({
            text: targetName,
            width: layoutConstants.width,
            graphicsContext: uiObjects.graphicsContext,
            fontSizeRange: layoutConstants.fontSizeRange,
            linesOfTextRange: layoutConstants.linesOfTextRange,
        })

        uiObjects.targetNameTextBox = TextBoxService.new({
            fontColor: layoutConstants.fontColor,
            fontSize: textInfo.fontSize,
            area: RectAreaService.new({
                left: RectAreaService.left(boundingBox),
                top: RectAreaService.top(boundingBox),
                width: layoutConstants.width,
                height: layoutConstants.height,
                margin: layoutConstants.margin,
            }),
            text: textInfo.text,
        })

        BlackboardService.add<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects",
            uiObjects
        )

        return true
    }

    clone(): BehaviorTreeTask {
        return new CreateTargetNameTextBoxesAction(this.blackboard)
    }
}

class CreateNextChancesOfDegreesOfSuccessTextBoxAction
    implements BehaviorTreeTask
{
    blackboard: Blackboard

    constructor(blackboard: Blackboard) {
        this.blackboard = blackboard
    }

    run(): boolean {
        const uiObjects = BlackboardService.get<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects"
        )

        let context: ActionPreviewTileContext = BlackboardService.get(
            this.blackboard,
            "context"
        )

        const degreesOfSuccessLayoutConstants =
            BlackboardService.get<ActionPreviewTileLayout>(
                this.blackboard,
                "layout"
            ).degreesOfSuccess

        const chancesOfDegreesOfSuccessLayoutConstants =
            BlackboardService.get<ActionPreviewTileLayout>(
                this.blackboard,
                "layout"
            ).chancesOfDegreesOfSuccess

        const targetForecast = context.forecast.changesPerEffect[0]
        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )

        uiObjects.chancesOfDegreesOfSuccessTextBoxes ||= []
        const { forecastedChange, degreeOfSuccessToDraw } =
            findNextDegreeOfSuccessToDraw(
                degreesOfSuccessLayoutConstants.rowOrder,
                uiObjects.chancesOfDegreesOfSuccessTextBoxes,
                targetForecast,
                context.actionTemplate
            )
        if (!degreeOfSuccessToDraw) return false

        const messageToShow = degreeOfSuccessToDraw.showChanceOfSuccess
            ? `${((forecastedChange.chanceOfDegreeOfSuccess * 100) / 36).toFixed()}% ${degreeOfSuccessToDraw.suffix}`
            : ""

        const top = calculateTopOfNextDegreesOfSuccessRow({
            blackboard: this.blackboard,
            degreeOfSuccessUIObjects:
                uiObjects.chancesOfDegreesOfSuccessTextBoxes,
            boundingBox,
        })

        uiObjects.chancesOfDegreesOfSuccessTextBoxes.push({
            degreeOfSuccess: degreeOfSuccessToDraw.degreeOfSuccess,
            textBox: TextBoxService.new({
                fontColor: chancesOfDegreesOfSuccessLayoutConstants.fontColor,
                fontSize: chancesOfDegreesOfSuccessLayoutConstants.fontSize,
                area: RectAreaService.new({
                    left: RectAreaService.left(boundingBox),
                    top,
                    width: chancesOfDegreesOfSuccessLayoutConstants.width,
                    height: degreesOfSuccessLayoutConstants.height,
                    margin: chancesOfDegreesOfSuccessLayoutConstants.margin,
                }),
                text: messageToShow,
            }),
        })

        BlackboardService.add<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects",
            uiObjects
        )

        return true
    }

    clone(): BehaviorTreeTask {
        return new CreateNextChancesOfDegreesOfSuccessTextBoxAction(
            this.blackboard
        )
    }
}

const calculateTopOfNextDegreesOfSuccessRow = ({
    blackboard,
    degreeOfSuccessUIObjects,
    boundingBox,
}: {
    blackboard: Blackboard
    degreeOfSuccessUIObjects: {
        degreeOfSuccess: DegreeOfSuccess
        textBox: TextBox
    }[]
    boundingBox: RectArea
}) =>
    degreeOfSuccessUIObjects.length > 0
        ? RectAreaService.bottom(
              degreeOfSuccessUIObjects[degreeOfSuccessUIObjects.length - 1]
                  .textBox.area
          ) +
          WINDOW_SPACING.SPACING1 / 2
        : BlackboardService.get<ActionPreviewTileLayout>(blackboard, "layout")
              .topRowOffset + RectAreaService.top(boundingBox)

class CreateNextEffectsOfDegreesOfSuccessTextBoxAction
    implements BehaviorTreeTask
{
    blackboard: Blackboard

    constructor(blackboard: Blackboard) {
        this.blackboard = blackboard
    }

    run(): boolean {
        const uiObjects = BlackboardService.get<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects"
        )

        let context: ActionPreviewTileContext = BlackboardService.get(
            this.blackboard,
            "context"
        )

        const degreesOfSuccessLayoutConstants =
            BlackboardService.get<ActionPreviewTileLayout>(
                this.blackboard,
                "layout"
            ).degreesOfSuccess

        const effectsOfDegreesOfSuccessLayoutConstants =
            BlackboardService.get<ActionPreviewTileLayout>(
                this.blackboard,
                "layout"
            ).effectsOfDegreesOfSuccess

        const targetForecast = context.forecast.changesPerEffect[0]
        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )

        uiObjects.effectsOfDegreesOfSuccessTextBoxes ||= []
        const { forecastedChange, degreeOfSuccessToDraw } =
            findNextDegreeOfSuccessToDraw(
                degreesOfSuccessLayoutConstants.rowOrder,
                uiObjects.effectsOfDegreesOfSuccessTextBoxes,
                targetForecast,
                context.actionTemplate
            )

        if (!degreeOfSuccessToDraw) return false

        let messageToShow = ""
        if (
            ActionEffectTemplateService.doesItTargetFoes(
                context.actionTemplate.actionEffectTemplates[0]
            )
        ) {
            messageToShow = generateEffectMessageForFoe(
                forecastedChange,
                context.actionTemplate
            )
        } else {
            messageToShow = generateEffectMessageForFriendAndSelf(
                forecastedChange,
                context.actionTemplate
            )
        }

        const top = calculateTopOfNextDegreesOfSuccessRow({
            blackboard: this.blackboard,
            degreeOfSuccessUIObjects:
                uiObjects.effectsOfDegreesOfSuccessTextBoxes,
            boundingBox,
        })

        uiObjects.effectsOfDegreesOfSuccessTextBoxes.push({
            degreeOfSuccess: degreeOfSuccessToDraw.degreeOfSuccess,
            textBox: TextBoxService.new({
                fontColor: effectsOfDegreesOfSuccessLayoutConstants.fontColor,
                fontSize: effectsOfDegreesOfSuccessLayoutConstants.fontSize,
                area: RectAreaService.new({
                    right: RectAreaService.right(boundingBox),
                    top,
                    width: effectsOfDegreesOfSuccessLayoutConstants.width,
                    height: degreesOfSuccessLayoutConstants.height,
                    margin: effectsOfDegreesOfSuccessLayoutConstants.margin,
                }),
                text: messageToShow,
                horizAlign: effectsOfDegreesOfSuccessLayoutConstants.horizAlign,
            }),
        })

        BlackboardService.add<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects",
            uiObjects
        )

        return true
    }

    clone(): BehaviorTreeTask {
        return new CreateNextEffectsOfDegreesOfSuccessTextBoxAction(
            this.blackboard
        )
    }
}

const findNextDegreeOfSuccessToDraw = (
    potentialDegreesOfSuccessToDraw: ActionPreviewTileLayout["degreesOfSuccess"]["rowOrder"],
    alreadyDrawnTextBoxes: {
        degreeOfSuccess: DegreeOfSuccess
        textBox: TextBox
    }[],
    targetForecast: ActionEffectChange,
    actionTemplate: ActionTemplate
) => {
    let forecastedChange: BattleActionSquaddieChange = undefined
    const degreeOfSuccessToDraw = potentialDegreesOfSuccessToDraw.find(
        (degreeOfSuccessInfo) => {
            forecastedChange = targetForecast.squaddieChanges.find(
                (change) =>
                    change.actorDegreeOfSuccess ===
                    degreeOfSuccessInfo.degreeOfSuccess
            )

            if (!forecastedChange) {
                return false
            }

            if (
                alreadyDrawnTextBoxes.some(
                    (info) =>
                        info.degreeOfSuccess ===
                        degreeOfSuccessInfo.degreeOfSuccess
                )
            )
                return false

            const targetHasOnlyOneDegreeOfSuccess: boolean =
                targetForecast.squaddieChanges.filter(
                    (change) =>
                        change.battleSquaddieId ===
                        forecastedChange.battleSquaddieId
                ).length === 1

            switch (true) {
                case targetHasOnlyOneDegreeOfSuccess ||
                    degreeOfSuccessInfo.showEvenIfNoEffect:
                    return true
                case ActionEffectTemplateService.doesItTargetFoes(
                    actionTemplate.actionEffectTemplates[0]
                ) &&
                    !BattleActionSquaddieChangeService.isSquaddieHindered(
                        forecastedChange
                    ):
                    return false
                case (ActionEffectTemplateService.doesItTargetFriends(
                    actionTemplate.actionEffectTemplates[0]
                ) ||
                    ActionEffectTemplateService.doesItTargetSelf(
                        actionTemplate.actionEffectTemplates[0]
                    )) &&
                    !BattleActionSquaddieChangeService.isSquaddieHelped(
                        forecastedChange
                    ):
                    return false
            }
            return true
        }
    )

    return {
        forecastedChange,
        degreeOfSuccessToDraw,
    }
}

const generateEffectMessageForFoe = (
    forecastedChange: BattleActionSquaddieChange,
    actionTemplate: ActionTemplate
): string => {
    const dealsDamage =
        BattleActionSquaddieChangeService.isSquaddieHindered(forecastedChange)
    const triesToDealDamage = actionTemplate.actionEffectTemplates.some(
        (template) =>
            Object.values(template.damageDescriptions).reduce(
                (sum, currentValue) => sum + currentValue,
                0
            ) > 0
    )

    const attributeModifierDifferences: AttributeTypeAndAmount[] =
        InBattleAttributesService.calculateAttributeModifiersGainedAfterChanges(
            forecastedChange.attributesBefore,
            forecastedChange.attributesAfter
        )

    if (
        (triesToDealDamage && !dealsDamage) ||
        (!triesToDealDamage && attributeModifierDifferences.length === 0)
    ) {
        return "NO DAMAGE"
    }

    let messageToShow = ""
    messageToShow = generateMessageForAttributeModifiers(
        attributeModifierDifferences,
        messageToShow
    )
    if (dealsDamage) {
        messageToShow += `${forecastedChange.damage.net} damage`
    }
    return messageToShow
}

const generateEffectMessageForFriendAndSelf = (
    forecastedChange: BattleActionSquaddieChange,
    actionTemplate: ActionTemplate
): string => {
    const healsTarget =
        BattleActionSquaddieChangeService.isSquaddieHelped(forecastedChange)
    const triesToHealTarget = actionTemplate.actionEffectTemplates.some(
        (template) =>
            template.healingDescriptions.LOST_HIT_POINTS !== undefined &&
            template.healingDescriptions.LOST_HIT_POINTS > 0
    )

    const attributeModifierDifferences: AttributeTypeAndAmount[] =
        InBattleAttributesService.calculateAttributeModifiersGainedAfterChanges(
            forecastedChange.attributesBefore,
            forecastedChange.attributesAfter
        )

    if (
        (triesToHealTarget && !healsTarget) ||
        (!triesToHealTarget && attributeModifierDifferences.length === 0)
    ) {
        return "NO CHANGE"
    }

    let messageToShow = ""
    messageToShow = generateMessageForAttributeModifiers(
        attributeModifierDifferences,
        messageToShow
    )
    if (healsTarget) {
        messageToShow += `${forecastedChange.healingReceived} heal`
    }
    return messageToShow
}

const generateMessageForAttributeModifiers = (
    attributeModifierDifferences: AttributeTypeAndAmount[],
    messageToShow: string
) => {
    if (attributeModifierDifferences.length > 0) {
        let attributeMessages = attributeModifierDifferences.map(
            (typeAndAmount) => {
                if (
                    AttributeModifierService.isAttributeTypeABinaryEffect(
                        typeAndAmount.type
                    )
                ) {
                    return `${AttributeModifierService.readableNameForAttributeType(typeAndAmount.type)}`
                }

                const printedAmount =
                    typeAndAmount.amount > 0
                        ? `+${typeAndAmount.amount}`
                        : `${typeAndAmount.amount}`
                return `${printedAmount} ${AttributeModifierService.readableNameForAttributeType(typeAndAmount.type)}`
            }
        )
        messageToShow += attributeMessages.join(", ")
    }
    return messageToShow
}
