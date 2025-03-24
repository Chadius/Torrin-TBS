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

export class TitleScreenCreateGameDescriptionAction
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
        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()
        const layout: TitleScreenLayout = this.dataBlob.getLayout()

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

        this.dataBlob.setUIObjects(uiObjects)
        return true
    }
}
