import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { Blackboard } from "../../utils/blackboard/blackboard"
import { TextBox, TextBoxService } from "./textBox"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"

export class DrawTextBoxesAction implements BehaviorTreeTask {
    blackboard: Blackboard
    getTextBoxes: (blackboard: Blackboard) => TextBox[]
    getGraphicsContext: (blackboard: Blackboard) => GraphicsBuffer

    constructor(
        blackboard: Blackboard,
        getTextBoxes: (blackboard: Blackboard) => TextBox[],
        getGraphicsContext: (blackboard: Blackboard) => GraphicsBuffer
    ) {
        this.blackboard = blackboard
        this.getTextBoxes = getTextBoxes
        this.getGraphicsContext = getGraphicsContext
    }

    run(): boolean {
        this.getTextBoxes(this.blackboard).forEach((textBox) => {
            TextBoxService.draw(
                textBox,
                this.getGraphicsContext(this.blackboard)
            )
        })
        return true
    }

    clone(): BehaviorTreeTask {
        return new DrawTextBoxesAction(
            this.blackboard,
            this.getTextBoxes,
            this.getGraphicsContext
        )
    }
}
