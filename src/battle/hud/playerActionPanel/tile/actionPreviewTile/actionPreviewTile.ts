import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../objectRepository"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "../actionTilePosition"
import { SquaddieAffiliation } from "../../../../../squaddie/squaddieAffiliation"
import { TextBox } from "../../../../../ui/textBox/textBox"
import { getResultOrThrowError } from "../../../../../utils/ResultOrError"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../../../actionDecision/battleActionDecisionStep"
import {
    GOLDEN_RATIO,
    HORIZONTAL_ALIGN,
    WINDOW_SPACING,
} from "../../../../../ui/constants"
import { SquaddieTemplate } from "../../../../../campaign/squaddieTemplate"
import { ActionCalculator } from "../../../../calculator/actionCalculator/calculator"
import { CalculatedResult } from "../../../../history/calculatedResult"
import { DegreeOfSuccess } from "../../../../calculator/actionCalculator/degreeOfSuccess"
import {
    DataBlob,
    DataBlobService,
} from "../../../../../utils/dataBlob/dataBlob"
import { BehaviorTreeTask } from "../../../../../utils/behaviorTree/task"
import { SequenceComposite } from "../../../../../utils/behaviorTree/composite/sequence/sequence"
import { InverterDecorator } from "../../../../../utils/behaviorTree/decorator/inverter/inverter"
import { ExecuteAllComposite } from "../../../../../utils/behaviorTree/composite/executeAll/executeAll"
import { DrawTextBoxesAction } from "../../../../../ui/textBox/drawTextBoxesAction"
import { ScreenDimensions } from "../../../../../utils/graphics/graphicsConfig"
import { UntilFailDecorator } from "../../../../../utils/behaviorTree/decorator/untilFail/untilFail"
import { ActionTemplate } from "../../../../../action/template/actionTemplate"
import { CreateTargetNameTextBoxesAction } from "./uiObjects/targetName"
import { CreateNextChancesOfDegreesOfSuccessTextBoxAction } from "./uiObjects/chancesOfDegreesOfSuccess"
import { CreateNextEffectsOfDegreesOfSuccessTextBoxAction } from "./uiObjects/effectsOfDegreesOfSuccess"
import {
    CreateLeftModifiersTextBoxAction,
    CreateRightModifiersTextBoxAction,
} from "./uiObjects/modifiers"
import { MissionMap } from "../../../../../missionMap/missionMap"
import { BattleActionRecorder } from "../../../../history/battleAction/battleActionRecorder"
import { NumberGeneratorStrategy } from "../../../../numberGenerator/strategy"

export interface ActionPreviewTile {
    forecast: CalculatedResult
    data: DataBlob
    drawBehaviorTree: BehaviorTreeTask
}

const shortWidth = ScreenDimensions.SCREEN_WIDTH / 6 / (GOLDEN_RATIO + 1)
const longWidth = ScreenDimensions.SCREEN_WIDTH / 6 / GOLDEN_RATIO

export enum ShowDegreeOfSuccessEvenIfNoEffect {
    YES = "YES",
    NO = "NO",
    IF_CRITICAL_FAILURE_DOES_NOT_EXIST = "IF_CRITICAL_FAILURE_DOES_NOT_EXIST",
}

export interface ActionPreviewTileLayout {
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
            showEvenIfNoEffect: ShowDegreeOfSuccessEvenIfNoEffect
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

export interface ActionPreviewTileContext {
    horizontalPosition: ActionTilePosition.ACTION_PREVIEW
    squaddieAffiliation: SquaddieAffiliation
    forecast: CalculatedResult
    squaddieNamesByBattleSquaddieId: { [battleSquaddieId: string]: string }
    actionTemplate: ActionTemplate
    focusedBattleSquaddieId: string
}

export interface ActionPreviewTileUIObjects {
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
        battleActionDecisionStep,
        objectRepository,
        missionMap,
        battleActionRecorder,
        numberGenerator,
    }: {
        battleActionDecisionStep: BattleActionDecisionStep
        objectRepository: ObjectRepository
        missionMap: MissionMap
        battleActionRecorder: BattleActionRecorder
        numberGenerator: NumberGeneratorStrategy
    }): ActionPreviewTile => {
        const battleSquaddieId = BattleActionDecisionStepService.getActor(
            battleActionDecisionStep
        ).battleSquaddieId

        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
            )
        )

        const forecast = ActionCalculator.forecastResults({
            battleActionDecisionStep,
            missionMap,
            objectRepository,
            battleActionRecorder,
            numberGenerator,
        })

        const dataBlob: DataBlob = DataBlobService.new()
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
                        showEvenIfNoEffect:
                            ShowDegreeOfSuccessEvenIfNoEffect.YES,
                        showChanceOfSuccess: true,
                    },
                    {
                        degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        suffix: "hit",
                        showEvenIfNoEffect:
                            ShowDegreeOfSuccessEvenIfNoEffect.YES,
                        showChanceOfSuccess: true,
                    },
                    {
                        degreeOfSuccess: DegreeOfSuccess.FAILURE,
                        suffix: "miss",
                        showEvenIfNoEffect:
                            ShowDegreeOfSuccessEvenIfNoEffect.IF_CRITICAL_FAILURE_DOES_NOT_EXIST,
                        showChanceOfSuccess: true,
                    },
                    {
                        degreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
                        suffix: "botch",
                        showEvenIfNoEffect:
                            ShowDegreeOfSuccessEvenIfNoEffect.YES,
                        showChanceOfSuccess: true,
                    },
                    {
                        degreeOfSuccess: DegreeOfSuccess.NONE,
                        suffix: "",
                        showEvenIfNoEffect:
                            ShowDegreeOfSuccessEvenIfNoEffect.NO,
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
            forecast: forecast,
            objectRepository,
            battleActionDecisionStep,
        })

        DataBlobService.add<ActionPreviewTileLayout>(dataBlob, "layout", layout)

        DataBlobService.add<ActionPreviewTileContext>(
            dataBlob,
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
        DataBlobService.add<ActionPreviewTileUIObjects>(
            dataBlob,
            "uiObjects",
            uiObjects
        )
        const drawBehaviorTree = createDrawingBehaviorTree(dataBlob)

        return {
            forecast,
            data: dataBlob,
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
        const uiObjects = DataBlobService.get<ActionPreviewTileUIObjects>(
            tile.data,
            "uiObjects"
        )
        uiObjects.graphicsContext = graphicsContext

        const context = DataBlobService.get<ActionPreviewTileContext>(
            tile.data,
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

const createDrawingBehaviorTree = (blackboard: DataBlob) => {
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
            (blackboard: DataBlob) => {
                const uiObjects =
                    DataBlobService.get<ActionPreviewTileUIObjects>(
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
            (blackboard: DataBlob) => {
                const uiObjects =
                    DataBlobService.get<ActionPreviewTileUIObjects>(
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
    forecast,
    objectRepository,
    battleActionDecisionStep,
}: {
    squaddieTemplate: SquaddieTemplate
    objectRepository: ObjectRepository
    forecast: CalculatedResult
    battleActionDecisionStep: BattleActionDecisionStep
}) => {
    const squaddieNamesByBattleSquaddieId: {
        [battleSquaddieId: string]: string
    } = {}
    let focusedBattleSquaddieId: string = undefined
    forecast.changesPerEffect.forEach((effect) => {
        effect.squaddieChanges.forEach((squaddieChange) => {
            const { squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    squaddieChange.battleSquaddieId
                )
            )
            squaddieNamesByBattleSquaddieId[squaddieChange.battleSquaddieId] =
                squaddieTemplate.squaddieId.name
            focusedBattleSquaddieId ||= squaddieChange.battleSquaddieId
        })
    })

    const actionTemplateId = BattleActionDecisionStepService.getAction(
        battleActionDecisionStep
    ).actionTemplateId
    const actionTemplate = ObjectRepositoryService.getActionTemplateById(
        objectRepository,
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
    dataBlob: DataBlob
    uiObjectKey: string

    constructor(blackboard: DataBlob, uiObjectKey: string) {
        this.dataBlob = blackboard
        this.uiObjectKey = uiObjectKey
    }

    run(): boolean {
        const uiObjects = DataBlobService.get<ActionPreviewTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )
        return (
            uiObjects[this.uiObjectKey as keyof typeof uiObjects] !== undefined
        )
    }
}
