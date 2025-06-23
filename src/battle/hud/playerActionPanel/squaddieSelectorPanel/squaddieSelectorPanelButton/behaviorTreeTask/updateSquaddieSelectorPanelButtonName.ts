import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import {
    SquaddieSelectorPanelButton,
    SquaddieSelectorPanelButtonContext,
    SquaddieSelectorPanelButtonLayout,
    SquaddieSelectorPanelButtonObjects,
    SquaddieSelectorPanelButtonStatus,
} from "../squaddieSelectorPanelButton"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../../objectRepository"
import { GraphicsBuffer } from "../../../../../../utils/graphics/graphicsRenderer"
import { DataBlobService } from "../../../../../../utils/dataBlob/dataBlob"
import { getResultOrThrowError } from "../../../../../../utils/ResultOrError"
import { RectAreaService } from "../../../../../../ui/rectArea"
import { WINDOW_SPACING } from "../../../../../../ui/constants"
import { TextHandlingService } from "../../../../../../utils/graphics/textHandlingService"
import { TextBoxService } from "../../../../../../ui/textBox/textBox"

export class UpdateSquaddieSelectorPanelButtonName implements BehaviorTreeTask {
    dataBlob: SquaddieSelectorPanelButton
    objectRepository: ObjectRepository
    graphicsContext: GraphicsBuffer

    constructor(
        dataBlob: SquaddieSelectorPanelButton,
        objectRepository: ObjectRepository,
        graphicsContext: GraphicsBuffer
    ) {
        this.dataBlob = dataBlob
        this.objectRepository = objectRepository
        this.graphicsContext = graphicsContext
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

        let layoutConstantsToUseBasedOnSelectable: {
            strokeWeight: number
            fontSizeRange: {
                preferred: number
                minimum: number
            }
            fontColor: [number, number, number]
        }

        const status: SquaddieSelectorPanelButtonStatus =
            DataBlobService.get<SquaddieSelectorPanelButtonStatus>(
                this.dataBlob,
                "status"
            )

        switch (true) {
            case status.current.squaddieIsSelected:
                layoutConstantsToUseBasedOnSelectable = {
                    strokeWeight:
                        layout.selectedSquaddieButton.font.strokeWeight,
                    fontSizeRange: layout.selectedSquaddieButton.font.sizeRange,
                    fontColor: layout.selectedSquaddieButton.font.color,
                }
                break
            case status.current.squaddieIsControllable:
                layoutConstantsToUseBasedOnSelectable = {
                    strokeWeight:
                        layout.controllableSquaddieButton.font.strokeWeight,
                    fontSizeRange:
                        layout.controllableSquaddieButton.font.sizeRange,
                    fontColor: layout.controllableSquaddieButton.font.color,
                }
                break
            default:
                layoutConstantsToUseBasedOnSelectable = {
                    strokeWeight:
                        layout.uncontrollableSquaddieButton.font.strokeWeight,
                    fontSizeRange:
                        layout.uncontrollableSquaddieButton.font.sizeRange,
                    fontColor: layout.uncontrollableSquaddieButton.font.color,
                }
                break
        }

        const name = squaddieTemplate.squaddieId.name

        const areaToRender = RectAreaService.new({
            left:
                RectAreaService.right(uiObjects.mapIcon.drawArea) +
                WINDOW_SPACING.SPACING1 / 2,
            right: RectAreaService.right(uiObjects.drawingArea),
            top:
                RectAreaService.top(uiObjects.drawingArea) +
                WINDOW_SPACING.SPACING1,
            bottom: RectAreaService.bottom(uiObjects.drawingArea),
        })

        const textInfo = TextHandlingService.fitTextWithinSpace({
            text: name,
            maximumWidth: RectAreaService.width(areaToRender),
            graphicsContext: this.graphicsContext,
            font: {
                strokeWeight:
                    layoutConstantsToUseBasedOnSelectable.strokeWeight,
                fontSizeRange:
                    layoutConstantsToUseBasedOnSelectable.fontSizeRange,
            },
            linesOfTextRange: { minimum: 1 },
        })

        uiObjects.squaddieName = TextBoxService.new({
            fontSize: textInfo.fontSize,
            fontColor: layoutConstantsToUseBasedOnSelectable.fontColor,
            text: textInfo.text,
            area: areaToRender,
        })

        DataBlobService.add<SquaddieSelectorPanelButtonObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}
