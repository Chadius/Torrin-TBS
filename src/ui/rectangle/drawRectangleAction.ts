import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob } from "../../utils/dataBlob/dataBlob"
import { Rectangle, RectangleService } from "./rectangle"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"

export class DrawRectangleAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    getRectangle: (dataBlob: DataBlob) => Rectangle
    getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer

    constructor(
        dataBlob: DataBlob,
        getBackground: (dataBlob: DataBlob) => Rectangle,
        getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer
    ) {
        this.dataBlob = dataBlob
        this.getRectangle = getBackground
        this.getGraphicsContext = getGraphicsContext
    }

    run(): boolean {
        const background = this.getRectangle(this.dataBlob)
        const graphicsContext = this.getGraphicsContext(this.dataBlob)
        if (!background || !graphicsContext) return false

        RectangleService.draw(background, graphicsContext)
        return true
    }

    clone(): DrawRectangleAction {
        return new DrawRectangleAction(
            this.dataBlob,
            this.getRectangle,
            this.getGraphicsContext
        )
    }
}
