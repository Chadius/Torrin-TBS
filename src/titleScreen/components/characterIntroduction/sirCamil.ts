import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { ImageUI, ImageUILoadingBehavior } from "../../../ui/imageUI/imageUI"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { VERTICAL_ALIGN, WINDOW_SPACING } from "../../../ui/constants"
import { TextBox, TextBoxService } from "../../../ui/textBox/textBox"
import { TitleScreenLayout, TitleScreenUIObjects } from "../../titleScreen"

export class TitleScreenCreateSirCamilCharacterIntroductionIcon
    implements BehaviorTreeTask
{
    dataBlob: DataBlob

    constructor(dataBlob: DataBlob) {
        this.dataBlob = dataBlob
    }

    clone(): TitleScreenCreateSirCamilCharacterIntroductionIcon {
        return new TitleScreenCreateSirCamilCharacterIntroductionIcon(
            this.dataBlob
        )
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        uiObjects.sirCamil.icon = this.createIcon()
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
        const nahlaIconArea = uiObjects.nahla.icon.drawArea

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
    dataBlob: DataBlob

    constructor(dataBlob: DataBlob) {
        this.dataBlob = dataBlob
    }

    clone(): TitleScreenCreateSirCamilCharacterIntroductionDescriptionText {
        return new TitleScreenCreateSirCamilCharacterIntroductionDescriptionText(
            this.dataBlob
        )
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        uiObjects.sirCamil.descriptionText = this.createDescriptionText()
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

        const imageDrawArea = uiObjects.sirCamil.icon.drawArea

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
