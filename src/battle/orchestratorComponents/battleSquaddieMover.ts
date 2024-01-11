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
import {
    DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation,
    DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation,
    OrchestratorUtilities,
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct
} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {CurrentlySelectedSquaddieDecisionService} from "../history/currentlySelectedSquaddieDecision";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {DecisionActionEffectIteratorService} from "./decisionActionEffectIterator";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";

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
        ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state.battleOrchestratorState);
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

        OrchestratorUtilities.updateSquaddieBasedOnActionEffect({
            battleSquaddieId: CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleState.squaddieCurrentlyActing),
            missionMap: state.battleState.missionMap,
            repository: state.squaddieRepository,
            actionEffect: DecisionActionEffectIteratorService.peekActionEffect(state.decisionActionEffectIterator),
        });

        const mapIcon = state.squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
        if (mapIcon) {
            updateSquaddieIconLocation(state.squaddieRepository, battleSquaddie, state.battleState.squaddieMovePath.destination, state.battleState.camera);
            TintSquaddieIfTurnIsComplete(state.squaddieRepository, battleSquaddie, squaddieTemplate);
            mapIcon.draw(graphicsContext);
        }
        state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
    }
}
