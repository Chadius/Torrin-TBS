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

export class FileAccessHUDShouldCreateLoadButton implements BehaviorTreeTask {
    dataBlob: FileAccessHUDData

    constructor(dataBlob: FileAccessHUDData) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: FileAccessHUDUIObjects = this.dataBlob.getUIObjects()
        return uiObjects.loadButton == undefined
    }
}

export class FileAccessHUDCreateLoadButton implements BehaviorTreeTask {
    dataBlob: FileAccessHUDData

    constructor(dataBlob: FileAccessHUDData) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: FileAccessHUDUIObjects = this.dataBlob.getUIObjects()
        const layout: FileAccessHUDLayout = this.dataBlob.getLayout()
        const context: FileAccessHUDContext = this.dataBlob.getContext()

        const loadButtonArea: RectArea = RectAreaService.new({
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            ...layout.loadButton.drawingArea,
        })
        const buttonLogic = new ButtonLogicChangeOnRelease({
            dataBlob: context.buttonStatusChangeEventDataBlob,
        })
        const allLabelButtonDataBlob: AllLabelButtonDataBlob = {
            data: {
                layout: {
                    labelByButtonStatus: {
                        [ButtonStatus.READY]: LabelService.new({
                            area: loadButtonArea,
                            fontColor: layout.loadButton.fontColor,
                            textBoxMargin: layout.loadButton.padding,
                            text: layout.loadButton.text,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.loadButton.fontSize,
                            fillColor:
                                layout.loadButton.readyStatusStyle.fillColor,
                            strokeColor:
                                layout.loadButton.readyStatusStyle.strokeColor,
                            strokeWeight:
                                layout.loadButton.readyStatusStyle.strokeWeight,
                        }),
                        [ButtonStatus.HOVER]: LabelService.new({
                            area: loadButtonArea,
                            fontColor: layout.loadButton.fontColor,
                            textBoxMargin: layout.loadButton.padding,
                            text: layout.loadButton.text,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.loadButton.fontSize,
                            fillColor:
                                layout.loadButton.hoverStatusStyle.fillColor,
                            strokeColor:
                                layout.loadButton.hoverStatusStyle.strokeColor,
                            strokeWeight:
                                layout.loadButton.hoverStatusStyle.strokeWeight,
                        }),
                        [ButtonStatus.ACTIVE]: LabelService.new({
                            area: loadButtonArea,
                            fontColor: layout.loadButton.fontColor,
                            textBoxMargin: layout.loadButton.padding,
                            text: layout.loadButton.text,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.loadButton.fontSize,
                            fillColor:
                                layout.loadButton.activeStatusStyle.fillColor,
                            strokeColor:
                                layout.loadButton.activeStatusStyle.strokeColor,
                            strokeWeight:
                                layout.loadButton.activeStatusStyle
                                    .strokeWeight,
                        }),
                        [ButtonStatus.DISABLED]: LabelService.new({
                            area: loadButtonArea,
                            fontColor: layout.loadButton.fontColor,
                            textBoxMargin: layout.loadButton.padding,
                            text: layout.loadButton.text,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            fontSize: layout.loadButton.fontSize,
                            fillColor:
                                layout.loadButton.disabledStatusStyle.fillColor,
                            strokeColor:
                                layout.loadButton.disabledStatusStyle
                                    .strokeColor,
                            strokeWeight:
                                layout.loadButton.disabledStatusStyle
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

        uiObjects.loadButton = new Button({
            id: "fileAccessHUDLoad",
            drawTask,
            buttonLogic,
        })
        this.dataBlob.setUIObjects(uiObjects)

        return true
    }
}
