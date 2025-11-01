import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { DataBlob } from "../../utils/dataBlob/dataBlob"
import { ImageUI } from "./imageUI"
import { ResourceRepository } from "../../resource/resourceRepository.ts"

export class DrawImagesAction implements BehaviorTreeTask {
    dataBlob: DataBlob
    getImages: (dataBlob: DataBlob) => ImageUI[]
    getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer
    getResourceRepository: (dataBlob: DataBlob) => ResourceRepository

    constructor(
        dataBlob: DataBlob,
        getImages: (dataBlob: DataBlob) => ImageUI[],
        getGraphicsContext: (dataBlob: DataBlob) => GraphicsBuffer,
        getResourceRepository: (dataBlob: DataBlob) => ResourceRepository
    ) {
        this.dataBlob = dataBlob
        this.getImages = getImages
        this.getGraphicsContext = getGraphicsContext
        this.getResourceRepository = getResourceRepository
    }

    run(): boolean {
        this.getImages(this.dataBlob).forEach((imageUi) => {
            imageUi.draw({
                graphicsContext: this.getGraphicsContext(this.dataBlob),
                resourceRepository: this.getResourceRepository(this.dataBlob),
            })
        })
        return true
    }
}
