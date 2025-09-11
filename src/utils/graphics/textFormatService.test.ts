import { TextFormatService } from "./textFormatService"
import { beforeEach, describe, expect, it, test } from "vitest"

describe("Text Graphical Handling Service", () => {
    beforeEach(() => {})

    test.each`
        inputString     | approximateLength
        ${"ABCDEFG"}    | ${0.8 * 10 * 7 + 1}
        ${"01234"}      | ${0.8 * 10 * 5 + 1}
        ${"a sly fox."} | ${0.62 * 10 * 10 + 1}
    `(
        "$inputString estimated length is close to: $approximateLength",
        ({ inputString, approximateLength }) => {
            expect(
                TextFormatService.approximateLengthOfLineOfText({
                    text: inputString,
                    fontSize: 10,
                    strokeWeight: 1,
                })
            ).toBeCloseTo(approximateLength)
        }
    )

    it("can pad a + in front of positive numbers", () => {
        expect(TextFormatService.padPlusOnPositiveNumber(3)).toEqual("+3")
        expect(TextFormatService.padPlusOnPositiveNumber(0)).toEqual("0")
        expect(TextFormatService.padPlusOnPositiveNumber(-5)).toEqual("-5")
    })
    it("can title case, only capitalizing the first letter of a word", () => {
        expect(TextFormatService.titleCase("cat")).toEqual("Cat")
        expect(TextFormatService.titleCase("CAT")).toEqual("Cat")
        expect(TextFormatService.titleCase("0cat")).toEqual("0cat")
    })
})
