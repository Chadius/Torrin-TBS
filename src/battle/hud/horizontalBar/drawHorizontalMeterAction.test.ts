import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../utils/test/mocks"
import {
    DrawHorizontalMeterAction,
    DrawHorizontalMeterActionDataBlob,
} from "./drawHorizontalMeterAction"

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
            })
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "emptyColor",
            [0, 1, 2]
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "outlineStrokeColor",
            [4, 5, 6]
        )
        DataBlobService.add<number>(horizontalBarData, "outlineStrokeWeight", 7)

        DataBlobService.add<number>(horizontalBarData, "maxValue", 5)
        DataBlobService.add<number>(horizontalBarData, "currentValue", 0)
        const drawBehavior = new DrawHorizontalMeterAction(
            horizontalBarData,
            graphicsContext
        )

        drawBehavior.run()
        expect(graphicsBufferSpies["fill"]).toHaveBeenCalledWith(0, 1, 2)
        expect(graphicsBufferSpies["stroke"]).toHaveBeenCalledWith(4, 5, 6)
        expect(graphicsBufferSpies["strokeWeight"]).toHaveBeenCalledWith(7)
        expect(graphicsBufferSpies["rect"]).toHaveBeenCalledWith(
            10,
            20,
            360,
            30
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
                    })
                )
                DataBlobService.add<number[]>(
                    horizontalBarData,
                    "emptyColor",
                    [0, 1, 2]
                )
                DataBlobService.add<number[]>(
                    horizontalBarData,
                    "outlineStrokeColor",
                    [4, 5, 6]
                )
                DataBlobService.add<number | undefined>(
                    horizontalBarData,
                    "outlineStrokeWeight",
                    outlineStrokeWeight
                )

                DataBlobService.add<number>(horizontalBarData, "maxValue", 5)
                DataBlobService.add<number>(
                    horizontalBarData,
                    "currentValue",
                    0
                )
                const drawBehavior = new DrawHorizontalMeterAction(
                    horizontalBarData,
                    graphicsContext
                )

                drawBehavior.run()

                expect(graphicsBufferSpies["stroke"]).not.toHaveBeenCalled()
                expect(graphicsBufferSpies["noStroke"]).toHaveBeenCalled()
                expect(
                    graphicsBufferSpies["strokeWeight"]
                ).not.toHaveBeenCalled()
            }
        )
    })

    const getXValuesOfVerticalLineCalls = (): number[] =>
        graphicsBufferSpies["line"].mock.calls
            .filter((args) => args.length == 4 && args[0] == args[2])
            .map((args) => args[0])

    describe("current value", () => {
        beforeEach(() => {
            DataBlobService.add<RectArea>(
                horizontalBarData,
                "drawingArea",
                RectAreaService.new({
                    left: 10,
                    top: 20,
                    width: 360,
                    height: 30,
                })
            )

            DataBlobService.add<number[]>(
                horizontalBarData,
                "emptyColor",
                [0, 1, 2]
            )

            DataBlobService.add<number[]>(
                horizontalBarData,
                "currentValueFillColor",
                [10, 11, 12]
            )

            DataBlobService.add<number>(horizontalBarData, "maxValue", 5)
        })

        it("will draw a rectangle representing the current value", () => {
            DataBlobService.add<number>(horizontalBarData, "currentValue", 1)
            const drawBehavior = new DrawHorizontalMeterAction(
                horizontalBarData,
                graphicsContext
            )

            drawBehavior.run()
            expect(graphicsBufferSpies["fill"]).toHaveBeenCalledWith(10, 11, 12)
            expect(graphicsBufferSpies["rect"]).toHaveBeenCalledWith(
                10,
                20,
                360 / 5,
                30
            )
        })

        it("will draw a rectangle representing the current value", () => {
            DataBlobService.add<number>(horizontalBarData, "currentValue", 1)
            DataBlobService.add<number[]>(
                horizontalBarData,
                "currentValueFillAlphaRange",
                [0, 100]
            )
            DataBlobService.add<number>(
                horizontalBarData,
                "currentValueFillAlphaPeriod",
                1000
            )
            const dateSpy = vi.spyOn(Date, "now").mockReturnValue(500)
            const drawBehavior = new DrawHorizontalMeterAction(
                horizontalBarData,
                graphicsContext
            )

            drawBehavior.run()
            expect(graphicsBufferSpies["fill"]).toHaveBeenCalledWith(
                10,
                11,
                12,
                expect.any(Number)
            )
            expect(dateSpy).toHaveBeenCalled()
            dateSpy.mockRestore()
        })
    })

    describe("drawing segments", () => {
        beforeEach(() => {
            DataBlobService.add<RectArea>(
                horizontalBarData,
                "drawingArea",
                RectAreaService.new({
                    left: 10,
                    top: 20,
                    width: 360,
                    height: 30,
                })
            )

            DataBlobService.add<number[]>(
                horizontalBarData,
                "emptyColor",
                [0, 1, 2]
            )

            DataBlobService.add<number[]>(
                horizontalBarData,
                "currentValueSegmentColor",
                [7, 8, 9]
            )
            DataBlobService.add<number>(
                horizontalBarData,
                "currentValueSegmentStrokeWeight",
                13
            )

            DataBlobService.add<number[]>(
                horizontalBarData,
                "currentValueFillColor",
                [10, 11, 12]
            )
        })

        it("can draw segments at intervals based on a function", () => {
            DataBlobService.add<number>(
                horizontalBarData,
                "currentValueSegmentDivisionInterval",
                2
            )
            DataBlobService.add<number>(horizontalBarData, "maxValue", 10)
            DataBlobService.add<number>(horizontalBarData, "currentValue", 5)
            const drawBehavior = new DrawHorizontalMeterAction(
                horizontalBarData,
                graphicsContext,
                {
                    currentValueSegment: (
                        _: DrawHorizontalMeterActionDataBlob
                    ) => [1],
                }
            )

            drawBehavior.run()

            const lineXValues = getXValuesOfVerticalLineCalls()
            expect(lineXValues).toHaveLength(1)
            expect(lineXValues.includes(10 + 360 / 10)).toBeTruthy()
        })
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
            })
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "emptyColor",
            [0, 1, 2]
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "currentValueFillColor",
            [4, 5, 6]
        )

        DataBlobService.add<number[]>(
            horizontalBarData,
            "highlightedValueFillColor",
            [10, 11, 12]
        )
        DataBlobService.add<number[]>(
            horizontalBarData,
            "highlightedValueFillAlphaRange",
            [0, 100]
        )
        DataBlobService.add<number>(
            horizontalBarData,
            "highlightedValueFillAlphaPeriod",
            1000
        )

        DataBlobService.add<number>(horizontalBarData, "maxValue", 5)
        DataBlobService.add<number>(horizontalBarData, "currentValue", 2)
        DataBlobService.add<number>(horizontalBarData, "highlightedValue", 1)
        const drawBehavior = new DrawHorizontalMeterAction(
            horizontalBarData,
            graphicsContext
        )

        const dateSpy = vi.spyOn(Date, "now").mockReturnValue(500)
        drawBehavior.run()
        expect(graphicsBufferSpies["fill"]).toHaveBeenCalledWith(4, 5, 6)
        expect(graphicsBufferSpies["fill"]).toHaveBeenCalledWith(
            10,
            11,
            12,
            expect.any(Number)
        )
        expect(graphicsBufferSpies["rect"]).toHaveBeenCalledWith(
            10,
            20,
            360 / 5,
            30
        )
        expect(graphicsBufferSpies["rect"]).toHaveBeenCalledWith(
            10 + 360 / 5,
            20,
            360 / 5,
            30
        )
        expect(dateSpy).toHaveBeenCalled()
        dateSpy.mockRestore()
    })
})
