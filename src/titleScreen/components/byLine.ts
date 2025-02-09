import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import { TextBoxService } from "../../ui/textBox/textBox"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { WINDOW_SPACING } from "../../ui/constants"
import { TitleScreenLayout, TitleScreenUIObjects } from "../titleScreen"

export class TitleScreenCreateByLineAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): TitleScreenCreateByLineAction {
        return new TitleScreenCreateByLineAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        uiObjects.byLine = TextBoxService.new({
            area: RectAreaService.new({
                startColumn: layout.byLine.startColumn,
                endColumn: layout.byLine.endColumn,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                top:
                    ScreenDimensions.SCREEN_HEIGHT * layout.byLine.screenHeight,
                bottom:
                    ScreenDimensions.SCREEN_HEIGHT *
                        layout.byLine.screenHeight +
                    WINDOW_SPACING.SPACING4,
            }),
            text: "by Chad Serrant",
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
