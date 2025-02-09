import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { DataBlob } from "../../utils/dataBlob/dataBlob"
import { Button } from "./button"

export class DrawButtonsAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    getButtons: (dataBlob: DataBlob) => Button[]
    getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer

    constructor(
        dataBlob: DataBlob,
        getButtons: (dataBlob: DataBlob) => Button[],
        getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer
    ) {
        this.dataBlob = dataBlob
        this.getButtons = getButtons
        this.getGraphicsContext = getGraphicsContext
    }

    run(): boolean {
        this.getButtons(this.dataBlob).forEach((button) => {
            button.draw(this.getGraphicsContext(this.dataBlob))
        })
        return true
    }

    clone(): BehaviorTreeTask {
        return new DrawButtonsAction(
            this.dataBlob,
            this.getButtons,
            this.getGraphicsContext
        )
    }
}
