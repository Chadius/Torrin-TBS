import { TButtonStatus } from "../buttonStatus"
import {
    MousePress,
    MouseRelease,
    ScreenLocation,
} from "../../../utils/mouseConfig"
import { DataBlob, DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { RectArea } from "../../rectArea"

export interface ButtonStatusChangeEvent {
    previousStatus: TButtonStatus
    newStatus: TButtonStatus
    mouseLocation?: ScreenLocation
    mousePress?: MousePress
    mouseRelease?: MouseRelease
}

export interface ButtonLogic {
    status: TButtonStatus
    lastStatusChangeTimeStamp: number | undefined
    buttonStatusChangeEventData: ButtonStatusChangeEventByButtonId
}

export interface ButtonStatusChangeEventByButtonId extends DataBlob {
    data: {
        [buttonId: string]: ButtonStatusChangeEvent | undefined
    }
}

export interface ButtonLogicClassFunctions {
    changeStatus: ({
        buttonId,
        newStatus,
        mouseLocation,
        mousePress,
        mouseRelease,
    }: {
        buttonId: string
        newStatus: TButtonStatus
        mouseLocation?: ScreenLocation
        mousePress?: MousePress
        mouseRelease?: MouseRelease
    }) => void
    clearStatus: ({ buttonId }: { buttonId: string }) => void
    mouseMoved: ({
        buttonId,
        mouseLocation,
        buttonArea,
    }: {
        buttonId: string
        mouseLocation: ScreenLocation
        buttonArea: RectArea
    }) => void
    mousePressed: ({
        buttonId,
        mousePress,
        buttonArea,
    }: {
        buttonId: string
        mousePress: MousePress
        buttonArea: RectArea
    }) => void
    mouseReleased: ({
        buttonId,
        mouseRelease,
        buttonArea,
    }: {
        buttonId: string
        mouseRelease: MouseRelease
        buttonArea: RectArea
    }) => void
}

export const ButtonLogicCommonFunctions = {
    changeStatus: ({
        buttonId,
        buttonLogic,
        newStatus,
        mouseLocation,
        mousePress,
        mouseRelease,
    }: {
        buttonId: string
        buttonLogic: ButtonLogic
        newStatus: TButtonStatus
        mouseLocation?: ScreenLocation
        mousePress?: MousePress
        mouseRelease?: MouseRelease
    }) => {
        if (buttonLogic.status === newStatus) return

        const previousStatus = buttonLogic.status
        buttonLogic.status = newStatus
        buttonLogic.lastStatusChangeTimeStamp = Date.now()

        addButtonStatusChangeEvent({
            buttonId,
            buttonLogic,
            previousStatus,
            mouseLocation,
            mousePress: mousePress,
            mouseRelease,
        })
    },
    addButtonStatusChangeEvent: ({
        buttonId,
        buttonLogic,
        previousStatus,
        mouseLocation,
        mousePress,
        mouseRelease,
    }: {
        buttonId: string
        buttonLogic: ButtonLogic
        previousStatus: TButtonStatus
        mouseLocation?: ScreenLocation
        mousePress?: MousePress
        mouseRelease?: MouseRelease
    }) =>
        addButtonStatusChangeEvent({
            buttonId,
            buttonLogic,
            previousStatus,
            mouseLocation,
            mousePress,
            mouseRelease,
        }),
    clearButtonStatusChangeEvent: ({
        buttonId,
        buttonLogic,
    }: {
        buttonId: string
        buttonLogic: ButtonLogic
    }) =>
        clearButtonStatusChangeEvent({
            buttonId,
            buttonLogic,
        }),
}

const addButtonStatusChangeEvent = ({
    buttonId,
    buttonLogic,
    previousStatus,
    mouseLocation,
    mousePress,
    mouseRelease,
}: {
    buttonId: string
    buttonLogic: ButtonLogic
    previousStatus: TButtonStatus
    mouseLocation?: ScreenLocation
    mousePress?: MousePress
    mouseRelease?: MouseRelease
}) => {
    DataBlobService.add<ButtonStatusChangeEvent>(
        buttonLogic.buttonStatusChangeEventData,
        buttonId,
        {
            previousStatus,
            newStatus: buttonLogic.status,
            mouseLocation,
            mousePress,
            mouseRelease,
        }
    )
}

const clearButtonStatusChangeEvent = ({
    buttonId,
    buttonLogic,
}: {
    buttonId: string
    buttonLogic: ButtonLogic
}) => {
    DataBlobService.add<ButtonStatusChangeEvent | undefined>(
        buttonLogic.buttonStatusChangeEventData,
        buttonId,
        undefined
    )
}
