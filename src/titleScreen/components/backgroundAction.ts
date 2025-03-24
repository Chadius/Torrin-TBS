import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { RectangleService } from "../../ui/rectangle/rectangle"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    TitleScreenContext,
    TitleScreenLayout,
    TitleScreenUIObjects,
} from "../titleScreen"
import { ComponentDataBlob } from "../../utils/dataBlob/componentDataBlob"

export class TitleScreenCreateBackgroundAction implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        TitleScreenLayout,
        TitleScreenContext,
        TitleScreenUIObjects
    >

    constructor(
        data: ComponentDataBlob<
            TitleScreenLayout,
            TitleScreenContext,
            TitleScreenUIObjects
        >
    ) {
        this.dataBlob = data
    }

    run() {
        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()
        const layout: TitleScreenLayout = this.dataBlob.getLayout()

        uiObjects.background = RectangleService.new({
            area: RectAreaService.new({
                left: 0,
                top: 0,
                width: ScreenDimensions.SCREEN_WIDTH,
                height: ScreenDimensions.SCREEN_HEIGHT,
            }),
            fillColor: layout.colors.background,
        })

        this.dataBlob.setUIObjects(uiObjects)
        return true
    }
}
