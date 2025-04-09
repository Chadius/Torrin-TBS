import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { Button } from "./button"
import { ButtonLogicChangeOnRelease } from "./logic/buttonLogicChangeOnRelease"
import { ButtonStatus } from "./buttonStatus"
import { RectArea, RectAreaService } from "../rectArea"
import { MouseButton } from "../../utils/mouseConfig"
import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { ButtonStyle } from "./style/buttonStyle"

describe("button", () => {
    let button: Button

    describe("passes logic calls to the logic", () => {
        let logic: ButtonLogicChangeOnRelease
        let logicSpy: MockInstance
        let getAreaSpy: MockInstance

        beforeEach(() => {
            logic = new ButtonLogicChangeOnRelease({
                dataBlob: {
                    data: {},
                },
            })

            const testButtonStyle = new TestButtonStyle(DataBlobService.new())
            button = new Button({
                id: "new button",
                buttonLogic: logic,
                drawTask: testButtonStyle,
            })

            getAreaSpy = vi.spyOn(testButtonStyle, "getArea")
        })

        afterEach(() => {
            if (logicSpy) logicSpy.mockRestore()
            if (getAreaSpy) getAreaSpy.mockRestore()
        })

        it("changeStatus", () => {
            logicSpy = vi.spyOn(logic, "changeStatus")
            button.changeStatus({
                newStatus: ButtonStatus.DISABLED,
            })
            expect(logicSpy).toBeCalled()
        })
        it("mouseMoved", () => {
            logicSpy = vi.spyOn(logic, "mouseMoved")
            button.mouseMoved({
                mouseLocation: { x: 9001, y: -9001 },
            })
            expect(logicSpy).toBeCalled()
            expect(getAreaSpy).toBeCalled()
        })
        it("mousePressed", () => {
            logicSpy = vi.spyOn(logic, "mousePressed")
            button.mousePressed({
                mousePress: { x: 9001, y: -9001, button: MouseButton.NONE },
            })
            expect(logicSpy).toBeCalled()
            expect(getAreaSpy).toBeCalled()
        })
        it("mouseReleased", () => {
            logicSpy = vi.spyOn(logic, "mouseReleased")
            button.mouseReleased({
                mouseRelease: { x: 9001, y: -9001, button: MouseButton.NONE },
            })
            expect(logicSpy).toBeCalled()
            expect(getAreaSpy).toBeCalled()
        })
    })

    describe("Drawing", () => {
        let drawTask: ButtonStyle

        beforeEach(() => {
            drawTask = new TestButtonStyle(DataBlobService.new())
            const logic = new ButtonLogicChangeOnRelease({
                dataBlob: {
                    data: {},
                },
            })
            button = new Button({
                id: "new button",
                buttonLogic: logic,
                drawTask: drawTask,
            })
        })

        it("runs the provided drawing task using the provided data", () => {
            const drawTaskSpy = vi.spyOn(drawTask, "run")
            button.draw()
            expect(drawTaskSpy).toBeCalled()
            drawTaskSpy.mockRestore()
        })

        it("can get the area", () => {
            expect(button.getArea()).toEqual(button.buttonStyle.getArea())
        })
    })

    describe("change button status", () => {
        beforeEach(() => {
            button = new Button({
                id: "new button",
                buttonLogic: new ButtonLogicChangeOnRelease({
                    dataBlob: {
                        data: {},
                    },
                }),
                drawTask: new TestButtonStyle(DataBlobService.new()),
            })
            button.changeStatus({
                newStatus: ButtonStatus.DISABLED,
            })
        })

        it("can get the button logic status", () => {
            expect(button.getStatus()).toEqual(ButtonStatus.DISABLED)
        })

        it("can get the change event", () => {
            expect(button.getStatusChangeEvent()).toEqual({
                newStatus: ButtonStatus.DISABLED,
                previousStatus: ButtonStatus.READY,
            })
        })

        it("can clear the change event", () => {
            button.clearStatus()
            expect(button.getStatusChangeEvent()).toBeUndefined()
        })
    })
})

export class TestButtonStyle implements ButtonStyle {
    dataBlob: DataBlob
    rectArea: RectArea

    constructor(dataBlob: DataBlob, rectArea?: RectArea) {
        this.dataBlob = dataBlob
        this.rectArea =
            rectArea ??
            RectAreaService.new({
                left: 0,
                top: 0,
                right: 10,
                bottom: 10,
            })
    }

    getArea(): RectArea {
        return this.rectArea
    }

    run(): boolean {
        return true
    }

    clone: () => BehaviorTreeTask
}
