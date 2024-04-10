import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {DrawSquaddieUtilities} from "../animation/drawSquaddie";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {ActionsThisRoundService} from "../history/actionsThisRound";

export class BattleSquaddieMover implements BattleOrchestratorComponent {
    animationStartTime?: number;

    constructor() {
        this.animationStartTime = undefined;
    }

    hasCompleted(state: GameEngineState): boolean {
        if (state.battleOrchestratorState.battleState.squaddieMovePath === undefined) {
            return true;
        }
        return this.animationStartTime && DrawSquaddieUtilities.hasMovementAnimationFinished(this.animationStartTime, state.battleOrchestratorState.battleState.squaddieMovePath);
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

        if (!DrawSquaddieUtilities.hasMovementAnimationFinished(this.animationStartTime, state.battleOrchestratorState.battleState.squaddieMovePath)) {
            this.updateWhileAnimationIsInProgress(state, graphicsContext);
        } else {
            this.updateWhenAnimationCompletes(state, graphicsContext);
        }
    }

    recommendStateChanges(gameEngineState: GameEngineState): BattleOrchestratorChanges | undefined {
        ActionsThisRoundService.nextProcessedActionEffectToShow(gameEngineState.battleOrchestratorState.battleState.actionsThisRound);
        OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(gameEngineState);
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(gameEngineState);
        const processedActionEffectToShow = ActionsThisRoundService.getProcessedActionEffectToShow(gameEngineState.battleOrchestratorState.battleState.actionsThisRound);
        const nextMode = OrchestratorUtilities.getNextModeBasedOnProcessedActionEffect(processedActionEffectToShow);
        OrchestratorUtilities.drawOrResetHUDBasedOnSquaddieTurnAndAffiliation(gameEngineState);
        OrchestratorUtilities.drawSquaddieReachBasedOnSquaddieTurnAndAffiliation(gameEngineState);

        return {
            nextMode,
            displayMap: true,
            checkMissionObjectives: true,
        }
    }

    reset(gameEngineState: GameEngineState) {
        gameEngineState.battleOrchestratorState.battleState.squaddieMovePath = undefined;
        this.animationStartTime = undefined;
    }

    private updateWhileAnimationIsInProgress(state: GameEngineState, graphicsContext: GraphicsContext) {
        const {
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository,
            state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId,
        ));

        DrawSquaddieUtilities.moveSquaddieAlongPath({
            squaddieRepository: state.repository,
            battleSquaddie,
            timeMovementStarted: this.animationStartTime,
            squaddieMovePath: state.battleOrchestratorState.battleState.squaddieMovePath,
            camera: state.battleOrchestratorState.battleState.camera,
        });

        const mapIcon = state.repository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
        if (mapIcon) {
            mapIcon.draw(graphicsContext);
        }
    }

    private updateWhenAnimationCompletes(state: GameEngineState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository,
            state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId,
        ));
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        updateIconAndMapBasedOnWhetherSquaddieCanAct(state, battleSquaddie, squaddieTemplate, graphicsContext);
    }
}

const updateIconAndMapBasedOnWhetherSquaddieCanAct = (state: GameEngineState, battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate, graphicsContext: GraphicsContext) => {
    const mapIcon = state.repository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
    if (!mapIcon) {
        return;
    }
    DrawSquaddieUtilities.updateSquaddieIconLocation({
        repository: state.repository,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        destination: state.battleOrchestratorState.battleState.squaddieMovePath.destination,
        camera: state.battleOrchestratorState.battleState.camera,
    });
    DrawSquaddieUtilities.highlightPlayableSquaddieReachIfTheyCanAct({
        battleSquaddie,
        squaddieTemplate,
        missionMap: state.battleOrchestratorState.battleState.missionMap,
        repository: state.repository,
        campaign: state.campaign,
    });
    DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(battleSquaddie, squaddieTemplate, state.repository);
    mapIcon.draw(graphicsContext);
};

