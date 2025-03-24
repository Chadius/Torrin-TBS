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

export class TitleScreenCreateTitleTextAction implements BehaviorTreeTask {
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

        this.dataBlob.setUIObjects(uiObjects)
        return true
    }
}
