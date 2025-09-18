import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { TextBox, TextBoxService } from "./textBox"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { DataBlob } from "../../utils/dataBlob/dataBlob"

export class DrawTextBoxesAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    getTextBoxes: (dataBlob: DataBlob) => TextBox[]
    getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer

    constructor(
        dataBlob: DataBlob,
        getTextBoxes: (dataBlob: DataBlob) => TextBox[],
        getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer
    ) {
        this.dataBlob = dataBlob
        this.getTextBoxes = getTextBoxes
        this.getGraphicsContext = getGraphicsContext
    }

    run(): boolean {
        this.getTextBoxes(this.dataBlob).forEach((textBox) => {
            TextBoxService.draw(textBox, this.getGraphicsContext(this.dataBlob))
        })
        return true
    }
}
