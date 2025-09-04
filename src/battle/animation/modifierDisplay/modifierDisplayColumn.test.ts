import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    vi,
    MockInstance,
} from "vitest"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../utils/test/mocks"
import {
    ModifierDisplayColumn,
    ModifierDisplayColumnData,
    ModifierDisplayColumnPosition,
    ModifierDisplayColumnService,
    TModifierDisplayColumnPosition,
} from "./modifierDisplayColumn"

describe("Modifier Display", () => {
    let dateSpy: MockInstance
    let mockGraphicsContext: MockedP5GraphicsBuffer
    let graphicsBufferSpies: { [key: string]: MockInstance }

    beforeEach(() => {
        dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
        mockGraphicsContext = new MockedP5GraphicsBuffer()
        graphicsBufferSpies =
            MockedGraphicsBufferService.addSpies(mockGraphicsContext)
    })

    afterEach(() => {
        dateSpy.mockRestore()
        MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
    })

    describe("can sort modifiers with and without values", () => {
        let modifiers: ModifierDisplayColumnData[]
        let modifierDisplay: ModifierDisplayColumn

        beforeEach(() => {
            modifiers = [
                {
                    amount: 0,
                    description: "do not show because it is 0",
                },
                {
                    amount: 1,
                    description: "Marksman's Aim",
                },
                {
                    amount: -2,
                    description: "Blinded",
                },
                {
                    amount: undefined,
                    description: "Sure Shot",
                },
            ]
        })

        it("can sort modifiers from least to greatest", () => {
            modifierDisplay = createModifierDisplay({
                modifiers,
                sortOrderLeastToGreatest: true,
                position: ModifierDisplayColumnPosition.LEFT,
            })

            expect(modifierDisplay.labels).toHaveLength(modifiers.length - 1)
            expect(modifierDisplay.labels[0].textBox.text).toEqual("Sure Shot")
            expect(modifierDisplay.labels[1].textBox.text).toEqual("-2 Blinded")
            expect(modifierDisplay.labels[2].textBox.text).toEqual(
                "+1 Marksman's Aim"
            )
        })
        it("can sort modifiers from greatest to least", () => {
            modifierDisplay = createModifierDisplay({
                modifiers,
                sortOrderLeastToGreatest: false,
                position: ModifierDisplayColumnPosition.LEFT,
            })

            expect(modifierDisplay.labels).toHaveLength(modifiers.length - 1)
            expect(modifierDisplay.labels[0].textBox.text).toEqual("Sure Shot")
            expect(modifierDisplay.labels[1].textBox.text).toEqual(
                "+1 Marksman's Aim"
            )
            expect(modifierDisplay.labels[2].textBox.text).toEqual("-2 Blinded")
        })
    })

    describe("drawing", () => {
        let modifiers: ModifierDisplayColumnData[]
        let modifierDisplay: ModifierDisplayColumn

        beforeEach(() => {
            modifiers = [
                {
                    amount: undefined,
                    description: "Sure Shot",
                },
                {
                    amount: -2,
                    description: "Blinded",
                },
                {
                    amount: 1,
                    description: "Marksman's Aim",
                },
            ]
            modifierDisplay = createModifierDisplay({
                modifiers,
                sortOrderLeastToGreatest: true,
                position: ModifierDisplayColumnPosition.LEFT,
            })
        })

        it("gradually reveals each modifier over time", () => {
            dateSpy.mockReturnValue(0)
            ModifierDisplayColumnService.draw({
                modifierDisplay,
                graphicsBuffer: mockGraphicsContext,
            })
            let textCalls = getTextStrings(graphicsBufferSpies["text"])
            expect(textCalls).toContain("Sure Shot")
            expect(textCalls).not.toContain("-2 Blinded")
            expect(textCalls).not.toContain("+1 Marksman's Aim")
            graphicsBufferSpies["text"].mockClear()

            dateSpy.mockReturnValue(
                ModifierDisplayColumnService.MODIFIER_DISPLAY_DELAY
            )
            ModifierDisplayColumnService.draw({
                modifierDisplay,
                graphicsBuffer: mockGraphicsContext,
            })
            textCalls = getTextStrings(graphicsBufferSpies["text"])
            expect(textCalls).toContain("Sure Shot")
            expect(textCalls).toContain("-2 Blinded")
            expect(textCalls).not.toContain("+1 Marksman's Aim")
            graphicsBufferSpies["text"].mockClear()

            dateSpy.mockReturnValue(
                ModifierDisplayColumnService.MODIFIER_DISPLAY_DELAY * 2
            )
            ModifierDisplayColumnService.draw({
                modifierDisplay,
                graphicsBuffer: mockGraphicsContext,
            })
            textCalls = getTextStrings(graphicsBufferSpies["text"])
            expect(textCalls).toContain("Sure Shot")
            expect(textCalls).toContain("-2 Blinded")
            expect(textCalls).toContain("+1 Marksman's Aim")
            graphicsBufferSpies["text"].mockClear()

            expect(dateSpy).toBeCalled()
        })

        it("places each label below the next one", () => {
            dateSpy.mockReturnValue(0)
            ModifierDisplayColumnService.draw({
                modifierDisplay,
                graphicsBuffer: mockGraphicsContext,
            })
            graphicsBufferSpies["text"].mockClear()

            dateSpy.mockReturnValue(
                ModifierDisplayColumnService.MODIFIER_DISPLAY_DELAY * 2
            )
            ModifierDisplayColumnService.draw({
                modifierDisplay,
                graphicsBuffer: mockGraphicsContext,
            })
            let textTops = getTextTops(graphicsBufferSpies["text"])
            expect(textTops[1]).toBeGreaterThan(textTops[0])
            expect(textTops[2]).toBeGreaterThan(textTops[1])
        })

        it("places labels on the left or right", () => {
            const leftModifierDisplay = createModifierDisplay({
                modifiers,
                sortOrderLeastToGreatest: true,
                position: ModifierDisplayColumnPosition.LEFT,
            })

            const rightModifierDisplay = createModifierDisplay({
                modifiers,
                sortOrderLeastToGreatest: true,
                position: ModifierDisplayColumnPosition.RIGHT,
            })
            dateSpy.mockReturnValue(0)
            ModifierDisplayColumnService.draw({
                modifierDisplay: leftModifierDisplay,
                graphicsBuffer: mockGraphicsContext,
            })
            ModifierDisplayColumnService.draw({
                modifierDisplay: rightModifierDisplay,
                graphicsBuffer: mockGraphicsContext,
            })
            graphicsBufferSpies["text"].mockClear()

            dateSpy.mockReturnValue(
                ModifierDisplayColumnService.MODIFIER_DISPLAY_DELAY * 2
            )
            ModifierDisplayColumnService.draw({
                modifierDisplay: leftModifierDisplay,
                graphicsBuffer: mockGraphicsContext,
            })
            let textLeftsFromLeftDisplay = getTextLefts(
                graphicsBufferSpies["text"]
            )
            graphicsBufferSpies["text"].mockClear()
            ModifierDisplayColumnService.draw({
                modifierDisplay: rightModifierDisplay,
                graphicsBuffer: mockGraphicsContext,
            })
            let textLeftsFromRightDisplay = getTextLefts(
                graphicsBufferSpies["text"]
            )

            expect(textLeftsFromLeftDisplay[0]).toBeLessThan(
                textLeftsFromRightDisplay[0]
            )
            expect(textLeftsFromLeftDisplay[1]).toBeLessThan(
                textLeftsFromRightDisplay[1]
            )
            expect(textLeftsFromLeftDisplay[2]).toBeLessThan(
                textLeftsFromRightDisplay[2]
            )
        })
    })
})

const createModifierDisplay = ({
    modifiers,
    sortOrderLeastToGreatest,
    position,
}: {
    modifiers: ModifierDisplayColumnData[]
    sortOrderLeastToGreatest: boolean
    position: TModifierDisplayColumnPosition
}): ModifierDisplayColumn => {
    return ModifierDisplayColumnService.new({
        modifiers,
        sortOrderLeastToGreatest,
        position,
    })
}

const getTextStrings = (textSpy: MockInstance) => {
    return textSpy.mock.calls.map((call) => call[0] as string)
}

const getTextLefts = (textSpy: MockInstance) => {
    return textSpy.mock.calls.map((call) => call[1] as number)
}

const getTextTops = (textSpy: MockInstance) => {
    return textSpy.mock.calls.map((call) => call[2] as number)
}
