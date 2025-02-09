import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { ImageUI, ImageUILoadingBehavior } from "../../../ui/imageUI/imageUI"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { VERTICAL_ALIGN, WINDOW_SPACING } from "../../../ui/constants"
import { TextBox, TextBoxService } from "../../../ui/textBox/textBox"
import { TitleScreenLayout, TitleScreenUIObjects } from "../../titleScreen"

export class TitleScreenCreateDemonSlitherCharacterIntroductionIcon
    implements BehaviorTreeTask
{
    dataBlob: DataBlob

    constructor(dataBlob: DataBlob) {
        this.dataBlob = dataBlob
    }

    clone(): TitleScreenCreateDemonSlitherCharacterIntroductionIcon {
        return new TitleScreenCreateDemonSlitherCharacterIntroductionIcon(
            this.dataBlob
        )
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        uiObjects.demonSlither.icon = this.createIcon()
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
    dataBlob: DataBlob

    constructor(dataBlob: DataBlob) {
        this.dataBlob = dataBlob
    }

    clone(): TitleScreenCreateDemonSlitherCharacterIntroductionDescriptionText {
        return new TitleScreenCreateDemonSlitherCharacterIntroductionDescriptionText(
            this.dataBlob
        )
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        uiObjects.demonSlither.descriptionText = this.createDescriptionText()
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
