import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import {
    DataBlob,
    DataBlobService,
} from "../../../../../../utils/dataBlob/dataBlob"
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

export class CreateNextChancesOfDegreesOfSuccessTextBoxAction
    implements BehaviorTreeTask
{
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

        const degreesOfSuccessLayoutConstants =
            DataBlobService.get<ActionPreviewTileLayout>(
                this.dataBlob,
                "layout"
            ).degreesOfSuccess

        const chancesOfDegreesOfSuccessLayoutConstants =
            DataBlobService.get<ActionPreviewTileLayout>(
                this.dataBlob,
                "layout"
            ).chancesOfDegreesOfSuccess

        const targetForecast = context.forecast.changesPerEffect[0]
        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )

        uiObjects.chancesOfDegreesOfSuccessTextBoxes ||= []
        const { forecastedChange, degreeOfSuccessToDraw } =
            ActionPreviewTileDegreesOfSuccessService.findNextDegreeOfSuccessToDraw(
                degreesOfSuccessLayoutConstants.rowOrder,
                uiObjects.chancesOfDegreesOfSuccessTextBoxes,
                targetForecast,
                context.actionTemplate
            )
        if (!degreeOfSuccessToDraw) return false

        const messageToShow = degreeOfSuccessToDraw.showChanceOfSuccess
            ? `${((forecastedChange.chanceOfDegreeOfSuccess * 100) / 36).toFixed()}% ${degreeOfSuccessToDraw.suffix}`
            : ""

        const top =
            ActionPreviewTileDegreesOfSuccessService.calculateTopOfNextDegreesOfSuccessRow(
                {
                    blackboard: this.dataBlob,
                    degreeOfSuccessUIObjects:
                        uiObjects.chancesOfDegreesOfSuccessTextBoxes,
                    boundingBox,
                }
            )

        uiObjects.chancesOfDegreesOfSuccessTextBoxes.push({
            degreeOfSuccess: degreeOfSuccessToDraw.degreeOfSuccess,
            textBox: TextBoxService.new({
                fontColor: chancesOfDegreesOfSuccessLayoutConstants.fontColor,
                fontSize: chancesOfDegreesOfSuccessLayoutConstants.fontSize,
                area: RectAreaService.new({
                    left: RectAreaService.left(boundingBox),
                    top,
                    width: chancesOfDegreesOfSuccessLayoutConstants.width,
                    height: degreesOfSuccessLayoutConstants.height,
                    margin: chancesOfDegreesOfSuccessLayoutConstants.margin,
                }),
                text: messageToShow,
            }),
        })

        DataBlobService.add<ActionPreviewTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )

        return true
    }
}
