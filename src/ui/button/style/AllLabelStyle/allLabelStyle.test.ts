import { RectAreaService } from "../../../rectArea"
import { MockedP5GraphicsBuffer } from "../../../../utils/test/mocks"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import { Label, LabelService } from "../../../label"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { ButtonStatus } from "../../buttonStatus"
import {
    AllLabelButtonDataBlob,
    AllLabelButtonDrawTask,
    AllLabelButtonUIObjects,
} from "./allLabelStyle"
import {
    ButtonLogic,
    ButtonStatusChangeEventByButtonId,
} from "../../logic/base"
import { DataBlobService } from "../../../../utils/dataBlob/dataBlob"

describe("All Label Button Style", () => {
    let button: ButtonLogic
    let dataBlob: AllLabelButtonDataBlob
    let graphicsContext: MockedP5GraphicsBuffer
    let labelServiceSpy: MockInstance
    let buttonWithAllLabelDrawTask: AllLabelButtonDrawTask
    let labelByButtonStatus: {
        [s in ButtonStatus]: Label
    }

    beforeEach(() => {
        graphicsContext = new MockedP5GraphicsBuffer()
        labelServiceSpy = vi.spyOn(LabelService, "draw")

        labelByButtonStatus = {
            [ButtonStatus.READY]: LabelService.new({
                area: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: 20,
                    height: 10,
                }),
                text: "Ready",
                textBoxMargin: undefined,
                fontColor: [0, 0, 0],
                fontSize: 10,
            }),
            [ButtonStatus.HOVER]: LabelService.new({
                area: RectAreaService.new({
                    left: 10,
                    top: 10,
                    width: 30,
                    height: 20,
                }),
                text: "Hover",
                textBoxMargin: undefined,
                fontColor: [0, 0, 0],
                fontSize: 10,
            }),
            [ButtonStatus.ACTIVE]: LabelService.new({
                area: RectAreaService.new({
                    left: 20,
                    top: 20,
                    width: 30,
                    height: 20,
                }),
                text: "Active",
                textBoxMargin: undefined,
                fontColor: [0, 0, 0],
                fontSize: 10,
            }),
            [ButtonStatus.DISABLED]: LabelService.new({
                area: RectAreaService.new({
                    left: 30,
                    top: 30,
                    width: 30,
                    height: 20,
                }),
                text: "Disabled",
                textBoxMargin: undefined,
                fontColor: [0, 0, 0],
                fontSize: 10,
            }),
        }
        dataBlob = {
            data: {
                layout: {
                    labelByButtonStatus,
                },
            },
        }
        DataBlobService.add<GraphicsBuffer>(
            dataBlob,
            "graphicsContext",
            graphicsContext
        )
        button = new TestButtonLogic()
        buttonWithAllLabelDrawTask = new AllLabelButtonDrawTask({
            dataBlob: dataBlob,
            buttonLogic: button,
        })
    })

    afterEach(() => {
        labelServiceSpy.mockRestore()
    })

    describe("draw the label with the corresponding status", () => {
        const tests = [
            {
                buttonStatus: ButtonStatus.READY,
            },
            {
                buttonStatus: ButtonStatus.HOVER,
            },
            {
                buttonStatus: ButtonStatus.ACTIVE,
            },
            {
                buttonStatus: ButtonStatus.DISABLED,
            },
        ]

        it.each(tests)(`$buttonStatus`, ({ buttonStatus }) => {
            button.status = buttonStatus
            buttonWithAllLabelDrawTask.run()
            expect(labelServiceSpy).toHaveBeenCalledWith(
                labelByButtonStatus[buttonStatus],
                graphicsContext
            )
        })
    })

    describe("getArea returns the area of the label with the corresponding status", () => {
        const tests = [
            {
                buttonStatus: ButtonStatus.READY,
            },
            {
                buttonStatus: ButtonStatus.HOVER,
            },
            {
                buttonStatus: ButtonStatus.ACTIVE,
            },
            {
                buttonStatus: ButtonStatus.DISABLED,
            },
        ]

        it.each(tests)(`$buttonStatus`, ({ buttonStatus }) => {
            button.status = buttonStatus
            const area = buttonWithAllLabelDrawTask.getArea()

            let uiObjects = DataBlobService.get<AllLabelButtonUIObjects>(
                buttonWithAllLabelDrawTask.dataBlob,
                "uiObjects"
            )

            expect(RectAreaService.left(area)).toEqual(
                RectAreaService.left(
                    uiObjects.buttonLabelsByStatus[buttonStatus].rectangle.area
                )
            )
            expect(RectAreaService.top(area)).toEqual(
                RectAreaService.top(
                    uiObjects.buttonLabelsByStatus[buttonStatus].rectangle.area
                )
            )
            expect(RectAreaService.right(area)).toEqual(
                RectAreaService.right(
                    uiObjects.buttonLabelsByStatus[buttonStatus].rectangle.area
                )
            )
            expect(RectAreaService.bottom(area)).toEqual(
                RectAreaService.bottom(
                    uiObjects.buttonLabelsByStatus[buttonStatus].rectangle.area
                )
            )
        })
    })
})

class TestButtonLogic implements ButtonLogic {
    status: ButtonStatus
    lastStatusChangeTimeStamp: number
    buttonStatusChangeEventData: ButtonStatusChangeEventByButtonId

    constructor() {
        this.status = ButtonStatus.READY
    }
}
