import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { RollResultService } from "../../calculator/actionCalculator/rollResult"
import { RectAreaService } from "../../../ui/rectArea"
import {
    DiceRollAnimation,
    DiceRollAnimationService,
} from "./diceRollAnimation"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../utils/test/mocks"
import {
    DegreeOfSuccess,
    TDegreeOfSuccess,
} from "../../calculator/actionCalculator/degreeOfSuccess"

describe("die roll animation", () => {
    let dateSpy: MockInstance

    beforeEach(() => {
        dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
    })

    afterEach(() => {
        dateSpy.mockRestore()
    })

    describe("creation", () => {
        it("does not create dice if none are rolled", () => {
            const animation = createAnimation({
                occurred: false,
                degreeOfSuccess: DegreeOfSuccess.NONE,
            })
            expect(animation.dice).toHaveLength(0)
        })
        it("creates an object for each die rolled", () => {
            const animation = createAnimation({
                occurred: true,
                rolls: [1, 2],
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })
            expect(animation.dice).toHaveLength(2)
        })
    })

    describe("animation over time", () => {
        let mockGraphicsContext: MockedP5GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }

        beforeEach(() => {
            mockGraphicsContext = new MockedP5GraphicsBuffer()
            graphicsBufferSpies =
                MockedGraphicsBufferService.addSpies(mockGraphicsContext)
        })

        afterEach(() => {
            MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
        })

        it("At the start no text is drawn", () => {
            const animation = createAnimation({
                occurred: false,
                degreeOfSuccess: DegreeOfSuccess.NONE,
            })
            dateSpy.mockReturnValue(0)
            DiceRollAnimationService.draw({
                diceRollAnimation: animation,
                graphicsBuffer: mockGraphicsContext,
            })
            expect(graphicsBufferSpies["text"]).not.toBeCalled()
            expect(dateSpy).toBeCalled()
        })

        describe("First die appears first", () => {
            let animation: DiceRollAnimation
            beforeEach(() => {
                animation = createAnimation({
                    occurred: true,
                    rolls: [1, 2],
                    degreeOfSuccess: DegreeOfSuccess.FAILURE,
                })
                dateSpy.mockReturnValue(0)
                DiceRollAnimationService.draw({
                    diceRollAnimation: animation,
                    graphicsBuffer: mockGraphicsContext,
                })
                dateSpy.mockReturnValue(
                    DiceRollAnimationService.FIRST_DIE_ANIMATION_TIME_MS
                )
                DiceRollAnimationService.draw({
                    diceRollAnimation: animation,
                    graphicsBuffer: mockGraphicsContext,
                })
            })

            it("First die settles after a period of time", () => {
                expect(graphicsBufferSpies["text"]).toBeCalledWith(
                    "1",
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    expect.anything()
                )
                expect(dateSpy).toBeCalled()
            })
            it("Does not draw the second die", () => {
                expect(graphicsBufferSpies["text"]).not.toBeCalledWith(
                    "2",
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    expect.anything()
                )
            })
        })

        describe("Second die", () => {
            let animation: DiceRollAnimation
            beforeEach(() => {
                animation = createAnimation({
                    occurred: true,
                    rolls: [1, 2],
                    degreeOfSuccess: DegreeOfSuccess.FAILURE,
                })
                dateSpy.mockReturnValue(0)
                DiceRollAnimationService.draw({
                    diceRollAnimation: animation,
                    graphicsBuffer: mockGraphicsContext,
                })
                dateSpy.mockReturnValue(
                    DiceRollAnimationService.MORE_DICE_ANIMATION_TIME_MS
                )
                DiceRollAnimationService.draw({
                    diceRollAnimation: animation,
                    graphicsBuffer: mockGraphicsContext,
                })
            })

            it("Second die settles once enough time passes", () => {
                expect(graphicsBufferSpies["text"]).toBeCalledWith(
                    "2",
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    expect.anything()
                )
            })

            it("Second die is to the right of the first die", () => {
                const firstDieDraw = graphicsBufferSpies[
                    "text"
                ].mock.calls.find((call) => call[0] == "1")

                const secondDieDraw = graphicsBufferSpies[
                    "text"
                ].mock.calls.find((call) => call[0] == "2")
                expect(firstDieDraw?.length).toBeGreaterThan(0)
                expect(secondDieDraw?.length).toBeGreaterThan(0)
                if (firstDieDraw && secondDieDraw) {
                    expect(secondDieDraw[1]).toBeGreaterThan(firstDieDraw[1])
                }
            })
        })

        describe("Degree of Success and Text notifications", () => {
            type TestType = {
                expectedExtremeRollText: string | undefined
                degreeOfSuccessText: string
                degreeOfSuccess: TDegreeOfSuccess
                rolls: [number, number]
            }

            const extremeRollTests: TestType[] = [
                {
                    expectedExtremeRollText: "botch",
                    degreeOfSuccessText: "Critical Failure",
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
                    rolls: [1, 1],
                },
                {
                    expectedExtremeRollText: "MAX!",
                    degreeOfSuccessText: "Critical Success",
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
                    rolls: [6, 6],
                },
            ]

            const noExtremeTextTests: TestType[] = [
                {
                    expectedExtremeRollText: undefined,
                    degreeOfSuccessText: "Failure",
                    degreeOfSuccess: DegreeOfSuccess.FAILURE,
                    rolls: [1, 2],
                },
                {
                    expectedExtremeRollText: undefined,
                    degreeOfSuccessText: "Success",
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    rolls: [6, 5],
                },
            ]

            it.each([...extremeRollTests, ...noExtremeTextTests])(
                "$degreeOfSuccessText Does not draw a notification until after the notification time passes",
                ({
                    degreeOfSuccessText,
                    degreeOfSuccess,
                    expectedExtremeRollText,
                    rolls,
                }) => {
                    const animation = createAnimation({
                        occurred: true,
                        rolls,
                        degreeOfSuccess,
                    })
                    dateSpy.mockReturnValue(0)
                    DiceRollAnimationService.draw({
                        diceRollAnimation: animation,
                        graphicsBuffer: mockGraphicsContext,
                    })
                    dateSpy.mockReturnValue(
                        DiceRollAnimationService.MORE_DICE_ANIMATION_TIME_MS
                    )
                    DiceRollAnimationService.draw({
                        diceRollAnimation: animation,
                        graphicsBuffer: mockGraphicsContext,
                    })
                    expect(graphicsBufferSpies["text"]).not.toBeCalledWith(
                        expectedExtremeRollText,
                        expect.anything(),
                        expect.anything(),
                        expect.anything(),
                        expect.anything()
                    )
                    expect(graphicsBufferSpies["text"]).not.toBeCalledWith(
                        degreeOfSuccessText,
                        expect.anything(),
                        expect.anything(),
                        expect.anything(),
                        expect.anything()
                    )
                }
            )
            it.each([...extremeRollTests, ...noExtremeTextTests])(
                "$degreeOfSuccessText appears when time passes",
                ({
                    degreeOfSuccessText,
                    degreeOfSuccess,
                    expectedExtremeRollText,
                    rolls,
                }) => {
                    const animation = createAnimation({
                        occurred: true,
                        rolls,
                        degreeOfSuccess,
                    })
                    dateSpy.mockReturnValue(0)
                    DiceRollAnimationService.draw({
                        diceRollAnimation: animation,
                        graphicsBuffer: mockGraphicsContext,
                    })
                    dateSpy.mockReturnValue(
                        DiceRollAnimationService.SHOW_RESULT_ANIMATION_TIME_MS
                    )
                    DiceRollAnimationService.draw({
                        diceRollAnimation: animation,
                        graphicsBuffer: mockGraphicsContext,
                    })
                    if (expectedExtremeRollText) {
                        expect(graphicsBufferSpies["text"]).toBeCalledWith(
                            expectedExtremeRollText,
                            expect.anything(),
                            expect.anything(),
                            expect.anything(),
                            expect.anything()
                        )
                    }
                    expect(graphicsBufferSpies["text"]).toBeCalledWith(
                        degreeOfSuccessText,
                        expect.anything(),
                        expect.anything(),
                        expect.anything(),
                        expect.anything()
                    )
                }
            )
            it.each([...extremeRollTests])(
                "$degreeOfSuccessText shows the $expectedExtremeRollText to the left",
                ({
                    degreeOfSuccessText,
                    degreeOfSuccess,
                    expectedExtremeRollText,
                    rolls,
                }) => {
                    const animation = createAnimation({
                        occurred: true,
                        rolls,
                        degreeOfSuccess,
                    })
                    dateSpy.mockReturnValue(0)
                    DiceRollAnimationService.draw({
                        diceRollAnimation: animation,
                        graphicsBuffer: mockGraphicsContext,
                    })
                    dateSpy.mockReturnValue(
                        DiceRollAnimationService.SHOW_RESULT_ANIMATION_TIME_MS
                    )
                    DiceRollAnimationService.draw({
                        diceRollAnimation: animation,
                        graphicsBuffer: mockGraphicsContext,
                    })
                    const extremeRollTextCall = graphicsBufferSpies[
                        "text"
                    ].mock.calls.find(
                        (call) => call[0] == expectedExtremeRollText
                    )

                    const degreeOfSuccessTextCall = graphicsBufferSpies[
                        "text"
                    ].mock.calls.find((call) => call[0] == degreeOfSuccessText)

                    expect(extremeRollTextCall?.length).toBeGreaterThan(0)
                    expect(degreeOfSuccessTextCall?.length).toBeGreaterThan(0)
                    if (extremeRollTextCall && degreeOfSuccessTextCall) {
                        expect(extremeRollTextCall[1]).toBeLessThan(
                            degreeOfSuccessTextCall[1]
                        )
                    }
                }
            )
        })
    })
})

const createAnimation = ({
    occurred,
    rolls,
    degreeOfSuccess,
}: {
    occurred: boolean
    degreeOfSuccess: TDegreeOfSuccess
    rolls?: number[]
}): DiceRollAnimation => {
    return DiceRollAnimationService.new({
        degreeOfSuccess,
        rollResult: RollResultService.new({
            occurred,
            rolls,
        }),
        drawArea: RectAreaService.new({
            top: 0,
            left: 0,
            width: 100,
            height: 100,
        }),
    })
}
