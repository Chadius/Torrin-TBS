import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"
import {
    DebugModeMenuContext,
    DebugModeMenuLayout,
    DebugModeMenuUIObjects,
} from "./debugModeMenu"
import { Button } from "../../../ui/button/button"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import {
    AllLabelButtonDataBlob,
    AllLabelButtonDrawTask,
} from "../../../ui/button/style/AllLabelStyle/allLabelStyle"
import { ButtonStatus } from "../../../ui/button/buttonStatus"
import { LabelService } from "../../../ui/label"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../../ui/constants"
import { ButtonLogicToggleOnPress } from "../../../ui/button/logic/buttonLogicToggleOnPress"

export class DebugModeMenuShouldCreateToggleBehaviorOverrideNoActionButton
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        DebugModeMenuLayout,
        DebugModeMenuContext,
        DebugModeMenuUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            DebugModeMenuLayout,
            DebugModeMenuContext,
            DebugModeMenuUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: DebugModeMenuUIObjects = this.dataBlob.getUIObjects()
        const behaviorOverrideToggleNoActionButton: Button =
            uiObjects.behaviorOverrideToggleNoActionButton
        return !behaviorOverrideToggleNoActionButton
    }
}

export class DebugModeMenuCreateToggleBehaviorOverrideNoActionButton
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        DebugModeMenuLayout,
        DebugModeMenuContext,
        DebugModeMenuUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            DebugModeMenuLayout,
            DebugModeMenuContext,
            DebugModeMenuUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: DebugModeMenuUIObjects = this.dataBlob.getUIObjects()
        const layout: DebugModeMenuLayout = this.dataBlob.getLayout()
        const context: DebugModeMenuContext = this.dataBlob.getContext()

        const toggleButtonArea: RectArea = RectAreaService.new({
            ...layout.behaviorOverride.noAction.drawingArea,
            left:
                RectAreaService.left(uiObjects.menuBackground.area) +
                layout.behaviorOverride.offset.left +
                layout.behaviorOverride.noAction.drawingArea.left,
            top:
                RectAreaService.top(uiObjects.menuBackground.area) +
                layout.behaviorOverride.offset.top +
                layout.behaviorOverride.noAction.drawingArea.top,
        })
        const buttonLogic = new ButtonLogicToggleOnPress({
            dataBlob: context.buttonStatusChangeEventDataBlob,
        })
        const allLabelButtonDataBlob: AllLabelButtonDataBlob = {
            data: {
                layout: {
                    labelByButtonStatus: {
                        [ButtonStatus.TOGGLE_OFF]: LabelService.new({
                            area: toggleButtonArea,
                            fontColor: layout.behaviorOverride.button.fontColor,
                            textBoxMargin:
                                layout.behaviorOverride.button.padding,
                            text: layout.behaviorOverride.noAction
                                .textToggleOff,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize:
                                layout.behaviorOverride.noAction.fontSize ??
                                layout.behaviorOverride.button.fontSize,
                            fillColor:
                                layout.behaviorOverride.button
                                    .toggleOffStatusStyle.fillColor,
                            strokeColor:
                                layout.behaviorOverride.button
                                    .toggleOffStatusStyle.strokeColor,
                            strokeWeight:
                                layout.behaviorOverride.button
                                    .toggleOffStatusStyle.strokeWeight,
                        }),
                        [ButtonStatus.TOGGLE_ON]: LabelService.new({
                            area: toggleButtonArea,
                            fontColor: layout.behaviorOverride.button.fontColor,
                            textBoxMargin:
                                layout.behaviorOverride.button.padding,
                            text: layout.behaviorOverride.noAction.textToggleOn,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.behaviorOverride.button.fontSize,
                            fillColor:
                                layout.behaviorOverride.button
                                    .toggleOnStatusStyle.fillColor,
                            strokeColor:
                                layout.behaviorOverride.button
                                    .toggleOnStatusStyle.strokeColor,
                            strokeWeight:
                                layout.behaviorOverride.button
                                    .toggleOnStatusStyle.strokeWeight,
                        }),
                        [ButtonStatus.TOGGLE_OFF_HOVER]: LabelService.new({
                            area: toggleButtonArea,
                            fontColor: layout.behaviorOverride.button.fontColor,
                            textBoxMargin:
                                layout.behaviorOverride.button.padding,
                            text: layout.behaviorOverride.noAction
                                .textToggleOffHover,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.behaviorOverride.button.fontSize,
                            fillColor:
                                layout.behaviorOverride.button
                                    .toggleOffHoverStatusStyle.fillColor,
                            strokeColor:
                                layout.behaviorOverride.button
                                    .toggleOffHoverStatusStyle.strokeColor,
                            strokeWeight:
                                layout.behaviorOverride.button
                                    .toggleOffHoverStatusStyle.strokeWeight,
                        }),
                        [ButtonStatus.TOGGLE_ON_HOVER]: LabelService.new({
                            area: toggleButtonArea,
                            fontColor: layout.behaviorOverride.button.fontColor,
                            textBoxMargin:
                                layout.behaviorOverride.button.padding,
                            text: layout.behaviorOverride.noAction
                                .textToggleOnHover,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.behaviorOverride.button.fontSize,
                            fillColor:
                                layout.behaviorOverride.button
                                    .toggleOnHoverStatusStyle.fillColor,
                            strokeColor:
                                layout.behaviorOverride.button
                                    .toggleOnHoverStatusStyle.strokeColor,
                            strokeWeight:
                                layout.behaviorOverride.button
                                    .toggleOnHoverStatusStyle.strokeWeight,
                        }),
                    },
                },
            },
        }

        const drawTask = new AllLabelButtonDrawTask({
            buttonLogic: buttonLogic,
            dataBlob: allLabelButtonDataBlob,
        })

        uiObjects.behaviorOverrideToggleNoActionButton = new Button({
            id: "debugModeBehaviorOverrideNoActionButton",
            drawTask,
            buttonLogic,
        })
        this.dataBlob.setUIObjects(uiObjects)

        return true
    }
}
