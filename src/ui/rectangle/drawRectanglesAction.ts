import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob } from "../../utils/dataBlob/dataBlob"
import { Rectangle, RectangleService } from "./rectangle"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"

export class DrawRectanglesAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    getRectangles: (dataBlob: DataBlob) => Rectangle[]
    getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer

    constructor(
        dataBlob: DataBlob,
        getRectangles: (dataBlob: DataBlob) => Rectangle[],
        getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer
    ) {
        this.dataBlob = dataBlob
        this.getRectangles = getRectangles
        this.getGraphicsContext = getGraphicsContext
    }

    run(): boolean {
        const rectangles = this.getRectangles(this.dataBlob)
        const graphicsContext = this.getGraphicsContext(this.dataBlob)
        if (rectangles?.length === 0 || !graphicsContext) return false
        rectangles.forEach((rectangle) =>
            RectangleService.draw(rectangle, graphicsContext)
        )
        return true
    }
}
