import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { DataBlob } from "../../utils/dataBlob/dataBlob"
import { DEPRECATEDButton } from "./DEPRECATEDButton"

export class DrawDEPRECATEDButtonsAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    getButtons: (dataBlob: DataBlob) => DEPRECATEDButton[]
    getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer

    constructor(
        dataBlob: DataBlob,
        getButtons: (dataBlob: DataBlob) => DEPRECATEDButton[],
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
        return new DrawDEPRECATEDButtonsAction(
            this.dataBlob,
            this.getButtons,
            this.getGraphicsContext
        )
    }
}
