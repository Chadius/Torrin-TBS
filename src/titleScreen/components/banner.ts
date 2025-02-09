import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import { ImageUI, ImageUILoadingBehavior } from "../../ui/imageUI/imageUI"
import { RectAreaService } from "../../ui/rectArea"
import { WINDOW_SPACING } from "../../ui/constants"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { TitleScreenLayout, TitleScreenUIObjects } from "../titleScreen"

export class TitleScreenCreateTitleBannerAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): TitleScreenCreateTitleBannerAction {
        return new TitleScreenCreateTitleBannerAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        uiObjects.titleBanner = new ImageUI({
            imageLoadingBehavior: {
                resourceKey: layout.logo.iconImageResourceKey,
                loadingBehavior:
                    ImageUILoadingBehavior.KEEP_AREA_HEIGHT_USE_ASPECT_RATIO,
            },
            area: RectAreaService.new({
                left: WINDOW_SPACING.SPACING1,
                top: WINDOW_SPACING.SPACING1,
                height:
                    ScreenDimensions.SCREEN_HEIGHT * layout.logo.screenHeight,
                width: 0,
            }),
        })

        DataBlobService.add<TitleScreenUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}
