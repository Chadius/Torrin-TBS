import {UIControlSettings} from "./uiControlSettings";
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "./battleOrchestratorComponent";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {TintSquaddieIfTurnIsComplete} from "../animation/drawSquaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {FindTeamsOfAffiliation} from "../orchestratorComponents/battlePhaseTracker";
import {ObjectRepositoryService} from "../objectRepository";

export class InitializeBattle implements BattleOrchestratorComponent {
    hasCompleted(state: GameEngineState): boolean {
        return true;
    }

    keyEventHappened(state: GameEngineState, event: OrchestratorComponentKeyEvent): void {
    }

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void {
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        return {};
    }

    reset(state: GameEngineState): void {
        const playerTeams: BattleSquaddieTeam[] = FindTeamsOfAffiliation(state.battleOrchestratorState.battleState.teams, SquaddieAffiliation.PLAYER);
        playerTeams.forEach(playerTeam => {
            playerTeam.battleSquaddieIds.forEach((battleId) => {
                const {
                    battleSquaddie,
                    squaddieTemplate,
                } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.battleOrchestratorState.squaddieRepository, battleId))
                TintSquaddieIfTurnIsComplete(state.battleOrchestratorState.squaddieRepository, battleSquaddie, squaddieTemplate);
            });
        });
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return undefined;
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
    }
}
