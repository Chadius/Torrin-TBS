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
import { BattleSquaddie } from "../battleSquaddie"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ActionComponentCalculator } from "../actionDecision/actionComponentCalculator"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { BattleActionService } from "../history/battleAction"
import { BattleActionQueueService } from "../history/battleActionQueue"

export class BattleSquaddieMover implements BattleOrchestratorComponent {
    animationStartTime?: number
    finishedCleanup: boolean

    constructor() {
        this.animationStartTime = undefined
        this.finishedCleanup = false
    }

    hasCompleted(gameEngineState: GameEngineState): boolean {
        if (
            gameEngineState.battleOrchestratorState.battleState
                .squaddieMovePath === undefined
        ) {
            return true
        }
        return this.finishedCleanup
    }

    mouseEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    keyEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
            pauseTimer: true,
        })
    }

    update(state: GameEngineState, graphicsContext: GraphicsBuffer): void {
        if (!this.animationStartTime) {
            this.animationStartTime = Date.now()
        }

        if (
            !DrawSquaddieUtilities.hasMovementAnimationFinished(
                this.animationStartTime,
                state.battleOrchestratorState.battleState.squaddieMovePath
            )
        ) {
            this.updateWhileAnimationIsInProgress(state, graphicsContext)
            return
        }

        if (!this.finishedCleanup) {
            this.updateWhenAnimationCompletes(state, graphicsContext)
        }
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
            ActionComponentCalculator.getNextModeBasedOnBattleActionQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionQueue
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

    reset(gameEngineState: GameEngineState) {
        this.animationStartTime = undefined
        this.finishedCleanup = false
    }

    private updateWhileAnimationIsInProgress(
        state: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                state.repository,
                state.battleOrchestratorState.battleState.actionsThisRound
                    .battleSquaddieId
            )
        )

        DrawSquaddieUtilities.moveSquaddieAlongPath({
            squaddieRepository: state.repository,
            battleSquaddie,
            timeMovementStarted: this.animationStartTime,
            squaddieMovePath:
                state.battleOrchestratorState.battleState.squaddieMovePath,
            camera: state.battleOrchestratorState.battleState.camera,
        })

        const mapIcon =
            state.repository.imageUIByBattleSquaddieId[
                battleSquaddie.battleSquaddieId
            ]
        if (mapIcon) {
            mapIcon.draw(graphicsContext)
        }
    }

    private updateWhenAnimationCompletes(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        const battleSquaddieId = BattleActionQueueService.peek(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue
        ).actor.actorBattleSquaddieId

        if (!battleSquaddieId) {
            this.finishedCleanup = true
            gameEngineState.battleOrchestratorState.battleState.squaddieMovePath =
                undefined
            return
        }
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieId
            )
        )
        TerrainTileMapService.removeAllGraphicsLayers(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap
        )
        updateIconAndMapBasedOnWhetherSquaddieCanAct(
            gameEngineState,
            battleSquaddie,
            squaddieTemplate,
            graphicsContext
        )
        BattleActionService.setAnimationCompleted({
            battleAction: BattleActionQueueService.peek(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionQueue
            ),
            animationCompleted: true,
        })
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            gameEngineState,
        })
        this.finishedCleanup = true
        gameEngineState.battleOrchestratorState.battleState.squaddieMovePath =
            undefined
    }
}

const updateIconAndMapBasedOnWhetherSquaddieCanAct = (
    gameEngineState: GameEngineState,
    battleSquaddie: BattleSquaddie,
    squaddieTemplate: SquaddieTemplate,
    graphicsContext: GraphicsBuffer
) => {
    const mapIcon =
        gameEngineState.repository.imageUIByBattleSquaddieId[
            battleSquaddie.battleSquaddieId
        ]
    if (!mapIcon) {
        return
    }
    const destination = BattleActionQueueService.peek(
        gameEngineState.battleOrchestratorState.battleState.battleActionQueue
    ).effect.movement.endLocation

    DrawSquaddieUtilities.updateSquaddieIconLocation({
        repository: gameEngineState.repository,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        destination,
        camera: gameEngineState.battleOrchestratorState.battleState.camera,
    })
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
    mapIcon.draw(graphicsContext)
}
