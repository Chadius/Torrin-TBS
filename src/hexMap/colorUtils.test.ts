import {
    BlendColor,
    PulseBlendColor,
    pulseBlendColorToBlendColor,
} from "./colorUtils"
import { describe, expect, test, vi } from "vitest"

describe("PulseBlendColor to BlendColor", () => {
    test("Should return blended color", () => {
        const pulseBlendColor: PulseBlendColor = {
            hue: 100,
            saturation: 50,
            brightness: 40,
            lowAlpha: 0,
            highAlpha: 100,
            periodAlpha: 1000,
        }

        const lowBlendColor: BlendColor = [
            pulseBlendColor.hue,
            pulseBlendColor.saturation,
            pulseBlendColor.brightness,
            pulseBlendColor.lowAlpha,
        ]

        const baseBlendColor: BlendColor = [
            pulseBlendColor.hue,
            pulseBlendColor.saturation,
            pulseBlendColor.brightness,
            (pulseBlendColor.lowAlpha + pulseBlendColor.highAlpha) / 2,
        ]

        const highBlendColor: BlendColor = [
            pulseBlendColor.hue,
            pulseBlendColor.saturation,
            pulseBlendColor.brightness,
            pulseBlendColor.highAlpha,
        ]

        vi.spyOn(Date, "now").mockImplementation(() => 250) // peak value
        expect(pulseBlendColorToBlendColor(pulseBlendColor)).toStrictEqual(
            highBlendColor
        )

        vi.spyOn(Date, "now").mockImplementation(() => 0) // base value
        expect(pulseBlendColorToBlendColor(pulseBlendColor)).toStrictEqual(
            baseBlendColor
        )

        vi.spyOn(Date, "now").mockImplementation(() => 750) // valley value
        expect(pulseBlendColorToBlendColor(pulseBlendColor)).toStrictEqual(
            lowBlendColor
        )
    })
})
