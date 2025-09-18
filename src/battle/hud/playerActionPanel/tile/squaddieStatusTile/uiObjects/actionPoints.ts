import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import {
    DataBlob,
    DataBlobService,
} from "../../../../../../utils/dataBlob/dataBlob"
import { GraphicsBuffer } from "../../../../../../utils/graphics/graphicsRenderer"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../../../graphicsConstants"
import {
    DrawHorizontalMeterAction,
    DrawHorizontalMeterActionDataBlob,
} from "../../../../horizontalBar/drawHorizontalMeterAction"
import { ActionTilePositionService } from "../../actionTilePosition"
import { RectArea, RectAreaService } from "../../../../../../ui/rectArea"
import { GOLDEN_RATIO, WINDOW_SPACING } from "../../../../../../ui/constants"
import { DEFAULT_ACTION_POINTS_PER_TURN } from "../../../../../../squaddie/turn"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../../../../actionDecision/battleActionDecisionStep"
import { ObjectRepository } from "../../../../../objectRepository"
import { PlayerConsideredActions } from "../../../../../battleState/playerConsideredActions"
import {
    SquaddieStatusTileActionPointsContext,
    SquaddieStatusTileContext,
    SquaddieStatusTileService,
    SquaddieStatusTileUILayout,
    SquaddieStatusTileUIObjects,
} from "../squaddieStatusTile"

export class IsActionPointsCorrectCondition implements BehaviorTreeTask {
    dataBlob: DataBlob
    objectRepository: ObjectRepository
    playerConsideredActions: PlayerConsideredActions | undefined
    battleActionDecisionStep: BattleActionDecisionStep
    numberOfIncorrectFrames: number

    constructor({
        dataBlob,
        objectRepository,
        playerConsideredActions,
        battleActionDecisionStep,
    }: {
        dataBlob: DataBlob
        objectRepository: ObjectRepository
        playerConsideredActions: PlayerConsideredActions | undefined
        battleActionDecisionStep: BattleActionDecisionStep
    }) {
        this.dataBlob = dataBlob
        this.objectRepository = objectRepository
        this.playerConsideredActions = playerConsideredActions
        this.battleActionDecisionStep = battleActionDecisionStep
        this.numberOfIncorrectFrames = 0
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

        if (!uiObjects?.actionPoints?.actionPointMeterDataBlob) {
            return false
        }

        uiObjects.actionPoints.actionPointMeterDataBlob
        if (this.playerConsideredActions == undefined) return false
        const calculatedActionPoints: SquaddieStatusTileActionPointsContext =
            calculateActionPointsContext({
                battleSquaddieId: context.battleSquaddieId,
                objectRepository: this.objectRepository,
                battleActionDecisionStep: this.battleActionDecisionStep,
                playerConsideredActions: this.playerConsideredActions,
            })

        const expectedCurrentValue = calculateCurrentValue(
            calculatedActionPoints
        )
        const currentValueIsCorrect =
            DataBlobService.get<number>(
                uiObjects.actionPoints.actionPointMeterDataBlob,
                "currentValue"
            ) == expectedCurrentValue

        const expectedHighlightedValue = calculateHighlightedValue(
            calculatedActionPoints
        )
        const highlightedValueIsCorrect =
            DataBlobService.get<number>(
                uiObjects.actionPoints.actionPointMeterDataBlob,
                "highlightedValue"
            ) == expectedHighlightedValue

        if (currentValueIsCorrect && highlightedValueIsCorrect) {
            this.numberOfIncorrectFrames = 0
        } else {
            this.numberOfIncorrectFrames += 1
        }
        return this.numberOfIncorrectFrames > 1
    }
}

export class UpdateActionPointsContextAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    objectRepository: ObjectRepository
    battleActionDecisionStep: BattleActionDecisionStep
    playerConsideredActions: PlayerConsideredActions | undefined

    constructor({
        dataBlob,
        objectRepository,
        battleActionDecisionStep,
        playerConsideredActions,
    }: {
        dataBlob: DataBlob
        objectRepository: ObjectRepository
        battleActionDecisionStep: BattleActionDecisionStep
        playerConsideredActions: PlayerConsideredActions | undefined
    }) {
        this.dataBlob = dataBlob
        this.objectRepository = objectRepository
        this.battleActionDecisionStep = battleActionDecisionStep
        this.playerConsideredActions = playerConsideredActions
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const calculatedActionPoints = calculateActionPointsContext({
            battleSquaddieId: context.battleSquaddieId,
            objectRepository: this.objectRepository,
            battleActionDecisionStep: this.battleActionDecisionStep,
            playerConsideredActions: this.playerConsideredActions,
        })

        context.actionPoints ||= {
            actionPointsRemaining: 0,
            actionPointsMarkedForAction: 0,
            spentAndCannotBeRefunded: 0,
            movementPointsSpentButCanBeRefunded: 0,
            movementPointsPreviewedByPlayer: 0,
        }
        context.actionPoints.actionPointsRemaining =
            calculatedActionPoints.actionPointsRemaining
        context.actionPoints.movementPointsPreviewedByPlayer =
            calculatedActionPoints.movementPointsPreviewedByPlayer
        context.actionPoints.spentAndCannotBeRefunded =
            calculatedActionPoints.spentAndCannotBeRefunded
        context.actionPoints.movementPointsSpentButCanBeRefunded =
            calculatedActionPoints.movementPointsSpentButCanBeRefunded
        context.actionPoints.actionPointsMarkedForAction =
            calculatedActionPoints.actionPointsMarkedForAction

        DataBlobService.add<SquaddieStatusTileContext>(
            this.dataBlob,
            "context",
            context
        )

        return true
    }
}

export class UpdateActionPointsUIObjectsAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    graphicsContext: GraphicsBuffer

    constructor(dataBlob: DataBlob, graphicsContext: GraphicsBuffer) {
        this.dataBlob = dataBlob
        this.graphicsContext = graphicsContext
    }

    run(): boolean {
        this.updateTextBoxes()
        this.updateActionPointMeter()
        return true
    }

    private updateTextBoxes() {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )

        let actionPointText =
            context.actionPoints != undefined
                ? `AP ${context.actionPoints.actionPointsRemaining + context.actionPoints.movementPointsSpentButCanBeRefunded}`
                : `AP undefined`

        const squaddieAffiliationHue: number =
            HUE_BY_SQUADDIE_AFFILIATION[context.squaddieAffiliation]

        const layout = DataBlobService.get<SquaddieStatusTileUILayout>(
            this.dataBlob,
            "layout"
        )

        uiObjects.actionPoints.textBox =
            SquaddieStatusTileService.createTextBoxOnLeftSideOfRow({
                actionTilePosition: context.horizontalPosition,
                text: actionPointText,
                fontSize: layout.actionPoints.fontSize,
                fontColor: [
                    squaddieAffiliationHue,
                    layout.actionPoints.fontSaturation,
                    layout.actionPoints.fontBrightness,
                ],
                topOffset: layout.actionPoints.row * layout.rowSize,
                graphicsContext: this.graphicsContext,
            })

        DataBlobService.add<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
    }

    private updateActionPointMeter() {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )

        let actionPointMeterDataBlob =
            uiObjects.actionPoints.actionPointMeterDataBlob ??
            this.createDrawingActionPointsHorizontalMeterData()
        this.addCurrentActionPoints(actionPointMeterDataBlob, context)

        this.addHighlightedActionPoints({
            actionPointMeterDataBlob: actionPointMeterDataBlob,
            context: context,
        })

        let highlightedValueFillStartTime = DataBlobService.get<number>(
            actionPointMeterDataBlob,
            "highlightedValueFillStartTime"
        )

        if (
            DataBlobService.get<number>(
                actionPointMeterDataBlob,
                "highlightedValue"
            ) < 1
        ) {
            DataBlobService.add<number | undefined>(
                actionPointMeterDataBlob,
                "highlightedValueFillStartTime",
                undefined
            )
        } else if (highlightedValueFillStartTime == undefined) {
            DataBlobService.add<number>(
                actionPointMeterDataBlob,
                "highlightedValueFillStartTime",
                Date.now()
            )
        }
        uiObjects.actionPoints.actionPointMeterDataBlob =
            actionPointMeterDataBlob

        DataBlobService.add<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
    }

    private addCurrentActionPoints = (
        actionPointMeterDataBlob: DrawHorizontalMeterActionDataBlob,
        context: SquaddieStatusTileContext
    ) => {
        let currentValue =
            context?.actionPoints != undefined
                ? calculateCurrentValue(context.actionPoints)
                : 0

        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "currentValue",
            currentValue
        )
    }

    private addHighlightedActionPoints({
        actionPointMeterDataBlob,
        context,
    }: {
        actionPointMeterDataBlob: DrawHorizontalMeterActionDataBlob
        context: SquaddieStatusTileContext
    }) {
        let highlightedValue =
            context?.actionPoints != undefined
                ? calculateHighlightedValue(context.actionPoints)
                : 0

        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "highlightedValue",
            highlightedValue
        )
    }

    private createDrawingActionPointsHorizontalMeterData(): DrawHorizontalMeterActionDataBlob {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )
        const layout = DataBlobService.get<SquaddieStatusTileUILayout>(
            this.dataBlob,
            "layout"
        )
        const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )
        const overallBoundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                context.horizontalPosition
            )

        const actionPointMeterDataBlob: DrawHorizontalMeterActionDataBlob =
            DataBlobService.new() as DrawHorizontalMeterActionDataBlob
        if (uiObjects.actionPoints.textBox != undefined) {
            DataBlobService.add<RectArea>(
                actionPointMeterDataBlob,
                "drawingArea",
                RectAreaService.new(
                    RectAreaService.new({
                        left:
                            RectAreaService.right(
                                uiObjects.actionPoints.textBox.area
                            ) + WINDOW_SPACING.SPACING1,
                        top: RectAreaService.top(
                            uiObjects.actionPoints.textBox.area
                        ),
                        width:
                            RectAreaService.width(overallBoundingBox) *
                            (GOLDEN_RATIO - 1),
                        height: layout.actionPoints.fontSize * 0.8,
                    })
                )
            )
        }
        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "maxValue",
            DEFAULT_ACTION_POINTS_PER_TURN
        )
        DataBlobService.add<number[]>(
            actionPointMeterDataBlob,
            "emptyColor",
            layout.actionPoints.meter.emptyColor
        )

        DataBlobService.add<number[]>(
            actionPointMeterDataBlob,
            "currentValueFillColor",
            layout.actionPoints.meter.currentValueFillColor
        )
        DataBlobService.add<number[]>(
            actionPointMeterDataBlob,
            "currentValueSegmentColor",
            layout.actionPoints.meter.currentValueSegmentColor
        )
        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "currentValueSegmentStrokeWeight",
            layout.actionPoints.meter.currentValueSegmentStrokeWeight
        )

        DataBlobService.add<number[]>(
            actionPointMeterDataBlob,
            "highlightedValueFillColor",
            layout.actionPoints.meter.highlightedValueFillColor
        )
        DataBlobService.add<number[]>(
            actionPointMeterDataBlob,
            "highlightedValueFillAlphaRange",
            layout.actionPoints.meter.highlightedValueFillAlphaRange
        )
        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "highlightedValueFillAlphaPeriod",
            layout.actionPoints.meter.highlightedValueFillAlphaPeriod
        )

        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "outlineStrokeWeight",
            layout.actionPoints.meter.outlineStrokeWeight
        )
        DataBlobService.add<number[]>(
            actionPointMeterDataBlob,
            "outlineStrokeColor",
            layout.actionPoints.meter.outlineStrokeColor
        )

        DataBlobService.add<number>(actionPointMeterDataBlob, "currentValue", 0)
        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "currentValueSegmentDivisionInterval",
            1
        )

        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "highlightedValue",
            0
        )
        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "highlightedValueFillStartTime",
            Date.now()
        )

        uiObjects.actionPoints.actionPointMeterDataBlob =
            actionPointMeterDataBlob
        return actionPointMeterDataBlob
    }
}

export class DrawActionPointsMeterAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    graphicsContext: GraphicsBuffer

    constructor(dataBlob: DataBlob, graphicsContext: GraphicsBuffer) {
        this.dataBlob = dataBlob
        this.graphicsContext = graphicsContext
    }

    run(): boolean {
        const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )

        const meterDataBlob: DrawHorizontalMeterActionDataBlob | undefined =
            uiObjects.actionPoints.actionPointMeterDataBlob

        if (meterDataBlob) {
            const drawAction = new DrawHorizontalMeterAction(
                meterDataBlob,
                this.graphicsContext
            )
            return drawAction.run()
        }
        return false
    }
}

const calculateCurrentValue = (
    actionPointsContext: SquaddieStatusTileActionPointsContext
) => {
    let movementPointsPreviewedByPlayer =
        actionPointsContext.movementPointsPreviewedByPlayer ?? 0
    let movementPointsSpentButCanBeRefunded =
        actionPointsContext.movementPointsSpentButCanBeRefunded ?? 0

    let willPreviewRefundSpentMovementPoints =
        movementPointsPreviewedByPlayer < movementPointsSpentButCanBeRefunded
    return willPreviewRefundSpentMovementPoints
        ? actionPointsContext.actionPointsRemaining +
              (movementPointsSpentButCanBeRefunded -
                  movementPointsPreviewedByPlayer)
        : actionPointsContext.actionPointsRemaining
}

const calculateHighlightedValue = (
    actionPointsContext: SquaddieStatusTileActionPointsContext
) => {
    let movementPointsPreviewedByPlayer =
        actionPointsContext.movementPointsPreviewedByPlayer ?? 0
    let movementPointsSpentButCanBeRefunded =
        actionPointsContext.movementPointsSpentButCanBeRefunded ?? 0
    let actionPointsMarkedForAction =
        actionPointsContext.actionPointsMarkedForAction ?? 0

    let highlightedValue =
        movementPointsPreviewedByPlayer > movementPointsSpentButCanBeRefunded
            ? movementPointsPreviewedByPlayer -
              movementPointsSpentButCanBeRefunded
            : movementPointsSpentButCanBeRefunded -
              movementPointsPreviewedByPlayer
    highlightedValue += actionPointsMarkedForAction
    return highlightedValue
}

const calculateActionPointsContext = ({
    battleSquaddieId,
    battleActionDecisionStep,
    objectRepository,
    playerConsideredActions,
}: {
    battleSquaddieId: string
    battleActionDecisionStep: BattleActionDecisionStep
    objectRepository: ObjectRepository
    playerConsideredActions: PlayerConsideredActions | undefined
}): SquaddieStatusTileActionPointsContext => {
    const actorBattleSquaddieId = BattleActionDecisionStepService.getActor(
        battleActionDecisionStep
    )?.battleSquaddieId

    const squaddieIsTheActor = battleSquaddieId === actorBattleSquaddieId
    const actorSquaddieDependentContext = squaddieIsTheActor
        ? SquaddieStatusTileService.getContextVariablesThatDependOnActorSquaddie(
              {
                  battleSquaddieId,
                  objectRepository: objectRepository,
                  playerConsideredActions: playerConsideredActions,
              }
          )
        : SquaddieStatusTileService.getContextVariablesThatDependOnTargetSquaddie(
              {
                  battleSquaddieId,
                  objectRepository,
              }
          )

    return actorSquaddieDependentContext.actionPoints
}
