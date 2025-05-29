import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "../../actionTilePosition"
import { TextBoxService } from "../../../../../../ui/textBox/textBox"
import { RectAreaService } from "../../../../../../ui/rectArea"
import {
    ActionPreviewTileContext,
    ActionPreviewTileLayout,
    ActionPreviewTileUIObjects,
} from "../actionPreviewTile"
import { ActionPreviewTileDegreesOfSuccessService } from "./degreesOfSuccess"
import { ComponentDataBlob } from "../../../../../../utils/dataBlob/componentDataBlob"

export class CreateNextNamesOfDegreesOfSuccessTextBoxAction
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        ActionPreviewTileLayout,
        ActionPreviewTileContext,
        ActionPreviewTileUIObjects
    >

    constructor(
        blackboard: ComponentDataBlob<
            ActionPreviewTileLayout,
            ActionPreviewTileContext,
            ActionPreviewTileUIObjects
        >
    ) {
        this.dataBlob = blackboard
    }

    run(): boolean {
        const uiObjects = this.dataBlob.getUIObjects()
        let context: ActionPreviewTileContext = this.dataBlob.getContext()

        const degreesOfSuccessLayoutConstants =
            this.dataBlob.getLayout().degreesOfSuccess

        const namesOfDegreesOfSuccessLayoutConstants =
            this.dataBlob.getLayout().namesOfDegreesOfSuccess

        const targetForecast = context.forecast.changesPerEffect[0]
        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )

        uiObjects.namesOfDegreesOfSuccessTextBoxes ||= []
        const { degreeOfSuccessToDraw } =
            ActionPreviewTileDegreesOfSuccessService.findNextDegreeOfSuccessToDraw(
                degreesOfSuccessLayoutConstants.rowOrder,
                uiObjects.namesOfDegreesOfSuccessTextBoxes,
                targetForecast,
                context.actionTemplate
            )
        if (!degreeOfSuccessToDraw) return false

        const messageToShow = degreeOfSuccessToDraw.showChanceOfSuccess
            ? `${degreeOfSuccessToDraw.suffix}`
            : ""

        const top =
            ActionPreviewTileDegreesOfSuccessService.calculateTopOfNextDegreesOfSuccessRow(
                {
                    blackboard: this.dataBlob,
                    degreeOfSuccessUIObjects:
                        uiObjects.namesOfDegreesOfSuccessTextBoxes,
                    boundingBox,
                }
            )

        uiObjects.namesOfDegreesOfSuccessTextBoxes.push({
            degreeOfSuccess: degreeOfSuccessToDraw.degreeOfSuccess,
            textBox: TextBoxService.new({
                fontColor: namesOfDegreesOfSuccessLayoutConstants.fontColor,
                fontSize: namesOfDegreesOfSuccessLayoutConstants.fontSize,
                area: RectAreaService.new({
                    left: RectAreaService.left(boundingBox),
                    top,
                    width: namesOfDegreesOfSuccessLayoutConstants.width,
                    height: degreesOfSuccessLayoutConstants.height,
                    margin: namesOfDegreesOfSuccessLayoutConstants.margin,
                }),
                text: messageToShow,
            }),
        })

        this.dataBlob.setUIObjects(uiObjects)
        return true
    }
}
