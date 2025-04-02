import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ActionComponentCalculator } from "../actionDecision/actionComponentCalculator"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { ResourceHandler } from "../../resource/resourceHandler"
import { ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"

export const ACTION_COMPLETED_WAIT_TIME_MS = 500

export class BattleSquaddieUsesActionOnMap
    implements BattleOrchestratorComponent
{
    animationCompleteStartTime?: number
    completed: boolean

    constructor() {
        this.reset(undefined)
    }

    hasCompleted(_gameEngineState: GameEngineState): boolean {
        return this.completed
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

    uiControlSettings(_gameEngineState: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            displayMap: true,
            scrollCamera: false,
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
        graphicsContext,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
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
            gameEngineState,
            graphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
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
    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleAction.actor.actorBattleSquaddieId
        )
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
