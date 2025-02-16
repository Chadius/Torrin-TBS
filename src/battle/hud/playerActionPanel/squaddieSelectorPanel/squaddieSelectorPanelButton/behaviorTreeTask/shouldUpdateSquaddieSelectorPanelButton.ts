import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import {
    SquaddieSelectorPanelButton,
    SquaddieSelectorPanelButtonStatus,
} from "../squaddieSelectorPanelButton"
import { DataBlobService } from "../../../../../../utils/dataBlob/dataBlob"

export class ShouldUpdateSquaddieSelectorPanelButton
    implements BehaviorTreeTask
{
    dataBlob: SquaddieSelectorPanelButton

    constructor(dataBlob: SquaddieSelectorPanelButton) {
        this.dataBlob = dataBlob
    }

    clone(): ShouldUpdateSquaddieSelectorPanelButton {
        return new ShouldUpdateSquaddieSelectorPanelButton(this.dataBlob)
    }

    run(): boolean {
        const buttonStatus =
            DataBlobService.get<SquaddieSelectorPanelButtonStatus>(
                this.dataBlob,
                "status"
            )

        return (
            buttonStatus?.current?.squaddieIsSelected == undefined ||
            buttonStatus?.current?.squaddieIsControllable == undefined ||
            buttonStatus?.previous?.squaddieIsSelected == undefined ||
            buttonStatus?.previous?.squaddieIsControllable == undefined ||
            buttonStatus.previous.squaddieIsControllable !=
                buttonStatus.current.squaddieIsControllable ||
            buttonStatus.previous.squaddieIsSelected !=
                buttonStatus.current.squaddieIsSelected
        )
    }
}
