import { ButtonStatus } from "../buttonStatus"
import { RectArea, RectAreaService } from "../../rectArea"
import {
    MouseButton,
    MousePress,
    MouseRelease,
    ScreenLocation,
} from "../../../utils/mouseConfig"
import {
    ButtonLogic,
    ButtonLogicClassFunctions,
    ButtonLogicCommonFunctions,
    ButtonStatusChangeEventByButtonId,
} from "./base"

export class ButtonLogicChangeOnRelease
    implements ButtonLogic, ButtonLogicClassFunctions
{
    buttonStatusChangeEventData: ButtonStatusChangeEventByButtonId
    status: ButtonStatus
    lastStatusChangeTimeStamp: number

    constructor({ dataBlob }: { dataBlob: ButtonStatusChangeEventByButtonId }) {
        this.status = ButtonStatus.READY
        this.lastStatusChangeTimeStamp = undefined
        this.buttonStatusChangeEventData = dataBlob
    }

    changeStatus({
        buttonId,
        newStatus,
        mouseLocation,
        mousePress,
        mouseRelease,
    }: {
        buttonId: string
        newStatus: ButtonStatus
        mouseLocation?: ScreenLocation
        mousePress?: MousePress
        mouseRelease?: MouseRelease
    }) {
        if (this.status === newStatus) return

        const previousStatus = this.status
        this.status = newStatus
        this.lastStatusChangeTimeStamp = Date.now()

        ButtonLogicCommonFunctions.addButtonStatusChangeEvent({
            buttonId,
            buttonLogic: this,
            previousStatus,
            mouseLocation,
            mousePress: mousePress,
            mouseRelease,
        })
    }

    mouseMoved({
        buttonId,
        mouseLocation,
        buttonArea,
    }: {
        buttonId: string
        mouseLocation: ScreenLocation
        buttonArea: RectArea
    }) {
        switch (this.status) {
            case ButtonStatus.READY:
                return this.mouseMovedWhileButtonIsInReadyState({
                    buttonId,
                    mouseLocation: mouseLocation,
                    buttonArea: buttonArea,
                })
            case ButtonStatus.HOVER:
                return this.mouseMovedWhileButtonIsInHoverState({
                    buttonId,
                    mouseLocation,
                    buttonArea,
                })
        }
    }

    mouseMovedWhileButtonIsInReadyState({
        buttonId,
        mouseLocation,
        buttonArea,
    }: {
        buttonId: string
        mouseLocation: ScreenLocation
        buttonArea: RectArea
    }) {
        if (
            RectAreaService.isInside(
                buttonArea,
                mouseLocation.x,
                mouseLocation.y
            )
        ) {
            this.changeStatus({
                buttonId,
                newStatus: ButtonStatus.HOVER,
                mouseLocation,
            })
        }
    }

    mouseMovedWhileButtonIsInHoverState({
        buttonId,
        mouseLocation,
        buttonArea,
    }: {
        buttonId: string
        mouseLocation: ScreenLocation
        buttonArea: RectArea
    }) {
        if (
            !RectAreaService.isInside(
                buttonArea,
                mouseLocation.x,
                mouseLocation.y
            )
        ) {
            this.changeStatus({
                buttonId,
                newStatus: ButtonStatus.READY,
                mouseLocation,
            })
        }
    }

    mousePressed({
        buttonId,
        mousePress,
        buttonArea,
    }: {
        buttonId: string
        mousePress: MousePress
        buttonArea: RectArea
    }) {
        switch (this.status) {
            case ButtonStatus.READY:
                return this.mousePressedWhileButtonIsInReadyState({
                    buttonId,
                    mousePress,
                    buttonArea,
                })
            case ButtonStatus.HOVER:
                return this.mousePressedWhileButtonIsInHoverState({
                    buttonId,
                    mousePress,
                    buttonArea,
                })
        }
    }

    mousePressedWhileButtonIsInReadyState({
        buttonId,
        mousePress,
        buttonArea,
    }: {
        buttonId: string
        mousePress: MousePress
        buttonArea: RectArea
    }) {
        return this.mousePressedWhileButtonIsInHoverState({
            buttonId,
            mousePress,
            buttonArea,
        })
    }

    mousePressedWhileButtonIsInHoverState({
        buttonId,
        mousePress,
        buttonArea,
    }: {
        buttonId: string
        mousePress: MousePress
        buttonArea: RectArea
    }) {
        if (
            RectAreaService.isInside(buttonArea, mousePress.x, mousePress.y) &&
            mousePress.button === MouseButton.ACCEPT
        ) {
            this.changeStatus({
                buttonId,
                newStatus: ButtonStatus.ACTIVE,
                mousePress,
            })
        }
    }

    mouseReleased({
        buttonId,
        mouseRelease,
        buttonArea,
    }: {
        buttonId: string
        mouseRelease: MouseRelease
        buttonArea: RectArea
    }) {
        if (this.status !== ButtonStatus.ACTIVE) return
        this.mouseReleasedWhileButtonIsInActiveState({
            buttonId,
            mouseRelease,
            buttonArea,
        })
    }

    mouseReleasedWhileButtonIsInActiveState({
        buttonId,
        mouseRelease,
        buttonArea,
    }: {
        buttonId: string
        mouseRelease: MouseRelease
        buttonArea: RectArea
    }) {
        if (
            RectAreaService.isInside(buttonArea, mouseRelease.x, mouseRelease.y)
        ) {
            return this.changeStatus({
                buttonId,
                newStatus: ButtonStatus.HOVER,
                mouseRelease,
            })
        }

        this.changeStatus({
            buttonId,
            newStatus: ButtonStatus.READY,
            mouseRelease,
        })
    }

    clearStatus({ buttonId }: { buttonId: string }): void {
        ButtonLogicCommonFunctions.clearButtonStatusChangeEvent({
            buttonId: buttonId,
            buttonLogic: this,
        })
    }
}
