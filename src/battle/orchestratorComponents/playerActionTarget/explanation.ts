import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { Label, LabelService } from "../../../ui/label"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../../ui/constants"
import {
    PlayerActionTargetContext,
    PlayerActionTargetLayout,
    PlayerActionTargetUIObjects,
} from "./battlePlayerSquaddieTarget"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"

export class PlayerActionTargetShouldCreateExplanationLabel
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
        const explanationLabel: Label = uiObjects.explanationLabel
        if (!explanationLabel) return true

        const context: PlayerActionTargetContext = this.dataBlob.getContext()
        return explanationLabel.textBox.text != context.explanationLabelText
    }
}

export class PlayerActionTargetCreateExplanationLabel
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
        const layout: PlayerActionTargetLayout = this.dataBlob.getLayout()
        const context: PlayerActionTargetContext = this.dataBlob.getContext()
        uiObjects.explanationLabel = this.createExplanationLabel(
            layout,
            context
        )
        this.dataBlob.setUIObjects(uiObjects)
        return true
    }

    createExplanationLabel(
        layout: PlayerActionTargetLayout,
        context: PlayerActionTargetContext
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
