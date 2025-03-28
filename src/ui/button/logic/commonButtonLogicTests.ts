import { expect } from "vitest"
import { ButtonStatus } from "../buttonStatus"
import { DataBlob, DataBlobService } from "../../../utils/dataBlob/dataBlob"
import {
    ButtonLogic,
    ButtonLogicClassFunctions,
    ButtonStatusChangeEvent,
} from "./base"

export const CommonButtonLogicTests = {
    canChangeToValidStatuses: ({
        validStatuses,
        buttonLogic,
        buttonId,
    }: {
        validStatuses: ButtonStatus[]
        buttonLogic: ButtonLogicClassFunctions & ButtonLogic
        buttonId: string
    }) => {
        validStatuses.forEach((validStatus) => {
            buttonLogic.changeStatus({
                buttonId,
                newStatus: validStatus,
            })
            expect(buttonLogic.status).toEqual(validStatus)
        })
        return true
    },
    willIgnoreInvalidStatuses: ({
        validStatuses,
        buttonLogic,
        buttonId,
    }: {
        validStatuses: ButtonStatus[]
        buttonLogic: ButtonLogicClassFunctions & ButtonLogic
        buttonId: string
    }) => {
        const initialStatus = buttonLogic.status
        Object.keys(ButtonStatus)
            .map((keyStr) => keyStr as ButtonStatus)
            .filter((key) => !validStatuses.includes(key))
            .forEach((invalidStatus) => {
                buttonLogic.changeStatus({
                    buttonId,
                    newStatus: invalidStatus,
                })
                expect(buttonLogic.status).toEqual(initialStatus)
            })
        return true
    },
    willSendAMessageWhenTheStatusIsChanged: ({
        buttonLogic,
        dataBlob,
        buttonId,
    }: {
        buttonLogic: ButtonLogicClassFunctions & ButtonLogic
        dataBlob: DataBlob
        buttonId: string
    }) => {
        const initialStatus = buttonLogic.status
        buttonLogic.changeStatus({
            buttonId,
            newStatus: ButtonStatus.DISABLED,
        })
        const buttonStatusChangeEvent =
            DataBlobService.get<ButtonStatusChangeEvent>(dataBlob, buttonId)
        expect(buttonStatusChangeEvent).toEqual({
            previousStatus: initialStatus,
            newStatus: ButtonStatus.DISABLED,
        })
        return true
    },
}
