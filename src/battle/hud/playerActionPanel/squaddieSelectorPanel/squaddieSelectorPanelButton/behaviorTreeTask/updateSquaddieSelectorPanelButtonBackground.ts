import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import { DataBlobService } from "../../../../../../utils/dataBlob/dataBlob"
import {
    SquaddieSelectorPanelButton,
    SquaddieSelectorPanelButtonLayout,
    SquaddieSelectorPanelButtonObjects,
    SquaddieSelectorPanelButtonStatus,
} from "../squaddieSelectorPanelButton"
import { RectangleService } from "../../../../../../ui/rectangle/rectangle"

export class UpdateSquaddieSelectorPanelButtonBackground
    implements BehaviorTreeTask
{
    dataBlob: SquaddieSelectorPanelButton

    constructor(dataBlob: SquaddieSelectorPanelButton) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const layout: SquaddieSelectorPanelButtonLayout =
            DataBlobService.get<SquaddieSelectorPanelButtonLayout>(
                this.dataBlob,
                "layout"
            )

        const status: SquaddieSelectorPanelButtonStatus =
            DataBlobService.get<SquaddieSelectorPanelButtonStatus>(
                this.dataBlob,
                "status"
            )

        let layoutConstantsToUseBasedOnSelectable: {
            backgroundColor: [number, number, number]
            strokeColor: [number, number, number]
            strokeWeight: number
        }

        switch (true) {
            case status.current.squaddieIsSelected:
                layoutConstantsToUseBasedOnSelectable = {
                    backgroundColor:
                        layout.selectedSquaddieButton.backgroundColor,
                    strokeColor: layout.selectedBorder.borderColor,
                    strokeWeight: layout.selectedBorder.borderWeight,
                }
                break
            case status.current.squaddieIsControllable:
                layoutConstantsToUseBasedOnSelectable = {
                    backgroundColor:
                        layout.controllableSquaddieButton.backgroundColor,
                    strokeColor: layout.notSelectedBorder.borderColor,
                    strokeWeight: layout.notSelectedBorder.borderWeight,
                }
                break
            default:
                layoutConstantsToUseBasedOnSelectable = {
                    backgroundColor:
                        layout.uncontrollableSquaddieButton.backgroundColor,
                    strokeColor: layout.notSelectedBorder.borderColor,
                    strokeWeight: layout.notSelectedBorder.borderWeight,
                }
                break
        }

        let uiObjects: SquaddieSelectorPanelButtonObjects =
            DataBlobService.get<SquaddieSelectorPanelButtonObjects>(
                this.dataBlob,
                "uiObjects"
            )
        uiObjects.background = RectangleService.new({
            area: uiObjects.drawingArea,
            fillColor: layoutConstantsToUseBasedOnSelectable.backgroundColor,
            strokeWeight: layoutConstantsToUseBasedOnSelectable.strokeWeight,
            strokeColor: layoutConstantsToUseBasedOnSelectable.strokeColor,
        })

        DataBlobService.add<SquaddieSelectorPanelButtonObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}
