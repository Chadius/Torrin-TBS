import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { TextBoxService } from "../../../ui/textBox/textBox"
import { VERTICAL_ALIGN, WINDOW_SPACING } from "../../../ui/constants"
import { ImageUI, ImageUILoadingBehavior } from "../../../ui/imageUI/imageUI"
import { TitleScreenLayout, TitleScreenUIObjects } from "../../titleScreen"

export class TitleScreenCreateNahlaCharacterIntroductionIcon
    implements BehaviorTreeTask
{
    dataBlob: DataBlob

    constructor(dataBlob: DataBlob) {
        this.dataBlob = dataBlob
    }

    clone(): TitleScreenCreateNahlaCharacterIntroductionIcon {
        return new TitleScreenCreateNahlaCharacterIntroductionIcon(
            this.dataBlob
        )
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        uiObjects.nahla.icon = this.createIcon()
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
    dataBlob: DataBlob

    constructor(dataBlob: DataBlob) {
        this.dataBlob = dataBlob
    }

    clone(): TitleScreenCreateNahlaCharacterIntroductionDescriptionText {
        return new TitleScreenCreateNahlaCharacterIntroductionDescriptionText(
            this.dataBlob
        )
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        uiObjects.nahla.descriptionText = this.createDescriptionText()
        DataBlobService.add<TitleScreenUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }

    createDescriptionText() {
        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

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
