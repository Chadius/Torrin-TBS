import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import {
    PlayerSelectionContext,
    PlayerSelectionContextService,
} from "../playerSelectionContext"
import {
    PlayerContextDataBlob,
    PlayerIntent,
    PlayerSelectionContextCalculationArgs,
} from "../playerSelectionService"
import { SquaddieSelectorPanelService } from "../../hud/playerActionPanel/squaddieSelectorPanel/squaddieSelectorPanel"
import {
    SquaddieSelectorPanelButton,
    SquaddieSelectorPanelButtonService,
} from "../../hud/playerActionPanel/squaddieSelectorPanel/squaddieSelectorPanelButton/squaddieSelectorPanelButton"
import { OrchestratorUtilities } from "../../orchestratorComponents/orchestratorUtils"

export class PlayerClicksOnSquaddieSelectorPanel implements BehaviorTreeTask {
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const playerSelectionContextCalculationArgs =
            DataBlobService.get<PlayerSelectionContextCalculationArgs>(
                this.dataBlob,
                "playerSelectionContextCalculationArgs"
            )
        const { mouseClick, gameEngineState, playerInputActions } =
            playerSelectionContextCalculationArgs

        if (
            gameEngineState.battleOrchestratorState.battleHUDState
                .squaddieSelectorPanel == undefined
        )
            return false

        if (
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn({
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
            })
        )
            return false

        let clickedButton: SquaddieSelectorPanelButton = undefined

        if (mouseClick) {
            clickedButton = SquaddieSelectorPanelService.getClickedButton(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .squaddieSelectorPanel,
                mouseClick
            )
        } else {
        }

        if (!clickedButton) return false

        DataBlobService.add<PlayerSelectionContext>(
            this.dataBlob,
            "playerSelectionContext",
            PlayerSelectionContextService.new({
                playerIntent:
                    PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE,
                actorBattleSquaddieId:
                    SquaddieSelectorPanelButtonService.getBattleSquaddieId(
                        clickedButton
                    ),
                mouseClick,
            })
        )

        return true
    }
}
