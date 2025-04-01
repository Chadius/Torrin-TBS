import { DataBlob, DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import {
    PULSE_COLOR_FORMULA_TYPE,
    PulseColorService,
} from "../../../hexMap/pulseColor"

export interface DrawHorizontalMeterActionDataBlob extends DataBlob {
    data: {
        drawingArea: RectArea
        maxValue: number
        emptyColor: number[]

        currentValue?: number
        currentValueFillColor?: number[]
        currentValueSegmentColor?: number[]
        currentValueSegmentStrokeWeight?: number
        currentValueSegmentDivisionInterval?: number
        currentValueFillAlphaRange?: number[]
        currentValueFillAlphaPeriod?: number

        highlightedValue?: number
        highlightedValueFillColor?: number[]
        highlightedValueFillAlphaRange?: number[]
        highlightedValueFillAlphaPeriod?: number

        outlineStrokeWeight?: number
        outlineStrokeColor?: number[]
    }
}

export class DrawHorizontalMeterAction implements BehaviorTreeTask {
    graphicsContext: GraphicsBuffer
    dataBlob: DrawHorizontalMeterActionDataBlob
    currentValueSegmentFunction: (
        horizontalBarData: DrawHorizontalMeterActionDataBlob
    ) => number[]

    constructor(
        dataBlob: DrawHorizontalMeterActionDataBlob,
        graphicsContext: GraphicsBuffer,
        functions?: {
            currentValueSegment?: (
                horizontalBarData: DrawHorizontalMeterActionDataBlob
            ) => number[]
        }
    ) {
        this.dataBlob = dataBlob
        this.graphicsContext = graphicsContext
        this.currentValueSegmentFunction = functions?.currentValueSegment
    }

    run(): boolean {
        this.graphicsContext.push()
        this.drawBackground()
        this.drawCurrentValue()
        this.drawSegmentedValue()
        this.drawHighlightedValue()
        this.graphicsContext.pop()
        return true
    }

    private get emptyColor(): number[] {
        return DataBlobService.get<number[]>(this.dataBlob, "emptyColor")
    }

    private get drawingArea(): RectArea {
        return DataBlobService.get<RectArea>(this.dataBlob, "drawingArea")
    }

    private get outlineStrokeColor(): number[] {
        return DataBlobService.get<number[]>(
            this.dataBlob,
            "outlineStrokeColor"
        )
    }

    private get outlineStrokeWeight(): number {
        return DataBlobService.get<number>(this.dataBlob, "outlineStrokeWeight")
    }

    private get currentValue(): number {
        return DataBlobService.get<number>(this.dataBlob, "currentValue")
    }

    private get highlightedValue(): number {
        return DataBlobService.get<number>(this.dataBlob, "highlightedValue")
    }

    private get maxValue(): number {
        return DataBlobService.get<number>(this.dataBlob, "maxValue")
    }

    private get currentValueFillColor(): number[] {
        return DataBlobService.get<number[]>(
            this.dataBlob,
            "currentValueFillColor"
        )
    }

    private get currentValueSegmentColor(): number[] {
        return DataBlobService.get<number[]>(
            this.dataBlob,
            "currentValueSegmentColor"
        )
    }

    private get currentValueSegmentStrokeWeight(): number {
        return DataBlobService.get<number>(
            this.dataBlob,
            "currentValueSegmentStrokeWeight"
        )
    }

    private get currentValueSegmentDivisionInterval(): number {
        return DataBlobService.get<number>(
            this.dataBlob,
            "currentValueSegmentDivisionInterval"
        )
    }

    private get currentValueFillAlphaRange(): number[] {
        return DataBlobService.get<number[]>(
            this.dataBlob,
            "currentValueFillAlphaRange"
        )
    }

    private get currentValueFillAlphaPeriod(): number {
        return DataBlobService.get<number>(
            this.dataBlob,
            "currentValueFillAlphaPeriod"
        )
    }

    private get highlightedValueFillColor(): number[] {
        return DataBlobService.get<number[]>(
            this.dataBlob,
            "highlightedValueFillColor"
        )
    }

    private get highlightedValueFillAlphaRange(): number[] {
        return DataBlobService.get<number[]>(
            this.dataBlob,
            "highlightedValueFillAlphaRange"
        )
    }

    private get highlightedValueFillAlphaPeriod(): number {
        return DataBlobService.get<number>(
            this.dataBlob,
            "highlightedValueFillAlphaPeriod"
        )
    }

    private drawBackground() {
        this.graphicsContext.fill(
            this.emptyColor[0],
            this.emptyColor[1],
            this.emptyColor[2]
        )

        if (
            this.outlineStrokeWeight != undefined &&
            this.outlineStrokeWeight > 0
        ) {
            this.graphicsContext.strokeWeight(this.outlineStrokeWeight)

            this.graphicsContext.stroke(
                this.outlineStrokeColor[0],
                this.outlineStrokeColor[1],
                this.outlineStrokeColor[2]
            )
        } else {
            this.graphicsContext.noStroke()
        }

        this.graphicsContext.rect(
            RectAreaService.left(this.drawingArea),
            RectAreaService.top(this.drawingArea),
            RectAreaService.width(this.drawingArea),
            RectAreaService.height(this.drawingArea)
        )
    }

    private drawCurrentValue() {
        if (!this.isCurrentValueDefined()) return
        if (this.highlightedValue && this.currentValue <= this.highlightedValue)
            return

        let hasAlphaValue =
            this.currentValueFillAlphaRange && this.currentValueFillAlphaPeriod

        if (hasAlphaValue) {
            const alphaValue = PulseColorService.calculatePulseAmount({
                range: {
                    low: this.currentValueFillAlphaRange[0],
                    high: this.currentValueFillAlphaRange[1],
                },
                periodInMilliseconds: this.currentValueFillAlphaPeriod,
                formula: PULSE_COLOR_FORMULA_TYPE.SINE,
            })
            this.graphicsContext.fill(
                this.currentValueFillColor[0],
                this.currentValueFillColor[1],
                this.currentValueFillColor[2],
                alphaValue
            )
        } else {
            this.graphicsContext.fill(
                this.currentValueFillColor[0],
                this.currentValueFillColor[1],
                this.currentValueFillColor[2]
            )
        }

        const currentEndValue = this.highlightedValue
            ? this.currentValue - this.highlightedValue
            : this.currentValue

        this.graphicsContext.rect(
            RectAreaService.left(this.drawingArea),
            RectAreaService.top(this.drawingArea),
            this.calculateValueWidth(currentEndValue),
            RectAreaService.height(this.drawingArea)
        )
    }

    private calculateValueWidth(value: number): number {
        return (RectAreaService.width(this.drawingArea) * value) / this.maxValue
    }

    private drawSegmentedValue() {
        if (!this.isCurrentValueDefined()) return
        if (
            this.currentValueSegmentDivisionInterval == undefined ||
            this.currentValueSegmentDivisionInterval == 0
        )
            return
        if (
            this.currentValueSegmentStrokeWeight == undefined ||
            this.currentValueSegmentStrokeWeight == 0
        )
            return

        this.graphicsContext.strokeWeight(this.currentValueSegmentStrokeWeight)

        const outlineStrokeBorder = this.outlineStrokeWeight ?? 0

        this.graphicsContext.stroke(
            this.currentValueSegmentColor[0],
            this.currentValueSegmentColor[1],
            this.currentValueSegmentColor[2]
        )

        let valuesToDraw: number[]
        if (this.currentValueSegmentFunction) {
            valuesToDraw = this.currentValueSegmentFunction(this.dataBlob)
        } else {
            valuesToDraw = []
            for (
                let i = this.currentValueSegmentDivisionInterval;
                i < this.maxValue;
                i += this.currentValueSegmentDivisionInterval
            ) {
                valuesToDraw.push(i)
            }
        }

        valuesToDraw.forEach((i) => {
            this.graphicsContext.line(
                RectAreaService.left(this.drawingArea) +
                    (RectAreaService.width(this.drawingArea) * i) /
                        this.maxValue,
                RectAreaService.top(this.drawingArea) + outlineStrokeBorder,
                RectAreaService.left(this.drawingArea) +
                    (RectAreaService.width(this.drawingArea) * i) /
                        this.maxValue,
                RectAreaService.bottom(this.drawingArea)
            )
        })
    }

    private isMaxValueDefined(): boolean {
        return !(this.maxValue == undefined || this.maxValue == 0)
    }

    private isCurrentValueDefined(): boolean {
        if (this.currentValue == undefined || this.currentValue == 0)
            return false
        return this.isMaxValueDefined()
    }

    private isHighlightedValueDefined(): boolean {
        if (this.highlightedValue == undefined || this.highlightedValue == 0)
            return false
        return this.isCurrentValueDefined()
    }

    private drawHighlightedValue() {
        if (!this.isHighlightedValueDefined()) return

        if (
            this.highlightedValueFillAlphaRange == undefined ||
            this.highlightedValueFillAlphaRange.length == 0
        )
            return
        if (
            this.highlightedValueFillColor == undefined ||
            this.highlightedValueFillColor.length == 0
        )
            return
        if (
            this.highlightedValueFillAlphaPeriod == undefined ||
            this.highlightedValueFillAlphaPeriod == 0
        )
            return

        const alphaValue = PulseColorService.calculatePulseAmount({
            range: {
                low: this.highlightedValueFillAlphaRange[0],
                high: this.highlightedValueFillAlphaRange[1],
            },
            periodInMilliseconds: this.highlightedValueFillAlphaPeriod,
            formula: PULSE_COLOR_FORMULA_TYPE.SINE,
        })

        this.graphicsContext.fill(
            this.highlightedValueFillColor[0],
            this.highlightedValueFillColor[1],
            this.highlightedValueFillColor[2],
            alphaValue
        )

        const highlightedStartValue =
            this.currentValue > this.highlightedValue
                ? this.currentValue - this.highlightedValue
                : 0

        const highlightedEndValue =
            this.currentValue > this.highlightedValue
                ? this.currentValue
                : this.highlightedValue

        this.graphicsContext.rect(
            RectAreaService.left(this.drawingArea) +
                this.calculateValueWidth(highlightedStartValue),
            RectAreaService.top(this.drawingArea),
            this.calculateValueWidth(
                highlightedEndValue - highlightedStartValue
            ),
            RectAreaService.height(this.drawingArea)
        )
    }
}
