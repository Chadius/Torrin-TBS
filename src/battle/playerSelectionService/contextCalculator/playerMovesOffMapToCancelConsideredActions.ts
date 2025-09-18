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
import { getResultOrThrowError } from "../../../utils/resultOrError"
import { ObjectRepositoryService } from "../../objectRepository"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { SquaddieTurnService } from "../../../squaddie/turn"

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
        const battleActionDecisionStep =
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        const objectRepository = gameEngineState.repository

        let movementActionPointsPreviewedByPlayer: number | undefined =
            undefined
        const battleSquaddieId = BattleActionDecisionStepService.getActor(
            battleActionDecisionStep
        )?.battleSquaddieId
        if (
            battleActionDecisionStep &&
            BattleActionDecisionStepService.isActorSet(
                battleActionDecisionStep
            ) &&
            objectRepository != undefined &&
            battleSquaddieId != undefined
        ) {
            const { battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    battleSquaddieId
                )
            )
            movementActionPointsPreviewedByPlayer =
                SquaddieTurnService.getMovementActionPointsPreviewedByPlayer(
                    battleSquaddie.squaddieTurn
                )
        }

        if (
            movementActionPointsPreviewedByPlayer == undefined ||
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
}
