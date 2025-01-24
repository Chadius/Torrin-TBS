import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { TextBox, TextBoxService } from "./textBox"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { DataBlob } from "../../utils/dataBlob/dataBlob"

export class DrawTextBoxesAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    getTextBoxes: (blackboard: DataBlob) => TextBox[]
    getGraphicsContext: (blackboard: DataBlob) => GraphicsBuffer

    constructor(
        blackboard: DataBlob,
        getTextBoxes: (blackboard: DataBlob) => TextBox[],
        getGraphicsContext: (blackboard: DataBlob) => GraphicsBuffer
    ) {
        this.dataBlob = blackboard
        this.getTextBoxes = getTextBoxes
        this.getGraphicsContext = getGraphicsContext
    }

    run(): boolean {
        this.getTextBoxes(this.dataBlob).forEach((textBox) => {
            TextBoxService.draw(textBox, this.getGraphicsContext(this.dataBlob))
        })
        return true
    }

    clone(): BehaviorTreeTask {
        return new DrawTextBoxesAction(
            this.dataBlob,
            this.getTextBoxes,
            this.getGraphicsContext
        )
    }
}
