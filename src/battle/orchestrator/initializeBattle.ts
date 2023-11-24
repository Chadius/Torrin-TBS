import {BattleOrchestratorState} from "./battleOrchestratorState";
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

export class InitializeBattle implements BattleOrchestratorComponent {
    hasCompleted(state: BattleOrchestratorState): boolean {
        return true;
    }

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        return {};
    }

    reset(state: BattleOrchestratorState): void {
        const playerTeam = state.battleState.teamsByAffiliation[SquaddieAffiliation.PLAYER];
        if (playerTeam) {
            playerTeam.battleSquaddieIds.forEach((battleId) => {
                const {
                    battleSquaddie,
                    squaddieTemplate,
                } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(battleId))
                TintSquaddieIfTurnIsComplete(state.squaddieRepository, battleSquaddie, squaddieTemplate);
            });
        }
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return undefined;
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
    }
}
