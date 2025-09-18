import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { TextBoxService } from "../../ui/textBox/textBox"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    TitleScreenContext,
    TitleScreenLayout,
    TitleScreenUIObjects,
} from "../titleScreen"
import { ComponentDataBlob } from "../../utils/dataBlob/componentDataBlob"

export class TitleScreenCreateDebugModeTextBoxAction
    implements BehaviorTreeTask
{
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
        if (process.env.DEBUG !== "true") return false

        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()
        const layout: TitleScreenLayout = this.dataBlob.getLayout()

        uiObjects.debugModeTextBox = TextBoxService.new({
            area: RectAreaService.new({
                startColumn: layout.debugMode.startColumn,
                endColumn: layout.debugMode.endColumn,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                top: layout.debugMode.top,
                height: layout.debugMode.height,
            }),
            text: `DEBUG MODE`,
            fontSize: layout.debugMode.fontSize,
            fontColor: layout.debugMode.fontColor,
        })

        this.dataBlob.setUIObjects(uiObjects)
        return true
    }
}
