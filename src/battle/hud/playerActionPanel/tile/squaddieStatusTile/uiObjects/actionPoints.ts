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
import { getResultOrThrowError } from "../../../../../../utils/ResultOrError"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../../objectRepository"
import {
    PlayerConsideredActions,
    PlayerConsideredActionsService,
} from "../../../../../battleState/playerConsideredActions"
import {
    SquaddieStatusTileContext,
    SquaddieStatusTileService,
    SquaddieStatusTileUILayout,
    SquaddieStatusTileUIObjects,
} from "../squaddieStatusTile"

export class IsActionPointsCorrectCondition implements BehaviorTreeTask {
    dataBlob: DataBlob
    objectRepository: ObjectRepository
    playerConsideredActions: PlayerConsideredActions

    constructor({
        dataBlob,
        objectRepository,
        playerConsideredActions,
    }: {
        dataBlob: DataBlob
        objectRepository: ObjectRepository
        playerConsideredActions: PlayerConsideredActions
    }) {
        this.dataBlob = dataBlob
        this.objectRepository = objectRepository
        this.playerConsideredActions = playerConsideredActions
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

        const { unallocatedActionPoints } =
            SquaddieStatusTileService.calculateActionPoints(
                battleSquaddie,
                squaddieTemplate
            )

        let expectedMarkedActionPoints =
            PlayerConsideredActionsService.getExpectedMarkedActionPointsBasedOnPlayerConsideration(
                {
                    objectRepository: this.objectRepository,
                    playerConsideredActions: this.playerConsideredActions,
                    battleSquaddie,
                }
            )

        return (
            context.actionPoints?.actionPointsRemaining ===
                unallocatedActionPoints &&
            context.actionPoints?.actionPointsMarked ===
                expectedMarkedActionPoints
        )
    }
}

export class UpdateActionPointsContextAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    objectRepository: ObjectRepository
    battleActionDecisionStep: BattleActionDecisionStep
    playerConsideredActions: PlayerConsideredActions

    constructor({
        dataBlob,
        objectRepository,
        battleActionDecisionStep,
        playerConsideredActions,
    }: {
        dataBlob: DataBlob
        objectRepository: ObjectRepository
        battleActionDecisionStep: BattleActionDecisionStep
        playerConsideredActions: PlayerConsideredActions
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

        const battleSquaddieId = context.battleSquaddieId
        const actorBattleSquaddieId = BattleActionDecisionStepService.getActor(
            this.battleActionDecisionStep
        )?.battleSquaddieId

        const squaddieIsTheActor = battleSquaddieId === actorBattleSquaddieId
        const actorSquaddieDependentContext = squaddieIsTheActor
            ? SquaddieStatusTileService.getContextVariablesThatDependOnActorSquaddie(
                  {
                      battleSquaddieId,
                      objectRepository: this.objectRepository,
                      playerConsideredActions: this.playerConsideredActions,
                  }
              )
            : SquaddieStatusTileService.getContextVariablesThatDependOnTargetSquaddie(
                  {
                      battleSquaddieId,
                      objectRepository: this.objectRepository,
                  }
              )

        context.actionPoints ||= {
            actionPointsRemaining: 0,
            actionPointsMarked: 0,
        }
        context.actionPoints.actionPointsRemaining =
            actorSquaddieDependentContext.actionPoints.actionPointsRemaining
        context.actionPoints.actionPointsMarked =
            actorSquaddieDependentContext.actionPoints.actionPointsMarked

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

        let actionPointText = `AP ${context.actionPoints.actionPointsRemaining}`

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

        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "currentValue",
            context.actionPoints.actionPointsRemaining
        )

        this.addHighlightedActionPoints({
            actionPointMeterDataBlob: actionPointMeterDataBlob,
            context: context,
        })

        let highlightedValueFillStartTime = DataBlobService.get<number>(
            actionPointMeterDataBlob,
            "highlightedValueFillStartTime"
        )
        if (context.actionPoints.actionPointsMarked === 0) {
            DataBlobService.add<number>(
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

    private addHighlightedActionPoints({
        actionPointMeterDataBlob,
        context,
    }: {
        actionPointMeterDataBlob: DrawHorizontalMeterActionDataBlob
        context: SquaddieStatusTileContext
    }) {
        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "highlightedValue",
            context.actionPoints.actionPointsMarked
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

        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "currentValue",
            context.actionPoints.actionPointsRemaining
        )
        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "currentValueSegmentDivisionInterval",
            1
        )
        DataBlobService.add<number>(
            actionPointMeterDataBlob,
            "highlightedValue",
            context.actionPoints.actionPointsMarked
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

        const meterDataBlob: DrawHorizontalMeterActionDataBlob =
            uiObjects.actionPoints.actionPointMeterDataBlob

        const drawAction = new DrawHorizontalMeterAction(
            meterDataBlob,
            this.graphicsContext
        )
        return drawAction.run()
    }
}
