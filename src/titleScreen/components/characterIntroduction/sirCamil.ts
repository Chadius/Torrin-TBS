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

export class TitleScreenCreateSirCamilCharacterIntroductionIcon
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
        uiObjects.sirCamil.icon = this.createIcon()
        this.dataBlob.setUIObjects(uiObjects)
        return true
    }

    createIcon() {
        const layout: TitleScreenLayout = this.dataBlob.getLayout()
        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()

        return new ImageUI({
            imageLoadingBehavior: {
                resourceKey: layout.sirCamil.iconImageResourceKey,
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
        const nahlaIconArea = uiObjects.nahla.icon?.drawArea
        if (nahlaIconArea == undefined) {
            throw new Error("NahlaIconArea not found")
        }
        return RectAreaService.new({
            startColumn: layout.sirCamil.iconArea.startColumn,
            width: layout.sirCamil.iconArea.width,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top:
                RectAreaService.bottom(nahlaIconArea) + WINDOW_SPACING.SPACING1,
            height: layout.sirCamil.iconArea.height,
        })
    }
}

export class TitleScreenCreateSirCamilCharacterIntroductionDescriptionText
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
        uiObjects.sirCamil.descriptionText = this.createDescriptionText()
        this.dataBlob.setUIObjects(uiObjects)
        return true
    }

    createDescriptionText(): TextBox {
        const layout: TitleScreenLayout = this.dataBlob.getLayout()
        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()

        const imageDrawArea = uiObjects.sirCamil.icon?.drawArea
        if (imageDrawArea == undefined) {
            throw new Error("SirCamil icon area not found")
        }
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
            text: layout.sirCamil.descriptionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: layout.colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }
}
