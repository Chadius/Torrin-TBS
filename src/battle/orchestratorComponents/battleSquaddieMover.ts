import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {DrawSquaddieUtilities, hasMovementAnimationFinished, moveSquaddieAlongPath} from "../animation/drawSquaddie";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {
    DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation,
    DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation,
    OrchestratorUtilities
} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {CurrentlySelectedSquaddieDecisionService} from "../history/currentlySelectedSquaddieDecision";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

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
        }

        if (!hasMovementAnimationFinished(this.animationStartTime, state.battleOrchestratorState.battleState.squaddieMovePath)) {
            this.updateWhileAnimationIsInProgress(state.battleOrchestratorState, graphicsContext);
        } else {
            this.updateWhenAnimationCompletes(state.battleOrchestratorState, graphicsContext);
        }
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        OrchestratorUtilities.nextActionEffect(
            state.battleOrchestratorState,
            state.battleOrchestratorState.battleState.squaddieCurrentlyActing
        );
        const nextActionEffect = OrchestratorUtilities.peekActionEffect(
            state.battleOrchestratorState,
            state.battleOrchestratorState.battleState.squaddieCurrentlyActing
        );

        const nextMode: BattleOrchestratorMode = OrchestratorUtilities.getNextModeBasedOnActionEffect(nextActionEffect);

        return {
            nextMode,
            displayMap: true,
            checkMissionObjectives: true,
        }
    }

    reset(state: GameEngineState) {
        state.battleOrchestratorState.battleState.squaddieMovePath = undefined;
        this.animationStartTime = undefined;
        OrchestratorUtilities.resetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state.battleOrchestratorState);
        DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state.battleOrchestratorState);
        DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state.battleOrchestratorState);
    }

    private updateWhileAnimationIsInProgress(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository,
            CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleState.squaddieCurrentlyActing)
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
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository,
            CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleState.squaddieCurrentlyActing)
        ));
        state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        updateIconAndMapBasedOnWhetherSquaddieCanAct(state, battleSquaddie, squaddieTemplate, graphicsContext);
    }
}

const updateIconAndMapBasedOnWhetherSquaddieCanAct = (state: BattleOrchestratorState, battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate, graphicsContext: GraphicsContext) => {
    const mapIcon = state.squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
    if (!mapIcon) {
        return;
    }
    DrawSquaddieUtilities.updateSquaddieIconLocation({
        repository: state.squaddieRepository,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        destination: state.battleState.squaddieMovePath.destination,
        camera: state.battleState.camera,
    });
    DrawSquaddieUtilities.highlightPlayableSquaddieReachIfTheyCanAct(battleSquaddie, squaddieTemplate, state.battleState.missionMap, state.squaddieRepository);
    DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(battleSquaddie, squaddieTemplate, state.squaddieRepository);
    mapIcon.draw(graphicsContext);
};

