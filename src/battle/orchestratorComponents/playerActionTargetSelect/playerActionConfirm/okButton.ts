import { BehaviorTreeTask } from "../../../../utils/behaviorTree/task"
import { Button } from "../../../../ui/button/button"
import { RectArea, RectAreaService } from "../../../../ui/rectArea"
import { ButtonLogicChangeOnRelease } from "../../../../ui/button/logic/buttonLogicChangeOnRelease"
import {
    AllLabelButtonDataBlob,
    AllLabelButtonDrawTask,
} from "../../../../ui/button/style/AllLabelStyle/allLabelStyle"
import { ButtonStatus } from "../../../../ui/button/buttonStatus"
import { LabelService } from "../../../../ui/label"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../../../ui/constants"
import { BattleActionDecisionStepService } from "../../../actionDecision/battleActionDecisionStep"
import { ConvertCoordinateService } from "../../../../hexMap/convertCoordinates"
import { ScreenDimensions } from "../../../../utils/graphics/graphicsConfig"
import { ComponentDataBlob } from "../../../../utils/dataBlob/componentDataBlob"
import { PlayerActionConfirmLayout } from "./playerActionConfirmLayout"
import { PlayerActionTargetStateMachineUIObjects } from "../playerActionTargetStateMachineUIObjects"
import { PlayerActionTargetStateMachineContext } from "../playerActionTargetStateMachineContext"

export class PlayerActionConfirmShouldCreateOKButton
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        PlayerActionConfirmLayout,
        PlayerActionTargetStateMachineContext,
        PlayerActionTargetStateMachineUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            PlayerActionConfirmLayout,
            PlayerActionTargetStateMachineContext,
            PlayerActionTargetStateMachineUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: PlayerActionTargetStateMachineUIObjects =
            this.dataBlob.getUIObjects()
        const okButton: Button = uiObjects.confirm.okButton
        return !okButton
    }
}

export const PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID = "PlayerActionConfirmOK"

export class PlayerActionConfirmCreateOKButton implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        PlayerActionConfirmLayout,
        PlayerActionTargetStateMachineContext,
        PlayerActionTargetStateMachineUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            PlayerActionConfirmLayout,
            PlayerActionTargetStateMachineContext,
            PlayerActionTargetStateMachineUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: PlayerActionTargetStateMachineUIObjects =
            this.dataBlob.getUIObjects()
        const layout: PlayerActionConfirmLayout = this.dataBlob.getLayout()
        const context: PlayerActionTargetStateMachineContext =
            this.dataBlob.getContext()
        const targetCoordinate = BattleActionDecisionStepService.getTarget(
            context.battleActionDecisionStep
        )?.targetCoordinate
        const camera = uiObjects.camera
        const targetLocation = targetCoordinate
            ? ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                  mapCoordinate: targetCoordinate,
                  cameraLocation: camera.getWorldLocation(),
              })
            : undefined

        const okButtonArea: RectArea = targetCoordinate
            ? RectAreaService.new({
                  centerX: targetLocation.x,
                  width: layout.okButton.width,
                  top: targetLocation.y + layout.okButton.topOffset,
                  height: layout.okButton.height,
                  margin: layout.okButton.margin,
              })
            : RectAreaService.new({
                  centerX: ScreenDimensions.SCREEN_WIDTH / 2,
                  width: layout.okButton.width,
                  centerY: ScreenDimensions.SCREEN_HEIGHT / 2,
                  height: layout.okButton.height,
                  margin: layout.okButton.margin,
              })

        if (RectAreaService.left(okButtonArea) < 0) {
            RectAreaService.setLeft(okButtonArea, WINDOW_SPACING.SPACING1)
        }
        if (
            RectAreaService.right(okButtonArea) > ScreenDimensions.SCREEN_WIDTH
        ) {
            RectAreaService.setRight(
                okButtonArea,
                ScreenDimensions.SCREEN_WIDTH - WINDOW_SPACING.SPACING1
            )
        }

        if (RectAreaService.top(okButtonArea) < 0) {
            RectAreaService.setTop(okButtonArea, WINDOW_SPACING.SPACING1)
        }
        if (
            RectAreaService.bottom(okButtonArea) >
            ScreenDimensions.SCREEN_HEIGHT
        ) {
            RectAreaService.setBottom(
                okButtonArea,
                ScreenDimensions.SCREEN_HEIGHT - WINDOW_SPACING.SPACING1
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
                            area: okButtonArea,
                            fillColor: layout.okButton.fillColor,
                            strokeColor: layout.okButton.strokeColor,
                            strokeWeight: layout.okButton.strokeWeight,
                            text: layout.okButton.text,
                            fontSize: layout.okButton.fontSize,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontColor: layout.okButton.fontColor,
                            textBoxMargin: layout.okButton.textBoxMargin,
                        }),
                        [ButtonStatus.HOVER]: LabelService.new({
                            area: okButtonArea,
                            fillColor: layout.okButton.fillColor,
                            strokeColor:
                                layout.okButton.selectedBorder.strokeColor,
                            strokeWeight:
                                layout.okButton.selectedBorder.strokeWeight,
                            text: layout.okButton.text,
                            fontSize: layout.okButton.fontSize,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontColor: layout.okButton.fontColor,
                            textBoxMargin: layout.okButton.textBoxMargin,
                        }),
                        [ButtonStatus.ACTIVE]: LabelService.new({
                            area: okButtonArea,
                            fillColor: layout.okButton.activeFill.fillColor,
                            strokeColor:
                                layout.okButton.selectedBorder.strokeColor,
                            strokeWeight:
                                layout.okButton.selectedBorder.strokeWeight,
                            text: layout.okButton.text,
                            fontSize: layout.okButton.fontSize,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontColor: layout.okButton.fontColor,
                            textBoxMargin: layout.okButton.textBoxMargin,
                        }),
                        [ButtonStatus.DISABLED]: LabelService.new({
                            area: okButtonArea,
                            fillColor: layout.okButton.fillColor,
                            strokeColor: layout.okButton.strokeColor,
                            strokeWeight: layout.okButton.strokeWeight,
                            text: layout.okButton.text,
                            fontSize: layout.okButton.fontSize,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontColor: layout.okButton.fontColor,
                            textBoxMargin: layout.okButton.textBoxMargin,
                        }),
                    },
                },
            },
        }

        const drawTask = new AllLabelButtonDrawTask({
            buttonLogic: buttonLogic,
            dataBlob: allLabelButtonDataBlob,
        })

        uiObjects.confirm.okButton = new Button({
            id: PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID,
            drawTask,
            buttonLogic,
        })
        this.dataBlob.setUIObjects(uiObjects)

        return true
    }
}
