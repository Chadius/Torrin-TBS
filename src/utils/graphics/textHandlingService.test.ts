import { StyleFontConstants } from "../../cutscene/dialogue/constants"
import { TextHandlingService } from "./textHandlingService"

describe("Text Handling Service", () => {
    test.each`
        inputString     | approximateLength
        ${"ABCDEFG"}    | ${70}
        ${"01234"}      | ${25}
        ${"a sly fox."} | ${10}
    `(
        "$inputString estimated length is close to: $approximateLength",
        ({ inputString, approximateLength }) => {
            const fontStyle: StyleFontConstants = {
                fontColor: [],
                textSize: 1,
                widthRatio: {
                    uppercase: 10,
                    number: 5,
                    default: 1,
                },
            }

            expect(
                TextHandlingService.calculateLengthOfLineOfText({
                    text: inputString,
                    fontStyle,
                })
            ).toBeCloseTo(approximateLength)
        }
    )
})
