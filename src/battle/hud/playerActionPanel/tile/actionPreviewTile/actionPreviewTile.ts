import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../objectRepository"
import {
    ActionTilePosition,
    ActionTilePositionService,
    TActionTilePosition,
} from "../actionTilePosition"
import { TSquaddieAffiliation } from "../../../../../squaddie/squaddieAffiliation"
import { TextBox } from "../../../../../ui/textBox/textBox"
import { getResultOrThrowError } from "../../../../../utils/resultOrError"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../../../actionDecision/battleActionDecisionStep"
import {
    GOLDEN_RATIO,
    HORIZONTAL_ALIGN,
    HORIZONTAL_ALIGN_TYPE,
    WINDOW_SPACING,
} from "../../../../../ui/constants"
import { SquaddieTemplate } from "../../../../../campaign/squaddieTemplate"
import { ActionCalculator } from "../../../../calculator/actionCalculator/calculator"
import { CalculatedResult } from "../../../../history/calculatedResult"
import {
    DegreeOfSuccess,
    TDegreeOfSuccess,
} from "../../../../calculator/actionCalculator/degreeOfSuccess"
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
import { CreateNextNamesOfDegreesOfSuccessTextBoxAction } from "./uiObjects/namesOfDegreesOfSuccess"
import { DrawRectanglesAction } from "../../../../../ui/rectangle/drawRectanglesAction"
import { ComponentDataBlob } from "../../../../../utils/dataBlob/componentDataBlob"
import { Rectangle } from "../../../../../ui/rectangle/rectangle"

export interface ActionPreviewTile {
    forecast: CalculatedResult
    data: ComponentDataBlob<
        ActionPreviewTileLayout,
        ActionPreviewTileContext,
        ActionPreviewTileUIObjects
    >
    drawBehaviorTree: BehaviorTreeTask
}

const actionPreviewTileWidth = ScreenDimensions.SCREEN_WIDTH / 6
const shortWidth = ScreenDimensions.SCREEN_WIDTH / 6 / (GOLDEN_RATIO + 1)
const longWidth = ScreenDimensions.SCREEN_WIDTH / 6 / GOLDEN_RATIO

export const ShowDegreeOfSuccessEvenIfNoEffect = {
    YES: "YES",
    NO: "NO",
    IF_CRITICAL_FAILURE_DOES_NOT_EXIST: "IF_CRITICAL_FAILURE_DOES_NOT_EXIST",
} as const satisfies Record<string, string>

export type TShowDegreeOfSuccessEvenIfNoEffect = EnumLike<
    typeof ShowDegreeOfSuccessEvenIfNoEffect
>

export interface ActionPreviewTileLayout {
    topRowOffset: number
    targetName: {
        height: number
        width: number
        fontColor: number[]
        margin: number[]
        strokeWeight: number
        fontSizeRange: {
            preferred: number
            minimum: number
        }
        linesOfTextRange: { minimum: number }
    }
    degreesOfSuccess: {
        height: number
        rowOrder: {
            degreeOfSuccess: TDegreeOfSuccess
            suffix: string
            showEvenIfNoEffect: TShowDegreeOfSuccessEvenIfNoEffect
            showChanceOfSuccess: boolean
        }[]
    }
    namesOfDegreesOfSuccess: {
        width: number
        fontSize: number
        fontColor: number[]
        margin: number[]
    }
    chancesOfDegreesOfSuccess: {
        width: number
        fontSize: number
        fontColor: number[]
        margin: number[]
        bar: {
            colorByDegreeOfSuccess: {
                [degree in TDegreeOfSuccess]: number[]
            }
            lengthPerChance: number
            horizontalOffset: number
            height: number
            cornerRadius: number[]
        }
    }
    effectsOfDegreesOfSuccess: {
        width: number
        strokeWeight: number
        fontSizeRange: {
            preferred: number
            minimum: number
        }
        linesOfTextRange: { minimum: number }
        fontColor: number[]
        margin: number[]
    }
    modifiers: {
        topOffset: number
        strokeWeight: number
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
            horizAlign: HORIZONTAL_ALIGN_TYPE
        }
        rightColumn: {
            width: number
            margin: number[]
            limit: number
        }
    }
}

export interface ActionPreviewTileContext {
    horizontalPosition: TActionTilePosition
    squaddieAffiliation: TSquaddieAffiliation
    forecast: CalculatedResult
    squaddieNamesByBattleSquaddieId: { [battleSquaddieId: string]: string }
    actionTemplate: ActionTemplate
    focusedBattleSquaddieId: string
}

export interface ActionPreviewTileUIObjects {
    graphicsContext: GraphicsBuffer
    infoTextBox: TextBox
    namesOfDegreesOfSuccessTextBoxes: {
        degreeOfSuccess: TDegreeOfSuccess
        textBox: TextBox
    }[]
    chancesOfDegreesOfSuccessTextBoxes: {
        degreeOfSuccess: TDegreeOfSuccess
        textBox: TextBox
    }[]
    chancesOfDegreesOfSuccessRectangles: {
        degreeOfSuccess: TDegreeOfSuccess
        bar: Rectangle
    }[]
    effectsOfDegreesOfSuccessTextBoxes: {
        degreeOfSuccess: TDegreeOfSuccess
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

        const dataBlob: ComponentDataBlob<
            ActionPreviewTileLayout,
            ActionPreviewTileContext,
            ActionPreviewTileUIObjects
        > = new ComponentDataBlob()
        const shortDegreesOfSuccessWidth = shortWidth * 0.6
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
                strokeWeight: 4,
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
            namesOfDegreesOfSuccess: {
                fontSize: 16,
                width: shortDegreesOfSuccessWidth,
                fontColor: [0, 0, 192 - 128],
                margin: [0, 0, 0, WINDOW_SPACING.SPACING1],
            },
            chancesOfDegreesOfSuccess: {
                fontSize: 16,
                width: shortDegreesOfSuccessWidth,
                fontColor: [0, 0, 192 - 128],
                margin: [0, 0, 0, 0],
                bar: {
                    colorByDegreeOfSuccess: {
                        [DegreeOfSuccess.CRITICAL_SUCCESS]: [5, 40, 40],
                        [DegreeOfSuccess.SUCCESS]: [5, 40, 30],
                        [DegreeOfSuccess.FAILURE]: [240, 40, 40],
                        [DegreeOfSuccess.CRITICAL_FAILURE]: [240, 10, 10],
                        [DegreeOfSuccess.NONE]: [5, 10, 10],
                    },
                    horizontalOffset: 2,
                    lengthPerChance: actionPreviewTileWidth / 36,
                    height: 16,
                    cornerRadius: [0, 6, 6, 0],
                },
            },
            effectsOfDegreesOfSuccess: {
                width:
                    actionPreviewTileWidth -
                    shortDegreesOfSuccessWidth -
                    shortDegreesOfSuccessWidth -
                    WINDOW_SPACING.SPACING2,
                fontColor: [0, 0, 192 - 128],
                margin: [0, 0, 0, WINDOW_SPACING.SPACING1],
                strokeWeight: 2,
                fontSizeRange: {
                    preferred: 16,
                    minimum: 8,
                },
                linesOfTextRange: { minimum: 1 },
            },
            modifiers: {
                topOffset: WINDOW_SPACING.SPACING1,
                strokeWeight: 1,
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

        dataBlob.setLayout(layout)
        dataBlob.setContext(context)

        const uiObjects: ActionPreviewTileUIObjects = {
            infoTextBox: undefined,
            graphicsContext: undefined,
            namesOfDegreesOfSuccessTextBoxes: undefined,
            chancesOfDegreesOfSuccessTextBoxes: undefined,
            chancesOfDegreesOfSuccessRectangles: undefined,
            effectsOfDegreesOfSuccessTextBoxes: undefined,
            targetNameTextBox: undefined,
            modifiers: undefined,
        }
        dataBlob.setUIObjects(uiObjects)
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
        const uiObjects = tile.data.getUIObjects()
        uiObjects.graphicsContext = graphicsContext

        const context = tile.data.getContext()
        ActionTilePositionService.drawBackground({
            squaddieAffiliation: context.squaddieAffiliation,
            graphicsContext,
            horizontalPosition: context.horizontalPosition,
        })

        tile.drawBehaviorTree.run()
    },
}

const createDrawingBehaviorTree = (
    dataBlob: ComponentDataBlob<
        ActionPreviewTileLayout,
        ActionPreviewTileContext,
        ActionPreviewTileUIObjects
    >
) => {
    const createTargetNameTextBoxTree = new SequenceComposite(dataBlob, [
        new InverterDecorator(
            dataBlob,
            new DoesUIObjectExistCondition(dataBlob, "targetName")
        ),
        new CreateTargetNameTextBoxesAction(dataBlob),
    ])
    const createNamesOfDegreesOfSuccessTextBoxesTree = new SequenceComposite(
        dataBlob,
        [
            new InverterDecorator(
                dataBlob,
                new DoesUIObjectExistCondition(
                    dataBlob,
                    "namesOfDegreesOfSuccessTextBoxes"
                )
            ),
            new UntilFailDecorator(
                dataBlob,
                new CreateNextNamesOfDegreesOfSuccessTextBoxAction(dataBlob)
            ),
        ]
    )
    const createChancesOfDegreesOfSuccessTextBoxesTree = new SequenceComposite(
        dataBlob,
        [
            new InverterDecorator(
                dataBlob,
                new DoesUIObjectExistCondition(
                    dataBlob,
                    "chancesOfDegreesOfSuccessTextBoxes"
                )
            ),
            new InverterDecorator(
                dataBlob,
                new DoesUIObjectExistCondition(
                    dataBlob,
                    "chancesOfDegreesOfSuccessRectangles"
                )
            ),
            new UntilFailDecorator(
                dataBlob,
                new CreateNextChancesOfDegreesOfSuccessTextBoxAction(dataBlob)
            ),
        ]
    )
    const createEffectsOfDegreesOfSuccessTextBoxesTree = new SequenceComposite(
        dataBlob,
        [
            new InverterDecorator(
                dataBlob,
                new DoesUIObjectExistCondition(
                    dataBlob,
                    "effectsOfDegreesOfSuccessTextBoxes"
                )
            ),
            new UntilFailDecorator(
                dataBlob,
                new CreateNextEffectsOfDegreesOfSuccessTextBoxAction(dataBlob)
            ),
        ]
    )
    const createModifiersTextBoxesTree = new SequenceComposite(dataBlob, [
        new InverterDecorator(
            dataBlob,
            new DoesUIObjectExistCondition(dataBlob, "modifiersTextBoxes")
        ),
        new UntilFailDecorator(
            dataBlob,
            new CreateLeftModifiersTextBoxAction(dataBlob)
        ),
        new UntilFailDecorator(
            dataBlob,
            new CreateRightModifiersTextBoxAction(dataBlob)
        ),
    ])

    const drawTextBoxTree = new SequenceComposite(dataBlob, [
        new DoesUIObjectExistCondition(dataBlob, "graphicsContext"),
        new DrawTextBoxesAction(
            dataBlob,
            (
                dataBlob: ComponentDataBlob<
                    ActionPreviewTileLayout,
                    ActionPreviewTileContext,
                    ActionPreviewTileUIObjects
                >
            ) => {
                const uiObjects = dataBlob.getUIObjects()
                return [
                    ...uiObjects.namesOfDegreesOfSuccessTextBoxes.map(
                        (a) => a.textBox
                    ),
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
            (
                dataBlob: ComponentDataBlob<
                    ActionPreviewTileLayout,
                    ActionPreviewTileContext,
                    ActionPreviewTileUIObjects
                >
            ) => {
                const uiObjects = dataBlob.getUIObjects()
                return uiObjects.graphicsContext
            }
        ),
    ])

    const drawRectangles = new DrawRectanglesAction(
        dataBlob,
        (
            dataBlob: ComponentDataBlob<
                ActionPreviewTileLayout,
                ActionPreviewTileContext,
                ActionPreviewTileUIObjects
            >
        ) => {
            const uiObjects = dataBlob.getUIObjects()
            return [
                ...uiObjects.chancesOfDegreesOfSuccessRectangles.map(
                    (x) => x.bar
                ),
            ].filter((x) => x)
        },
        (
            dataBlob: ComponentDataBlob<
                ActionPreviewTileLayout,
                ActionPreviewTileContext,
                ActionPreviewTileUIObjects
            >
        ) => {
            const uiObjects = dataBlob.getUIObjects()
            return uiObjects.graphicsContext
        }
    )

    const drawBehaviorTree: BehaviorTreeTask = new ExecuteAllComposite(
        dataBlob,
        [
            createTargetNameTextBoxTree,
            createNamesOfDegreesOfSuccessTextBoxesTree,
            createChancesOfDegreesOfSuccessTextBoxesTree,
            drawRectangles,
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
    dataBlob: ComponentDataBlob<
        ActionPreviewTileLayout,
        ActionPreviewTileContext,
        ActionPreviewTileUIObjects
    >
    uiObjectKey: string

    constructor(
        blackboard: ComponentDataBlob<
            ActionPreviewTileLayout,
            ActionPreviewTileContext,
            ActionPreviewTileUIObjects
        >,
        uiObjectKey: string
    ) {
        this.dataBlob = blackboard
        this.uiObjectKey = uiObjectKey
    }

    run(): boolean {
        const uiObjects = this.dataBlob.getUIObjects()
        return (
            uiObjects[this.uiObjectKey as keyof typeof uiObjects] !== undefined
        )
    }
}
