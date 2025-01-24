import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import {
    DataBlob,
    DataBlobService,
} from "../../../../../../utils/dataBlob/dataBlob"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "../../actionTilePosition"
import { TextHandlingService } from "../../../../../../utils/graphics/textHandlingService"
import { TextBoxService } from "../../../../../../ui/textBox/textBox"
import { RectAreaService } from "../../../../../../ui/rectArea"
import {
    ActionPreviewTileContext,
    ActionPreviewTileLayout,
    ActionPreviewTileUIObjects,
} from "../actionPreviewTile"

export class CreateTargetNameTextBoxesAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(blackboard: DataBlob) {
        this.dataBlob = blackboard
    }

    run(): boolean {
        const uiObjects = DataBlobService.get<ActionPreviewTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )

        let context: ActionPreviewTileContext = DataBlobService.get(
            this.dataBlob,
            "context"
        )

        const targetBattleSquaddieId =
            context.forecast.changesPerEffect[0].squaddieChanges[0]
                .battleSquaddieId

        const targetName =
            context.squaddieNamesByBattleSquaddieId[targetBattleSquaddieId]
        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )
        const layoutConstants = DataBlobService.get<ActionPreviewTileLayout>(
            this.dataBlob,
            "layout"
        ).targetName

        const textInfo = TextHandlingService.fitTextWithinSpace({
            text: targetName,
            width: layoutConstants.width,
            graphicsContext: uiObjects.graphicsContext,
            fontSizeRange: layoutConstants.fontSizeRange,
            linesOfTextRange: layoutConstants.linesOfTextRange,
        })

        uiObjects.targetNameTextBox = TextBoxService.new({
            fontColor: layoutConstants.fontColor,
            fontSize: textInfo.fontSize,
            area: RectAreaService.new({
                left: RectAreaService.left(boundingBox),
                top: RectAreaService.top(boundingBox),
                width: layoutConstants.width,
                height: layoutConstants.height,
                margin: layoutConstants.margin,
            }),
            text: textInfo.text,
        })

        DataBlobService.add<ActionPreviewTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )

        return true
    }

    clone(): BehaviorTreeTask {
        return new CreateTargetNameTextBoxesAction(this.dataBlob)
    }
}
