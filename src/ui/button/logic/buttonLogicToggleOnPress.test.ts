import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { ButtonStatus, TButtonStatus } from "../buttonStatus"
import { RectArea, RectAreaService } from "../../rectArea"
import { MouseButton } from "../../../utils/mouseConfig"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { ButtonLogic, ButtonStatusChangeEventByButtonId } from "./base"
import { ButtonLogicToggleOnPress } from "./ButtonLogicToggleOnPress"
import { CommonButtonLogicTests } from "./commonButtonLogicTests"

describe("Button Logic Toggle On Press", () => {
    let dataBlob: ButtonStatusChangeEventByButtonId
    let buttonArea: RectArea

    beforeEach(() => {
        dataBlob = DataBlobService.new()
        buttonArea = RectAreaService.new({
            left: 10,
            right: 20,
            top: 30,
            bottom: 40,
        })
    })

    describe("new button", () => {
        let button: ButtonLogic
        beforeEach(() => {
            button = new ButtonLogicToggleOnPress({
                dataBlob,
            })
        })
        it("Has a default status of Toggle Off", () => {
            expect(button.status).toEqual(ButtonStatus.TOGGLE_OFF)
        })
    })

    describe("Mouse interaction", () => {
        let buttonLogic: ButtonLogicToggleOnPress
        let changeStatusSpy: MockInstance

        beforeEach(() => {
            buttonLogic = new ButtonLogicToggleOnPress({
                dataBlob,
            })
            changeStatusSpy = vi.spyOn(buttonLogic, "changeStatus")
        })

        afterEach(() => {
            changeStatusSpy.mockRestore()
        })

        describe("will not change status if not clicking on the buttonLogic", () => {
            const buttonTests = [
                {
                    currentStatus: ButtonStatus.TOGGLE_OFF,
                },
                {
                    currentStatus: ButtonStatus.TOGGLE_ON,
                },
            ]

            it.each(buttonTests)(`$currentStatus`, ({ currentStatus }) => {
                buttonLogic.changeStatus({
                    buttonId: "new buttonLogic",
                    newStatus: currentStatus,
                })
                changeStatusSpy.mockClear()
                buttonLogic.mousePressed({
                    buttonId: "new buttonLogic",
                    mousePress: {
                        x: 9001,
                        y: -9001,
                        button: MouseButton.ACCEPT,
                    },
                    buttonArea,
                })

                expect(buttonLogic.status).toEqual(currentStatus)
                expect(changeStatusSpy).not.toHaveBeenCalled()
            })
        })

        describe("change to the HOVER-based status when the mouse hovers over it", () => {
            const buttonTests = [
                {
                    currentStatus: ButtonStatus.TOGGLE_OFF,
                    expectedStatus: ButtonStatus.TOGGLE_OFF_HOVER,
                },
                {
                    currentStatus: ButtonStatus.TOGGLE_ON,
                    expectedStatus: ButtonStatus.TOGGLE_ON_HOVER,
                },
            ]

            it.each(buttonTests)(
                `$currentStatus to $expectedStatus`,
                ({ currentStatus, expectedStatus }) => {
                    buttonLogic.changeStatus({
                        buttonId: "new button",
                        newStatus: currentStatus,
                    })

                    buttonLogic.mouseMoved({
                        buttonId: "new button",
                        mouseLocation: {
                            x: 15,
                            y: 35,
                        },
                        buttonArea,
                    })

                    expect(buttonLogic.status).toEqual(expectedStatus)
                    expect(changeStatusSpy).toHaveBeenCalled()
                }
            )
        })

        describe("changes away from the HOVER-based status when the mouse moves away from it", () => {
            const buttonTests = [
                {
                    currentStatus: ButtonStatus.TOGGLE_OFF_HOVER,
                    expectedStatus: ButtonStatus.TOGGLE_OFF,
                },
                {
                    currentStatus: ButtonStatus.TOGGLE_ON_HOVER,
                    expectedStatus: ButtonStatus.TOGGLE_ON,
                },
            ]

            it.each(buttonTests)(
                `$currentStatus to $expectedStatus`,
                ({ currentStatus, expectedStatus }) => {
                    buttonLogic.changeStatus({
                        buttonId: "new button",
                        newStatus: currentStatus,
                    })

                    buttonLogic.mouseMoved({
                        buttonId: "new button",
                        mouseLocation: {
                            x: 9001,
                            y: -9001,
                        },
                        buttonArea,
                    })

                    expect(buttonLogic.status).toEqual(expectedStatus)
                    expect(changeStatusSpy).toHaveBeenCalled()
                }
            )
        })

        describe("change toggle state when the mouse presses on it", () => {
            const buttonTests = [
                {
                    currentStatus: ButtonStatus.TOGGLE_OFF_HOVER,
                    expectedStatus: ButtonStatus.TOGGLE_ON_HOVER,
                },
                {
                    currentStatus: ButtonStatus.TOGGLE_ON_HOVER,
                    expectedStatus: ButtonStatus.TOGGLE_OFF_HOVER,
                },
                {
                    currentStatus: ButtonStatus.TOGGLE_ON,
                    expectedStatus: ButtonStatus.TOGGLE_OFF,
                },
                {
                    currentStatus: ButtonStatus.TOGGLE_OFF,
                    expectedStatus: ButtonStatus.TOGGLE_ON,
                },
            ]

            it.each(buttonTests)(
                `$currentStatus will switch to $expectedStatus when the mouse presses on it`,
                ({ currentStatus, expectedStatus }) => {
                    buttonLogic.changeStatus({
                        buttonId: "new buttonLogic",
                        newStatus: currentStatus,
                    })
                    changeStatusSpy.mockClear()
                    buttonLogic.mousePressed({
                        buttonId: "new buttonLogic",
                        mousePress: {
                            x: 15,
                            y: 35,
                            button: MouseButton.ACCEPT,
                        },
                        buttonArea,
                    })
                    expect(buttonLogic.status).toEqual(expectedStatus)
                    expect(changeStatusSpy).toHaveBeenCalled()
                }
            )
        })

        describe("disabled buttons ignore all interaction", () => {
            it(`will remain DISABLED when the mouse hovers over it`, () => {
                buttonLogic.changeStatus({
                    buttonId: "new buttonLogic",
                    newStatus: ButtonStatus.DISABLED,
                })
                changeStatusSpy.mockClear()
                buttonLogic.mouseMoved({
                    buttonId: "new buttonLogic",
                    mouseLocation: {
                        x: 15,
                        y: 35,
                    },
                    buttonArea,
                })

                expect(buttonLogic.status).toEqual(ButtonStatus.DISABLED)
                expect(changeStatusSpy).not.toHaveBeenCalled()
            })
            it(`will remain DISABLED when the mouse presses on it`, () => {
                buttonLogic.changeStatus({
                    buttonId: "new buttonLogic",
                    newStatus: ButtonStatus.DISABLED,
                })
                changeStatusSpy.mockClear()
                buttonLogic.mousePressed({
                    buttonId: "new buttonLogic",
                    mousePress: {
                        x: 15,
                        y: 35,
                        button: MouseButton.ACCEPT,
                    },
                    buttonArea,
                })

                expect(buttonLogic.status).toEqual(ButtonStatus.DISABLED)
                expect(changeStatusSpy).not.toHaveBeenCalled()
            })
        })
    })

    describe("valid button states", () => {
        let buttonLogic: ButtonLogicToggleOnPress
        const validStatuses: TButtonStatus[] = [
            ButtonStatus.TOGGLE_OFF,
            ButtonStatus.TOGGLE_ON,
            ButtonStatus.TOGGLE_OFF_HOVER,
            ButtonStatus.TOGGLE_ON_HOVER,
            ButtonStatus.DISABLED,
        ]

        beforeEach(() => {
            buttonLogic = new ButtonLogicToggleOnPress({
                dataBlob,
            })
        })

        it("can change to valid statuses", () => {
            expect(
                CommonButtonLogicTests.canChangeToValidStatuses({
                    validStatuses,
                    buttonLogic,
                    buttonId: "new buttonLogic",
                })
            ).toBeTruthy()
        })

        it("sends a message when the status is changed", () => {
            expect(
                CommonButtonLogicTests.willSendAMessageWhenTheStatusIsChanged({
                    buttonId: "new button",
                    dataBlob,
                    buttonLogic,
                })
            ).toBeTruthy()
        })

        it("will ignore invalid states", () => {
            expect(
                CommonButtonLogicTests.willIgnoreInvalidStatuses({
                    validStatuses,
                    buttonLogic,
                    buttonId: "new buttonLogic",
                })
            ).toBeTruthy()
        })
    })
})
