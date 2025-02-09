import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import { TextBoxService } from "../../ui/textBox/textBox"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { WINDOW_SPACING } from "../../ui/constants"
import {
    TitleScreenContext,
    TitleScreenLayout,
    TitleScreenUIObjects,
} from "../titleScreen"

export class TitleScreenCreateVersionTextBoxAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): TitleScreenCreateVersionTextBoxAction {
        return new TitleScreenCreateVersionTextBoxAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.dataBlob, "context")

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        uiObjects.versionTextBox = TextBoxService.new({
            area: RectAreaService.new({
                startColumn: layout.version.startColumn,
                endColumn: layout.version.endColumn,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                top: layout.version.top,
                bottom: layout.version.bottom,
                margin: WINDOW_SPACING.SPACING1,
            }),
            text: `Version ${context.version}`,
            fontSize: layout.version.fontSize,
            fontColor: layout.version.fontColor,
        })

        DataBlobService.add<TitleScreenUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}
