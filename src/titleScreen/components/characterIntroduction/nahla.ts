import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { TextBoxService } from "../../../ui/textBox/textBox"
import { VERTICAL_ALIGN, WINDOW_SPACING } from "../../../ui/constants"
import { ImageUI, ImageUILoadingBehavior } from "../../../ui/imageUI/imageUI"
import {
    TitleScreenContext,
    TitleScreenLayout,
    TitleScreenUIObjects,
} from "../../titleScreen"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"

export class TitleScreenCreateNahlaCharacterIntroductionIcon
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
        uiObjects.nahla.icon = this.createIcon()
        this.dataBlob.setUIObjects(uiObjects)
        return true
    }

    createIcon() {
        const layout: TitleScreenLayout = this.dataBlob.getLayout()
        return new ImageUI({
            imageLoadingBehavior: {
                resourceKey: layout.nahla.iconImageResourceKey,
                loadingBehavior:
                    ImageUILoadingBehavior.KEEP_AREA_WIDTH_USE_ASPECT_RATIO,
            },
            area: this.getIconRectArea(layout),
        })
    }

    getIconRectArea(layout: TitleScreenLayout): RectArea {
        return RectAreaService.new({
            startColumn: layout.nahla.iconArea.startColumn,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            width: layout.nahla.iconArea.width,
            top: layout.nahla.iconArea.top,
            height: layout.nahla.iconArea.height,
        })
    }
}

export class TitleScreenCreateNahlaCharacterIntroductionDescriptionText
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
        uiObjects.nahla.descriptionText = this.createDescriptionText()
        this.dataBlob.setUIObjects(uiObjects)
        return true
    }

    createDescriptionText() {
        const layout: TitleScreenLayout = this.dataBlob.getLayout()
        const iconArea: RectArea = RectAreaService.new({
            startColumn: layout.nahla.iconArea.startColumn,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            width: layout.nahla.iconArea.width,
            top: layout.nahla.iconArea.top,
            height: layout.nahla.iconArea.height,
        })

        return TextBoxService.new({
            area: RectAreaService.new({
                left: RectAreaService.right(iconArea) + WINDOW_SPACING.SPACING1,
                top: layout.nahla.iconArea.top,
                height: layout.nahla.iconArea.height,
                width:
                    ScreenDimensions.SCREEN_WIDTH -
                    RectAreaService.right(iconArea) -
                    WINDOW_SPACING.SPACING2,
            }),
            text: layout.nahla.descriptionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: layout.colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }
}
