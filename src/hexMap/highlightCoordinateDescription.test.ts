import { it, describe, expect } from "vitest"
import {
    HighlightCoordinateDescription,
    HighlightCoordinateDescriptionService,
} from "./highlightCoordinateDescription"
import { HIGHLIGHT_PULSE_COLOR } from "./hexDrawingUtils"

describe("HighlightCoordinateDescription", () => {
    it("test highlight comparison", () => {
        const twoBlue: HighlightCoordinateDescription = {
            coordinates: [
                {
                    q: 0,
                    r: 0,
                },
                {
                    q: 0,
                    r: 1,
                },
            ],
            pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
        }
        const twoPurple: HighlightCoordinateDescription = {
            coordinates: [
                {
                    q: 0,
                    r: 0,
                },
                {
                    q: 0,
                    r: 1,
                },
            ],
            pulseColor: HIGHLIGHT_PULSE_COLOR.PURPLE,
        }
        const threeBlue: HighlightCoordinateDescription = {
            coordinates: [
                {
                    q: 0,
                    r: 0,
                },
                {
                    q: 0,
                    r: 1,
                },
                {
                    q: 0,
                    r: 2,
                },
            ],
            pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
        }
        const twoDifferentBlue: HighlightCoordinateDescription = {
            coordinates: [
                {
                    q: 0,
                    r: 0,
                },
                {
                    q: 0,
                    r: 2,
                },
            ],
            pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
        }
        const twoBlueDifferentOrder: HighlightCoordinateDescription = {
            coordinates: [
                {
                    q: 0,
                    r: 1,
                },
                {
                    q: 0,
                    r: 0,
                },
            ],
            pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
        }

        expect(
            HighlightCoordinateDescriptionService.areEqual(twoBlue, twoBlue)
        ).toBe(true)
        expect(
            HighlightCoordinateDescriptionService.areEqual(
                twoBlue,
                twoBlueDifferentOrder
            )
        ).toBe(true)
        expect(
            HighlightCoordinateDescriptionService.areEqual(
                twoBlue,
                twoDifferentBlue
            )
        ).toBe(false)
        expect(
            HighlightCoordinateDescriptionService.areEqual(twoBlue, twoPurple)
        ).toBe(false)
        expect(
            HighlightCoordinateDescriptionService.areEqual(twoBlue, threeBlue)
        ).toBe(false)
        expect(
            HighlightCoordinateDescriptionService.areEqual(undefined, twoBlue)
        ).toBe(false)
        expect(
            HighlightCoordinateDescriptionService.areEqual(undefined, undefined)
        ).toBe(false)
    })
})
