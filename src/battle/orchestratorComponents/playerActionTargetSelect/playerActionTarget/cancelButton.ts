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
    GOLDEN_RATIO,
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../../../ui/constants"
import { ScreenDimensions } from "../../../../utils/graphics/graphicsConfig"
import { ComponentDataBlob } from "../../../../utils/dataBlob/componentDataBlob"
import { BattleActionDecisionStepService } from "../../../actionDecision/battleActionDecisionStep"
import { ConvertCoordinateService } from "../../../../hexMap/convertCoordinates"
import { MissionMapService } from "../../../../missionMap/missionMap"
import { PlayerActionTargetLayout } from "./playerActionTargetLayout"
import { PlayerActionTargetStateMachineUIObjects } from "../playerActionTargetStateMachineUIObjects"
import { PlayerActionTargetStateMachineContext } from "../playerActionTargetStateMachineContext"
import { HexCoordinate } from "../../../../hexMap/hexCoordinate/hexCoordinate"
import { HEX_TILE_RADIUS } from "../../../../graphicsConstants"

export class PlayerActionTargetShouldCreateCancelButton
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        PlayerActionTargetLayout,
        PlayerActionTargetStateMachineContext,
        PlayerActionTargetStateMachineUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            PlayerActionTargetLayout,
            PlayerActionTargetStateMachineContext,
            PlayerActionTargetStateMachineUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: PlayerActionTargetStateMachineUIObjects =
            this.dataBlob.getUIObjects()
        const cancelButton: Button = uiObjects.selectTarget.cancelButton
        return !cancelButton
    }
}

export const PLAYER_ACTION_SELECT_TARGET_CREATE_CANCEL_BUTTON_ID =
    "PlayerActionTargetCancel"
export class PlayerActionTargetCreateCancelButton implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        PlayerActionTargetLayout,
        PlayerActionTargetStateMachineContext,
        PlayerActionTargetStateMachineUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            PlayerActionTargetLayout,
            PlayerActionTargetStateMachineContext,
            PlayerActionTargetStateMachineUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: PlayerActionTargetStateMachineUIObjects =
            this.dataBlob.getUIObjects()
        const layout: PlayerActionTargetLayout = this.dataBlob.getLayout()
        const context: PlayerActionTargetStateMachineContext =
            this.dataBlob.getContext()

        const cancelButtonArea: RectArea = this.calculatePositionForButton()

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

        uiObjects.selectTarget.cancelButton = new Button({
            id: PLAYER_ACTION_SELECT_TARGET_CREATE_CANCEL_BUTTON_ID,
            drawTask,
            buttonLogic,
        })
        this.dataBlob.setUIObjects(uiObjects)

        return true
    }

    calculatePositionForButton(): RectArea {
        const layout: PlayerActionTargetLayout = this.dataBlob.getLayout()
        const context: PlayerActionTargetStateMachineContext =
            this.dataBlob.getContext()

        const actorBattleSquaddieId = BattleActionDecisionStepService.getActor(
            context.battleActionDecisionStep
        ).battleSquaddieId

        const actorMapCoordinate = MissionMapService.getByBattleSquaddieId(
            context.missionMap,
            actorBattleSquaddieId
        ).currentMapCoordinate

        const centerOfScreenRectArea = RectAreaService.new({
            centerX: ScreenDimensions.SCREEN_WIDTH / 2,
            width: layout.cancelButton.width,
            centerY: ScreenDimensions.SCREEN_HEIGHT / 2,
            height: layout.cancelButton.height,
            margin: layout.cancelButton.margin,
        })

        if (!actorMapCoordinate) {
            return centerOfScreenRectArea
        }

        let candidateCoordinate: HexCoordinate = {
            q: actorMapCoordinate.q,
            r: actorMapCoordinate.r,
        }

        let candidateScreenLocation =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: candidateCoordinate,
                cameraLocation: context.camera.getWorldLocation(),
            })

        const mapCoordinatesDirectlyBelowActor =
            this.targetMapCoordinatesDirectlyBelowActor(
                actorMapCoordinate,
                context
            )

        if (mapCoordinatesDirectlyBelowActor.length > 0) {
            candidateScreenLocation.y =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: {
                        q: mapCoordinatesDirectlyBelowActor[0].q,
                        r: 0,
                    },
                    cameraLocation: context.camera.getWorldLocation(),
                }).y
        }

        const locationIsTooLowOnScreen =
            candidateScreenLocation.y >=
            ScreenDimensions.SCREEN_HEIGHT -
                (ScreenDimensions.SCREEN_WIDTH / 12) * GOLDEN_RATIO
        if (locationIsTooLowOnScreen) {
            candidateScreenLocation =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: candidateCoordinate,
                    cameraLocation: context.camera.getWorldLocation(),
                })
        }

        return RectAreaService.new({
            centerX: candidateScreenLocation.x,
            width: layout.cancelButton.width,
            top: candidateScreenLocation.y + layout.cancelButton.topOffset,
            height: layout.cancelButton.height,
            margin: layout.cancelButton.margin,
        })
    }

    private targetMapCoordinatesDirectlyBelowActor = (
        actorMapCoordinate: HexCoordinate,
        context: PlayerActionTargetStateMachineContext
    ) => {
        const actorScreenLocation =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: actorMapCoordinate,
                cameraLocation: context.camera.getWorldLocation(),
            })

        return Object.values(context.targetResults.validTargets)
            .filter((targetResult) => !!targetResult.currentMapCoordinate)
            .filter((targetResult) => {
                const targetScreenLocation =
                    ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                        {
                            mapCoordinate: targetResult.currentMapCoordinate,
                            cameraLocation: context.camera.getWorldLocation(),
                        }
                    )
                const targetIsBelowActor =
                    targetScreenLocation.y > actorScreenLocation.y
                const targetIsLinedUpWithActor =
                    Math.abs(targetScreenLocation.x - actorScreenLocation.x) <
                    HEX_TILE_RADIUS
                return targetIsBelowActor && targetIsLinedUpWithActor
            })
            .map((targetResult) => targetResult.currentMapCoordinate)
            .sort((a, b) => b.q - a.q)
    }
}
