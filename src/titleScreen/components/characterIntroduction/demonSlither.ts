import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { ImageUI, ImageUILoadingBehavior } from "../../../ui/imageUI/imageUI"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { VERTICAL_ALIGN, WINDOW_SPACING } from "../../../ui/constants"
import { TextBox, TextBoxService } from "../../../ui/textBox/textBox"
import {
    TitleScreenContext,
    TitleScreenLayout,
    TitleScreenUIObjects,
} from "../../titleScreen"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"

export class TitleScreenCreateDemonSlitherCharacterIntroductionIcon
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        TitleScreenLayout,
        TitleScreenContext,
        TitleScreenUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            TitleScreenLayout,
            TitleScreenContext,
            TitleScreenUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()
        uiObjects.demonSlither.icon = this.createIcon()
        this.dataBlob.setUIObjects(uiObjects)
        return true
    }

    createIcon() {
        const layout: TitleScreenLayout = this.dataBlob.getLayout()
        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()
        return new ImageUI({
            imageLoadingBehavior: {
                resourceKey: layout.demonSlither.iconImageResourceKey,
                loadingBehavior:
                    ImageUILoadingBehavior.KEEP_AREA_WIDTH_USE_ASPECT_RATIO,
            },
            area: this.getIconRectArea(layout, uiObjects),
        })
    }

    getIconRectArea(
        layout: TitleScreenLayout,
        uiObjects: TitleScreenUIObjects
    ): RectArea {
        const sirCamilIconArea = uiObjects.sirCamil.icon.drawArea

        return RectAreaService.new({
            startColumn: layout.demonSlither.iconArea.startColumn,
            endColumn: layout.demonSlither.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top:
                RectAreaService.bottom(sirCamilIconArea) +
                WINDOW_SPACING.SPACING1,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
            width: layout.demonSlither.iconArea.width,
        })
    }
}

export class TitleScreenCreateDemonSlitherCharacterIntroductionDescriptionText
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        TitleScreenLayout,
        TitleScreenContext,
        TitleScreenUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            TitleScreenLayout,
            TitleScreenContext,
            TitleScreenUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()
        uiObjects.demonSlither.descriptionText = this.createDescriptionText()
        this.dataBlob.setUIObjects(uiObjects)
        return true
    }

    createDescriptionText(): TextBox {
        const layout: TitleScreenLayout = this.dataBlob.getLayout()
        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()

        const imageDrawArea = uiObjects.demonSlither.icon.drawArea

        return TextBoxService.new({
            area: RectAreaService.new({
                left:
                    RectAreaService.right(imageDrawArea) +
                    WINDOW_SPACING.SPACING1,
                top: imageDrawArea.top,
                height: imageDrawArea.height,
                width:
                    ScreenDimensions.SCREEN_WIDTH -
                    RectAreaService.right(imageDrawArea),
                margin: [0, 0, 0, WINDOW_SPACING.SPACING1],
            }),
            text: layout.demonSlither.descriptionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: layout.colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }
}
