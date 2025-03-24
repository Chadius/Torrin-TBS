import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { ImageUI, ImageUILoadingBehavior } from "../../ui/imageUI/imageUI"
import { RectAreaService } from "../../ui/rectArea"
import { WINDOW_SPACING } from "../../ui/constants"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    TitleScreenContext,
    TitleScreenLayout,
    TitleScreenUIObjects,
} from "../titleScreen"
import { ComponentDataBlob } from "../../utils/dataBlob/componentDataBlob"

export class TitleScreenCreateTitleBannerAction implements BehaviorTreeTask {
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

        this.dataBlob.setUIObjects(uiObjects)
        return true
    }
}
