import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {
    hasMovementAnimationFinished,
    moveSquaddieAlongPath,
    TintSquaddieIfTurnIsComplete,
    updateSquaddieIconLocation
} from "../animation/drawSquaddie";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {spendSquaddieActionPoints, updateSquaddieLocation} from "../squaddieMovementLogic";
import {
    DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation,
    DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation,
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct
} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {SquaddieInstructionInProgressHandler} from "../history/squaddieInstructionInProgress";
import {SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryHelper} from "../objectRepository";

export class BattleSquaddieMover implements BattleOrchestratorComponent {
    animationStartTime?: number;

    constructor() {
        this.animationStartTime = undefined;
    }

    hasCompleted(state: GameEngineState): boolean {
        if (state.battleOrchestratorState.battleState.squaddieMovePath === undefined) {
            return true;
        }
        return this.animationStartTime && hasMovementAnimationFinished(this.animationStartTime, state.battleOrchestratorState.battleState.squaddieMovePath);
    }

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void {
    }

    keyEventHappened(state: GameEngineState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
            pauseTimer: true,
        });
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
        if (!this.animationStartTime) {
            this.animationStartTime = Date.now();

            if (
                state.battleOrchestratorState.battleState.squaddieCurrentlyActing
                && state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound
                && SquaddieActionsForThisRoundHandler.getMostRecentAction(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound).type
                === SquaddieActionType.MOVEMENT
            ) {
                SquaddieInstructionInProgressHandler.markBattleSquaddieIdAsMoving(
                    state.battleOrchestratorState.battleState.squaddieCurrentlyActing,
                    SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)
                );
            }
        }

        if (!hasMovementAnimationFinished(this.animationStartTime, state.battleOrchestratorState.battleState.squaddieMovePath)) {
            this.updateWhileAnimationIsInProgress(state.battleOrchestratorState, graphicsContext);
        } else {
            this.updateWhenAnimationCompletes(state.battleOrchestratorState, graphicsContext);
        }
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
            checkMissionObjectives: true,
        }
    }

    reset(state: GameEngineState) {
        state.battleOrchestratorState.battleState.squaddieMovePath = undefined;
        this.animationStartTime = undefined;
        ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state.battleOrchestratorState);

        if (
            state.battleOrchestratorState.battleState.squaddieCurrentlyActing
            && state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound
            && SquaddieActionsForThisRoundHandler.getMostRecentAction(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound).type
            === SquaddieActionType.MOVEMENT
        ) {
            SquaddieInstructionInProgressHandler.removeBattleSquaddieIdAsMoving(
                state.battleOrchestratorState.battleState.squaddieCurrentlyActing,
                SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)
            );
        }

        DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state.battleOrchestratorState);
        DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state.battleOrchestratorState);
    }

    private updateWhileAnimationIsInProgress(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(state.squaddieRepository,
            SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing)
        ));

        moveSquaddieAlongPath(state.squaddieRepository, battleSquaddie, this.animationStartTime, state.battleState.squaddieMovePath, state.battleState.camera);
        const mapIcon = state.squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
        if (mapIcon) {
            mapIcon.draw(graphicsContext);
        }
    }

    private updateWhenAnimationCompletes(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(state.squaddieRepository,
            SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing)
        ));

        updateSquaddieLocation(battleSquaddie, squaddieTemplate, state.battleState.squaddieMovePath.destination, state.battleState.missionMap, battleSquaddie.battleSquaddieId);
        const mostRecentAction = SquaddieActionsForThisRoundHandler.getMostRecentAction(state.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound);
        if (mostRecentAction.type === SquaddieActionType.MOVEMENT) {
            spendSquaddieActionPoints(battleSquaddie, mostRecentAction.numberOfActionPointsSpent);
        }

        const mapIcon = state.squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
        if (mapIcon) {
            updateSquaddieIconLocation(state.squaddieRepository, battleSquaddie, state.battleState.squaddieMovePath.destination, state.battleState.camera);
            TintSquaddieIfTurnIsComplete(state.squaddieRepository, battleSquaddie, squaddieTemplate);
            mapIcon.draw(graphicsContext);
        }
        state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
    }
}
