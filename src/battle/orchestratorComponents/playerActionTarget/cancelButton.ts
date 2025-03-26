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
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import {
    PlayerActionTargetContext,
    PlayerActionTargetLayout,
    PlayerActionTargetUIObjects,
} from "./battlePlayerSquaddieTarget"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import { MissionMapService } from "../../../missionMap/missionMap"

export class PlayerActionTargetShouldCreateCancelButton
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        PlayerActionTargetLayout,
        PlayerActionTargetContext,
        PlayerActionTargetUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            PlayerActionTargetLayout,
            PlayerActionTargetContext,
            PlayerActionTargetUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: PlayerActionTargetUIObjects =
            this.dataBlob.getUIObjects()
        const cancelButton: Button = uiObjects.cancelButton
        return !cancelButton
    }
}

export class PlayerActionTargetCreateCancelButton implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        PlayerActionTargetLayout,
        PlayerActionTargetContext,
        PlayerActionTargetUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            PlayerActionTargetLayout,
            PlayerActionTargetContext,
            PlayerActionTargetUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: PlayerActionTargetUIObjects =
            this.dataBlob.getUIObjects()
        const layout: PlayerActionTargetLayout = this.dataBlob.getLayout()
        const context: PlayerActionTargetContext = this.dataBlob.getContext()

        const actorBattleSquaddieId = BattleActionDecisionStepService.getActor(
            context.battleActionDecisionStep
        ).battleSquaddieId

        const targetCoordinate = MissionMapService.getByBattleSquaddieId(
            context.missionMap,
            actorBattleSquaddieId
        ).mapCoordinate
        const targetLocation = targetCoordinate
            ? ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                  mapCoordinate: targetCoordinate,
                  cameraLocation: context.camera.getWorldLocation(),
              })
            : undefined

        const cancelButtonArea: RectArea = targetCoordinate
            ? RectAreaService.new({
                  centerX: targetLocation.x,
                  width: layout.cancelButton.width,
                  top: targetLocation.y + layout.cancelButton.topOffset,
                  height: layout.cancelButton.height,
                  margin: layout.cancelButton.margin,
              })
            : RectAreaService.new({
                  centerX: ScreenDimensions.SCREEN_WIDTH / 2,
                  width: layout.cancelButton.width,
                  centerY: ScreenDimensions.SCREEN_HEIGHT / 2,
                  height: layout.cancelButton.height,
                  margin: layout.cancelButton.margin,
              })

        if (RectAreaService.left(cancelButtonArea) < 0) {
            RectAreaService.setLeft(cancelButtonArea, WINDOW_SPACING.SPACING1)
        }
        if (
            RectAreaService.right(cancelButtonArea) >
            ScreenDimensions.SCREEN_WIDTH
        ) {
            RectAreaService.setRight(
                cancelButtonArea,
                ScreenDimensions.SCREEN_WIDTH - WINDOW_SPACING.SPACING1
            )
        }

        if (RectAreaService.top(cancelButtonArea) < 0) {
            RectAreaService.setTop(cancelButtonArea, WINDOW_SPACING.SPACING1)
        }
        if (
            RectAreaService.bottom(cancelButtonArea) >
            ScreenDimensions.SCREEN_HEIGHT
        ) {
            RectAreaService.setBottom(
                cancelButtonArea,
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
            id: "PlayerActionTargetCancel",
            drawTask,
            buttonLogic,
        })
        this.dataBlob.setUIObjects(uiObjects)

        return true
    }
}
