import { ComponentDataBlob } from "../../utils/dataBlob/componentDataBlob"
import { CutsceneContext, CutsceneLayout, CutsceneUIObjects } from "../cutscene"
import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { Button } from "../../ui/button/button"
import {
    AllLabelButtonDataBlob,
    AllLabelButtonDrawTask,
} from "../../ui/button/style/AllLabelStyle/allLabelStyle"
import { ButtonStatus } from "../../ui/button/buttonStatus"
import { LabelService } from "../../ui/label"
import { ButtonLogicToggleOnPress } from "../../ui/button/logic/buttonLogicToggleOnPress"

export class CutsceneShouldCreateFastForwardButton implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        CutsceneLayout,
        CutsceneContext,
        CutsceneUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            CutsceneLayout,
            CutsceneContext,
            CutsceneUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: CutsceneUIObjects = this.dataBlob.getUIObjects()
        const fastForwardButton: Button = uiObjects.fastForwardButton
        return !fastForwardButton
    }
}

export class CutsceneCreateFastForwardButton implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        CutsceneLayout,
        CutsceneContext,
        CutsceneUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            CutsceneLayout,
            CutsceneContext,
            CutsceneUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: CutsceneUIObjects = this.dataBlob.getUIObjects()
        const layout: CutsceneLayout = this.dataBlob.getLayout()
        const context: CutsceneContext = this.dataBlob.getContext()

        const buttonLogic = new ButtonLogicToggleOnPress({
            dataBlob: context.buttonStatusChangeEventDataBlob,
        })
        const allLabelButtonDataBlob: AllLabelButtonDataBlob = {
            data: {
                layout: {
                    labelByButtonStatus: {
                        [ButtonStatus.TOGGLE_OFF]: LabelService.new({
                            area: layout.fastForwardButton.fastForwardIsOff
                                .drawingArea,
                            fillColor:
                                layout.fastForwardButton.fastForwardIsOff
                                    .fillColor,
                            strokeColor:
                                layout.fastForwardButton.fastForwardIsOff
                                    .strokeColor,
                            strokeWeight:
                                layout.fastForwardButton.fastForwardIsOff
                                    .strokeWeight,
                            text: layout.fastForwardButton.fastForwardIsOff
                                .text,
                            fontSize:
                                layout.fastForwardButton.fastForwardIsOff
                                    .fontSize,
                            horizAlign:
                                layout.fastForwardButton.fastForwardIsOff
                                    .horizAlign,
                            vertAlign:
                                layout.fastForwardButton.fastForwardIsOff
                                    .vertAlign,
                            fontColor:
                                layout.fastForwardButton.fastForwardIsOff
                                    .fontColor,
                            textBoxMargin:
                                layout.fastForwardButton.fastForwardIsOff
                                    .textBoxMargin,
                        }),
                        [ButtonStatus.TOGGLE_OFF_HOVER]: LabelService.new({
                            area: layout.fastForwardButton.fastForwardIsOff
                                .drawingArea,
                            fillColor:
                                layout.fastForwardButton.fastForwardIsOff
                                    .fillColor,
                            strokeColor:
                                layout.fastForwardButton.fastForwardIsOff.hover
                                    .strokeColor,
                            strokeWeight:
                                layout.fastForwardButton.fastForwardIsOff.hover
                                    .strokeWeight,
                            text: layout.fastForwardButton.fastForwardIsOff
                                .hover.text,
                            fontSize:
                                layout.fastForwardButton.fastForwardIsOff
                                    .fontSize,
                            horizAlign:
                                layout.fastForwardButton.fastForwardIsOff
                                    .horizAlign,
                            vertAlign:
                                layout.fastForwardButton.fastForwardIsOff
                                    .vertAlign,
                            fontColor:
                                layout.fastForwardButton.fastForwardIsOff
                                    .fontColor,
                            textBoxMargin:
                                layout.fastForwardButton.fastForwardIsOff
                                    .textBoxMargin,
                        }),
                        [ButtonStatus.TOGGLE_ON]: LabelService.new({
                            area: layout.fastForwardButton.fastForwardIsOn
                                .drawingArea,
                            fillColor:
                                layout.fastForwardButton.fastForwardIsOn
                                    .fillColor,
                            strokeColor:
                                layout.fastForwardButton.fastForwardIsOn
                                    .strokeColor,
                            strokeWeight:
                                layout.fastForwardButton.fastForwardIsOn
                                    .strokeWeight,
                            text: layout.fastForwardButton.fastForwardIsOn.text,
                            fontSize:
                                layout.fastForwardButton.fastForwardIsOn
                                    .fontSize,
                            horizAlign:
                                layout.fastForwardButton.fastForwardIsOn
                                    .horizAlign,
                            vertAlign:
                                layout.fastForwardButton.fastForwardIsOn
                                    .vertAlign,
                            fontColor:
                                layout.fastForwardButton.fastForwardIsOn
                                    .fontColor,
                            textBoxMargin:
                                layout.fastForwardButton.fastForwardIsOn
                                    .textBoxMargin,
                        }),
                        [ButtonStatus.TOGGLE_ON_HOVER]: LabelService.new({
                            area: layout.fastForwardButton.fastForwardIsOn
                                .drawingArea,
                            fillColor:
                                layout.fastForwardButton.fastForwardIsOn
                                    .fillColor,
                            strokeColor:
                                layout.fastForwardButton.fastForwardIsOn.hover
                                    .strokeColor,
                            strokeWeight:
                                layout.fastForwardButton.fastForwardIsOn.hover
                                    .strokeWeight,
                            text: layout.fastForwardButton.fastForwardIsOn.hover
                                .text,
                            fontSize:
                                layout.fastForwardButton.fastForwardIsOn
                                    .fontSize,
                            horizAlign:
                                layout.fastForwardButton.fastForwardIsOn
                                    .horizAlign,
                            vertAlign:
                                layout.fastForwardButton.fastForwardIsOn
                                    .vertAlign,
                            fontColor:
                                layout.fastForwardButton.fastForwardIsOn
                                    .fontColor,
                            textBoxMargin:
                                layout.fastForwardButton.fastForwardIsOn
                                    .textBoxMargin,
                        }),
                    },
                },
            },
        }

        const drawTask = new AllLabelButtonDrawTask({
            buttonLogic: buttonLogic,
            dataBlob: allLabelButtonDataBlob,
        })

        uiObjects.fastForwardButton = new Button({
            id: "CutsceneFastForward",
            drawTask,
            buttonLogic,
        })
        this.dataBlob.setUIObjects(uiObjects)

        return true
    }
}
