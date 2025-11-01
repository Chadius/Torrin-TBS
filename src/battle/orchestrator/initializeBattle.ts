import {
    BattleUISettings,
    BattleUISettingsService,
} from "./uiSettings/uiSettings"
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "./battleOrchestratorComponent"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { BattlePhaseService } from "../orchestratorComponents/battlePhaseTracker"
import { ObjectRepositoryService } from "../objectRepository"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"
import { ResourceRepository } from "../../resource/resourceRepository"

export class InitializeBattle implements BattleOrchestratorComponent {
    hasCompleted(_: GameEngineState): boolean {
        return true
    }

    keyEventHappened(
        _state: GameEngineState,
        _event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    mouseEventHappened(
        _state: GameEngineState,
        _event: OrchestratorComponentMouseEvent
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
                    ObjectRepositoryService.getSquaddieByBattleId(
                        repository,
                        battleId
                    )

                DrawSquaddieIconOnMapUtilities.tintSquaddieMapIconIfTheyCannotAct(
                    battleSquaddie,
                    squaddieTemplate,
                    repository
                )
            })
        })
    }

    uiControlSettings(_: GameEngineState): BattleUISettings {
        return BattleUISettingsService.new({})
    }

    update({}: { gameEngineState: GameEngineState }): void {
        // Required by inheritance
    }

    draw({
        gameEngineState,
    }: {
        gameEngineState: GameEngineState
        graphics: GraphicsBuffer
    }): ResourceRepository | undefined {
        return gameEngineState.resourceRepository
    }
}
