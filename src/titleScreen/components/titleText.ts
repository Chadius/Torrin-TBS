import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import { TextBoxService } from "../../ui/textBox/textBox"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { WINDOW_SPACING } from "../../ui/constants"
import { TitleScreenLayout, TitleScreenUIObjects } from "../titleScreen"

export class TitleScreenCreateTitleTextAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): TitleScreenCreateTitleTextAction {
        return new TitleScreenCreateTitleTextAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        uiObjects.titleText = TextBoxService.new({
            area: RectAreaService.new({
                startColumn: layout.title.startColumn,
                endColumn: layout.title.endColumn,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                top: ScreenDimensions.SCREEN_HEIGHT * layout.title.screenHeight,
                height: WINDOW_SPACING.SPACING4,
            }),
            text: "Lady of Arid Tranquility",
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: layout.colors.backgroundText,
        })

        DataBlobService.add<TitleScreenUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}
