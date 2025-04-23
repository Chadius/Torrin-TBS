import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { Button } from "../../../ui/button/button"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ButtonLogicChangeOnRelease } from "../../../ui/button/logic/buttonLogicChangeOnRelease"
import {
    AllLabelButtonDataBlob,
    AllLabelButtonDrawTask,
} from "../../../ui/button/style/AllLabelStyle/allLabelStyle"
import { ButtonStatus } from "../../../ui/button/buttonStatus"
import { LabelService } from "../../../ui/label"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../../ui/constants"
import {
    PlayerActionConfirmContext,
    PlayerActionConfirmLayout,
    PlayerActionConfirmUIObjects,
} from "./battlePlayerActionConfirm"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"

export class PlayerActionConfirmShouldCreateCancelButton
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        PlayerActionConfirmLayout,
        PlayerActionConfirmContext,
        PlayerActionConfirmUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            PlayerActionConfirmLayout,
            PlayerActionConfirmContext,
            PlayerActionConfirmUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: PlayerActionConfirmUIObjects =
            this.dataBlob.getUIObjects()
        const okButton: Button = uiObjects.okButton
        const cancelButton: Button = uiObjects.cancelButton
        return !cancelButton && !!okButton
    }
}

export const PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID =
    "PlayerActionConfirmCancel"
export class PlayerActionConfirmCreateCancelButton implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        PlayerActionConfirmLayout,
        PlayerActionConfirmContext,
        PlayerActionConfirmUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            PlayerActionConfirmLayout,
            PlayerActionConfirmContext,
            PlayerActionConfirmUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: PlayerActionConfirmUIObjects =
            this.dataBlob.getUIObjects()
        const layout: PlayerActionConfirmLayout = this.dataBlob.getLayout()
        const okButtonArea = uiObjects.okButton.getArea()

        const context: PlayerActionConfirmContext = this.dataBlob.getContext()

        const cancelButtonArea: RectArea = RectAreaService.new({
            left: RectAreaService.right(okButtonArea) + WINDOW_SPACING.SPACING1,
            bottom: RectAreaService.bottom(okButtonArea),
            height: layout.cancelButton.height,
            width: layout.cancelButton.width,
            margin: layout.cancelButton.margin,
        })

        if (
            RectAreaService.right(cancelButtonArea) >
            ScreenDimensions.SCREEN_WIDTH
        ) {
            RectAreaService.setRight(
                cancelButtonArea,
                RectAreaService.left(okButtonArea) - WINDOW_SPACING.SPACING1
            )
        }

        const buttonLogic = new ButtonLogicChangeOnRelease({
            dataBlob: context.buttonStatusChangeEventDataBlob,
        })
        const allLabelButtonDataBlob: AllLabelButtonDataBlob = {
            data: {
                layout: {
                    labelByButtonStatus: {
                        [ButtonStatus.READY]: LabelService.new({
                            area: cancelButtonArea,
                            fillColor: layout.cancelButton.fillColor,
                            strokeColor: layout.cancelButton.strokeColor,
                            strokeWeight: layout.cancelButton.strokeWeight,
                            text: layout.cancelButton.text,
                            fontSize: layout.cancelButton.fontSize,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontColor: layout.cancelButton.fontColor,
                            textBoxMargin: layout.cancelButton.textBoxMargin,
                        }),
                        [ButtonStatus.HOVER]: LabelService.new({
                            area: cancelButtonArea,
                            fillColor: layout.cancelButton.fillColor,
                            strokeColor:
                                layout.cancelButton.selectedBorder.strokeColor,
                            strokeWeight:
                                layout.cancelButton.selectedBorder.strokeWeight,
                            text: layout.cancelButton.text,
                            fontSize: layout.cancelButton.fontSize,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontColor: layout.cancelButton.fontColor,
                            textBoxMargin: layout.cancelButton.textBoxMargin,
                        }),
                        [ButtonStatus.ACTIVE]: LabelService.new({
                            area: cancelButtonArea,
                            fillColor: layout.cancelButton.activeFill.fillColor,
                            strokeColor:
                                layout.cancelButton.selectedBorder.strokeColor,
                            strokeWeight:
                                layout.cancelButton.selectedBorder.strokeWeight,
                            text: layout.cancelButton.text,
                            fontSize: layout.cancelButton.fontSize,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontColor: layout.cancelButton.fontColor,
                            textBoxMargin: layout.cancelButton.textBoxMargin,
                        }),
                        [ButtonStatus.DISABLED]: LabelService.new({
                            area: cancelButtonArea,
                            fillColor: layout.cancelButton.fillColor,
                            strokeColor: layout.cancelButton.strokeColor,
                            strokeWeight: layout.cancelButton.strokeWeight,
                            text: layout.cancelButton.text,
                            fontSize: layout.cancelButton.fontSize,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontColor: layout.cancelButton.fontColor,
                            textBoxMargin: layout.cancelButton.textBoxMargin,
                        }),
                    },
                },
            },
        }

        const drawTask = new AllLabelButtonDrawTask({
            buttonLogic: buttonLogic,
            dataBlob: allLabelButtonDataBlob,
        })

        uiObjects.cancelButton = new Button({
            id: PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID,
            drawTask,
            buttonLogic,
        })
        this.dataBlob.setUIObjects(uiObjects)

        return true
    }
}
