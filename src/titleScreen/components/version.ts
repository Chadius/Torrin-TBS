import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { TextBoxService } from "../../ui/textBox/textBox"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { WINDOW_SPACING } from "../../ui/constants"
import {
    TitleScreenContext,
    TitleScreenLayout,
    TitleScreenUIObjects,
} from "../titleScreen"
import { ComponentDataBlob } from "../../utils/dataBlob/componentDataBlob"

export class TitleScreenCreateVersionTextBoxAction implements BehaviorTreeTask {
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
        const context: TitleScreenContext = this.dataBlob.getContext()
        const layout: TitleScreenLayout = this.dataBlob.getLayout()

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

        this.dataBlob.setUIObjects(uiObjects)
        return true
    }
}
