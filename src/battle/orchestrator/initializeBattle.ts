import { UIControlSettings } from "./uiControlSettings"
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "./battleOrchestratorComponent"
import { DrawSquaddieUtilities } from "../animation/drawSquaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { BattlePhaseService } from "../orchestratorComponents/battlePhaseTracker"
import { ObjectRepositoryService } from "../objectRepository"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"

export class InitializeBattle implements BattleOrchestratorComponent {
    hasCompleted(state: GameEngineState): boolean {
        return true
    }

    keyEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    mouseEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    recommendStateChanges(
        state: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        return {}
    }

    reset(state: GameEngineState): void {
        const playerTeams: BattleSquaddieTeam[] =
            BattlePhaseService.findTeamsOfAffiliation(
                state.battleOrchestratorState.battleState.teams,
                SquaddieAffiliation.PLAYER
            )
        playerTeams.forEach((playerTeam) => {
            playerTeam.battleSquaddieIds.forEach((battleId) => {
                const { battleSquaddie, squaddieTemplate } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            state.repository,
                            battleId
                        )
                    )
                DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(
                    battleSquaddie,
                    squaddieTemplate,
                    state.repository
                )
            })
        })
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return undefined
    }

    update(state: GameEngineState, graphicsContext: GraphicsBuffer): void {
        // Required by inheritance
    }
}
