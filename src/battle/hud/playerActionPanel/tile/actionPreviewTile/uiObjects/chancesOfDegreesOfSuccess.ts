import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import {
    Blackboard,
    BlackboardService,
} from "../../../../../../utils/blackboard/blackboard"
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
    blackboard: Blackboard

    constructor(blackboard: Blackboard) {
        this.blackboard = blackboard
    }

    run(): boolean {
        const uiObjects = BlackboardService.get<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects"
        )

        let context: ActionPreviewTileContext = BlackboardService.get(
            this.blackboard,
            "context"
        )

        const degreesOfSuccessLayoutConstants =
            BlackboardService.get<ActionPreviewTileLayout>(
                this.blackboard,
                "layout"
            ).degreesOfSuccess

        const chancesOfDegreesOfSuccessLayoutConstants =
            BlackboardService.get<ActionPreviewTileLayout>(
                this.blackboard,
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
                    blackboard: this.blackboard,
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

        BlackboardService.add<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects",
            uiObjects
        )

        return true
    }

    clone(): BehaviorTreeTask {
        return new CreateNextChancesOfDegreesOfSuccessTextBoxAction(
            this.blackboard
        )
    }
}
