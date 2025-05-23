import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import { DataBlobService } from "../../../../../../utils/dataBlob/dataBlob"
import {
    SquaddieSelectorPanelButton,
    SquaddieSelectorPanelButtonContext,
    SquaddieSelectorPanelButtonLayout,
    SquaddieSelectorPanelButtonObjects,
    SquaddieSelectorPanelButtonStatus,
} from "../squaddieSelectorPanelButton"
import { RectArea, RectAreaService } from "../../../../../../ui/rectArea"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "../../../tile/actionTilePosition"

export class UpdateSquaddieSelectorPanelButtonDrawingArea
    implements BehaviorTreeTask
{
    dataBlob: SquaddieSelectorPanelButton

    constructor(dataBlob: SquaddieSelectorPanelButton) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const context = DataBlobService.get<SquaddieSelectorPanelButtonContext>(
            this.dataBlob,
            "context"
        )

        const status = DataBlobService.get<SquaddieSelectorPanelButtonStatus>(
            this.dataBlob,
            "status"
        )

        const layout = DataBlobService.get<SquaddieSelectorPanelButtonLayout>(
            this.dataBlob,
            "layout"
        )

        const drawingArea = this.getDrawingAreaByStatusAndIndex({
            squaddieIndex: context.squaddieIndex,
            status,
            layout,
        })

        let uiObjects: SquaddieSelectorPanelButtonObjects =
            DataBlobService.get<SquaddieSelectorPanelButtonObjects>(
                this.dataBlob,
                "uiObjects"
            )
        uiObjects ||= {
            background: undefined,
            drawingArea: undefined,
            mapIcon: undefined,
            squaddieName: undefined,
        }
        uiObjects.drawingArea = drawingArea
        DataBlobService.add<SquaddieSelectorPanelButtonObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }

    private getDrawingAreaByStatusAndIndex({
        squaddieIndex,
        status,
        layout,
    }: {
        squaddieIndex: number
        status: SquaddieSelectorPanelButtonStatus
        layout: SquaddieSelectorPanelButtonLayout
    }): RectArea {
        const tileBoundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTOR_STATUS
            )
        const buttonHeight = status.current.squaddieIsSelected
            ? layout.selectedBorder.height
            : layout.notSelectedBorder.height

        const outerMargin = status.current.squaddieIsSelected
            ? layout.selectedBorder.outerMargin
            : layout.notSelectedBorder.outerMargin

        const horizontalPlacementInRow =
            squaddieIndex % 2 == 0
                ? {
                      left: RectAreaService.left(tileBoundingBox) + outerMargin,
                      right: RectAreaService.centerX(tileBoundingBox) - 1,
                  }
                : {
                      right:
                          RectAreaService.right(tileBoundingBox) - outerMargin,
                      left: RectAreaService.centerX(tileBoundingBox) + 1,
                  }

        const verticalPlacementByRow = {
            bottom:
                RectAreaService.top(tileBoundingBox) -
                1 -
                buttonHeight * Math.floor(squaddieIndex / 2),
        }

        return RectAreaService.new({
            ...horizontalPlacementInRow,
            height: buttonHeight,
            bottom: verticalPlacementByRow.bottom,
        })
    }
}
