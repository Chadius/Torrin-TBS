import {
    MousePress,
    MouseRelease,
    ScreenLocation,
} from "../../utils/mouseConfig"
import { TButtonStatus } from "./buttonStatus"
import {
    ButtonLogic,
    ButtonLogicClassFunctions,
    ButtonStatusChangeEvent,
} from "./logic/base"
import { ButtonStyle } from "./style/buttonStyle"
import { DataBlobService } from "../../utils/dataBlob/dataBlob"
import { RectArea } from "../rectArea"

export class Button implements ButtonLogicClassFunctions {
    id: string
    buttonStyle: ButtonStyle
    logic: ButtonLogic & ButtonLogicClassFunctions

    constructor({
        id,
        buttonLogic,
        drawTask,
    }: {
        id: string
        buttonLogic: ButtonLogic & ButtonLogicClassFunctions
        drawTask: ButtonStyle
    }) {
        this.id = id
        this.logic = buttonLogic
        this.buttonStyle = drawTask
    }

    changeStatus({
        newStatus,
        mouseLocation,
        mousePress,
        mouseRelease,
    }: {
        newStatus: TButtonStatus
        mouseLocation?: ScreenLocation
        mousePress?: MousePress
        mouseRelease?: MouseRelease
    }) {
        return this.logic.changeStatus({
            buttonId: this.id,
            newStatus,
            mouseLocation,
            mousePress,
            mouseRelease,
        })
    }

    mouseMoved({ mouseLocation }: { mouseLocation: ScreenLocation }) {
        this.logic.mouseMoved({
            buttonId: this.id,
            buttonArea: this.buttonStyle.getArea(),
            mouseLocation,
        })
    }

    mousePressed({ mousePress }: { mousePress: MousePress }) {
        this.logic.mousePressed({
            buttonId: this.id,
            mousePress,
            buttonArea: this.buttonStyle.getArea(),
        })
    }

    mouseReleased({ mouseRelease }: { mouseRelease: MouseRelease }) {
        this.logic.mouseReleased({
            buttonId: this.id,
            mouseRelease,
            buttonArea: this.buttonStyle.getArea(),
        })
    }

    draw() {
        this.buttonStyle.run()
    }

    getStatus(): TButtonStatus {
        return this.logic.status
    }

    getStatusChangeEvent(): ButtonStatusChangeEvent {
        return DataBlobService.get<ButtonStatusChangeEvent>(
            this.logic.buttonStatusChangeEventData,
            this.id
        )
    }

    getArea(): RectArea {
        return this.buttonStyle.getArea()
    }

    clearStatus(): void {
        this.logic.clearStatus({ buttonId: this.id })
    }
}
