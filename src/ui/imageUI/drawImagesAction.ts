import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { DataBlob } from "../../utils/dataBlob/dataBlob"
import { ImageUI } from "./imageUI"
import { ResourceHandler } from "../../resource/resourceHandler"

export class DrawImagesAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    getImages: (dataBlob: DataBlob) => ImageUI[]
    getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer
    getResourceHandler: (dataBlob: DataBlob) => ResourceHandler

    constructor(
        dataBlob: DataBlob,
        getImages: (dataBlob: DataBlob) => ImageUI[],
        getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer,
        getResourceHandler: (dataBlob: DataBlob) => ResourceHandler
    ) {
        this.dataBlob = dataBlob
        this.getImages = getImages
        this.getGraphicsContext = getGraphicsContext
        this.getResourceHandler = getResourceHandler
    }

    run(): boolean {
        this.getImages(this.dataBlob).forEach((imageUi) => {
            imageUi.draw({
                graphicsContext: this.getGraphicsContext(this.dataBlob),
                resourceHandler: this.getResourceHandler(this.dataBlob),
            })
        })
        return true
    }

    clone(): BehaviorTreeTask {
        return new DrawImagesAction(
            this.dataBlob,
            this.getImages,
            this.getGraphicsContext,
            this.getResourceHandler
        )
    }
}
