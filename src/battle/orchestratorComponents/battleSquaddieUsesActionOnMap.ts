import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { DrawSquaddieUtilities } from "../animation/drawSquaddie"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { PlayerBattleActionBuilderStateService } from "../actionBuilder/playerBattleActionBuilderState"
import { ActionComponentCalculator } from "../actionBuilder/actionComponentCalculator"

export const ACTION_COMPLETED_WAIT_TIME_MS = 500

export class BattleSquaddieUsesActionOnMap
    implements BattleOrchestratorComponent
{
    animationCompleteStartTime?: number

    constructor() {
        this.animationCompleteStartTime = undefined
    }

    hasCompleted(state: GameEngineState): boolean {
        return animationTimeHasExpired(this.animationCompleteStartTime)
    }

    mouseEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {}

    keyEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {}

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            displayMap: true,
            scrollCamera: false,
            pauseTimer: true,
        })
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        ActionsThisRoundService.nextProcessedActionEffectToShow(
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
        )
        OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(
            gameEngineState
        )
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
            gameEngineState
        )
        const nextMode =
            ActionComponentCalculator.getNextModeBasedOnActionsThisRound(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            )
        OrchestratorUtilities.drawOrResetHUDBasedOnSquaddieTurnAndAffiliation(
            gameEngineState
        )
        OrchestratorUtilities.drawSquaddieReachBasedOnSquaddieTurnAndAffiliation(
            gameEngineState
        )

        return {
            nextMode,
            displayMap: true,
            checkMissionObjectives: true,
        }
    }

    reset(gameEngineState: GameEngineState): void {
        this.animationCompleteStartTime = undefined
        OrchestratorUtilities.resetActionBuilderIfActionIsComplete(
            gameEngineState
        )
    }

    update(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ): void {
        if (this.animationCompleteStartTime !== undefined) {
            if (animationTimeHasExpired(this.animationCompleteStartTime)) {
                PlayerBattleActionBuilderStateService.setAnimationCompleted({
                    actionBuilderState:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState,
                    animationCompleted: true,
                })
            }
            return
        }

        const battleSquaddieId =
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieId
            )
        )
        DrawSquaddieUtilities.highlightPlayableSquaddieReachIfTheyCanAct({
            battleSquaddie,
            squaddieTemplate,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            repository: gameEngineState.repository,
            campaign: gameEngineState.campaign,
        })
        DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(
            battleSquaddie,
            squaddieTemplate,
            gameEngineState.repository
        )
        this.animationCompleteStartTime = Date.now()
    }
}

const animationTimeHasExpired = (animationCompleteStartTime: number) =>
    animationCompleteStartTime !== undefined &&
    Date.now() - animationCompleteStartTime >= ACTION_COMPLETED_WAIT_TIME_MS
