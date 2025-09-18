import { BehaviorTreeTask } from "../../../../utils/behaviorTree/task"
import { Label, LabelService } from "../../../../ui/label"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../../../ui/constants"
import { ComponentDataBlob } from "../../../../utils/dataBlob/componentDataBlob"
import { PlayerActionTargetLayout } from "./playerActionTargetLayout"
import { PlayerActionTargetStateMachineUIObjects } from "../playerActionTargetStateMachineUIObjects"
import { PlayerActionTargetStateMachineContext } from "../playerActionTargetStateMachineContext"

export class PlayerActionTargetShouldCreateExplanationLabel
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
        const explanationLabel = uiObjects.selectTarget?.explanationLabel
        if (!explanationLabel) return true

        const context: PlayerActionTargetStateMachineContext =
            this.dataBlob.getContext()
        return explanationLabel.textBox.text != context.explanationLabelText
    }
}

export class PlayerActionTargetCreateExplanationLabel
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
        const layout: PlayerActionTargetLayout = this.dataBlob.getLayout()
        const context: PlayerActionTargetStateMachineContext =
            this.dataBlob.getContext()
        uiObjects.selectTarget!.explanationLabel = this.createExplanationLabel(
            layout,
            context
        )
        this.dataBlob.setUIObjects(uiObjects)
        return true
    }

    createExplanationLabel(
        layout: PlayerActionTargetLayout,
        context: PlayerActionTargetStateMachineContext
    ): Label {
        return LabelService.new({
            ...layout.targetExplanationLabel,
            text: context.explanationLabelText,
            fontSize: layout.targetExplanationLabel.fontSize,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }
}
