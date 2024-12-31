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
import {
    RollModifierType,
    RollModifierTypeService,
} from "../../../calculator/actionCalculator/rollResult"
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
        fontSizeRange: {
            preferred: number
            minimum: number
        }
        linesOfTextRange: { minimum: number }
        fontColor: number[]
        margin: number[]
        horizAlign: HORIZONTAL_ALIGN
    }
    modifiers: {
        topOffset: number
        fontSizeRange: {
            preferred: number
            minimum: number
        }
        linesOfTextRange: { minimum: number }
        fontColor: number[]
        height: number
        leftColumn: {
            width: number
            margin: number[]
            limit: number
            horizAlign: HORIZONTAL_ALIGN
        }
        rightColumn: {
            width: number
            margin: number[]
            limit: number
        }
    }
}

interface ActionPreviewTileContext {
    horizontalPosition: ActionTilePosition.ACTION_PREVIEW
    squaddieAffiliation: SquaddieAffiliation
    forecast: CalculatedResult
    squaddieNamesByBattleSquaddieId: { [battleSquaddieId: string]: string }
    actionTemplate: ActionTemplate
    focusedBattleSquaddieId: string
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
    modifiers: {
        leftSide: TextBox[]
        rightSide: TextBox[]
    }
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
                width: longWidth,
                fontColor: [0, 0, 192 - 128],
                margin: [
                    0,
                    WINDOW_SPACING.SPACING2,
                    0,
                    WINDOW_SPACING.SPACING1,
                ],
                horizAlign: HORIZONTAL_ALIGN.RIGHT,
                fontSizeRange: {
                    preferred: 16,
                    minimum: 8,
                },
                linesOfTextRange: { minimum: 1 },
            },
            modifiers: {
                topOffset: WINDOW_SPACING.SPACING1,
                fontSizeRange: {
                    preferred: 12,
                    minimum: 8,
                },
                linesOfTextRange: { minimum: 1 },
                height: 14,
                fontColor: [0, 0, 192 - 112],
                leftColumn: {
                    width: shortWidth,
                    margin: [
                        0,
                        WINDOW_SPACING.SPACING1,
                        WINDOW_SPACING.SPACING1 / 2,
                        0,
                    ],
                    limit: 4,
                    horizAlign: HORIZONTAL_ALIGN.RIGHT,
                },
                rightColumn: {
                    width: shortWidth,
                    margin: [
                        0,
                        0,
                        WINDOW_SPACING.SPACING1 / 2,
                        WINDOW_SPACING.SPACING1,
                    ],
                    limit: 4,
                },
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
            modifiers: undefined,
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
    const createModifiersTextBoxesTree = new SequenceComposite(blackboard, [
        new InverterDecorator(
            blackboard,
            new DoesUIObjectExistCondition(blackboard, "modifiersTextBoxes")
        ),
        new UntilFailDecorator(
            blackboard,
            new CreateLeftModifiersTextBoxAction(blackboard)
        ),
        new UntilFailDecorator(
            blackboard,
            new CreateRightModifiersTextBoxAction(blackboard)
        ),
    ])

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
                    ...uiObjects.modifiers.leftSide,
                    ...uiObjects.modifiers.rightSide,
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
            createModifiersTextBoxesTree,
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
    const squaddieNamesByBattleSquaddieId: {
        [battleSquaddieId: string]: string
    } = {}
    let focusedBattleSquaddieId: string = undefined
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
            focusedBattleSquaddieId ||= squaddieChange.battleSquaddieId
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
        forecast,
        squaddieNamesByBattleSquaddieId,
        actionTemplate,
        focusedBattleSquaddieId,
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

        let messageToShow: string
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

        const textInfo = TextHandlingService.fitTextWithinSpace({
            text: messageToShow,
            width: effectsOfDegreesOfSuccessLayoutConstants.width,
            graphicsContext: uiObjects.graphicsContext,
            fontSizeRange:
                effectsOfDegreesOfSuccessLayoutConstants.fontSizeRange,
            linesOfTextRange:
                effectsOfDegreesOfSuccessLayoutConstants.linesOfTextRange,
        })

        uiObjects.effectsOfDegreesOfSuccessTextBoxes.push({
            degreeOfSuccess: degreeOfSuccessToDraw.degreeOfSuccess,
            textBox: TextBoxService.new({
                fontColor: effectsOfDegreesOfSuccessLayoutConstants.fontColor,
                fontSize: textInfo.fontSize,
                area: RectAreaService.new({
                    right: RectAreaService.right(boundingBox),
                    top,
                    width: effectsOfDegreesOfSuccessLayoutConstants.width,
                    height: degreesOfSuccessLayoutConstants.height,
                    margin: effectsOfDegreesOfSuccessLayoutConstants.margin,
                }),
                text: textInfo.text,
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

class CreateLeftModifiersTextBoxAction implements BehaviorTreeTask {
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

        const modifiersLayoutConstants =
            BlackboardService.get<ActionPreviewTileLayout>(
                this.blackboard,
                "layout"
            ).modifiers

        const leftSideRollModifiers =
            context.forecast.changesPerEffect[0].actorContext.actorRoll
                .rollModifiers || {}
        const leftSideActorAttributeModifiers =
            context.forecast.changesPerEffect[0].actorContext
                .actorAttributeModifiers || []
        const leftSideModifiers: {
            name: string
            amount: number | undefined
        }[] = [
            ...Object.entries(leftSideRollModifiers)
                .filter(([_, amount]) => amount !== 0)
                .map(([keyStr, amount]) => ({
                    name: RollModifierTypeService.readableName({
                        type: keyStr as RollModifierType,
                        abbreviate: true,
                    }),
                    amount,
                })),
            ...leftSideActorAttributeModifiers
                .filter(({ amount }) => amount != 0)
                .map(formatAttributeTypeAndAmount),
        ].sort(sortModifierDisplayDescending)

        uiObjects.modifiers ||= {
            leftSide: [],
            rightSide: [],
        }
        if (
            uiObjects.modifiers.leftSide.length >=
            modifiersLayoutConstants.leftColumn.limit
        )
            return false

        if (uiObjects.modifiers.leftSide.length >= leftSideModifiers.length)
            return false

        const modifierToShow =
            leftSideModifiers[uiObjects.modifiers.leftSide.length]
        let amountToShow: string = formatAmount(modifierToShow.amount)
        const messageToShow = `${amountToShow}${modifierToShow.name}`

        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )

        const bottom = calculateBottomOfModifierList(
            uiObjects.modifiers.leftSide,
            boundingBox
        )

        const textInfo = TextHandlingService.fitTextWithinSpace({
            text: messageToShow,
            width: modifiersLayoutConstants.leftColumn.width,
            graphicsContext: uiObjects.graphicsContext,
            fontSizeRange: modifiersLayoutConstants.fontSizeRange,
            linesOfTextRange: modifiersLayoutConstants.linesOfTextRange,
        })

        uiObjects.modifiers.leftSide.push(
            TextBoxService.new({
                fontColor: modifiersLayoutConstants.fontColor,
                fontSize: textInfo.fontSize,
                area: RectAreaService.new({
                    right: RectAreaService.centerX(boundingBox),
                    bottom,
                    width: modifiersLayoutConstants.leftColumn.width,
                    height: modifiersLayoutConstants.height,
                    margin: modifiersLayoutConstants.leftColumn.margin,
                }),
                text: textInfo.text,
                horizAlign: modifiersLayoutConstants.leftColumn.horizAlign,
            })
        )

        BlackboardService.add<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects",
            uiObjects
        )

        return true
    }

    clone(): BehaviorTreeTask {
        return new CreateLeftModifiersTextBoxAction(this.blackboard)
    }
}

class CreateRightModifiersTextBoxAction implements BehaviorTreeTask {
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

        const modifiersLayoutConstants =
            BlackboardService.get<ActionPreviewTileLayout>(
                this.blackboard,
                "layout"
            ).modifiers

        const rightSideTargetAttributeModifiers =
            context.forecast.changesPerEffect[0].actorContext
                .targetAttributeModifiers[context.focusedBattleSquaddieId] || []
        const rightSideModifiers: {
            name: string
            amount: number | undefined
        }[] = rightSideTargetAttributeModifiers
            .filter(({ amount }) => amount != 0)
            .map(formatAttributeTypeAndAmount)
            .sort(sortModifierDisplayDescending)

        uiObjects.modifiers ||= {
            leftSide: [],
            rightSide: [],
        }
        if (
            uiObjects.modifiers.rightSide.length >=
            modifiersLayoutConstants.rightColumn.limit
        )
            return false

        if (uiObjects.modifiers.rightSide.length >= rightSideModifiers.length)
            return false

        const modifierToShow =
            rightSideModifiers[uiObjects.modifiers.rightSide.length]
        let amountToShow: string = formatAmount(modifierToShow.amount)
        const messageToShow = `${amountToShow}${modifierToShow.name}`

        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )

        const bottom = calculateBottomOfModifierList(
            uiObjects.modifiers.rightSide,
            boundingBox
        )

        const textInfo = TextHandlingService.fitTextWithinSpace({
            text: messageToShow,
            width: modifiersLayoutConstants.rightColumn.width,
            graphicsContext: uiObjects.graphicsContext,
            fontSizeRange: modifiersLayoutConstants.fontSizeRange,
            linesOfTextRange: modifiersLayoutConstants.linesOfTextRange,
        })

        uiObjects.modifiers.rightSide.push(
            TextBoxService.new({
                fontColor: modifiersLayoutConstants.fontColor,
                fontSize: textInfo.fontSize,
                area: RectAreaService.new({
                    left: RectAreaService.centerX(boundingBox),
                    bottom,
                    width: modifiersLayoutConstants.rightColumn.width,
                    height: modifiersLayoutConstants.height,
                    margin: modifiersLayoutConstants.rightColumn.margin,
                }),
                text: textInfo.text,
            })
        )

        BlackboardService.add<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects",
            uiObjects
        )

        return true
    }

    clone(): BehaviorTreeTask {
        return new CreateRightModifiersTextBoxAction(this.blackboard)
    }
}

const sortModifierDisplayDescending = (
    a: { name: string; amount: number | undefined },
    b: { name: string; amount: number | undefined }
) => {
    switch (true) {
        case a === undefined:
            return 1
        case b === undefined:
            return -1
        default:
            return a < b ? -1 : 1
    }
}

const formatAttributeTypeAndAmount = ({
    amount,
    type,
}: AttributeTypeAndAmount): {
    name: string
    amount: number | undefined
} => ({
    name: AttributeModifierService.readableNameForAttributeType(type),
    amount: AttributeModifierService.isAttributeTypeABinaryEffect(type)
        ? undefined
        : amount,
})

const formatAmount = (amount: number | undefined) => {
    switch (true) {
        case amount == undefined:
            return ""
        case amount > 0:
            return `+${amount} `
        default:
            return `${amount} `
    }
}

const calculateBottomOfModifierList = (
    modifierTextBoxes: TextBox[],
    boundingBox: RectArea
) =>
    modifierTextBoxes.length > 0
        ? RectAreaService.top(
              modifierTextBoxes[modifierTextBoxes.length - 1].area
          )
        : RectAreaService.bottom(boundingBox)
