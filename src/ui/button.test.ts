import { Button, ButtonStatus } from "./button"
import { LabelService } from "./label"
import { RectAreaService } from "./rectArea"

describe("Button UI", () => {
    it("defaults to ready status", () => {
        const button = new Button({
            readyLabel: LabelService.new({
                area: undefined,
                textBoxMargin: undefined,
                text: "ready",
                textSize: 8,
                fontColor: [],
            }),
        })

        expect(button.getStatus()).toBe(ButtonStatus.READY)
    })

    it("can change initial status", () => {
        const button = new Button({
            readyLabel: LabelService.new({
                area: undefined,
                textBoxMargin: undefined,
                text: "should be active",
                textSize: 8,
                fontColor: [],
            }),
            initialStatus: ButtonStatus.ACTIVE,
        })

        expect(button.getStatus()).toBe(ButtonStatus.ACTIVE)
    })

    it("can change status", () => {
        const button = new Button({
            readyLabel: LabelService.new({
                area: undefined,
                textBoxMargin: undefined,
                text: "active then ready",
                textSize: 8,
                fontColor: [],
            }),
            initialStatus: ButtonStatus.ACTIVE,
        })

        button.setStatus(ButtonStatus.READY)

        expect(button.getStatus()).toBe(ButtonStatus.READY)
    })

    it("can react to button clicks", () => {
        const buttonHandler = jest.fn()
        const callerObject = jest.fn()

        const button = new Button({
            readyLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "go button handler",
                textSize: 8,
                fontColor: [],
            }),
            onClickHandler: buttonHandler,
        })

        button.mouseClicked(0, 0, callerObject)
        expect(buttonHandler).not.toBeCalled()

        button.mouseClicked(50, 100, callerObject)
        expect(buttonHandler).toBeCalledTimes(1)
        expect(buttonHandler).toBeCalledWith(50, 100, button, callerObject)
    })

    it("can react to button clicks even if in hover state", () => {
        const buttonHandler = jest.fn()
        const callerObject = jest.fn()

        const button = new Button({
            readyLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "go button handler",
                textSize: 8,
                fontColor: [],
            }),
            hoverLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "you are hovering over this",
                textSize: 8,
                fontColor: [],
            }),
            onClickHandler: buttonHandler,
        })

        button.mouseMoved(50, 100, callerObject)
        expect(button.getStatus()).toBe(ButtonStatus.HOVER)

        button.mouseClicked(50, 100, callerObject)
        expect(buttonHandler).toBeCalledTimes(1)
        expect(buttonHandler).toBeCalledWith(50, 100, button, callerObject)
    })

    it("can disable the button and ignore mouse clicks", () => {
        const buttonHandler = jest.fn()
        const callerObject = jest.fn()

        const button = new Button({
            readyLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "disabled",
                textSize: 8,
                fontColor: [],
            }),
            onClickHandler: buttonHandler,
            initialStatus: ButtonStatus.DISABLED,
        })

        expect(button.getStatus()).toBe(ButtonStatus.DISABLED)

        button.mouseClicked(50, 100, callerObject)
        expect(buttonHandler).not.toBeCalled()
    })

    it("can enter hovered state if the mouse hovers over the button and it has a hover label", () => {
        const buttonHandler = jest.fn()
        const callerObject = jest.fn()

        const button = new Button({
            readyLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "go button handler",
                textSize: 8,
                fontColor: [],
            }),
            hoverLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "you are hovering over this",
                textSize: 8,
                fontColor: [],
            }),
            onMoveHandler: buttonHandler,
        })

        button.mouseMoved(0, 0, callerObject)
        expect(buttonHandler).not.toBeCalled()

        button.mouseMoved(50, 100, callerObject)
        expect(buttonHandler).toBeCalledTimes(1)
        expect(buttonHandler).toBeCalledWith(50, 100, button, callerObject)
        expect(button.getStatus()).toBe(ButtonStatus.HOVER)
    })

    it("cannot enter hovered state if the mouse hovers over the button, and it does not have a hover label", () => {
        const buttonHandler = jest.fn()
        const callerObject = jest.fn()

        const button = new Button({
            readyLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "go button handler",
                textSize: 8,
                fontColor: [],
            }),
            onMoveHandler: buttonHandler,
            initialStatus: ButtonStatus.ACTIVE,
        })

        button.mouseMoved(50, 100, callerObject)
        expect(buttonHandler).not.toBeCalled()
        expect(button.getStatus()).toBe(ButtonStatus.ACTIVE)
    })

    it("cannot enter hovered state if the button is disabled, even if the button has a hover label and the mouse hovers over the button", () => {
        const buttonHandler = jest.fn()
        const callerObject = jest.fn()

        const button = new Button({
            readyLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "go button handler",
                textSize: 8,
                fontColor: [],
            }),
            hoverLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "you are hovering over this",
                textSize: 8,
                fontColor: [],
            }),
            onMoveHandler: buttonHandler,
            initialStatus: ButtonStatus.DISABLED,
        })

        button.mouseMoved(50, 100, callerObject)
        expect(buttonHandler).not.toBeCalled()
        expect(button.getStatus()).toBe(ButtonStatus.DISABLED)
    })

    it("cannot enter hovered state if the button is active, even if the button has a hover label and the mouse hovers over the button", () => {
        const buttonHandler = jest.fn()
        const callerObject = jest.fn()

        const button = new Button({
            readyLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "go button handler",
                textSize: 8,
                fontColor: [],
            }),
            hoverLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "you are hovering over this",
                textSize: 8,
                fontColor: [],
            }),
            onMoveHandler: buttonHandler,
            initialStatus: ButtonStatus.ACTIVE,
        })

        button.mouseMoved(50, 100, callerObject)
        expect(buttonHandler).not.toBeCalled()
        expect(button.getStatus()).toBe(ButtonStatus.ACTIVE)
    })

    it("can revert to hovered state if the mouse was hovering over the button and then it moves away", () => {
        const callerObject = jest.fn()

        const button = new Button({
            readyLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "go button handler",
                textSize: 8,
                fontColor: [],
            }),
            hoverLabel: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 25,
                    right: 100,
                    bottom: 150,
                }),
                textBoxMargin: undefined,
                text: "you are hovering over this",
                textSize: 8,
                fontColor: [],
            }),
        })

        button.mouseMoved(0, 0, callerObject)
        expect(button.getStatus()).toBe(ButtonStatus.READY)

        button.mouseMoved(50, 100, callerObject)
        expect(button.getStatus()).toBe(ButtonStatus.HOVER)

        button.mouseMoved(0, 0, callerObject)
        expect(button.getStatus()).toBe(ButtonStatus.READY)
    })
})
