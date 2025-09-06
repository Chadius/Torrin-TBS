import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../objectRepository"
import { getResultOrThrowError } from "../../../../../utils/ResultOrError"
import { ResourceHandler } from "../../../../../resource/resourceHandler"
import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import { TSquaddieAffiliation } from "../../../../../squaddie/squaddieAffiliation"
import {
    ActionTilePositionService,
    TActionTilePosition,
} from "../actionTilePosition"
import { InBattleAttributesService } from "../../../../stats/inBattleAttributes"
import { TextBox, TextBoxService } from "../../../../../ui/textBox/textBox"
import { RectAreaService } from "../../../../../ui/rectArea"
import { WINDOW_SPACING } from "../../../../../ui/constants"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../../graphicsConstants"
import { BattleSquaddie } from "../../../../battleSquaddie"
import {
    SquaddieMovementExplanation,
    SquaddieService,
} from "../../../../../squaddie/squaddieService"
import { SquaddieTemplate } from "../../../../../campaign/squaddieTemplate"
import {
    MissionMap,
    MissionMapService,
} from "../../../../../missionMap/missionMap"
import { CalculateAgainstArmor } from "../../../../calculator/actionCalculator/calculateAgainstArmor"
import {
    ImageUI,
    ImageUILoadingBehavior,
} from "../../../../../ui/imageUI/imageUI"
import {
    Attribute,
    TAttribute,
    AttributeTypeAndAmount,
    AttributeTypeService,
} from "../../../../../squaddie/attribute/attribute"
import {
    DataBlob,
    DataBlobService,
} from "../../../../../utils/dataBlob/dataBlob"
import { BehaviorTreeTask } from "../../../../../utils/behaviorTree/task"
import { SequenceComposite } from "../../../../../utils/behaviorTree/composite/sequence/sequence"
import { InverterDecorator } from "../../../../../utils/behaviorTree/decorator/inverter/inverter"
import { ExecuteAllComposite } from "../../../../../utils/behaviorTree/composite/executeAll/executeAll"
import { DrawTextBoxesAction } from "../../../../../ui/textBox/drawTextBoxesAction"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../../../../hexMap/hexCoordinate/hexCoordinate"
import { DrawImagesAction } from "../../../../../ui/imageUI/drawImagesAction"
import { DrawHorizontalMeterActionDataBlob } from "../../../horizontalBar/drawHorizontalMeterAction"
import { GameEngineState } from "../../../../../gameEngine/gameEngine"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../../../actionDecision/battleActionDecisionStep"
import { PlayerConsideredActions } from "../../../../battleState/playerConsideredActions"
import {
    SquaddieStatusTileDrawHitPointsPointsMeterAction,
    SquaddieStatusTileIsHitPointsCorrectCondition,
    SquaddieStatusTileUpdateHitPointsContextAction,
    SquaddieStatusTileUpdateHitPointsUIObjectsAction,
} from "./uiObjects/hitPoints"
import {
    DrawActionPointsMeterAction,
    IsActionPointsCorrectCondition,
    UpdateActionPointsContextAction,
    UpdateActionPointsUIObjectsAction,
} from "./uiObjects/actionPoints"
import { ACTION_POINT_METER_FILL_COLOR } from "../../../../../ui/colors"

export interface SquaddieStatusTile {
    data: DataBlob
    drawBehaviorTree: BehaviorTreeTask
}

export interface SquaddieStatusTileUILayout {
    rowSize: number
    armor: {
        row: number
        fontSize: number
        fontSaturation: number
        fontBrightness: number
    }
    hitPoints: {
        row: number
        fontSize: number
        fontSaturation: number
        fontBrightness: number
        hitPointMeter: {
            emptyColor: number[]
            currentValueFillColor: number[]
            currentValueSegmentColor: number[]
            currentValueSegmentStrokeWeight: number

            dangerLevelHitPoints: {
                currentValueFillAlphaRange: number[]
                currentValueFillAlphaPeriod: number
            }
            perilLevelHitPoints: {
                currentValueFillAlphaRange: number[]
                currentValueFillAlphaPeriod: number
            }

            highlightedValueFillColor: number[]
            highlightedValueFillAlphaRange: number[]
            highlightedValueFillAlphaPeriod: number

            outlineStrokeWeight: number
            outlineStrokeColor: number[]

            absorbBar: {
                emptyColor: number[]
                currentValueFillColor: number[]
                currentValueSegmentColor: number[]
                currentValueSegmentStrokeWeight: number
                currentValueFillAlphaRange: number[]
                currentValueFillAlphaPeriod: number

                outlineStrokeWeight: number
                outlineStrokeColor: number[]
            }
        }
    }
    actionPoints: {
        row: number
        fontSize: number
        fontSaturation: number
        fontBrightness: number
        meter: {
            emptyColor: number[]
            currentValueFillColor: number[]
            currentValueSegmentColor: number[]
            currentValueSegmentStrokeWeight: number

            highlightedValueFillColor: number[]
            highlightedValueFillAlphaRange: number[]
            highlightedValueFillAlphaPeriod: number

            outlineStrokeWeight: number
            outlineStrokeColor: number[]
        }
    }
    movement: {
        row: number
        fontSize: number
        fontSaturation: number
        fontBrightness: number
    }
    coordinates: {
        fontSize: number
        fontSaturation: number
        fontBrightness: number
    }
    attributeModifiers: {
        fontSize: number
        fontSaturation: number
        fontBrightness: number
        iconSize: number
        positionByType: [
            {
                type: typeof Attribute.ARMOR
                row: number
                percentLeft: number
            },
            {
                type: typeof Attribute.MOVEMENT
                row: number
                percentLeft: number
            },
            {
                type: typeof Attribute.HUSTLE
                row: number
                percentLeft: number
            },
            {
                type: typeof Attribute.ELUSIVE
                row: number
                percentLeft: number
            },
        ]
        arrowIconWidth: number
        arrowIconHeight: number
    }
}

export interface SquaddieStatusTileUIObjects {
    armor: { textBox?: TextBox }
    actionPoints: {
        textBox?: TextBox
        actionPointMeterDataBlob?: DrawHorizontalMeterActionDataBlob
    }
    hitPoints: {
        textBox?: TextBox
        actionPointMeterDataBlob?: DrawHorizontalMeterActionDataBlob
        absorbBar?: DrawHorizontalMeterActionDataBlob
    }
    movement: {
        textBox?: TextBox
    }
    coordinates: {
        textBox?: TextBox
    }
    attributeModifiers: {
        graphicsByAttributeType: {
            [t in TAttribute]?: {
                icon: ImageUI
                arrowIcon?: ImageUI
                textBox: TextBox
            }
        }
    }
}

export type SquaddieStatusTileActionPointsContext = {
    actionPointsRemaining: number
    actionPointsMarkedForAction: number
    movementPointsPreviewedByPlayer: number
    movementPointsSpentButCanBeRefunded: number
    spentAndCannotBeRefunded: number
}

export interface SquaddieStatusTileContext {
    squaddieAffiliation: TSquaddieAffiliation
    horizontalPosition: TActionTilePosition
    battleSquaddieId: string
    objectRepository: ObjectRepository
    playerConsideredActions?: PlayerConsideredActions
    armor?: {
        net: number
        modifier: number
    }
    hitPoints?: {
        currentHitPoints: number
        maxHitPoints: number
        currentAbsorb: number
    }
    actionPoints?: SquaddieStatusTileActionPointsContext
    movement?: {
        initialMovementPerAction: number
        movementChange: number
    }
    coordinates?: HexCoordinate
    attributeModifiers?: AttributeTypeAndAmount[]
}

export const SquaddieStatusTileService = {
    new: ({
        battleSquaddieId,
        horizontalPosition,
        gameEngineState,
    }: {
        battleSquaddieId: string
        horizontalPosition: TActionTilePosition
        gameEngineState: GameEngineState
    }): SquaddieStatusTile => {
        const dataBlob: DataBlob = DataBlobService.new()
        const context = createContext({
            gameEngineState,
            battleSquaddieId,
            horizontalPosition,
        })

        DataBlobService.add<SquaddieStatusTileContext>(
            dataBlob,
            "context",
            context
        )

        const uiObjects: SquaddieStatusTileUIObjects = {
            armor: { textBox: undefined },
            actionPoints: { textBox: undefined },
            hitPoints: { textBox: undefined },
            movement: { textBox: undefined },
            coordinates: { textBox: undefined },
            attributeModifiers: { graphicsByAttributeType: {} },
        }
        DataBlobService.add<SquaddieStatusTileUIObjects>(
            dataBlob,
            "uiObjects",
            uiObjects
        )

        const layoutConstants: SquaddieStatusTileUILayout = {
            rowSize: 28,
            armor: {
                row: 0,
                fontSize: 14,
                fontSaturation: 7,
                fontBrightness: 112,
            },
            hitPoints: {
                row: 1,
                fontSize: 16,
                fontSaturation: 7,
                fontBrightness: 112,
                hitPointMeter: {
                    emptyColor: [5, 65, 8],
                    currentValueFillColor: [5, 74, 69],
                    currentValueSegmentColor: [0, 20, 10],
                    currentValueSegmentStrokeWeight: 2,
                    dangerLevelHitPoints: {
                        currentValueFillAlphaRange: [192, 256],
                        currentValueFillAlphaPeriod: 2000,
                    },
                    perilLevelHitPoints: {
                        currentValueFillAlphaRange: [128, 256],
                        currentValueFillAlphaPeriod: 1000,
                    },

                    highlightedValueFillColor: [0, 40, 60],
                    highlightedValueFillAlphaRange: [0, 100],
                    highlightedValueFillAlphaPeriod: 2000,

                    outlineStrokeWeight: 2,
                    outlineStrokeColor: [0, 20, 10],

                    absorbBar: {
                        emptyColor: [0, 0, 0],
                        currentValueFillColor: [9, 23, 82],
                        currentValueSegmentColor: [9, 65, 8],
                        currentValueSegmentStrokeWeight: 8,
                        currentValueFillAlphaRange: [256 - 32, 256],
                        currentValueFillAlphaPeriod: 1000,

                        outlineStrokeWeight: 1,
                        outlineStrokeColor: [9, 9, 90],
                    },
                },
            },
            actionPoints: {
                row: 2,
                fontSize: 14,
                fontSaturation: 7,
                fontBrightness: 112,
                meter: {
                    emptyColor: [0, 0, 12],
                    currentValueFillColor: ACTION_POINT_METER_FILL_COLOR,
                    currentValueSegmentColor: [0, 2, 10],
                    currentValueSegmentStrokeWeight: 2,

                    highlightedValueFillColor: [0, 2, 60],
                    highlightedValueFillAlphaRange: [0, 100],
                    highlightedValueFillAlphaPeriod: 2000,

                    outlineStrokeWeight: 2,
                    outlineStrokeColor: [0, 2, 10],
                },
            },
            movement: {
                row: 3,
                fontSize: 14,
                fontSaturation: 7,
                fontBrightness: 112,
            },
            coordinates: {
                fontSize: 12,
                fontSaturation: 7,
                fontBrightness: 112,
            },
            attributeModifiers: {
                fontSize: 12,
                fontSaturation: 7,
                fontBrightness: 80,
                iconSize: 20,
                positionByType: [
                    {
                        type: Attribute.ARMOR,
                        row: 0,
                        percentLeft: 40,
                    },
                    {
                        type: Attribute.MOVEMENT,
                        row: 3,
                        percentLeft: 40,
                    },
                    {
                        type: Attribute.HUSTLE,
                        row: 3,
                        percentLeft: 45,
                    },
                    {
                        type: Attribute.ELUSIVE,
                        row: 3,
                        percentLeft: 55,
                    },
                ],
                arrowIconWidth: 16,
                arrowIconHeight: 24,
            },
        }
        DataBlobService.add<SquaddieStatusTileUILayout>(
            dataBlob,
            "layout",
            layoutConstants
        )

        updateContext({
            dataBlob,
            objectRepository: gameEngineState.repository,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            playerConsideredActions:
                gameEngineState.battleOrchestratorState.battleState
                    .playerConsideredActions,
            battleActionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
        })

        return {
            data: dataBlob,
            drawBehaviorTree: undefined,
        }
    },
    draw: ({
        tile,
        graphicsContext,
        resourceHandler,
    }: {
        tile: SquaddieStatusTile
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }) => {
        if (tile.drawBehaviorTree == undefined) {
            tile.drawBehaviorTree = createDrawingTree({
                dataBlob: tile.data,
                graphicsContext,
                resourceHandler,
            })
        }

        const context = DataBlobService.get<SquaddieStatusTileContext>(
            tile.data,
            "context"
        )

        ActionTilePositionService.drawBackground({
            squaddieAffiliation: context.squaddieAffiliation,
            graphicsContext,
            horizontalPosition: context.horizontalPosition,
        })

        updateUIObjects({
            dataBlob: tile.data,
            graphicsContext: graphicsContext,
            resourceHandler: resourceHandler,
        })
        tile.drawBehaviorTree.run()
    },
    updateTileUsingSquaddie: ({
        tile,
        missionMap,
        playerConsideredActions,
        battleActionDecisionStep,
        objectRepository,
    }: {
        tile: SquaddieStatusTile
        missionMap: MissionMap
        playerConsideredActions: PlayerConsideredActions
        battleActionDecisionStep: BattleActionDecisionStep
        objectRepository: ObjectRepository
    }) => {
        updateContext({
            dataBlob: tile.data,
            objectRepository,
            missionMap,
            playerConsideredActions,
            battleActionDecisionStep,
        })
    },
    calculateHitPoints: (
        battleSquaddie: BattleSquaddie,
        squaddieTemplate: SquaddieTemplate
    ) => {
        let { currentHitPoints, maxHitPoints } = SquaddieService.getHitPoints({
            battleSquaddie,
            squaddieTemplate,
        })

        const currentAttributes =
            InBattleAttributesService.calculateCurrentAttributeModifiers(
                battleSquaddie.inBattleAttributes
            )

        const absorbAttribute = currentAttributes.find(
            (attributeTypeAndAmount) =>
                attributeTypeAndAmount.type === Attribute.ABSORB
        )
        let currentAbsorb = 0
        if (absorbAttribute) {
            currentAbsorb = absorbAttribute.amount
        }

        return {
            currentHitPoints,
            maxHitPoints,
            currentAbsorb,
        }
    },
    createTextBoxOnLeftSideOfRow: ({
        actionTilePosition,
        text,
        fontSize,
        fontColor,
        topOffset,
        graphicsContext,
    }: {
        actionTilePosition: TActionTilePosition
        fontColor: number[]
        text: string
        fontSize: number
        topOffset: number
        graphicsContext: GraphicsBuffer
    }): TextBox => {
        const overallBoundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                actionTilePosition
            )
        graphicsContext.push()
        graphicsContext.textSize(fontSize)
        const textBox = TextBoxService.new({
            text,
            fontSize: fontSize,
            fontColor,
            area: RectAreaService.new({
                left:
                    RectAreaService.left(overallBoundingBox) +
                    WINDOW_SPACING.SPACING1,
                top:
                    RectAreaService.top(overallBoundingBox) +
                    topOffset +
                    WINDOW_SPACING.SPACING1,
                width:
                    graphicsContext.textWidth(text) + WINDOW_SPACING.SPACING1,
                height: fontSize,
            }),
        })
        graphicsContext.pop()
        return textBox
    },
    getContextVariablesThatDependOnTargetSquaddie: ({
        battleSquaddieId,
        objectRepository,
    }: {
        battleSquaddieId: string
        objectRepository: ObjectRepository
    }): { actionPoints: SquaddieStatusTileActionPointsContext } => {
        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
            )
        )

        const { actionPointsRemaining, movementActionPoints } =
            calculateActionPoints(battleSquaddie)

        return {
            actionPoints: {
                actionPointsRemaining,
                spentAndCannotBeRefunded:
                    movementActionPoints.spentAndCannotBeRefunded,
                movementPointsSpentButCanBeRefunded: 0,
                movementPointsPreviewedByPlayer: 0,
                actionPointsMarkedForAction: 0,
            },
        }
    },
    getContextVariablesThatDependOnActorSquaddie: ({
        battleSquaddieId,
        playerConsideredActions,
        objectRepository,
    }: {
        battleSquaddieId: string
        playerConsideredActions: PlayerConsideredActions
        objectRepository: ObjectRepository
    }): { actionPoints: SquaddieStatusTileActionPointsContext } => {
        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
            )
        )

        const { actionPointsRemaining, movementActionPoints } =
            calculateActionPoints(battleSquaddie)

        let actionPointsMarkedForAction = 0
        switch (true) {
            case !!playerConsideredActions.actionTemplateId:
                actionPointsMarkedForAction =
                    ObjectRepositoryService.getActionTemplateById(
                        objectRepository,
                        playerConsideredActions.actionTemplateId
                    ).resourceCost.actionPoints
                break
            case playerConsideredActions.endTurn:
                actionPointsMarkedForAction = actionPointsRemaining
        }

        return {
            actionPoints: {
                actionPointsRemaining: actionPointsRemaining,
                spentAndCannotBeRefunded:
                    movementActionPoints.spentAndCannotBeRefunded,
                movementPointsSpentButCanBeRefunded:
                    movementActionPoints.spentButCanBeRefunded,
                movementPointsPreviewedByPlayer:
                    movementActionPoints.previewedByPlayer,
                actionPointsMarkedForAction,
            },
        }
    },
}

const calculateAttributeTopLeftCorner = ({
    actionTilePosition,
    attributeTypeAndAmount,
    layout,
}: {
    actionTilePosition: TActionTilePosition
    attributeTypeAndAmount: AttributeTypeAndAmount
    layout: SquaddieStatusTileUILayout
}) => {
    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            actionTilePosition
        )
    const attributePosition = layout.attributeModifiers.positionByType.find(
        (a) => a.type === attributeTypeAndAmount.type
    ) ?? {
        row: 4,
        percentLeft: 0,
    }

    const attributeLeft =
        WINDOW_SPACING.SPACING1 +
        RectAreaService.left(overallBoundingBox) +
        (RectAreaService.width(overallBoundingBox) *
            attributePosition.percentLeft) /
            100
    const attributeTop =
        RectAreaService.top(overallBoundingBox) +
        attributePosition.row * layout.rowSize +
        WINDOW_SPACING.SPACING1
    return { attributeLeft, attributeTop }
}

const createContext = ({
    battleSquaddieId,
    horizontalPosition,
    gameEngineState,
}: {
    battleSquaddieId: string
    horizontalPosition: TActionTilePosition
    gameEngineState: GameEngineState
}): SquaddieStatusTileContext => {
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleSquaddieId
        )
    )
    const actorBattleSquaddieId = BattleActionDecisionStepService.getActor(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    )?.battleSquaddieId

    const squaddieIsTheActor = battleSquaddieId === actorBattleSquaddieId
    const actorSquaddieDependentContext = squaddieIsTheActor
        ? SquaddieStatusTileService.getContextVariablesThatDependOnActorSquaddie(
              {
                  battleSquaddieId,
                  objectRepository: gameEngineState.repository,
                  playerConsideredActions:
                      gameEngineState.battleOrchestratorState.battleState
                          .playerConsideredActions,
              }
          )
        : SquaddieStatusTileService.getContextVariablesThatDependOnTargetSquaddie(
              {
                  battleSquaddieId,
                  objectRepository: gameEngineState.repository,
              }
          )

    return {
        squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
        objectRepository: gameEngineState.repository,
        horizontalPosition,
        battleSquaddieId,
        playerConsideredActions: {
            ...gameEngineState.battleOrchestratorState.battleState
                .playerConsideredActions,
        },
        armor: { ...calculateArmorClass(battleSquaddie, squaddieTemplate) },
        hitPoints: {
            ...SquaddieStatusTileService.calculateHitPoints(
                battleSquaddie,
                squaddieTemplate
            ),
        },
        movement: { ...calculateMovement(battleSquaddie, squaddieTemplate) },
        coordinates: { q: 0, r: 0 },
        attributeModifiers: calculateAttributeModifiers(battleSquaddie),
        ...actorSquaddieDependentContext,
    }
}

const calculateMovement = (
    battleSquaddie: BattleSquaddie,
    squaddieTemplate: SquaddieTemplate
) => {
    const squaddieMovementExplanation: SquaddieMovementExplanation =
        SquaddieService.getSquaddieMovementAttributes({
            battleSquaddie,
            squaddieTemplate,
        })
    let movementChange =
        squaddieMovementExplanation.net.movementPerAction -
        squaddieMovementExplanation.initial.movementPerAction

    return {
        initialMovementPerAction:
            squaddieMovementExplanation.initial.movementPerAction,
        movementChange,
    }
}

const calculateAttributeModifiers = (
    battleSquaddie: BattleSquaddie
): AttributeTypeAndAmount[] =>
    InBattleAttributesService.calculateCurrentAttributeModifiers(
        battleSquaddie.inBattleAttributes
    ).filter(
        (attributeTypeAndAmount) =>
            attributeTypeAndAmount.type != Attribute.ABSORB
    )

const calculateArmorClass = (
    battleSquaddie: BattleSquaddie,
    squaddieTemplate: SquaddieTemplate
) => {
    const armorClass = SquaddieService.getArmorClass({
        battleSquaddie,
        squaddieTemplate,
    })
    const currentNetArmorClass = armorClass.net
    const currentArmorModifierTotal =
        CalculateAgainstArmor.getTargetSquaddieModifierTotal(
            battleSquaddie
        ).reduce(
            (currentTotal, attributeTypeAndAmount) =>
                currentTotal + attributeTypeAndAmount.amount,
            0
        )

    return {
        net: currentNetArmorClass,
        modifier: currentArmorModifierTotal,
    }
}

const calculateCoordinates = (
    battleSquaddieId: string,
    missionMap: MissionMap
) => {
    const { currentMapCoordinate } = MissionMapService.getByBattleSquaddieId(
        missionMap,
        battleSquaddieId
    )
    return currentMapCoordinate
}

const updateContext = ({
    dataBlob,
    objectRepository,
    missionMap,
    playerConsideredActions,
    battleActionDecisionStep,
}: {
    dataBlob: DataBlob
    objectRepository: ObjectRepository
    missionMap: MissionMap
    playerConsideredActions: PlayerConsideredActions
    battleActionDecisionStep: BattleActionDecisionStep
}) => {
    const updateArmor = new SequenceComposite(dataBlob, [
        new DoesUIObjectExistCondition(dataBlob, "armor"),
        new InverterDecorator(
            dataBlob,
            new IsArmorCorrectCondition(dataBlob, objectRepository)
        ),
        new UpdateArmorContextAction(dataBlob, objectRepository),
    ])

    const updateHitPoints = new SequenceComposite(dataBlob, [
        new DoesUIObjectExistCondition(dataBlob, "hitPoints"),
        new InverterDecorator(
            dataBlob,
            new SquaddieStatusTileIsHitPointsCorrectCondition(
                dataBlob,
                objectRepository
            )
        ),
        new SquaddieStatusTileUpdateHitPointsContextAction(
            dataBlob,
            objectRepository
        ),
    ])

    const updateActionPoints = new SequenceComposite(dataBlob, [
        new DoesUIObjectExistCondition(dataBlob, "actionPoints"),
        new InverterDecorator(
            dataBlob,
            new IsActionPointsCorrectCondition({
                dataBlob,
                objectRepository,
                playerConsideredActions,
                battleActionDecisionStep,
            })
        ),
        new UpdateActionPointsContextAction({
            dataBlob,
            objectRepository,
            playerConsideredActions,
            battleActionDecisionStep,
        }),
    ])

    const updateMovement = new SequenceComposite(dataBlob, [
        new DoesUIObjectExistCondition(dataBlob, "movement"),
        new InverterDecorator(
            dataBlob,
            new IsMovementCorrectCondition(dataBlob, objectRepository)
        ),
        new UpdateMovementContextAction(dataBlob, objectRepository),
    ])

    const updateCoordinates = new SequenceComposite(dataBlob, [
        new DoesUIObjectExistCondition(dataBlob, "coordinates"),
        new InverterDecorator(
            dataBlob,
            new IsCoordinatesCorrectCondition(dataBlob, missionMap)
        ),
        new UpdateCoordinatesContextAction(dataBlob, missionMap),
    ])

    const updateAttributeModifiers = new SequenceComposite(dataBlob, [
        new DoesUIObjectExistCondition(dataBlob, "attributeModifiers"),
        new InverterDecorator(
            dataBlob,
            new IsAttributeModifiersCorrectCondition(dataBlob, objectRepository)
        ),
        new UpdateAttributeModifiersContextAction(dataBlob, objectRepository),
    ])

    const updateAll = new ExecuteAllComposite(dataBlob, [
        updateArmor,
        updateHitPoints,
        updateActionPoints,
        updateMovement,
        updateCoordinates,
        updateAttributeModifiers,
    ])

    updateAll.run()
}
const updateUIObjects = ({
    dataBlob,
    graphicsContext,
    resourceHandler,
}: {
    dataBlob: DataBlob
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}) => {
    const updateArmor = new SequenceComposite(dataBlob, [
        new UpdateArmorUIObjectsAction(dataBlob, graphicsContext),
    ])

    const updateHitPoints = new SequenceComposite(dataBlob, [
        new SquaddieStatusTileUpdateHitPointsUIObjectsAction(
            dataBlob,
            graphicsContext
        ),
    ])

    const updateActionPoints = new SequenceComposite(dataBlob, [
        new UpdateActionPointsUIObjectsAction(dataBlob, graphicsContext),
    ])

    const updateMovement = new SequenceComposite(dataBlob, [
        new UpdateMovementUIObjectsAction(dataBlob, graphicsContext),
    ])

    const updateCoordinates = new SequenceComposite(dataBlob, [
        new UpdateCoordinatesUIObjectsAction(dataBlob, graphicsContext),
    ])

    const updateAttributeModifiers = new SequenceComposite(dataBlob, [
        new UpdateAttributeModifiersUIObjectsAction(
            dataBlob,
            graphicsContext,
            resourceHandler
        ),
    ])

    const updateAll = new ExecuteAllComposite(dataBlob, [
        updateArmor,
        updateHitPoints,
        updateActionPoints,
        updateMovement,
        updateCoordinates,
        updateAttributeModifiers,
    ])

    updateAll.run()
}

const createDrawingTree = ({
    dataBlob,
    graphicsContext,
    resourceHandler,
}: {
    dataBlob: DataBlob
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}) => {
    const drawTextBoxTreeAction = new DrawTextBoxesAction(
        dataBlob,
        (dataBlob: DataBlob) => {
            const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
                dataBlob,
                "uiObjects"
            )
            return [
                uiObjects.armor.textBox,
                uiObjects.actionPoints.textBox,
                uiObjects.hitPoints.textBox,
                uiObjects.movement.textBox,
                uiObjects.coordinates.textBox,
                ...Object.values(
                    uiObjects.attributeModifiers.graphicsByAttributeType
                ).map((a) => a.textBox),
            ].filter((x) => x)
        },
        (_) => {
            return graphicsContext
        }
    )

    const drawImagesAction = new DrawImagesAction(
        dataBlob,
        (dataBlob: DataBlob) => {
            const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
                dataBlob,
                "uiObjects"
            )
            return [
                ...Object.values(
                    uiObjects.attributeModifiers.graphicsByAttributeType
                ).map((a) => a.icon),
                ...Object.values(
                    uiObjects.attributeModifiers.graphicsByAttributeType
                ).map((a) => a.arrowIcon),
            ].filter((x) => x)
        },
        (_: DataBlob) => {
            return graphicsContext
        },
        (_: DataBlob) => {
            return resourceHandler
        }
    )

    return new ExecuteAllComposite(dataBlob, [
        drawTextBoxTreeAction,
        drawImagesAction,
        new DrawActionPointsMeterAction(dataBlob, graphicsContext),
        new SquaddieStatusTileDrawHitPointsPointsMeterAction(
            dataBlob,
            graphicsContext
        ),
    ])
}

class DoesUIObjectExistCondition implements BehaviorTreeTask {
    dataBlob: DataBlob
    uiObjectKey: string

    constructor(blackboard: DataBlob, uiObjectKey: string) {
        this.dataBlob = blackboard
        this.uiObjectKey = uiObjectKey
    }

    run(): boolean {
        const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )
        return (
            uiObjects[this.uiObjectKey as keyof typeof uiObjects] !== undefined
        )
    }
}

class IsArmorCorrectCondition implements BehaviorTreeTask {
    dataBlob: DataBlob
    objectRepository: ObjectRepository

    constructor(blackboard: DataBlob, objectRepository: ObjectRepository) {
        this.dataBlob = blackboard
        this.objectRepository = objectRepository
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const battleSquaddieId = context.battleSquaddieId
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                this.objectRepository,
                battleSquaddieId
            )
        )

        const { net: currentNet, modifier: currentModifier } =
            calculateArmorClass(battleSquaddie, squaddieTemplate)

        return (
            context.armor?.net === currentNet &&
            context.armor?.modifier === currentModifier
        )
    }
}

class UpdateArmorContextAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    objectRepository: ObjectRepository

    constructor(blackboard: DataBlob, objectRepository: ObjectRepository) {
        this.dataBlob = blackboard
        this.objectRepository = objectRepository
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const battleSquaddieId = context.battleSquaddieId
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                this.objectRepository,
                battleSquaddieId
            )
        )

        const { net: currentNet, modifier: currentModifier } =
            calculateArmorClass(battleSquaddie, squaddieTemplate)

        context.armor ||= {
            net: 0,
            modifier: 0,
        }
        context.armor.net = currentNet
        context.armor.modifier = currentModifier
        DataBlobService.add<SquaddieStatusTileContext>(
            this.dataBlob,
            "context",
            context
        )

        return true
    }
}

class UpdateArmorUIObjectsAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    graphicsContext: GraphicsBuffer

    constructor(dataBlob: DataBlob, graphicsContext: GraphicsBuffer) {
        this.dataBlob = dataBlob
        this.graphicsContext = graphicsContext
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )
        let armorText = `Armor ${context.armor.net}`
        if (context.armor.modifier != 0) {
            armorText += ` +${context.armor.modifier}`
        }
        const squaddieAffiliationHue: number =
            HUE_BY_SQUADDIE_AFFILIATION[context.squaddieAffiliation]

        const layout = DataBlobService.get<SquaddieStatusTileUILayout>(
            this.dataBlob,
            "layout"
        )

        uiObjects.armor.textBox =
            SquaddieStatusTileService.createTextBoxOnLeftSideOfRow({
                actionTilePosition: context.horizontalPosition,
                text: armorText,
                fontSize: layout.armor.fontSize,
                fontColor: [
                    squaddieAffiliationHue,
                    layout.armor.fontSaturation,
                    layout.armor.fontBrightness,
                ],
                topOffset: layout.armor.row * layout.rowSize,
                graphicsContext: this.graphicsContext,
            })
        DataBlobService.add<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )

        return true
    }
}

class IsMovementCorrectCondition implements BehaviorTreeTask {
    dataBlob: DataBlob
    objectRepository: ObjectRepository

    constructor(dataBlob: DataBlob, objectRepository: ObjectRepository) {
        this.dataBlob = dataBlob
        this.objectRepository = objectRepository
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const battleSquaddieId = context.battleSquaddieId
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                this.objectRepository,
                battleSquaddieId
            )
        )

        const { initialMovementPerAction, movementChange } = calculateMovement(
            battleSquaddie,
            squaddieTemplate
        )

        return (
            context.movement?.initialMovementPerAction ===
                initialMovementPerAction &&
            context.movement?.movementChange === movementChange
        )
    }
}

class UpdateMovementContextAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    objectRepository: ObjectRepository

    constructor(dataBlob: DataBlob, objectRepository: ObjectRepository) {
        this.dataBlob = dataBlob
        this.objectRepository = objectRepository
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const battleSquaddieId = context.battleSquaddieId
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                this.objectRepository,
                battleSquaddieId
            )
        )

        const { initialMovementPerAction, movementChange } = calculateMovement(
            battleSquaddie,
            squaddieTemplate
        )

        context.movement ||= {
            initialMovementPerAction: 0,
            movementChange: 0,
        }
        context.movement.initialMovementPerAction = initialMovementPerAction
        context.movement.movementChange = movementChange
        DataBlobService.add<SquaddieStatusTileContext>(
            this.dataBlob,
            "context",
            context
        )

        return true
    }
}

class UpdateMovementUIObjectsAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    graphicsContext: GraphicsBuffer

    constructor(dataBlob: DataBlob, graphicsContext: GraphicsBuffer) {
        this.dataBlob = dataBlob
        this.graphicsContext = graphicsContext
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )

        let movementText = `Move ${context.movement.initialMovementPerAction}`
        if (context.movement.movementChange !== 0) {
            movementText += ` ${context.movement.movementChange > 0 ? "+" : ""}${context.movement.movementChange}`
        }

        const squaddieAffiliationHue: number =
            HUE_BY_SQUADDIE_AFFILIATION[context.squaddieAffiliation]

        const layout = DataBlobService.get<SquaddieStatusTileUILayout>(
            this.dataBlob,
            "layout"
        )

        uiObjects.movement.textBox =
            SquaddieStatusTileService.createTextBoxOnLeftSideOfRow({
                actionTilePosition: context.horizontalPosition,
                text: movementText,
                fontSize: layout.movement.fontSize,
                fontColor: [
                    squaddieAffiliationHue,
                    layout.movement.fontSaturation,
                    layout.movement.fontBrightness,
                ],
                topOffset: layout.movement.row * layout.rowSize,
                graphicsContext: this.graphicsContext,
            })

        DataBlobService.add<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )

        return true
    }
}

class IsCoordinatesCorrectCondition implements BehaviorTreeTask {
    dataBlob: DataBlob
    missionMap: MissionMap

    constructor(dataBlob: DataBlob, missionMap: MissionMap) {
        this.dataBlob = dataBlob
        this.missionMap = missionMap
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const coordinates = calculateCoordinates(
            context.battleSquaddieId,
            this.missionMap
        )

        if (!coordinates) return false
        if (!context.coordinates) return false

        return HexCoordinateService.areEqual(context.coordinates, coordinates)
    }
}

class UpdateCoordinatesContextAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    missionMap: MissionMap

    constructor(dataBlob: DataBlob, missionMap: MissionMap) {
        this.dataBlob = dataBlob
        this.missionMap = missionMap
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        context.coordinates = this.missionMap
            ? calculateCoordinates(context.battleSquaddieId, this.missionMap)
            : undefined

        DataBlobService.add<SquaddieStatusTileContext>(
            this.dataBlob,
            "context",
            context
        )
        return true
    }
}

class UpdateCoordinatesUIObjectsAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    graphicsContext: GraphicsBuffer

    constructor(dataBlob: DataBlob, graphicsContext: GraphicsBuffer) {
        this.dataBlob = dataBlob
        this.graphicsContext = graphicsContext
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        let coordinateText = context.coordinates
            ? `(${context.coordinates.q}, ${context.coordinates.r})`
            : "(??,??)"

        const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )

        const squaddieAffiliationHue: number =
            HUE_BY_SQUADDIE_AFFILIATION[context.squaddieAffiliation]

        const layout = DataBlobService.get<SquaddieStatusTileUILayout>(
            this.dataBlob,
            "layout"
        )
        const overallBoundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                context.horizontalPosition
            )

        uiObjects.coordinates.textBox = TextBoxService.new({
            text: coordinateText,
            fontSize: layout.coordinates.fontSize,
            fontColor: [
                squaddieAffiliationHue,
                layout.coordinates.fontSaturation,
                layout.coordinates.fontBrightness,
            ],
            area: RectAreaService.new({
                left:
                    RectAreaService.right(overallBoundingBox) -
                    this.graphicsContext.textWidth(coordinateText) -
                    WINDOW_SPACING.SPACING1,
                top:
                    RectAreaService.top(overallBoundingBox) +
                    RectAreaService.height(overallBoundingBox) -
                    layout.coordinates.fontSize -
                    WINDOW_SPACING.SPACING2 +
                    WINDOW_SPACING.SPACING1,
                width:
                    this.graphicsContext.textWidth(coordinateText) +
                    WINDOW_SPACING.SPACING1,
                height: layout.coordinates.fontSize,
            }),
        })

        DataBlobService.add<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )

        return true
    }
}

class IsAttributeModifiersCorrectCondition implements BehaviorTreeTask {
    dataBlob: DataBlob
    objectRepository: ObjectRepository

    constructor(dataBlob: DataBlob, objectRepository: ObjectRepository) {
        this.dataBlob = dataBlob
        this.objectRepository = objectRepository
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const battleSquaddieId = context.battleSquaddieId
        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                this.objectRepository,
                battleSquaddieId
            )
        )

        const attributeModifiers = calculateAttributeModifiers(battleSquaddie)

        if (context.attributeModifiers === undefined) {
            return false
        }
        if (context.attributeModifiers.length != attributeModifiers.length) {
            return false
        }

        return context.attributeModifiers.every((contextAttributeModifier) =>
            attributeModifiers.some(
                (calculatedAttributeModifier) =>
                    calculatedAttributeModifier.type ===
                        contextAttributeModifier.type &&
                    calculatedAttributeModifier.amount ===
                        contextAttributeModifier.amount
            )
        )
    }
}

class UpdateAttributeModifiersContextAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    objectRepository: ObjectRepository

    constructor(blackboard: DataBlob, objectRepository: ObjectRepository) {
        this.dataBlob = blackboard
        this.objectRepository = objectRepository
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const battleSquaddieId = context.battleSquaddieId
        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                this.objectRepository,
                battleSquaddieId
            )
        )

        const attributeModifiers = calculateAttributeModifiers(battleSquaddie)

        context.attributeModifiers ||= attributeModifiers
        context.attributeModifiers = attributeModifiers

        DataBlobService.add<SquaddieStatusTileContext>(
            this.dataBlob,
            "context",
            context
        )

        return true
    }
}

class UpdateAttributeModifiersUIObjectsAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler

    constructor(
        dataBlob: DataBlob,
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        this.dataBlob = dataBlob
        this.graphicsContext = graphicsContext
        this.resourceHandler = resourceHandler
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )

        const layout = DataBlobService.get<SquaddieStatusTileUILayout>(
            this.dataBlob,
            "layout"
        )

        this.updateNumericalAttributeModifiers({
            context,
            uiObjects,
            layout,
            attributeTypeAndAmounts: context.attributeModifiers.filter(
                (attributeTypeAndAmount) =>
                    !AttributeTypeService.isBinary(attributeTypeAndAmount.type)
            ),
        })
        this.updateBinaryAttributeModifiers({
            context,
            uiObjects,
            layout,
            attributeTypeAndAmounts: context.attributeModifiers.filter(
                (attributeTypeAndAmount) =>
                    AttributeTypeService.isBinary(attributeTypeAndAmount.type)
            ),
        })

        this.removeInactiveModifierIcons({
            uiObjects,
            attributeModifiers: context.attributeModifiers,
        })

        DataBlobService.add<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )

        return true
    }

    private updateNumericalAttributeModifiers({
        attributeTypeAndAmounts,
        context,
        uiObjects,
        layout,
    }: {
        attributeTypeAndAmounts: AttributeTypeAndAmount[]
        context: SquaddieStatusTileContext
        uiObjects: SquaddieStatusTileUIObjects
        layout: SquaddieStatusTileUILayout
    }) {
        if (attributeTypeAndAmounts.length <= 0) return

        const graphicsContext = this.graphicsContext
        const resourceHandler = this.resourceHandler

        ;[
            "attribute-up",
            "attribute-down",
            ...attributeTypeAndAmounts.map((attributeTypeAndAmount) =>
                AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                    attributeTypeAndAmount.type
                )
            ),
        ]
            .filter(
                (comparisonImageResourceKey) =>
                    !resourceHandler.isResourceLoaded(
                        comparisonImageResourceKey
                    )
            )
            .forEach((comparisonImageResourceKey) =>
                resourceHandler.loadResource(comparisonImageResourceKey)
            )

        const squaddieAffiliationHue: number =
            HUE_BY_SQUADDIE_AFFILIATION[context.squaddieAffiliation]

        attributeTypeAndAmounts.forEach((attributeTypeAndAmount) => {
            const { attributeLeft, attributeTop } =
                calculateAttributeTopLeftCorner({
                    actionTilePosition: context.horizontalPosition,
                    attributeTypeAndAmount: attributeTypeAndAmount,
                    layout,
                })

            const iconImageRectArea = RectAreaService.new({
                left: attributeLeft,
                top: attributeTop,
                width: layout.attributeModifiers.iconSize,
                height: layout.attributeModifiers.iconSize,
            })

            const text = `${attributeTypeAndAmount.amount > 0 ? "+" : "-"}${attributeTypeAndAmount.amount}`
            graphicsContext.push()
            graphicsContext.textSize(layout.attributeModifiers.fontSize)

            const textBox = TextBoxService.new({
                text,
                fontSize: layout.attributeModifiers.fontSize,
                fontColor: [
                    squaddieAffiliationHue,
                    layout.attributeModifiers.fontSaturation,
                    layout.attributeModifiers.fontBrightness,
                ],
                area: RectAreaService.new({
                    left:
                        attributeLeft +
                        WINDOW_SPACING.SPACING1 +
                        layout.attributeModifiers.iconSize,
                    top: attributeTop,
                    width: graphicsContext.textWidth(text),
                    height: layout.attributeModifiers.fontSize,
                }),
            })
            graphicsContext.pop()

            const arrowImageRectArea = RectAreaService.new({
                left: RectAreaService.right(textBox.area),
                top: attributeTop,
                width: layout.attributeModifiers.arrowIconWidth,
                height: layout.attributeModifiers.arrowIconHeight,
            })

            uiObjects.attributeModifiers.graphicsByAttributeType[
                attributeTypeAndAmount.type
            ] = {
                icon: new ImageUI({
                    imageLoadingBehavior: {
                        resourceKey:
                            AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                                attributeTypeAndAmount.type
                            ),
                        loadingBehavior:
                            ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
                    },
                    area: iconImageRectArea,
                }),
                arrowIcon: new ImageUI({
                    imageLoadingBehavior: {
                        resourceKey:
                            attributeTypeAndAmount.amount > 0
                                ? "attribute-up"
                                : "attribute-down",
                        loadingBehavior:
                            ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
                    },
                    area: arrowImageRectArea,
                }),
                textBox,
            }
        })
    }

    private updateBinaryAttributeModifiers({
        attributeTypeAndAmounts,
        context,
        uiObjects,
        layout,
    }: {
        context: SquaddieStatusTileContext
        uiObjects: SquaddieStatusTileUIObjects
        attributeTypeAndAmounts: AttributeTypeAndAmount[]
        layout: SquaddieStatusTileUILayout
    }) {
        if (attributeTypeAndAmounts.length <= 0) return

        const resourceHandler = this.resourceHandler

        ;[
            ...attributeTypeAndAmounts.map((attributeTypeAndAmount) =>
                AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                    attributeTypeAndAmount.type
                )
            ),
        ]
            .filter(
                (comparisonImageResourceKey) =>
                    !resourceHandler.isResourceLoaded(
                        comparisonImageResourceKey
                    )
            )
            .forEach((comparisonImageResourceKey) =>
                resourceHandler.loadResource(comparisonImageResourceKey)
            )

        attributeTypeAndAmounts.forEach((attributeTypeAndAmount) => {
            const { attributeLeft, attributeTop } =
                calculateAttributeTopLeftCorner({
                    actionTilePosition: context.horizontalPosition,
                    attributeTypeAndAmount: attributeTypeAndAmount,
                    layout,
                })

            const iconImageRectArea = RectAreaService.new({
                left: attributeLeft,
                top: attributeTop,
                width: layout.attributeModifiers.iconSize,
                height: layout.attributeModifiers.iconSize,
            })

            uiObjects.attributeModifiers.graphicsByAttributeType[
                attributeTypeAndAmount.type
            ] = {
                icon: new ImageUI({
                    imageLoadingBehavior: {
                        resourceKey:
                            AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                                attributeTypeAndAmount.type
                            ),
                        loadingBehavior:
                            ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
                    },
                    area: iconImageRectArea,
                }),
                arrowIcon: undefined,
                textBox: undefined,
            }
        })
    }

    private removeInactiveModifierIcons({
        uiObjects,
        attributeModifiers,
    }: {
        uiObjects: SquaddieStatusTileUIObjects
        attributeModifiers: AttributeTypeAndAmount[]
    }) {
        const graphicalKeysToDelete = Object.keys(
            uiObjects.attributeModifiers.graphicsByAttributeType
        )
            .map((typeStr) => typeStr as TAttribute)
            .filter(
                (type) =>
                    !attributeModifiers.some(
                        (attributeTypeAndAmount) =>
                            attributeTypeAndAmount.type === type
                    )
            )

        graphicalKeysToDelete.forEach((type) => {
            delete uiObjects.attributeModifiers.graphicsByAttributeType[type]
        })
    }
}

const calculateActionPoints = (battleSquaddie: BattleSquaddie) => {
    let { unSpentActionPoints, movementActionPoints } =
        SquaddieService.getActionPointSpend({
            battleSquaddie,
        })

    return {
        actionPointsRemaining: unSpentActionPoints,
        movementActionPoints,
    }
}
