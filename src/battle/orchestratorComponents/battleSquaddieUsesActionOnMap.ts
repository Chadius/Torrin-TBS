import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { BattleUISettings, BattleUISettingsService } from "../orchestrator/uiSettings/uiSettings"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ActionComponentCalculator } from "../actionDecision/actionComponentCalculator"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { ResourceHandler } from "../../resource/resourceHandler"
import { ObjectRepositoryService } from "../objectRepository"
import { SquaddieService } from "../../squaddie/squaddieService"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngineState/gameEngineState"

export const ACTION_COMPLETED_WAIT_TIME_MS = 500

export class BattleSquaddieUsesActionOnMap
    implements BattleOrchestratorComponent
{
    animationCompleteStartTime?: number
    completed: boolean | undefined

    constructor() {
        this.reset(GameEngineStateService.new({}))
    }

    hasCompleted(_gameEngineState: GameEngineState): boolean {
        return this.completed ?? false
    }

    mouseEventHappened(
        _gameEngineState: GameEngineState,
        _event: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    keyEventHappened(
        _gameEngineState: GameEngineState,
        _event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    uiControlSettings(
        _gameEngineState: GameEngineState
    ): BattleUISettings {
        return BattleUISettingsService.new({
            displayBattleMap: true,
            letMouseScrollCamera: false,
            pauseTimer: true,
            displayPlayerHUD: false,
        })
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
            gameEngineState
        )
        const nextMode =
            ActionComponentCalculator.getNextModeBasedOnBattleActionRecorder(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        OrchestratorUtilities.messageAndHighlightPlayableSquaddieTakingATurn({
            gameEngineState,
        })

        return {
            nextMode,
            checkMissionObjectives: true,
        }
    }

    reset(_gameEngineState: GameEngineState): void {
        this.animationCompleteStartTime = undefined
        this.completed = false
    }

    update({
        gameEngineState,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler | undefined
    }): void {
        if (this.animationCompleteStartTime === undefined) {
            this.animationCompleteStartTime = Date.now()
        }

        if (
            shouldWaitBeforeFinishing(gameEngineState) &&
            !animationTimeHasExpired(this.animationCompleteStartTime)
        ) {
            return
        }

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            battleActionRecorder:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
            repository: gameEngineState.repository,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            cache: gameEngineState.battleOrchestratorState.cache,
            battleHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState,
            battleState: gameEngineState.battleOrchestratorState.battleState,
            messageBoard: gameEngineState.messageBoard,
        })

        this.completed = true
    }
}

const shouldWaitBeforeFinishing = (
    gameEngineState: GameEngineState
): boolean => {
    const battleAction = BattleActionRecorderService.peekAtAnimationQueue(
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder
    )
    if (
        gameEngineState.repository == undefined ||
        battleAction?.actor.actorBattleSquaddieId == undefined
    )
        return false
    const { battleSquaddie, squaddieTemplate } =
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleAction.actor.actorBattleSquaddieId
        )

    const { squaddieIsNormallyControllableByPlayer } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            battleSquaddie,
            squaddieTemplate,
        })
    return squaddieIsNormallyControllableByPlayer
}

const animationTimeHasExpired = (animationCompleteStartTime: number) =>
    animationCompleteStartTime !== undefined &&
    Date.now() - animationCompleteStartTime >= ACTION_COMPLETED_WAIT_TIME_MS
