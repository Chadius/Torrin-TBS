import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import {
    DataBlob,
    DataBlobService,
} from "../../../../../../utils/dataBlob/dataBlob"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../../objectRepository"
import { getResultOrThrowError } from "../../../../../../utils/resultOrError"
import { GraphicsBuffer } from "../../../../../../utils/graphics/graphicsRenderer"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../../../graphicsConstants"
import {
    SquaddieStatusTileContext,
    SquaddieStatusTileService,
    SquaddieStatusTileUILayout,
    SquaddieStatusTileUIObjects,
} from "../squaddieStatusTile"
import {
    DrawHorizontalMeterAction,
    DrawHorizontalMeterActionDataBlob,
} from "../../../../horizontalBar/drawHorizontalMeterAction"
import { ActionTilePositionService } from "../../actionTilePosition"
import { RectArea, RectAreaService } from "../../../../../../ui/rectArea"
import { GOLDEN_RATIO, WINDOW_SPACING } from "../../../../../../ui/constants"
import { SequenceComposite } from "../../../../../../utils/behaviorTree/composite/sequence/sequence"

export class SquaddieStatusTileIsHitPointsCorrectCondition
    implements BehaviorTreeTask
{
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

        const { currentHitPoints, currentAbsorb, maxHitPoints } =
            SquaddieStatusTileService.calculateHitPoints(
                battleSquaddie,
                squaddieTemplate
            )

        return (
            context.hitPoints?.currentHitPoints === currentHitPoints &&
            context.hitPoints?.currentAbsorb === currentAbsorb &&
            context.hitPoints?.maxHitPoints === maxHitPoints
        )
    }
}

export class SquaddieStatusTileUpdateHitPointsContextAction
    implements BehaviorTreeTask
{
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

        const { currentHitPoints, currentAbsorb, maxHitPoints } =
            SquaddieStatusTileService.calculateHitPoints(
                battleSquaddie,
                squaddieTemplate
            )

        context.hitPoints ||= {
            currentHitPoints: 0,
            maxHitPoints: 0,
            currentAbsorb: 0,
        }
        context.hitPoints.currentHitPoints = currentHitPoints
        context.hitPoints.maxHitPoints = maxHitPoints
        context.hitPoints.currentAbsorb = currentAbsorb
        DataBlobService.add<SquaddieStatusTileContext>(
            this.dataBlob,
            "context",
            context
        )
        return true
    }
}

export class SquaddieStatusTileUpdateHitPointsUIObjectsAction
    implements BehaviorTreeTask
{
    dataBlob: DataBlob
    graphicsContext: GraphicsBuffer

    constructor(dataBlob: DataBlob, graphicsContext: GraphicsBuffer) {
        this.dataBlob = dataBlob
        this.graphicsContext = graphicsContext
    }

    run(): boolean {
        this.updateTextBoxes()
        this.updateHitPointMeter()
        this.updateAbsorbPointMeter()
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

        let hitPointText = `HP `
        if (context.hitPoints != undefined) {
            hitPointText += `${context.hitPoints.currentHitPoints}`
            if (context.hitPoints.currentAbsorb) {
                hitPointText += ` + ${context.hitPoints.currentAbsorb}`
            }
            hitPointText += `/${context.hitPoints.maxHitPoints}`
        }

        const squaddieAffiliationHue: number =
            HUE_BY_SQUADDIE_AFFILIATION[context.squaddieAffiliation]

        const layout = DataBlobService.get<SquaddieStatusTileUILayout>(
            this.dataBlob,
            "layout"
        )

        uiObjects.hitPoints.textBox =
            SquaddieStatusTileService.createTextBoxOnLeftSideOfRow({
                actionTilePosition: context.horizontalPosition,
                text: hitPointText,
                fontSize: layout.hitPoints.fontSize,
                fontColor: [
                    squaddieAffiliationHue,
                    layout.hitPoints.fontSaturation,
                    layout.hitPoints.fontBrightness,
                ],
                topOffset: layout.hitPoints.row * layout.rowSize,
                graphicsContext: this.graphicsContext,
            })

        DataBlobService.add<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )

        return true
    }

    private updateHitPointMeter() {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )

        let hitPointMeterDataBlob =
            uiObjects.hitPoints.actionPointMeterDataBlob ??
            this.createDrawingHitPointsHorizontalMeterData()

        DataBlobService.add<number>(
            hitPointMeterDataBlob,
            "currentValue",
            context?.hitPoints?.currentHitPoints ?? 0
        )

        uiObjects.hitPoints.actionPointMeterDataBlob = hitPointMeterDataBlob

        const layout = DataBlobService.get<SquaddieStatusTileUILayout>(
            this.dataBlob,
            "layout"
        )

        const { currentValueFillAlphaRange, currentValueFillAlphaPeriod } =
            this.calculateCurrentHitPointsFillAlpha(
                context?.hitPoints?.currentHitPoints,
                context?.hitPoints?.maxHitPoints,
                layout
            )
        DataBlobService.add<number[] | undefined>(
            uiObjects.hitPoints.actionPointMeterDataBlob,
            "currentValueFillAlphaRange",
            currentValueFillAlphaRange
        )
        DataBlobService.add<number | undefined>(
            uiObjects.hitPoints.actionPointMeterDataBlob,
            "currentValueFillAlphaPeriod",
            currentValueFillAlphaPeriod
        )

        DataBlobService.add<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
    }

    private createDrawingHitPointsHorizontalMeterData(): DrawHorizontalMeterActionDataBlob {
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

        const hitPointMeterDataBlob: DrawHorizontalMeterActionDataBlob =
            DataBlobService.new() as DrawHorizontalMeterActionDataBlob
        if (uiObjects.hitPoints.textBox != undefined) {
            DataBlobService.add<RectArea>(
                hitPointMeterDataBlob,
                "drawingArea",
                RectAreaService.new(
                    RectAreaService.new({
                        left:
                            RectAreaService.right(
                                uiObjects.hitPoints.textBox.area
                            ) + WINDOW_SPACING.SPACING1,
                        top: RectAreaService.top(
                            uiObjects.hitPoints.textBox.area
                        ),
                        right:
                            RectAreaService.right(overallBoundingBox) -
                            WINDOW_SPACING.SPACING1,
                        height: layout.hitPoints.fontSize,
                    })
                )
            )
        }
        if (context.hitPoints != undefined) {
            DataBlobService.add<number>(
                hitPointMeterDataBlob,
                "maxValue",
                context.hitPoints.maxHitPoints
            )
        }
        DataBlobService.add<number[]>(
            hitPointMeterDataBlob,
            "emptyColor",
            layout.hitPoints.hitPointMeter.emptyColor
        )
        DataBlobService.add<number[]>(
            hitPointMeterDataBlob,
            "currentValueFillColor",
            layout.hitPoints.hitPointMeter.currentValueFillColor
        )
        DataBlobService.add<number[]>(
            hitPointMeterDataBlob,
            "currentValueSegmentColor",
            layout.hitPoints.hitPointMeter.currentValueSegmentColor
        )
        DataBlobService.add<number>(
            hitPointMeterDataBlob,
            "currentValueSegmentStrokeWeight",
            layout.hitPoints.hitPointMeter.currentValueSegmentStrokeWeight
        )
        DataBlobService.add<number[]>(
            hitPointMeterDataBlob,
            "highlightedValueFillColor",
            layout.hitPoints.hitPointMeter.highlightedValueFillColor
        )
        DataBlobService.add<number[]>(
            hitPointMeterDataBlob,
            "highlightedValueFillAlphaRange",
            layout.hitPoints.hitPointMeter.highlightedValueFillAlphaRange
        )
        DataBlobService.add<number>(
            hitPointMeterDataBlob,
            "highlightedValueFillAlphaPeriod",
            layout.hitPoints.hitPointMeter.highlightedValueFillAlphaPeriod
        )

        DataBlobService.add<number>(
            hitPointMeterDataBlob,
            "outlineStrokeWeight",
            layout.hitPoints.hitPointMeter.outlineStrokeWeight
        )
        DataBlobService.add<number[]>(
            hitPointMeterDataBlob,
            "outlineStrokeColor",
            layout.hitPoints.hitPointMeter.outlineStrokeColor
        )

        if (context.hitPoints != undefined) {
            DataBlobService.add<number>(
                hitPointMeterDataBlob,
                "currentValue",
                context.hitPoints.currentHitPoints
            )
        }

        DataBlobService.add<number>(
            hitPointMeterDataBlob,
            "currentValueSegmentDivisionInterval",
            1
        )
        DataBlobService.add<number>(
            hitPointMeterDataBlob,
            "highlightedValueFillStartTime",
            Date.now()
        )

        uiObjects.hitPoints.actionPointMeterDataBlob = hitPointMeterDataBlob
        return hitPointMeterDataBlob
    }

    private updateAbsorbPointMeter() {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )

        if (uiObjects.hitPoints.actionPointMeterDataBlob == undefined) {
            return
        }

        let absorbMeterDataBlob =
            uiObjects.hitPoints.absorbBar ??
            this.createDrawingAbsorbPointsHorizontalMeterData(
                uiObjects.hitPoints.actionPointMeterDataBlob
            )

        if (context.hitPoints != undefined) {
            DataBlobService.add<number>(
                absorbMeterDataBlob,
                "currentValue",
                context.hitPoints.currentAbsorb
            )

            DataBlobService.add<number>(
                absorbMeterDataBlob,
                "maxValue",
                context.hitPoints.currentAbsorb
            )
        }

        uiObjects.hitPoints.absorbBar = absorbMeterDataBlob

        const layout = DataBlobService.get<SquaddieStatusTileUILayout>(
            this.dataBlob,
            "layout"
        )
        DataBlobService.add<number[]>(
            uiObjects.hitPoints.absorbBar,
            "currentValueFillAlphaRange",
            layout.hitPoints.hitPointMeter.absorbBar.currentValueFillAlphaRange
        )
        DataBlobService.add<number>(
            uiObjects.hitPoints.absorbBar,
            "currentValueFillAlphaPeriod",
            layout.hitPoints.hitPointMeter.absorbBar.currentValueFillAlphaPeriod
        )

        DataBlobService.add<SquaddieStatusTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
    }

    private createDrawingAbsorbPointsHorizontalMeterData(
        actionPointMeterDataBlob: DrawHorizontalMeterActionDataBlob
    ): DrawHorizontalMeterActionDataBlob {
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

        const overallBoundingBox = DataBlobService.get<RectArea>(
            actionPointMeterDataBlob,
            "drawingArea"
        )

        const absorbMeterDataBlob: DrawHorizontalMeterActionDataBlob =
            DataBlobService.new() as DrawHorizontalMeterActionDataBlob
        if (context.hitPoints != undefined) {
            DataBlobService.add<RectArea>(
                absorbMeterDataBlob,
                "drawingArea",
                RectAreaService.new(
                    RectAreaService.new({
                        width:
                            (RectAreaService.width(overallBoundingBox) *
                                context.hitPoints.currentAbsorb) /
                            context.hitPoints.maxHitPoints,
                        top:
                            RectAreaService.top(overallBoundingBox) +
                            WINDOW_SPACING.SPACING1,
                        right:
                            RectAreaService.right(overallBoundingBox) +
                            WINDOW_SPACING.SPACING1 / 2,
                        height: layout.hitPoints.fontSize * (GOLDEN_RATIO - 1),
                    })
                )
            )
            DataBlobService.add<number>(
                absorbMeterDataBlob,
                "maxValue",
                context.hitPoints.currentAbsorb
            )
        }
        DataBlobService.add<number[]>(
            absorbMeterDataBlob,
            "emptyColor",
            layout.hitPoints.hitPointMeter.absorbBar.emptyColor
        )
        DataBlobService.add<number[]>(
            absorbMeterDataBlob,
            "currentValueFillColor",
            layout.hitPoints.hitPointMeter.absorbBar.currentValueFillColor
        )
        DataBlobService.add<number[]>(
            absorbMeterDataBlob,
            "currentValueSegmentColor",
            layout.hitPoints.hitPointMeter.absorbBar.currentValueSegmentColor
        )
        DataBlobService.add<number>(
            absorbMeterDataBlob,
            "currentValueSegmentStrokeWeight",
            layout.hitPoints.hitPointMeter.absorbBar
                .currentValueSegmentStrokeWeight
        )

        DataBlobService.add<number>(
            absorbMeterDataBlob,
            "outlineStrokeWeight",
            layout.hitPoints.hitPointMeter.absorbBar.outlineStrokeWeight
        )
        DataBlobService.add<number[]>(
            absorbMeterDataBlob,
            "outlineStrokeColor",
            layout.hitPoints.hitPointMeter.absorbBar.outlineStrokeColor
        )

        if (context.hitPoints != undefined) {
            DataBlobService.add<number>(
                absorbMeterDataBlob,
                "currentValue",
                context.hitPoints.currentAbsorb
            )
        }

        DataBlobService.add<number>(
            absorbMeterDataBlob,
            "currentValueSegmentDivisionInterval",
            1
        )
        DataBlobService.add<number>(
            absorbMeterDataBlob,
            "highlightedValueFillStartTime",
            Date.now()
        )

        uiObjects.hitPoints.absorbBar = absorbMeterDataBlob
        return absorbMeterDataBlob
    }

    private calculateCurrentHitPointsFillAlpha(
        currentHitPoints: number | undefined,
        maxHitPoints: number | undefined,
        layout: SquaddieStatusTileUILayout
    ): {
        currentValueFillAlphaRange: number[] | undefined
        currentValueFillAlphaPeriod: number | undefined
    } {
        const noFillAlpha = {
            currentValueFillAlphaRange: undefined,
            currentValueFillAlphaPeriod: undefined,
        }
        if (currentHitPoints == undefined || maxHitPoints == undefined) {
            return noFillAlpha
        }
        const maxHitPointsAreLow: boolean = maxHitPoints <= 5
        const hitPointsAreAtDangerLevel = maxHitPointsAreLow
            ? currentHitPoints < maxHitPoints
            : currentHitPoints <= maxHitPoints / 2
        const hitPointsAreAtPerilLevel = maxHitPointsAreLow
            ? currentHitPoints == 1
            : currentHitPoints <= maxHitPoints / 5

        switch (true) {
            case hitPointsAreAtPerilLevel:
                return layout.hitPoints.hitPointMeter.perilLevelHitPoints
            case hitPointsAreAtDangerLevel:
                return layout.hitPoints.hitPointMeter.dangerLevelHitPoints
            default:
                return noFillAlpha
        }
    }
}

export class SquaddieStatusTileDrawHitPointsPointsMeterAction
    implements BehaviorTreeTask
{
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

        const hitPointsMeterData:
            | DrawHorizontalMeterActionDataBlob
            | undefined = uiObjects.hitPoints.actionPointMeterDataBlob
        const absorbMeterData: DrawHorizontalMeterActionDataBlob | undefined =
            uiObjects.hitPoints.absorbBar

        const currentValueSegmentFunction = (
            horizontalBarData: DrawHorizontalMeterActionDataBlob
        ): number[] => {
            const currentHitPoints = DataBlobService.get<number>(
                horizontalBarData,
                "currentValue"
            )
            const maxHitPoints = DataBlobService.get<number>(
                horizontalBarData,
                "maxValue"
            )

            if (currentHitPoints == 1) {
                return [1]
            }

            const CUTOFF_FOR_ALL_SINGLE_SEGMENTS = 10
            const SEGMENT_INTERVAL_FOR_LARGE_MAX_HP = 5

            let values: number[] = []
            if (maxHitPoints <= CUTOFF_FOR_ALL_SINGLE_SEGMENTS) {
                for (let i = 1; i < maxHitPoints; ++i) {
                    values.push(i)
                }
                return values
            }

            values.push(1)
            for (
                let i = SEGMENT_INTERVAL_FOR_LARGE_MAX_HP;
                i < maxHitPoints;
                i += SEGMENT_INTERVAL_FOR_LARGE_MAX_HP
            ) {
                values.push(i)
            }
            const fromLastInterval =
                maxHitPoints -
                (maxHitPoints % SEGMENT_INTERVAL_FOR_LARGE_MAX_HP == 0
                    ? SEGMENT_INTERVAL_FOR_LARGE_MAX_HP
                    : maxHitPoints % SEGMENT_INTERVAL_FOR_LARGE_MAX_HP) +
                1
            for (let i = fromLastInterval; i < maxHitPoints; i += 1) {
                values.push(i)
            }
            return values
        }

        if (hitPointsMeterData == undefined || absorbMeterData == undefined)
            return false

        const drawAction = new SequenceComposite(hitPointsMeterData, [
            new DrawHorizontalMeterAction(
                hitPointsMeterData,
                this.graphicsContext,
                {
                    currentValueSegment: currentValueSegmentFunction,
                }
            ),
            new ShouldDrawAbsorbMeter(this.dataBlob),
            new DrawHorizontalMeterAction(
                absorbMeterData,
                this.graphicsContext
            ),
        ])
        return drawAction.run()
    }
}

class ShouldDrawAbsorbMeter implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(dataBlob: DataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieStatusTileContext>(
            this.dataBlob,
            "context"
        )

        return (
            context?.hitPoints != undefined &&
            context.hitPoints.currentAbsorb > 0
        )
    }
}
