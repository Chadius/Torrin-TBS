import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { ButtonStatus } from "../buttonStatus"
import { RectArea, RectAreaService } from "../../rectArea"
import { MouseButton } from "../../../utils/mouseConfig"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import {
    ButtonLogic,
    ButtonStatusChangeEvent,
    ButtonStatusChangeEventByButtonId,
} from "./base"
import { ButtonLogicChangeOnRelease } from "./buttonLogicChangeOnRelease"

describe("Button Logic Change on Release", () => {
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
            button = new ButtonLogicChangeOnRelease({
                dataBlob,
            })
        })
        it("Has a default status of Ready", () => {
            expect(button.status).toEqual(ButtonStatus.READY)
        })
    })

    describe("Changing the button status", () => {
        let dateSpy: MockInstance
        let button: ButtonLogicChangeOnRelease

        beforeEach(() => {
            dateSpy = vi.spyOn(Date, "now").mockImplementation(() => 0)
            button = new ButtonLogicChangeOnRelease({
                dataBlob,
            })
        })

        afterEach(() => {
            dateSpy.mockRestore()
        })

        it("When created should have no timestamp for last change", () => {
            expect(button.lastStatusChangeTimeStamp).toBeUndefined()
        })

        it("Can change the button status and record when the status changed", () => {
            button.changeStatus({
                buttonId: "new button",
                newStatus: ButtonStatus.HOVER,
            })
            expect(button.status).toEqual(ButtonStatus.HOVER)
            expect(button.lastStatusChangeTimeStamp).toEqual(0)
            expect(dateSpy).toBeCalled()
        })

        it("Will not reset the timer if the status is unchanged", () => {
            expect(button.status).toEqual(ButtonStatus.READY)
            button.changeStatus({
                buttonId: "new button",
                newStatus: ButtonStatus.READY,
            })
            expect(button.lastStatusChangeTimeStamp).toBeUndefined()
            expect(dateSpy).not.toBeCalled()
        })
    })

    describe("Mouse interaction", () => {
        let button: ButtonLogicChangeOnRelease
        let changeStatusSpy: MockInstance

        beforeEach(() => {
            button = new ButtonLogicChangeOnRelease({
                dataBlob,
            })
            changeStatusSpy = vi.spyOn(button, "changeStatus")
        })

        afterEach(() => {
            changeStatusSpy.mockRestore()
        })

        it("moving the mouse over an ready button makes it hover", () => {
            button.mouseMoved({
                buttonId: "new button",
                mouseLocation: {
                    x: 15,
                    y: 35,
                },
                buttonArea,
            })
            expect(button.status).toEqual(ButtonStatus.HOVER)
            expect(changeStatusSpy).toHaveBeenCalled()
        })

        it("moving the mouse away from a hovering button makes it ready", () => {
            button.status = ButtonStatus.HOVER
            button.mouseMoved({
                buttonId: "new button",
                mouseLocation: {
                    x: 9001,
                    y: -9001,
                },
                buttonArea,
            })
            expect(button.status).toEqual(ButtonStatus.READY)
            expect(changeStatusSpy).toHaveBeenCalled()
        })

        it("disabled buttons ignore mouse movement", () => {
            button.status = ButtonStatus.DISABLED
            button.mouseMoved({
                buttonId: "new button",
                mouseLocation: {
                    x: 15,
                    y: 35,
                },
                buttonArea,
            })
            expect(button.status).toEqual(ButtonStatus.DISABLED)
            expect(changeStatusSpy).not.toHaveBeenCalled()
        })

        describe("clicking the button", () => {
            it("will change from Ready to Active when clicked", () => {
                button.mousePressed({
                    buttonId: "new button",
                    mousePress: {
                        button: MouseButton.ACCEPT,
                        x: 15,
                        y: 35,
                    },
                    buttonArea,
                })
                expect(button.status).toEqual(ButtonStatus.ACTIVE)
                expect(changeStatusSpy).toHaveBeenCalled()
            })

            it("will change from Hover to Active when clicked", () => {
                button.status = ButtonStatus.HOVER
                button.mousePressed({
                    buttonId: "new button",
                    mousePress: {
                        button: MouseButton.ACCEPT,
                        x: 15,
                        y: 35,
                    },
                    buttonArea,
                })
                expect(button.status).toEqual(ButtonStatus.ACTIVE)
                expect(changeStatusSpy).toHaveBeenCalled()
            })

            it("will not change if not clicking on a button", () => {
                button.mousePressed({
                    buttonId: "new button",
                    mousePress: {
                        button: MouseButton.ACCEPT,
                        x: 9001,
                        y: -9001,
                    },
                    buttonArea,
                })
                expect(button.status).toEqual(ButtonStatus.READY)
                expect(changeStatusSpy).not.toHaveBeenCalled()
            })
        })

        describe("releasing the button", () => {
            it("will change from Active to Hover when released since you are over the button", () => {
                button.status = ButtonStatus.ACTIVE
                button.mouseReleased({
                    buttonId: "new button",
                    mouseRelease: {
                        button: MouseButton.ACCEPT,
                        x: 15,
                        y: 35,
                    },
                    buttonArea,
                })
                expect(button.status).toEqual(ButtonStatus.HOVER)
                expect(changeStatusSpy).toHaveBeenCalled()
            })

            it("will change from Active to Ready when released since you are not over the button", () => {
                button.status = ButtonStatus.ACTIVE
                button.mouseReleased({
                    buttonId: "new button",
                    mouseRelease: {
                        button: MouseButton.ACCEPT,
                        x: -9001,
                        y: 9001,
                    },
                    buttonArea,
                })
                expect(button.status).toEqual(ButtonStatus.READY)
                expect(changeStatusSpy).toHaveBeenCalled()
            })

            it("will change not change if it was not active when you released", () => {
                button.mouseReleased({
                    buttonId: "new button",
                    mouseRelease: {
                        button: MouseButton.ACCEPT,
                        x: 15,
                        y: 35,
                    },
                    buttonArea,
                })
                expect(button.status).toEqual(ButtonStatus.READY)
                expect(changeStatusSpy).not.toHaveBeenCalled()
            })
        })
    })

    describe("Send messages when status changes", () => {
        let buttonLogic: ButtonLogicChangeOnRelease
        beforeEach(() => {
            buttonLogic = new ButtonLogicChangeOnRelease({
                dataBlob,
            })
        })

        const getButtonStatusChangeEvent = () => {
            return DataBlobService.get<ButtonStatusChangeEvent>(
                dataBlob,
                "new button"
            )
        }

        it("sends a message when the status is changed manually", () => {
            buttonLogic.changeStatus({
                buttonId: "new button",
                newStatus: ButtonStatus.DISABLED,
            })
            expect(buttonLogic.status).toEqual(ButtonStatus.DISABLED)
            const buttonStatusChangeEvent = getButtonStatusChangeEvent()
            expect(buttonStatusChangeEvent).toEqual({
                previousStatus: ButtonStatus.READY,
                newStatus: ButtonStatus.DISABLED,
            })
        })
        it("sends a message with a mouse location when switching to HOVER", () => {
            buttonLogic.mouseMoved({
                buttonId: "new button",
                mouseLocation: {
                    x: 15,
                    y: 35,
                },
                buttonArea,
            })
            expect(buttonLogic.status).toEqual(ButtonStatus.HOVER)
            const buttonStatusChangeEvent = getButtonStatusChangeEvent()
            expect(buttonStatusChangeEvent).toEqual({
                previousStatus: ButtonStatus.READY,
                newStatus: ButtonStatus.HOVER,
                mouseLocation: {
                    x: 15,
                    y: 35,
                },
            })
        })
        it("sends a message with a mouse location when switching to READY", () => {
            buttonLogic.status = ButtonStatus.HOVER
            buttonLogic.mouseMoved({
                buttonId: "new button",
                mouseLocation: {
                    x: 9001,
                    y: -9001,
                },
                buttonArea,
            })
            expect(buttonLogic.status).toEqual(ButtonStatus.READY)
            const buttonStatusChangeEvent = getButtonStatusChangeEvent()
            expect(buttonStatusChangeEvent).toEqual({
                previousStatus: ButtonStatus.HOVER,
                newStatus: ButtonStatus.READY,
                mouseLocation: {
                    x: 9001,
                    y: -9001,
                },
            })
        })
        it("sends a message with a mouse click when switching to ACTIVE", () => {
            buttonLogic.status = ButtonStatus.HOVER
            buttonLogic.mousePressed({
                buttonId: "new button",
                mousePress: {
                    button: MouseButton.ACCEPT,
                    x: 15,
                    y: 35,
                },
                buttonArea,
            })
            expect(buttonLogic.status).toEqual(ButtonStatus.ACTIVE)
            const buttonStatusChangeEvent = getButtonStatusChangeEvent()
            expect(buttonStatusChangeEvent).toEqual({
                previousStatus: ButtonStatus.HOVER,
                newStatus: ButtonStatus.ACTIVE,
                mousePress: {
                    button: MouseButton.ACCEPT,
                    x: 15,
                    y: 35,
                },
            })
        })
        it("sends a message with a mouse release when switching to READY", () => {
            buttonLogic.status = ButtonStatus.ACTIVE
            buttonLogic.mouseReleased({
                buttonId: "new button",
                mouseRelease: {
                    button: MouseButton.ACCEPT,
                    x: 15,
                    y: 35,
                },
                buttonArea,
            })
            expect(buttonLogic.status).toEqual(ButtonStatus.HOVER)
            const buttonStatusChangeEvent = getButtonStatusChangeEvent()
            expect(buttonStatusChangeEvent).toEqual({
                previousStatus: ButtonStatus.ACTIVE,
                newStatus: ButtonStatus.HOVER,
                mouseRelease: {
                    button: MouseButton.ACCEPT,
                    x: 15,
                    y: 35,
                },
            })
        })
        it("can also clear messages once consumed", () => {
            buttonLogic.mouseMoved({
                buttonId: "new button",
                mouseLocation: {
                    x: 15,
                    y: 35,
                },
                buttonArea,
            })
            buttonLogic.clearStatus({ buttonId: "new button" })
            const buttonStatusChangeEvent = getButtonStatusChangeEvent()
            expect(buttonStatusChangeEvent).toBeUndefined()
        })
    })
})
