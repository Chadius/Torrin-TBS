import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { ImageUI, ImageUILoadingBehavior } from "../../../ui/imageUI/imageUI"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { VERTICAL_ALIGN, WINDOW_SPACING } from "../../../ui/constants"
import { TitleScreenLayout, TitleScreenUIObjects } from "../../titleScreen"
import { TextBox, TextBoxService } from "../../../ui/textBox/textBox"

export class TitleScreenCreateDemonLocustCharacterIntroductionIcon
    implements BehaviorTreeTask
{
    dataBlob: DataBlob

    constructor(dataBlob: DataBlob) {
        this.dataBlob = dataBlob
    }

    clone(): TitleScreenCreateDemonLocustCharacterIntroductionIcon {
        return new TitleScreenCreateDemonLocustCharacterIntroductionIcon(
            this.dataBlob
        )
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        uiObjects.demonLocust.icon = this.createIcon()
        DataBlobService.add<TitleScreenUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }

    createIcon() {
        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        return new ImageUI({
            imageLoadingBehavior: {
                resourceKey: layout.demonLocust.iconImageResourceKey,
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
        const demonSlitherIconArea = uiObjects.demonSlither.icon.drawArea

        return RectAreaService.new({
            startColumn: layout.demonLocust.iconArea.startColumn,
            endColumn: layout.demonLocust.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top:
                RectAreaService.bottom(demonSlitherIconArea) +
                WINDOW_SPACING.SPACING1,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
            width: layout.demonLocust.iconArea.width,
        })
    }
}

export class TitleScreenCreateDemonLocustCharacterIntroductionDescriptionText
    implements BehaviorTreeTask
{
    dataBlob: DataBlob

    constructor(dataBlob: DataBlob) {
        this.dataBlob = dataBlob
    }

    clone(): TitleScreenCreateDemonLocustCharacterIntroductionDescriptionText {
        return new TitleScreenCreateDemonLocustCharacterIntroductionDescriptionText(
            this.dataBlob
        )
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        uiObjects.demonLocust.descriptionText = this.createDescriptionText()
        DataBlobService.add<TitleScreenUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }

    createDescriptionText(): TextBox {
        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const imageDrawArea = uiObjects.demonLocust.icon.drawArea

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
            text: layout.demonLocust.descriptionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: layout.colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }
}
