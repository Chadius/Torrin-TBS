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
        const playerTeam = state.battleOrchestratorState.battleState.teamsByAffiliation[SquaddieAffiliation.PLAYER];
        if (playerTeam) {
            playerTeam.battleSquaddieIds.forEach((battleId) => {
                const {
                    battleSquaddie,
                    squaddieTemplate,
                } = getResultOrThrowError(state.battleOrchestratorState.squaddieRepository.getSquaddieByBattleId(battleId))
                TintSquaddieIfTurnIsComplete(state.battleOrchestratorState.squaddieRepository, battleSquaddie, squaddieTemplate);
            });
        }
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return undefined;
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
    }
}
