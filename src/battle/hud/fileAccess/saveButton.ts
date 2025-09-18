import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import {
    FileAccessHUDContext,
    FileAccessHUDData,
    FileAccessHUDLayout,
    FileAccessHUDUIObjects,
} from "./fileAccessHUD"
import { Button } from "../../../ui/button/button"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { ButtonLogicChangeOnRelease } from "../../../ui/button/logic/buttonLogicChangeOnRelease"
import {
    AllLabelButtonDataBlob,
    AllLabelButtonDrawTask,
} from "../../../ui/button/style/AllLabelStyle/allLabelStyle"
import { ButtonStatus } from "../../../ui/button/buttonStatus"
import { LabelService } from "../../../ui/label"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../../ui/constants"

export class FileAccessHUDShouldCreateSaveButton implements BehaviorTreeTask {
    dataBlob: FileAccessHUDData

    constructor(dataBlob: FileAccessHUDData) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: FileAccessHUDUIObjects = this.dataBlob.getUIObjects()
        return uiObjects.saveButton == undefined
    }
}

export class FileAccessHUDCreateSaveButton implements BehaviorTreeTask {
    dataBlob: FileAccessHUDData

    constructor(dataBlob: FileAccessHUDData) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: FileAccessHUDUIObjects = this.dataBlob.getUIObjects()
        const layout: FileAccessHUDLayout = this.dataBlob.getLayout()
        const context: FileAccessHUDContext = this.dataBlob.getContext()

        const saveButtonArea: RectArea = RectAreaService.new({
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            ...layout.saveButton.drawingArea,
        })
        const buttonLogic = new ButtonLogicChangeOnRelease({
            dataBlob: context.buttonStatusChangeEventDataBlob,
        })
        const allLabelButtonDataBlob: AllLabelButtonDataBlob = {
            data: {
                layout: {
                    labelByButtonStatus: {
                        [ButtonStatus.READY]: LabelService.new({
                            area: saveButtonArea,
                            fontColor: layout.saveButton.fontColor,
                            textBoxMargin: layout.saveButton.padding,
                            text: layout.saveButton.text,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.saveButton.fontSize,
                            fillColor:
                                layout.saveButton.readyStatusStyle.fillColor,
                            strokeColor:
                                layout.saveButton.readyStatusStyle.strokeColor,
                            strokeWeight:
                                layout.saveButton.readyStatusStyle.strokeWeight,
                        }),
                        [ButtonStatus.HOVER]: LabelService.new({
                            area: saveButtonArea,
                            fontColor: layout.saveButton.fontColor,
                            textBoxMargin: layout.saveButton.padding,
                            text: layout.saveButton.text,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.saveButton.fontSize,
                            fillColor:
                                layout.saveButton.hoverStatusStyle.fillColor,
                            strokeColor:
                                layout.saveButton.hoverStatusStyle.strokeColor,
                            strokeWeight:
                                layout.saveButton.hoverStatusStyle.strokeWeight,
                        }),
                        [ButtonStatus.ACTIVE]: LabelService.new({
                            area: saveButtonArea,
                            fontColor: layout.saveButton.fontColor,
                            textBoxMargin: layout.saveButton.padding,
                            text: layout.saveButton.text,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.saveButton.fontSize,
                            fillColor:
                                layout.saveButton.activeStatusStyle.fillColor,
                            strokeColor:
                                layout.saveButton.activeStatusStyle.strokeColor,
                            strokeWeight:
                                layout.saveButton.activeStatusStyle
                                    .strokeWeight,
                        }),
                        [ButtonStatus.DISABLED]: LabelService.new({
                            area: saveButtonArea,
                            fontColor: layout.saveButton.fontColor,
                            textBoxMargin: layout.saveButton.padding,
                            text: layout.saveButton.text,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.saveButton.fontSize,
                            fillColor:
                                layout.saveButton.disabledStatusStyle.fillColor,
                            strokeColor:
                                layout.saveButton.disabledStatusStyle
                                    .strokeColor,
                            strokeWeight:
                                layout.saveButton.disabledStatusStyle
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

        uiObjects.saveButton = new Button({
            id: "fileAccessHUDStart",
            drawTask,
            buttonLogic,
        })
        this.dataBlob.setUIObjects(uiObjects)

        return true
    }
}
