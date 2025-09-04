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
    TShowDegreeOfSuccessEvenIfNoEffect,
} from "../actionPreviewTile"
import { ActionPreviewTileDegreesOfSuccessService } from "./degreesOfSuccess"
import { ComponentDataBlob } from "../../../../../../utils/dataBlob/componentDataBlob"
import { BattleActionSquaddieChange } from "../../../../../history/battleAction/battleActionSquaddieChange"
import {
    DegreeOfSuccess,
    TDegreeOfSuccess,
} from "../../../../../calculator/actionCalculator/degreeOfSuccess"
import { RectangleService } from "../../../../../../ui/rectangle/rectangle"

export class CreateNextChancesOfDegreesOfSuccessTextBoxAction
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

        const targetForecast = context.forecast.changesPerEffect[0]
        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )

        uiObjects.chancesOfDegreesOfSuccessTextBoxes ||= []
        const { forecastedChange, degreeOfSuccessToDraw } =
            ActionPreviewTileDegreesOfSuccessService.findNextDegreeOfSuccessToDraw(
                degreesOfSuccessLayoutConstants.rowOrder,
                uiObjects.chancesOfDegreesOfSuccessTextBoxes ?? [],
                targetForecast,
                context.actionTemplate
            )
        if (!degreeOfSuccessToDraw) return false
        const top =
            ActionPreviewTileDegreesOfSuccessService.calculateTopOfNextDegreesOfSuccessRow(
                {
                    blackboard: this.dataBlob,
                    degreeOfSuccessUIObjects:
                        uiObjects.chancesOfDegreesOfSuccessTextBoxes,
                    boundingBox,
                }
            )

        this.addTextDescription({
            uiObjects,
            forecastedChange,
            degreeOfSuccessToDraw,
            top,
        })

        this.addRectangle({
            uiObjects,
            forecastedChange,
            degreeOfSuccessToDraw,
            top,
        })

        this.dataBlob.setUIObjects(uiObjects)
        return true
    }

    private addTextDescription({
        uiObjects,
        forecastedChange,
        degreeOfSuccessToDraw,
        top,
    }: {
        uiObjects: ActionPreviewTileUIObjects
        forecastedChange: BattleActionSquaddieChange
        degreeOfSuccessToDraw: {
            degreeOfSuccess: TDegreeOfSuccess
            suffix: string
            showEvenIfNoEffect: TShowDegreeOfSuccessEvenIfNoEffect
            showChanceOfSuccess: boolean
        }
        top: number
    }) {
        const chancesOfDegreesOfSuccessLayoutConstants =
            this.dataBlob.getLayout().chancesOfDegreesOfSuccess
        const degreesOfSuccessLayoutConstants =
            this.dataBlob.getLayout().degreesOfSuccess

        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )

        uiObjects.chancesOfDegreesOfSuccessTextBoxes ||= []
        const areWeDrawingTheFirstDegreeOfSuccessTextBox =
            uiObjects.chancesOfDegreesOfSuccessTextBoxes.length === 0
        const chanceOfDegreeOfSuccessText =
            areWeDrawingTheFirstDegreeOfSuccessTextBox
                ? `${forecastedChange.chanceOfDegreeOfSuccess}/36`
                : forecastedChange.chanceOfDegreeOfSuccess

        const messageToShow = degreeOfSuccessToDraw.showChanceOfSuccess
            ? `${chanceOfDegreeOfSuccessText}`
            : ""

        uiObjects.chancesOfDegreesOfSuccessTextBoxes.push({
            degreeOfSuccess: degreeOfSuccessToDraw.degreeOfSuccess,
            textBox: TextBoxService.new({
                fontColor: chancesOfDegreesOfSuccessLayoutConstants.fontColor,
                fontSize: chancesOfDegreesOfSuccessLayoutConstants.fontSize,
                area: RectAreaService.new({
                    right: RectAreaService.right(boundingBox),
                    top,
                    width: chancesOfDegreesOfSuccessLayoutConstants.width,
                    height: degreesOfSuccessLayoutConstants.height,
                    margin: chancesOfDegreesOfSuccessLayoutConstants.margin,
                }),
                text: messageToShow,
            }),
        })
    }

    private addRectangle({
        uiObjects,
        forecastedChange,
        degreeOfSuccessToDraw,
        top,
    }: {
        uiObjects: ActionPreviewTileUIObjects
        forecastedChange: BattleActionSquaddieChange
        degreeOfSuccessToDraw: {
            degreeOfSuccess: TDegreeOfSuccess
            suffix: string
            showEvenIfNoEffect: TShowDegreeOfSuccessEvenIfNoEffect
            showChanceOfSuccess: boolean
        }
        top: number
    }) {
        uiObjects.chancesOfDegreesOfSuccessRectangles ||= []
        if (forecastedChange.actorDegreeOfSuccess == DegreeOfSuccess.NONE)
            return
        if (forecastedChange.chanceOfDegreeOfSuccess == 0) return

        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )
        const chancesOfDegreesOfSuccessLayoutConstants =
            this.dataBlob.getLayout().chancesOfDegreesOfSuccess

        uiObjects.chancesOfDegreesOfSuccessRectangles.push({
            degreeOfSuccess: degreeOfSuccessToDraw.degreeOfSuccess,
            bar: RectangleService.new({
                noStroke: true,
                area: RectAreaService.new({
                    left:
                        RectAreaService.left(boundingBox) +
                        chancesOfDegreesOfSuccessLayoutConstants.bar
                            .horizontalOffset,
                    top,
                    width:
                        chancesOfDegreesOfSuccessLayoutConstants.bar
                            .lengthPerChance *
                        forecastedChange.chanceOfDegreeOfSuccess,
                    height: chancesOfDegreesOfSuccessLayoutConstants.bar.height,
                    margin: chancesOfDegreesOfSuccessLayoutConstants.margin,
                }),
                fillColor:
                    chancesOfDegreesOfSuccessLayoutConstants.bar
                        .colorByDegreeOfSuccess[
                        degreeOfSuccessToDraw.degreeOfSuccess
                    ],
                cornerRadius:
                    chancesOfDegreesOfSuccessLayoutConstants.bar.cornerRadius,
            }),
        })
    }
}
