import {
    PULSE_COLOR_FORMULA_TYPE,
    PulseColor,
    PulseColorService,
} from "./pulseColor"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"

describe("Pulse Color", () => {
    let dateSpy: MockInstance
    beforeEach(() => {
        dateSpy = vi.spyOn(Date, "now")
    })

    afterEach(() => {
        dateSpy.mockRestore()
    })

    it("new will create a pulse color", () => {
        expect(
            PulseColorService.new({
                hue: 10,
                saturation: 20,
                brightness: 30,
                alpha: 40,
                pulse: {
                    period: 50,
                    formula: PULSE_COLOR_FORMULA_TYPE.SINE,
                },
            })
        ).toEqual({
            hue: 10,
            saturation: 20,
            brightness: 30,
            alpha: 40,
            pulse: {
                period: 50,
                formula: PULSE_COLOR_FORMULA_TYPE.SINE,
            },
        })
    })

    describe("PulseColor can vary brightness over time", () => {
        const pulseBlendColor: PulseColor = {
            hue: 100,
            saturation: 50,
            brightness: {
                low: 0,
                high: 100,
            },
            alpha: 100,
            pulse: {
                period: 1000,
                formula: PULSE_COLOR_FORMULA_TYPE.SINE,
            },
        }

        const tests = [
            {
                name: "base value",
                timeElapsed: 0,
                expectedColor: [
                    pulseBlendColor.hue,
                    pulseBlendColor.saturation,
                    50,
                    pulseBlendColor.alpha,
                ],
            },
            {
                name: "peak value",
                timeElapsed: 250,
                expectedColor: [
                    pulseBlendColor.hue,
                    pulseBlendColor.saturation,
                    100,
                    pulseBlendColor.alpha,
                ],
            },
            {
                name: "valley value",
                timeElapsed: 750,
                expectedColor: [
                    pulseBlendColor.hue,
                    pulseBlendColor.saturation,
                    0,
                    pulseBlendColor.alpha,
                ],
            },
        ]

        it.each(tests)(`$name`, ({ timeElapsed, expectedColor }) => {
            dateSpy.mockReturnValue(timeElapsed)

            const actualColor =
                PulseColorService.pulseColorToColor(pulseBlendColor)

            expect(actualColor[0]).toEqual(expectedColor[0])
            expect(actualColor[1]).toEqual(expectedColor[1])
            expect(typeof expectedColor[2]).toEqual("number")
            if (typeof expectedColor[2] === "number") {
                expect(actualColor[2]).toBeCloseTo(expectedColor[2])
            }
            expect(actualColor[3]).toEqual(expectedColor[3])
            expect(dateSpy).toHaveBeenCalled()
        })
    })

    describe("Calculate Pulse Amount", () => {
        it("if there is no range, will return the given number", () => {
            expect(
                PulseColorService.calculatePulseAmount({
                    range: 9001,
                    periodInMilliseconds: 0,
                    formula: PULSE_COLOR_FORMULA_TYPE.SINE,
                })
            ).toEqual(9001)
            expect(dateSpy).not.toHaveBeenCalled()
        })

        it("sine formula will vary based on time elapsed", () => {
            const now = Date.now()
            dateSpy.mockReturnValue(now)
            const expectedValue =
                40 * Math.sin((Date.now() * (Math.PI * 2)) / 1000) + 60
            expect(
                PulseColorService.calculatePulseAmount({
                    range: { low: 20, high: 100 },
                    periodInMilliseconds: 1000,
                    formula: PULSE_COLOR_FORMULA_TYPE.SINE,
                })
            ).toBeCloseTo(expectedValue)
            expect(dateSpy).toHaveBeenCalled()
        })

        it("linear formula will increase in time before setting back to low based on time elapsed", () => {
            const now = Date.now()
            dateSpy.mockReturnValue(now)
            const expectedValue = ((100 - 20) / 1000) * (now % 1000) + 20
            expect(
                PulseColorService.calculatePulseAmount({
                    range: { low: 20, high: 100 },
                    periodInMilliseconds: 1000,
                    formula: PULSE_COLOR_FORMULA_TYPE.LINEAR,
                })
            ).toBeCloseTo(expectedValue)
            expect(dateSpy).toHaveBeenCalled()
        })
    })
})
