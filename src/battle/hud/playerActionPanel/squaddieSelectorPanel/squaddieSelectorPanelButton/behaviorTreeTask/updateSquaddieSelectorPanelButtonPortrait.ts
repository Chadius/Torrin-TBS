import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import {
    SquaddieSelectorPanelButton,
    SquaddieSelectorPanelButtonContext,
    SquaddieSelectorPanelButtonLayout,
    SquaddieSelectorPanelButtonObjects,
} from "../squaddieSelectorPanelButton"
import {
    ImageUI,
    ImageUILoadingBehavior,
} from "../../../../../../ui/imageUI/imageUI"
import { DataBlobService } from "../../../../../../utils/dataBlob/dataBlob"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../../objectRepository"
import { getResultOrThrowError } from "../../../../../../utils/ResultOrError"
import { RectAreaService } from "../../../../../../ui/rectArea"
import { WINDOW_SPACING } from "../../../../../../ui/constants"

export class UpdateSquaddieSelectorPanelButtonPortrait
    implements BehaviorTreeTask
{
    dataBlob: SquaddieSelectorPanelButton
    objectRepository: ObjectRepository

    constructor(
        dataBlob: SquaddieSelectorPanelButton,
        objectRepository: ObjectRepository
    ) {
        this.dataBlob = dataBlob
        this.objectRepository = objectRepository
    }

    clone(): UpdateSquaddieSelectorPanelButtonPortrait {
        return new UpdateSquaddieSelectorPanelButtonPortrait(
            this.dataBlob,
            this.objectRepository
        )
    }

    run(): boolean {
        const layout: SquaddieSelectorPanelButtonLayout =
            DataBlobService.get<SquaddieSelectorPanelButtonLayout>(
                this.dataBlob,
                "layout"
            )

        const uiObjects: SquaddieSelectorPanelButtonObjects =
            DataBlobService.get<SquaddieSelectorPanelButtonObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const context: SquaddieSelectorPanelButtonContext =
            DataBlobService.get<SquaddieSelectorPanelButtonContext>(
                this.dataBlob,
                "context"
            )

        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                this.objectRepository,
                context.battleSquaddieId
            )
        )

        uiObjects.mapIcon = new ImageUI({
            area: RectAreaService.new({
                left:
                    RectAreaService.left(uiObjects.drawingArea) +
                    WINDOW_SPACING.SPACING1,
                top: RectAreaService.top(uiObjects.drawingArea),
                width: RectAreaService.width(
                    layout.controllableSquaddieButton.portrait
                ),
                bottom: RectAreaService.bottom(uiObjects.drawingArea),
            }),
            imageLoadingBehavior: {
                resourceKey:
                    squaddieTemplate.squaddieId.resources.mapIconResourceKey,
                loadingBehavior:
                    ImageUILoadingBehavior.KEEP_AREA_HEIGHT_USE_ASPECT_RATIO,
            },
        })

        DataBlobService.add<SquaddieSelectorPanelButtonObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}
