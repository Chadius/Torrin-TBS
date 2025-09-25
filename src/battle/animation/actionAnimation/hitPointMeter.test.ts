import { ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME } from "./actionAnimationConstants"
import { HIT_POINT_METER_HP_WIDTH, HitPointMeter } from "./hitPointMeter"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../utils/test/mocks"
import { beforeEach, describe, expect, it, MockInstance, vi } from "vitest"
import { RectAreaService } from "../../../ui/rectArea"

describe("Hit Point Meter", () => {
    let hitPointMeter: HitPointMeter
    let hue: number
    let textDrawSpy: MockInstance
    let rectDrawSpy: MockInstance
    let strokeSpy: MockInstance
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        hue = 30
        hitPointMeter = new HitPointMeter({
            maxHitPoints: 5,
            currentHitPoints: 3,
            left: 10,
            top: 50,
            hue,
        })

        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        textDrawSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "text")
        rectDrawSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "rect")
        strokeSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "stroke")
    })

    it("knows to draw the current and max hit points", () => {
        hitPointMeter.draw(mockedP5GraphicsContext)

        expect(textDrawSpy).toBeCalledTimes(2)
        expect(textDrawSpy.mock.calls[0][0]).toBe("3")
        expect(textDrawSpy.mock.calls[1][0]).toBe("/5")

        const currentHitPointDrawLocation = {
            left: textDrawSpy.mock.calls[0][1],
            top: textDrawSpy.mock.calls[0][2],
        }

        const maxHitPointDrawLocation = {
            left: textDrawSpy.mock.calls[1][1],
            top: textDrawSpy.mock.calls[1][2],
        }

        expect(currentHitPointDrawLocation.top).toBe(
            maxHitPointDrawLocation.top
        )
        expect(currentHitPointDrawLocation.left).toBeLessThan(
            maxHitPointDrawLocation.left
        )
    })

    it("knows to draw the max hit points outline first, and then the current hit points", () => {
        hitPointMeter.draw(mockedP5GraphicsContext)

        expect(strokeSpy).toBeCalledTimes(1)
        expect(strokeSpy.mock.calls[0][0]).toBe(hue)

        expect(rectDrawSpy).toBeCalledTimes(2)
        expect(rectDrawSpy.mock.calls[0][2]).toBeGreaterThanOrEqual(
            5 * HIT_POINT_METER_HP_WIDTH
        )
        expect(rectDrawSpy.mock.calls[0][2]).toBeLessThan(
            6 * HIT_POINT_METER_HP_WIDTH
        )

        expect(rectDrawSpy.mock.calls[1][2]).toBe(3 * HIT_POINT_METER_HP_WIDTH)
    })

    describe("hit point change", () => {
        it("will draw hit point change with a brighter color", () => {
            vi.spyOn(Date, "now").mockImplementation(() => 0)
            hitPointMeter.changeHitPoints(-2)
            hitPointMeter.draw(mockedP5GraphicsContext)

            expect(rectDrawSpy).toBeCalledTimes(3)
            expect(rectDrawSpy.mock.calls[2][2]).toBe(
                2 * HIT_POINT_METER_HP_WIDTH
            )
        })

        describe("will animate the length of the changed hit points when damaged", () => {
            beforeEach(() => {
                vi.spyOn(Date, "now").mockImplementation(() => 0)
                hitPointMeter.changeHitPoints(-2)
                hitPointMeter.draw(mockedP5GraphicsContext)
            })

            it("prints the expected number of hit points", () => {
                const textStrings =
                    MockedGraphicsBufferService.getTextStrings(textDrawSpy)
                expect(textStrings[0]).toBe("1")
                expect(textStrings[1]).toBe("/5")
            })

            it("the bar should shrink over time", () => {
                const startWidth = RectAreaService.width(
                    hitPointMeter.changedHitPointsRectangle!.area
                )
                vi.spyOn(Date, "now").mockImplementation(
                    () => ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME
                )
                hitPointMeter.draw(mockedP5GraphicsContext)
                const endWidth = RectAreaService.width(
                    hitPointMeter.changedHitPointsRectangle!.area
                )
                expect(endWidth).toBeLessThan(startWidth)
            })
        })

        describe("will animate the length of the changed hit points when healed", () => {
            beforeEach(() => {
                vi.spyOn(Date, "now").mockImplementation(() => 0)
                hitPointMeter.changeHitPoints(2)
                hitPointMeter.draw(mockedP5GraphicsContext)
            })

            it("prints the expected number of hit points", () => {
                const textStrings =
                    MockedGraphicsBufferService.getTextStrings(textDrawSpy)
                expect(textStrings[0]).toBe("5")
                expect(textStrings[1]).toBe("/5")
            })

            it("the bar should grow over time", () => {
                const startWidth = RectAreaService.width(
                    hitPointMeter.changedHitPointsRectangle!.area
                )
                vi.spyOn(Date, "now").mockImplementation(
                    () => ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME
                )
                hitPointMeter.draw(mockedP5GraphicsContext)
                const endWidth = RectAreaService.width(
                    hitPointMeter.changedHitPointsRectangle!.area
                )
                expect(endWidth).toBeGreaterThan(startWidth)
            })
        })
    })
})
