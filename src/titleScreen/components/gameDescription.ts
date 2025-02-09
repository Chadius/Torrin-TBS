import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import { TextBoxService } from "../../ui/textBox/textBox"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { WINDOW_SPACING } from "../../ui/constants"
import { TitleScreenLayout, TitleScreenUIObjects } from "../titleScreen"

export class TitleScreenCreateGameDescriptionAction
    implements BehaviorTreeTask
{
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): TitleScreenCreateGameDescriptionAction {
        return new TitleScreenCreateGameDescriptionAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        uiObjects.gameDescription = TextBoxService.new({
            area: RectAreaService.new({
                startColumn: layout.gameDescription.startColumn,
                endColumn: layout.gameDescription.endColumn,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                top:
                    ScreenDimensions.SCREEN_HEIGHT *
                    layout.gameDescription.screenHeightTop,
                bottom:
                    ScreenDimensions.SCREEN_HEIGHT *
                    layout.gameDescription.screenHeightBottom,
                margin: WINDOW_SPACING.SPACING1,
            }),
            text: layout.gameDescription.text,
            fontSize: WINDOW_SPACING.SPACING4,
            fontColor: layout.colors.descriptionText,
        })

        DataBlobService.add<TitleScreenUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}
