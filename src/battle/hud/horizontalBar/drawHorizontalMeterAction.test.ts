import { afterEach, beforeEach, describe, expect, it, MockInstance, vi } from "vitest"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { MockedGraphicsBufferService, MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import { DrawHorizontalMeterAction, DrawHorizontalMeterActionDataBlob } from "./drawHorizontalMeterAction"

describe("Horizontal Meter", () => {
    let horizontalBarData: DrawHorizontalMeterActionDataBlob
    let graphicsContext: GraphicsBuffer
    let graphicsBufferSpies: {
        [x: string]: MockInstance
    }

    beforeEach(() => {
        horizontalBarData =
            DataBlobService.new() as DrawHorizontalMeterActionDataBlob
        graphicsContext = new MockedP5GraphicsBuffer()

        graphicsBufferSpies =
            MockedGraphicsBufferService.addSpies(graphicsContext)
    })

    afterEach(() => {
        MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
    })

    it("will try to draw a bounding box covering the drawing area with a given color", () => {
        DataBlobService.add<RectArea>(
            horizontalBarData,
            "drawingArea",
            RectAreaService.new({
                left: 10,
                top: 20,
                width: 360,
                height: 30,
            }),
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "emptyColor",
            [0, 1, 2],
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "outlineStrokeColor",
            [4, 5, 6],
        )
        DataBlobService.add<number>(horizontalBarData, "outlineStrokeWeight", 7)

        DataBlobService.add<number>(horizontalBarData, "maxValue", 5)
        DataBlobService.add<number>(horizontalBarData, "currentValue", 0)
        const drawBehavior = new DrawHorizontalMeterAction(
            horizontalBarData,
            graphicsContext,
        )

        drawBehavior.run()
        expect(graphicsBufferSpies["fill"]).toHaveBeenCalledWith(0, 1, 2)
        expect(graphicsBufferSpies["stroke"]).toHaveBeenCalledWith(4, 5, 6)
        expect(graphicsBufferSpies["strokeWeight"]).toHaveBeenCalledWith(7)
        expect(graphicsBufferSpies["rect"]).toHaveBeenCalledWith(
            10,
            20,
            360,
            30,
        )
    })

    describe("Use noStroke if none given", () => {
        let scenarios: { outlineStrokeWeight?: number }[] = [
            {
                outlineStrokeWeight: undefined,
            },
            {
                outlineStrokeWeight: 0,
            },
        ]

        it.each(scenarios)(
            `$outlineStrokeWeight`,
            ({ outlineStrokeWeight }) => {
                DataBlobService.add<RectArea>(
                    horizontalBarData,
                    "drawingArea",
                    RectAreaService.new({
                        left: 10,
                        top: 20,
                        width: 360,
                        height: 30,
                    }),
                )
                DataBlobService.add<number[]>(
                    horizontalBarData,
                    "emptyColor",
                    [0, 1, 2],
                )
                DataBlobService.add<number[]>(
                    horizontalBarData,
                    "outlineStrokeColor",
                    [4, 5, 6],
                )
                DataBlobService.add<number>(
                    horizontalBarData,
                    "outlineStrokeWeight",
                    outlineStrokeWeight,
                )

                DataBlobService.add<number>(horizontalBarData, "maxValue", 5)
                DataBlobService.add<number>(
                    horizontalBarData,
                    "currentValue",
                    0,
                )
                const drawBehavior = new DrawHorizontalMeterAction(
                    horizontalBarData,
                    graphicsContext,
                )

                drawBehavior.run()

                expect(graphicsBufferSpies["stroke"]).not.toHaveBeenCalled()
                expect(graphicsBufferSpies["noStroke"]).toHaveBeenCalled()
                expect(
                    graphicsBufferSpies["strokeWeight"],
                ).not.toHaveBeenCalled()
            },
        )
    })

    it("will draw a rectangle representing the current value", () => {
        DataBlobService.add<RectArea>(
            horizontalBarData,
            "drawingArea",
            RectAreaService.new({
                left: 10,
                top: 20,
                width: 360,
                height: 30,
            }),
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "emptyColor",
            [0, 1, 2],
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "currentValueFillColor",
            [10, 11, 12],
        )

        DataBlobService.add<number>(horizontalBarData, "maxValue", 5)
        DataBlobService.add<number>(horizontalBarData, "currentValue", 1)
        const drawBehavior = new DrawHorizontalMeterAction(
            horizontalBarData,
            graphicsContext,
        )

        drawBehavior.run()
        expect(graphicsBufferSpies["fill"]).toHaveBeenCalledWith(10, 11, 12)
        expect(graphicsBufferSpies["rect"]).toHaveBeenCalledWith(
            10,
            20,
            360 / 5,
            30,
        )
    })

    it("will draw segments per value", () => {
        DataBlobService.add<RectArea>(
            horizontalBarData,
            "drawingArea",
            RectAreaService.new({
                left: 10,
                top: 20,
                width: 360,
                height: 30,
            }),
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "emptyColor",
            [0, 1, 2],
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "currentValueSegmentColor",
            [7, 8, 9],
        )
        DataBlobService.add<number>(
            horizontalBarData,
            "currentValueSegmentStrokeWeight",
            13,
        )
        DataBlobService.add<number>(
            horizontalBarData,
            "currentValueSegmentDivisionInterval",
            2,
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "currentValueFillColor",
            [10, 11, 12],
        )

        DataBlobService.add<number>(horizontalBarData, "maxValue", 10)
        DataBlobService.add<number>(horizontalBarData, "currentValue", 5)
        const drawBehavior = new DrawHorizontalMeterAction(
            horizontalBarData,
            graphicsContext,
        )

        drawBehavior.run()
        expect(graphicsBufferSpies["stroke"]).toHaveBeenCalledWith(7, 8, 9)
        expect(graphicsBufferSpies["strokeWeight"]).toHaveBeenCalledWith(13)
        expect(graphicsBufferSpies["line"]).not.toHaveBeenCalledWith(
            10,
            20,
            10,
            50 - 1,
        )
        expect(graphicsBufferSpies["line"]).toHaveBeenCalledWith(
            10 + (360 * 2) / 10,
            20,
            10 + (360 * 2) / 10,
            50 - 1,
        )
        expect(graphicsBufferSpies["line"]).toHaveBeenCalledWith(
            10 + (360 * 4) / 10,
            20,
            10 + (360 * 4) / 10,
            50 - 1,
        )
        expect(graphicsBufferSpies["line"]).toHaveBeenCalledWith(
            10 + (360 * 6) / 10,
            20,
            10 + (360 * 6) / 10,
            50 - 1,
        )
        expect(graphicsBufferSpies["line"]).toHaveBeenCalledWith(
            10 + (360 * 8) / 10,
            20,
            10 + (360 * 8) / 10,
            50 - 1,
        )
        expect(graphicsBufferSpies["line"]).not.toHaveBeenCalledWith(
            10 + 360,
            20,
            10 + 360,
            50 - 1,
        )
    })

    it("will draw a rectangle representing the highlighted value that glows over time", () => {
        DataBlobService.add<RectArea>(
            horizontalBarData,
            "drawingArea",
            RectAreaService.new({
                left: 10,
                top: 20,
                width: 360,
                height: 30,
            }),
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "emptyColor",
            [0, 1, 2],
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "currentValueFillColor",
            [4, 5, 6],
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "highlightedValueFillColor",
            [10, 11, 12],
        )
        DataBlobService.add<number[]>(
            horizontalBarData,
            "highlightedValueFillAlphaRange",
            [0, 100],
        )
        DataBlobService.add<number>(
            horizontalBarData,
            "highlightedValueFillAlphaPeriod",
            1000,
        )
        DataBlobService.add<number>(
            horizontalBarData,
            "highlightedValueFillStartTime",
            0,
        )

        DataBlobService.add<number>(horizontalBarData, "maxValue", 5)
        DataBlobService.add<number>(horizontalBarData, "currentValue", 2)
        DataBlobService.add<number>(horizontalBarData, "highlightedValue", 1)
        const drawBehavior = new DrawHorizontalMeterAction(
            horizontalBarData,
            graphicsContext,
        )

        const dateSpy = vi.spyOn(Date, "now").mockReturnValue(500)
        drawBehavior.run()
        expect(graphicsBufferSpies["fill"]).toHaveBeenCalledWith(4, 5, 6)
        expect(graphicsBufferSpies["fill"]).toHaveBeenCalledWith(10, 11, 12, 50)
        expect(graphicsBufferSpies["rect"]).toHaveBeenCalledWith(
            10,
            20,
            360 / 5,
            30,
        )
        expect(graphicsBufferSpies["rect"]).toHaveBeenCalledWith(
            10 + 360 / 5,
            20,
            (360 * 2) / 5,
            30,
        )
        expect(dateSpy).toHaveBeenCalled()
        dateSpy.mockRestore()
    })
})
