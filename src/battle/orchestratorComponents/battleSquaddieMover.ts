import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { getResultOrThrowError } from "../../utils/resultOrError"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddie } from "../battleSquaddie"
import { ActionComponentCalculator } from "../actionDecision/actionComponentCalculator"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { BattleActionService } from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { ResourceHandler } from "../../resource/resourceHandler"
import { SquaddieService } from "../../squaddie/squaddieService"
import { GraphicsConfig } from "../../utils/graphics/graphicsConfig"
import { SearchPathAdapterService } from "../../search/searchPathAdapter/searchPathAdapter"

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
            scrollCamera: false,
            displayMap: true,
            pauseTimer: true,
            displayPlayerHUD: false,
        })
    }

    update({
        gameEngineState,
        graphicsContext,
        resourceHandler,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
        if (!this.animationStartTime) {
            this.animationStartTime = Date.now()
        }

        if (
            this.shouldAnimateSquaddieMovement(gameEngineState) &&
            !DrawSquaddieIconOnMapUtilities.hasMovementAnimationFinished(
                this.animationStartTime,
                gameEngineState.battleOrchestratorState.battleState
                    .squaddieMovePath
            )
        ) {
            this.updateWhileAnimationIsInProgress(
                gameEngineState,
                graphicsContext,
                resourceHandler
            )
            return
        }

        if (!this.finishedCleanup) {
            this.updateWhenAnimationCompletes(gameEngineState, graphicsContext)
        }
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

    reset(_: GameEngineState) {
        this.animationStartTime = undefined
        this.finishedCleanup = false
    }

    private updateWhileAnimationIsInProgress(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                BattleActionRecorderService.peekAtAnimationQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                ).actor.actorBattleSquaddieId
            )
        )

        DrawSquaddieIconOnMapUtilities.moveSquaddieAlongPath({
            squaddieRepository: gameEngineState.repository,
            battleSquaddie,
            timeMovementStarted: this.animationStartTime,
            squaddieMovePath:
                gameEngineState.battleOrchestratorState.battleState
                    .squaddieMovePath,
            camera: gameEngineState.battleOrchestratorState.battleState.camera,
        })

        const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId({
            repository: gameEngineState.repository,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        })
        if (mapIcon) {
            mapIcon.draw({ graphicsContext, resourceHandler })
        }
    }

    private updateWhenAnimationCompletes(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        const { battleSquaddie, battleSquaddieId } =
            getBattleSquaddieCurrentlyMoving(gameEngineState)

        if (!battleSquaddieId) {
            this.finishedCleanup = true
            gameEngineState.battleOrchestratorState.battleState.squaddieMovePath =
                undefined
            return
        }

        TerrainTileMapService.removeAllGraphicsLayers(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap
        )
        DrawSquaddieIconOnMapUtilities.unTintSquaddieMapIcon(
            gameEngineState.repository,
            battleSquaddie
        )
        updateIconLocation(
            gameEngineState,
            battleSquaddie,
            graphicsContext,
            gameEngineState.resourceHandler
        )
        BattleActionService.setAnimationCompleted({
            battleAction: BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            ),
            animationCompleted: true,
        })
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            gameEngineState,
            graphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        this.finishedCleanup = true
        gameEngineState.battleOrchestratorState.battleState.squaddieMovePath =
            undefined
    }

    private shouldAnimateSquaddieMovement(
        gameEngineState: GameEngineState
    ): boolean {
        const { battleSquaddie, battleSquaddieId } =
            getBattleSquaddieCurrentlyMoving(gameEngineState)

        if (!battleSquaddieId || !battleSquaddie) return false

        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddie.battleSquaddieId
            )
        )

        const { squaddieIsNormallyControllableByPlayer } =
            SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            })
        if (squaddieIsNormallyControllableByPlayer) return true

        return SearchPathAdapterService.getCoordinates(
            gameEngineState.battleOrchestratorState.battleState.squaddieMovePath
        ).some((coordinate) =>
            GraphicsConfig.isMapCoordinateOnScreen({
                mapCoordinate: coordinate,
                camera: gameEngineState.battleOrchestratorState.battleState
                    .camera,
            })
        )
    }
}

const updateIconLocation = (
    gameEngineState: GameEngineState,
    battleSquaddie: BattleSquaddie,
    graphicsContext: GraphicsBuffer,
    resourceHandler: ResourceHandler
) => {
    const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId({
        repository: gameEngineState.repository,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
    })
    if (!mapIcon) {
        return
    }
    const destination = BattleActionRecorderService.peekAtAnimationQueue(
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder
    ).effect.movement.endCoordinate

    DrawSquaddieIconOnMapUtilities.updateSquaddieIconLocation({
        repository: gameEngineState.repository,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        destination,
        camera: gameEngineState.battleOrchestratorState.battleState.camera,
    })
    mapIcon.draw({ graphicsContext, resourceHandler })
}

const getBattleSquaddieCurrentlyMoving = (gameEngineState: GameEngineState) => {
    const battleSquaddieId = BattleActionRecorderService.peekAtAnimationQueue(
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder
    ).actor.actorBattleSquaddieId

    if (!battleSquaddieId) {
        return {
            battleSquaddieId,
            battleSquaddie: undefined,
        }
    }

    const { battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleSquaddieId
        )
    )

    return {
        battleSquaddieId,
        battleSquaddie,
    }
}
