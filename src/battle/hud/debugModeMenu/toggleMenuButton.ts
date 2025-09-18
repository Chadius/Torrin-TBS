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

export class DebugModeMenuShouldCreateToggleModeMenuButton
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
        return uiObjects.toggleMenuButton == undefined
    }
}

export class DebugModeMenuCreateToggleModeMenuButton
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
            ...layout.toggleMenuButton.drawingArea,
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
                            fontColor: layout.toggleMenuButton.fontColor,
                            textBoxMargin: layout.toggleMenuButton.padding,
                            text: layout.toggleMenuButton.textToggleOff,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.toggleMenuButton.fontSize,
                            fillColor:
                                layout.toggleMenuButton.toggleOffStatusStyle
                                    .fillColor,
                            strokeColor:
                                layout.toggleMenuButton.toggleOffStatusStyle
                                    .strokeColor,
                            strokeWeight:
                                layout.toggleMenuButton.toggleOffStatusStyle
                                    .strokeWeight,
                        }),
                        [ButtonStatus.TOGGLE_ON]: LabelService.new({
                            area: toggleButtonArea,
                            fontColor: layout.toggleMenuButton.fontColor,
                            textBoxMargin: layout.toggleMenuButton.padding,
                            text: layout.toggleMenuButton.textToggleOn,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.toggleMenuButton.fontSize,
                            fillColor:
                                layout.toggleMenuButton.toggleOnStatusStyle
                                    .fillColor,
                            strokeColor:
                                layout.toggleMenuButton.toggleOnStatusStyle
                                    .strokeColor,
                            strokeWeight:
                                layout.toggleMenuButton.toggleOnStatusStyle
                                    .strokeWeight,
                        }),
                        [ButtonStatus.TOGGLE_OFF_HOVER]: LabelService.new({
                            area: toggleButtonArea,
                            fontColor: layout.toggleMenuButton.fontColor,
                            textBoxMargin: layout.toggleMenuButton.padding,
                            text: layout.toggleMenuButton.textToggleOffHover,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.toggleMenuButton.fontSize,
                            fillColor:
                                layout.toggleMenuButton
                                    .toggleOffHoverStatusStyle.fillColor,
                            strokeColor:
                                layout.toggleMenuButton
                                    .toggleOffHoverStatusStyle.strokeColor,
                            strokeWeight:
                                layout.toggleMenuButton
                                    .toggleOffHoverStatusStyle.strokeWeight,
                        }),
                        [ButtonStatus.TOGGLE_ON_HOVER]: LabelService.new({
                            area: toggleButtonArea,
                            fontColor: layout.toggleMenuButton.fontColor,
                            textBoxMargin: layout.toggleMenuButton.padding,
                            text: layout.toggleMenuButton.textToggleOnHover,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.toggleMenuButton.fontSize,
                            fillColor:
                                layout.toggleMenuButton.toggleOnHoverStatusStyle
                                    .fillColor,
                            strokeColor:
                                layout.toggleMenuButton.toggleOnHoverStatusStyle
                                    .strokeColor,
                            strokeWeight:
                                layout.toggleMenuButton.toggleOnHoverStatusStyle
                                    .strokeWeight,
                        }),
                    },
                },
            },
        }

        const drawTask = new AllLabelButtonDrawTask({
            buttonLogic: buttonLogic,
            dataBlob: allLabelButtonDataBlob,
        })

        uiObjects.toggleMenuButton = new Button({
            id: "debugModeToggleButton",
            drawTask,
            buttonLogic,
        })
        this.dataBlob.setUIObjects(uiObjects)

        return true
    }
}
