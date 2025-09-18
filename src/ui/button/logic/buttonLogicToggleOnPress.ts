import { ButtonStatus, TButtonStatus } from "../buttonStatus"
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

const VALID_STATUSES: TButtonStatus[] = [
    ButtonStatus.TOGGLE_OFF,
    ButtonStatus.TOGGLE_ON,
    ButtonStatus.TOGGLE_OFF_HOVER,
    ButtonStatus.TOGGLE_ON_HOVER,
    ButtonStatus.DISABLED,
]

export class ButtonLogicToggleOnPress
    implements ButtonLogic, ButtonLogicClassFunctions
{
    buttonStatusChangeEventData: ButtonStatusChangeEventByButtonId
    status: TButtonStatus
    lastStatusChangeTimeStamp: number | undefined

    constructor({ dataBlob }: { dataBlob: ButtonStatusChangeEventByButtonId }) {
        this.status = ButtonStatus.TOGGLE_OFF
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
        newStatus: TButtonStatus | undefined
        mouseLocation?: ScreenLocation
        mousePress?: MousePress
        mouseRelease?: MouseRelease
    }) {
        if (newStatus == undefined || !VALID_STATUSES.includes(newStatus))
            return
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
        const mouseIsOnButton = RectAreaService.isInside(
            buttonArea,
            mouseLocation.x,
            mouseLocation.y
        )

        const toggleStatesWhenMouseIsOnButton: {
            [b in TButtonStatus]?: TButtonStatus
        } = {
            [ButtonStatus.TOGGLE_ON]: ButtonStatus.TOGGLE_ON_HOVER,
            [ButtonStatus.TOGGLE_OFF]: ButtonStatus.TOGGLE_OFF_HOVER,
        }
        if (mouseIsOnButton && this.status in toggleStatesWhenMouseIsOnButton) {
            this.changeStatus({
                buttonId,
                newStatus: toggleStatesWhenMouseIsOnButton[this.status],
                mouseLocation,
            })
            return
        }

        const toggleStatesWhenMouseIsOffButton: {
            [b in TButtonStatus]?: TButtonStatus
        } = {
            [ButtonStatus.TOGGLE_ON_HOVER]: ButtonStatus.TOGGLE_ON,
            [ButtonStatus.TOGGLE_OFF_HOVER]: ButtonStatus.TOGGLE_OFF,
        }

        if (
            !mouseIsOnButton &&
            this.status in toggleStatesWhenMouseIsOffButton
        ) {
            this.changeStatus({
                buttonId,
                newStatus: toggleStatesWhenMouseIsOffButton[this.status],
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
        const mouseIsOnButton = RectAreaService.isInside(
            buttonArea,
            mousePress.x,
            mousePress.y
        )

        const toggleStates: { [b in TButtonStatus]?: TButtonStatus } = {
            [ButtonStatus.TOGGLE_ON]: ButtonStatus.TOGGLE_OFF,
            [ButtonStatus.TOGGLE_OFF]: ButtonStatus.TOGGLE_ON,
            [ButtonStatus.TOGGLE_ON_HOVER]: ButtonStatus.TOGGLE_OFF_HOVER,
            [ButtonStatus.TOGGLE_OFF_HOVER]: ButtonStatus.TOGGLE_ON_HOVER,
        }

        if (
            mouseIsOnButton &&
            mousePress.button == MouseButton.ACCEPT &&
            this.status in toggleStates
        ) {
            this.changeStatus({
                buttonId,
                newStatus: toggleStates[this.status],
                mousePress,
            })
        }
    }

    mouseReleased(_: {
        buttonId: string
        mouseRelease: MouseRelease
        buttonArea: RectArea
    }) {
        // Required by inheritance
    }

    clearStatus({ buttonId }: { buttonId: string }): void {
        ButtonLogicCommonFunctions.clearButtonStatusChangeEvent({
            buttonId: buttonId,
            buttonLogic: this,
        })
    }
}
