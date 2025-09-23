import { UIControlSettings } from "./uiControlSettings"
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "./battleOrchestratorComponent"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { getResultOrThrowError } from "../../utils/resultOrError"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { BattlePhaseService } from "../orchestratorComponents/battlePhaseTracker"
import { ObjectRepositoryService } from "../objectRepository"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../resource/resourceHandler"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

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
        _: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        return {}
    }

    reset(gameEngineState: GameEngineState): void {
        const repository = gameEngineState.repository
        if (!repository) return
        const playerTeams: BattleSquaddieTeam[] =
            BattlePhaseService.findTeamsOfAffiliation(
                gameEngineState.battleOrchestratorState.battleState.teams,
                SquaddieAffiliation.PLAYER
            )
        playerTeams.forEach((playerTeam) => {
            playerTeam.battleSquaddieIds.forEach((battleId) => {
                const { battleSquaddie, squaddieTemplate } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            repository,
                            battleId
                        )
                    )
                DrawSquaddieIconOnMapUtilities.tintSquaddieMapIconIfTheyCannotAct(
                    battleSquaddie,
                    squaddieTemplate,
                    repository
                )
            })
        })
    }

    uiControlSettings(_: GameEngineState): UIControlSettings {
        return new UIControlSettings({})
    }

    update({}: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler | undefined
    }): void {
        // Required by inheritance
    }
}
