import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
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
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"
import {
    SquaddieMoveOnMapAnimation,
    SquaddieMoveOnMapAnimationService,
} from "../animation/squaddieMoveOnMap/squaddieMoveOnMapAnimation"

export class BattleSquaddieMover implements BattleOrchestratorComponent {
    startedAnimation: boolean
    finishedCleanup: boolean
    squaddieMoveOnMapAnimations: {
        [battleSquaddieId: string]: SquaddieMoveOnMapAnimation
    }

    constructor() {
        this.startedAnimation = false
        this.finishedCleanup = false
        this.squaddieMoveOnMapAnimations = {}
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
        resourceHandler: ResourceHandler | undefined
    }): void {
        if (!this.startedAnimation) {
            this.startedAnimation = true
            this.createSquaddieMovementAnimationsFromBattleAction(
                gameEngineState
            )
        }

        if (
            this.shouldAnimateSquaddieMovement(gameEngineState) &&
            gameEngineState.battleOrchestratorState.battleState
                .squaddieMovePath != undefined &&
            !this.hasAllMovementAnimationsFinished()
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
        this.startedAnimation = false
        this.finishedCleanup = false
        this.squaddieMoveOnMapAnimations = {}
    }

    private updateWhileAnimationIsInProgress(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler | undefined
    ) {
        if (gameEngineState.repository == undefined) return
        const repository = gameEngineState.repository

        DrawSquaddieIconOnMapUtilities.moveSquaddieOnMap({
            repository,
            squaddieMoveOnMapAnimations: this.squaddieMoveOnMapAnimations,
        })

        Object.keys(this.squaddieMoveOnMapAnimations).forEach(
            (battleSquaddieId) => {
                const mapIcon =
                    ObjectRepositoryService.getImageUIByBattleSquaddieId({
                        repository,
                        battleSquaddieId: battleSquaddieId,
                    })
                if (mapIcon && resourceHandler) {
                    mapIcon.draw({ graphicsContext, resourceHandler })
                }
            }
        )
    }

    private updateWhenAnimationCompletes(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        TerrainTileMapService.removeAllGraphicsLayers(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap
        )
        Object.keys(this.squaddieMoveOnMapAnimations).forEach(
            (battleSquaddieId) => {
                if (gameEngineState.repository == undefined) return
                const { battleSquaddie } =
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository,
                        battleSquaddieId
                    )

                DrawSquaddieIconOnMapUtilities.unTintSquaddieMapIcon(
                    gameEngineState.repository,
                    battleSquaddie
                )
                if (gameEngineState.resourceHandler) {
                    updateIconLocation(
                        gameEngineState,
                        battleSquaddie,
                        graphicsContext,
                        gameEngineState.resourceHandler
                    )
                }
            }
        )

        const battleAction = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )
        if (battleAction) {
            BattleActionService.setAnimationCompleted({
                battleAction: battleAction,
                animationCompleted: true,
            })
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
        this.finishedCleanup = true
        gameEngineState.battleOrchestratorState.battleState.squaddieMovePath =
            undefined
        this.squaddieMoveOnMapAnimations = {}
    }

    private shouldAnimateSquaddieMovement(
        gameEngineState: GameEngineState
    ): boolean {
        const activeAnimations = Object.entries(
            this.squaddieMoveOnMapAnimations
        ).filter(([_, squaddieMoveOnMapAnimation]) => {
            return !SquaddieMoveOnMapAnimationService.hasFinishedMoving(
                squaddieMoveOnMapAnimation
            )
        })

        if (activeAnimations.length == 0) return false
        if (gameEngineState.repository == undefined) return false
        const repository = gameEngineState.repository

        return activeAnimations.some(
            ([battleSquaddieId, squaddieMoveOnMapAnimation]) => {
                const { battleSquaddie, squaddieTemplate } =
                    ObjectRepositoryService.getSquaddieByBattleId(
                        repository,
                        battleSquaddieId
                    )

                const { squaddieIsNormallyControllableByPlayer } =
                    SquaddieService.canPlayerControlSquaddieRightNow({
                        squaddieTemplate,
                        battleSquaddie,
                    })
                if (squaddieIsNormallyControllableByPlayer) return true
                return squaddieMoveOnMapAnimation.movementPath.some(
                    (coordinate) =>
                        GraphicsConfig.isMapCoordinateOnScreen({
                            mapCoordinate: coordinate,
                            camera: gameEngineState.battleOrchestratorState
                                .battleState.camera,
                        })
                )
            }
        )
    }

    private hasAllMovementAnimationsFinished() {
        return Object.values(this.squaddieMoveOnMapAnimations).every(
            (squaddieMoveOnMapAnimation) =>
                SquaddieMoveOnMapAnimationService.hasFinishedMoving(
                    squaddieMoveOnMapAnimation
                )
        )
    }

    private createSquaddieMovementAnimationsFromBattleAction(
        gameEngineState: GameEngineState
    ) {
        if (gameEngineState.repository == undefined) return

        const peekAtAnimationQueue =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )
        if (peekAtAnimationQueue == undefined) return

        const { battleSquaddie } =
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                peekAtAnimationQueue.actor.actorBattleSquaddieId
            )

        if (
            gameEngineState.battleOrchestratorState.battleState
                .squaddieMovePath == undefined
        )
            return

        if (
            this.squaddieMoveOnMapAnimations[battleSquaddie.battleSquaddieId] ==
            undefined
        ) {
            this.squaddieMoveOnMapAnimations[battleSquaddie.battleSquaddieId] =
                SquaddieMoveOnMapAnimationService.new({
                    movementPath: SearchPathAdapterService.getCoordinates(
                        gameEngineState.battleOrchestratorState.battleState
                            .squaddieMovePath
                    ),
                    camera: gameEngineState.battleOrchestratorState.battleState
                        .camera,
                })
        }
    }
}

const updateIconLocation = (
    gameEngineState: GameEngineState,
    battleSquaddie: BattleSquaddie,
    graphicsContext: GraphicsBuffer,
    resourceHandler: ResourceHandler
) => {
    if (gameEngineState.repository == undefined) return
    const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId({
        repository: gameEngineState.repository,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
    })
    if (!mapIcon) {
        return
    }
    const destination = BattleActionRecorderService.peekAtAnimationQueue(
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder
    )?.effect?.movement?.endCoordinate
    if (destination == undefined) return

    DrawSquaddieIconOnMapUtilities.updateSquaddieIconLocation({
        repository: gameEngineState.repository,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        destination,
        camera: gameEngineState.battleOrchestratorState.battleState.camera,
    })
    mapIcon.draw({ graphicsContext, resourceHandler })
}
