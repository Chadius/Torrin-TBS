import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { PlayerSelectionContextService } from "../playerSelectionContext"
import {
    PlayerContextDataBlob,
    PlayerIntent,
    PlayerSelectionContextCalculationArgs,
    PlayerSelectionService,
} from "../playerSelectionService"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"

export class PlayerMovesOffMapToCancelConsideredActions
    implements BehaviorTreeTask
{
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const hoveredLocationIsOnMap: boolean =
            DataBlobService.get<HexCoordinate>(
                this.dataBlob,
                "hoveredMapLocation"
            ) != undefined

        const playerSelectionContextCalculationArgs =
            DataBlobService.get<PlayerSelectionContextCalculationArgs>(
                this.dataBlob,
                "playerSelectionContextCalculationArgs"
            )
        const { gameEngineState } = playerSelectionContextCalculationArgs
        const playerConsideredActions =
            gameEngineState.battleOrchestratorState.battleState
                .playerConsideredActions

        if (
            playerConsideredActions.movement == undefined ||
            hoveredLocationIsOnMap
        ) {
            return false
        }

        PlayerSelectionService.addPlayerSelectionContextToDataBlob(
            this.dataBlob,
            PlayerSelectionContextService.new({
                playerIntent: PlayerIntent.CANCEL_SQUADDIE_CONSIDERED_ACTIONS,
            })
        )
        return true
    }

    clone(): PlayerMovesOffMapToCancelConsideredActions {
        return new PlayerMovesOffMapToCancelConsideredActions(this.dataBlob)
    }
}
