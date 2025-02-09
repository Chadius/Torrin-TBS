import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import { RectangleService } from "../../ui/rectangle/rectangle"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { TitleScreenLayout, TitleScreenUIObjects } from "../titleScreen"

export class TitleScreenCreateBackgroundAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): TitleScreenCreateBackgroundAction {
        return new TitleScreenCreateBackgroundAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        uiObjects.background = RectangleService.new({
            area: RectAreaService.new({
                left: 0,
                top: 0,
                width: ScreenDimensions.SCREEN_WIDTH,
                height: ScreenDimensions.SCREEN_HEIGHT,
            }),
            fillColor: layout.colors.background,
        })

        DataBlobService.add<TitleScreenUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}
