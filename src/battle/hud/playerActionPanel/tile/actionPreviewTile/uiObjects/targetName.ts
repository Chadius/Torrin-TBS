import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
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
import { ComponentDataBlob } from "../../../../../../utils/dataBlob/componentDataBlob"

export class CreateTargetNameTextBoxesAction implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        ActionPreviewTileLayout,
        ActionPreviewTileContext,
        ActionPreviewTileUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            ActionPreviewTileLayout,
            ActionPreviewTileContext,
            ActionPreviewTileUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects = this.dataBlob.getUIObjects()
        let context: ActionPreviewTileContext = this.dataBlob.getContext()

        const targetBattleSquaddieId =
            context.forecast.changesPerEffect[0].squaddieChanges[0]
                .battleSquaddieId

        const targetName =
            context.squaddieNamesByBattleSquaddieId[targetBattleSquaddieId]
        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )
        const layoutConstants = this.dataBlob.getLayout().targetName

        const textInfo = TextHandlingService.fitTextWithinSpace({
            text: targetName,
            maximumWidth: layoutConstants.width,
            graphicsContext: uiObjects.graphicsContext,
            fontDescription: {
                strokeWeight: layoutConstants.strokeWeight,
                fontSizeRange: layoutConstants.fontSizeRange,
            },
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

        this.dataBlob.setUIObjects(uiObjects)
        return true
    }
}
