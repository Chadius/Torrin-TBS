import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { GraphicsConfig } from "../../utils/graphics/graphicsConfig"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { HIGHLIGHT_PULSE_COLOR } from "../../hexMap/hexDrawingUtils"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { TeamStrategy } from "../teamStrategy/teamStrategy"
import { DetermineNextDecisionService } from "../teamStrategy/determineNextDecision"
import { BattleStateService } from "../battleState/battleState"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { SearchResult } from "../../hexMap/pathfinder/searchResults/searchResult"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { ActionComponentCalculator } from "../actionDecision/actionComponentCalculator"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../hexMap/mapLayer/mapGraphicsLayer"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { BattleSquaddieSelectorService } from "./battleSquaddieSelectorUtils"
import { SquaddieService } from "../../squaddie/squaddieService"
import { ActionCalculator } from "../calculator/actionCalculator/calculator"
import { MissionMapService } from "../../missionMap/missionMap"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { isValidValue } from "../../utils/objectValidityCheck"
import { BattleSquaddie } from "../battleSquaddie"
import { ResourceHandler } from "../../resource/resourceHandler"
import { SearchResultAdapterService } from "../../hexMap/pathfinder/searchResults/searchResultAdapter"
import { MapSearchService } from "../../hexMap/pathfinder/pathGeneration/mapSearch"
import { SearchLimitService } from "../../hexMap/pathfinder/pathGeneration/searchLimit"
import { SearchPathAdapterService } from "../../search/searchPathAdapter/searchPathAdapter"
import { ActionTemplate } from "../../action/template/actionTemplate"

export const SQUADDIE_SELECTOR_PANNING_TIME = 1000
export const SHOW_SELECTED_ACTION_TIME = 500

export class BattleComputerSquaddieSelector
    implements BattleOrchestratorComponent
{
    mostRecentDecisionSteps: BattleActionDecisionStep[]
    private showSelectedActionWaitTime?: number
    private clickedToSkipActionDescription: boolean
    shouldPanToSquaddie: boolean

    constructor() {
        this.resetInternalState()
    }

    hasCompleted(gameEngineState: GameEngineState): boolean {
        if (
            this.isPauseToShowSquaddieSelectionRequired(gameEngineState) &&
            !(
                this.pauseToShowSquaddieSelectionCompleted(gameEngineState) ||
                this.clickedToSkipActionDescription
            )
        ) {
            return false
        }

        return (
            !this.shouldPanToSquaddie ||
            !gameEngineState.battleOrchestratorState.battleState.camera.isPanning()
        )
    }

    mouseEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        if (
            event.eventType === OrchestratorComponentMouseEventType.RELEASE &&
            !this.pauseToShowSquaddieSelectionCompleted(state)
        ) {
            this.clickedToSkipActionDescription = true
        }
    }

    keyEventHappened(
        _state: GameEngineState,
        _event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance but does nothing
    }

    uiControlSettings(_state: GameEngineState): UIControlSettings {
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
        const currentTeam: BattleSquaddieTeam =
            BattleStateService.getCurrentTeam(
                gameEngineState.battleOrchestratorState.battleState,
                gameEngineState.repository
            )
        if (
            this.mostRecentDecisionSteps === undefined &&
            currentTeam &&
            BattleSquaddieTeamService.hasAnActingSquaddie(
                currentTeam,
                gameEngineState.repository
            ) &&
            !BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(
                currentTeam,
                gameEngineState.repository
            )
        ) {
            this.askComputerControlSquaddie(gameEngineState)
        }

        if (
            gameEngineState.battleOrchestratorState.battleState.camera.isPanning() &&
            this.mostRecentDecisionSteps !== undefined
        ) {
            drawSquaddieAtInitialPositionAsCameraPans(
                gameEngineState,
                graphicsContext,
                resourceHandler
            )
        }
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode
        if (this.mostRecentDecisionSteps !== undefined) {
            nextMode =
                ActionComponentCalculator.getNextModeBasedOnBattleActionRecorder(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
        } else if (
            !this.atLeastOneSquaddieOnCurrentTeamCanAct(gameEngineState)
        ) {
            nextMode = BattleOrchestratorMode.PHASE_CONTROLLER
        }
        return {
            nextMode,
        }
    }

    reset(_gameEngineState: GameEngineState) {
        this.resetInternalState()
    }

    private atLeastOneSquaddieOnCurrentTeamCanAct(
        state: GameEngineState
    ): boolean {
        const currentTeam = BattleStateService.getCurrentTeam(
            state.battleOrchestratorState.battleState,
            state.repository
        )
        return (
            currentTeam &&
            BattleSquaddieTeamService.hasAnActingSquaddie(
                currentTeam,
                state.repository
            )
        )
    }

    private isPauseToShowSquaddieSelectionRequired(
        _gameEngineState: GameEngineState
    ) {
        if (
            this.mostRecentDecisionSteps === undefined ||
            this.mostRecentDecisionSteps.length === 0
        ) {
            return false
        }

        return (
            this.mostRecentDecisionSteps[
                this.mostRecentDecisionSteps.length - 1
            ].action.actionTemplateId !== undefined
        )
    }

    private pauseToShowSquaddieSelectionCompleted(
        _gameEngineState: GameEngineState
    ) {
        return (
            this.showSelectedActionWaitTime !== undefined &&
            Date.now() - this.showSelectedActionWaitTime >=
                SHOW_SELECTED_ACTION_TIME
        )
    }

    private highlightTargetRange(
        gameEngineState: GameEngineState,
        targetCoordinate: HexCoordinate,
        battleSquaddieId: string
    ) {
        const searchResult: SearchResult =
            MapSearchService.calculateAllPossiblePathsFromStartingCoordinate({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository,
                originMapCoordinate: targetCoordinate,
                currentMapCoordinate: targetCoordinate,
                searchLimit: SearchLimitService.new({
                    baseSearchLimit: SearchLimitService.targeting(),
                    maximumDistance: 0,
                    minimumDistance: 0,
                }),
            })

        const tilesTargeted: HexCoordinate[] =
            SearchResultAdapterService.getCoordinatesWithPaths(searchResult)

        const actionRangeOnMap = MapGraphicsLayerService.new({
            id: battleSquaddieId,
            highlightedTileDescriptions: [
                {
                    coordinates: tilesTargeted,
                    pulseColor: HIGHLIGHT_PULSE_COLOR.RED,
                    overlayImageResourceName: "map icon attack 1 action",
                },
            ],
            type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
        })
        TerrainTileMapService.addGraphicsLayer(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap,
            actionRangeOnMap
        )
    }

    private resetInternalState() {
        this.mostRecentDecisionSteps = undefined
        this.showSelectedActionWaitTime = undefined
        this.clickedToSkipActionDescription = false
        this.shouldPanToSquaddie = false
    }

    private askComputerControlSquaddie(gameEngineState: GameEngineState) {
        if (this.mostRecentDecisionSteps !== undefined) {
            return
        }
        BattleActionDecisionStepService.reset(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )

        const currentTeam: BattleSquaddieTeam =
            BattleStateService.getCurrentTeam(
                gameEngineState.battleOrchestratorState.battleState,
                gameEngineState.repository
            )
        const currentTeamStrategies: TeamStrategy[] =
            gameEngineState.battleOrchestratorState.battleState
                .teamStrategiesById[currentTeam.id] || []
        let strategyIndex = 0
        let battleActionDecisionSteps: BattleActionDecisionStep[] = undefined
        while (
            !battleActionDecisionSteps &&
            strategyIndex < currentTeamStrategies.length
        ) {
            const nextStrategy: TeamStrategy =
                currentTeamStrategies[strategyIndex]
            battleActionDecisionSteps = this.askTeamStrategyToInstructSquaddie(
                gameEngineState,
                currentTeam,
                nextStrategy
            )
            strategyIndex++
        }
        if (battleActionDecisionSteps) {
            this.reactToComputerSelectedAction(
                gameEngineState,
                battleActionDecisionSteps
            )
            this.shouldPanToSquaddie =
                this.isSquaddieActionWorthShowingToPlayer(gameEngineState)
            if (this.shouldPanToSquaddie) {
                this.panToSquaddieIfOffscreen(gameEngineState)
            }
        } else {
            this.defaultSquaddieToEndTurn(gameEngineState, currentTeam)
        }
    }

    private defaultSquaddieToEndTurn(
        state: GameEngineState,
        currentTeam: BattleSquaddieTeam
    ) {
        const battleSquaddieId: string =
            BattleSquaddieTeamService.getBattleSquaddieIdThatCanActButNotPlayerControlled(
                currentTeam,
                state.repository
            )

        const endTurnStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: endTurnStep,
            battleSquaddieId: battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: endTurnStep,
            endTurn: true,
        })

        this.reactToComputerSelectedAction(state, [endTurnStep])
    }

    private askTeamStrategyToInstructSquaddie(
        gameEngineState: GameEngineState,
        currentTeam: BattleSquaddieTeam,
        currentTeamStrategy: TeamStrategy
    ): BattleActionDecisionStep[] {
        return DetermineNextDecisionService.determineNextDecision({
            strategy: currentTeamStrategy,
            team: currentTeam,
            gameEngineState,
        })
    }

    private panToSquaddieIfOffscreen(gameEngineState: GameEngineState) {
        const battleAction = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )

        const battleSquaddieId: string =
            battleAction.actor.actorBattleSquaddieId
        const datum = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddieId
        )

        const { x: squaddieScreenLocationX, y: squaddieScreenLocationY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: datum.currentMapCoordinate,
                cameraLocation:
                    gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
            })

        const { x: squaddieWorldLocationX, y: squaddieWorldLocationY } =
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: datum.currentMapCoordinate,
            })

        if (
            !GraphicsConfig.isLocationOnScreen(
                squaddieScreenLocationX,
                squaddieScreenLocationY
            )
        ) {
            gameEngineState.battleOrchestratorState.battleState.camera.pan({
                xDestination: squaddieWorldLocationX,
                yDestination: squaddieWorldLocationY,
                timeToPan: SQUADDIE_SELECTOR_PANNING_TIME,
                respectConstraints: true,
            })
        }
    }

    private reactToComputerSelectedAction(
        gameEngineState: GameEngineState,
        battleActionDecisionSteps: BattleActionDecisionStep[]
    ) {
        const battleActionDecisionStep: BattleActionDecisionStep =
            battleActionDecisionSteps[0]
        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleActionDecisionStep.actor.battleSquaddieId
            )
        )

        TerrainTileMapService.removeAllGraphicsLayers(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap
        )
        DrawSquaddieIconOnMapUtilities.unTintSquaddieMapIcon(
            gameEngineState.repository,
            battleSquaddie
        )

        const { endTurn, actionTemplate, movement } =
            this.calculateActionPointsSpentOnDecisionSteps(
                gameEngineState,
                battleActionDecisionSteps
            )

        const battleActions = this.createBattleActions(
            gameEngineState,
            battleActionDecisionSteps
        )
        battleActions.forEach((battleAction) => {
            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                battleAction
            )
        })

        this.updateSquaddieLocationForEachMovementDecisionStep(
            battleActionDecisionSteps,
            gameEngineState,
            battleSquaddie
        )
        this.highlightRangeForFirstActionTemplateDecisionStep(
            battleActionDecisionSteps,
            gameEngineState,
            battleSquaddie
        )

        if (movement != undefined) {
            SquaddieTurnService.setMovementActionPointsPreviewedByPlayer({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionPoints: movement,
            })
            SquaddieTurnService.spendPreviewedMovementActionPointsToRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
            })
        }

        SquaddieTurnService.setSpentMovementActionPointsAsNotRefundable({
            squaddieTurn: battleSquaddie.squaddieTurn,
            endTurn,
            actionTemplate,
        })

        this.mostRecentDecisionSteps = battleActionDecisionSteps
    }

    private highlightRangeForFirstActionTemplateDecisionStep(
        battleActionDecisionSteps: BattleActionDecisionStep[],
        gameEngineState: GameEngineState,
        battleSquaddie: BattleSquaddie
    ) {
        const firstActionTemplateDecisionStep = battleActionDecisionSteps.find(
            (battleActionDecisionStep) =>
                battleActionDecisionStep.action.actionTemplateId !== undefined
        )
        if (!firstActionTemplateDecisionStep) {
            return
        }

        this.showSelectedActionWaitTime = Date.now()
        this.highlightTargetRange(
            gameEngineState,
            firstActionTemplateDecisionStep.target.targetCoordinate,
            battleSquaddie.battleSquaddieId
        )
    }

    private updateSquaddieLocationForEachMovementDecisionStep(
        battleActionDecisionSteps: BattleActionDecisionStep[],
        gameEngineState: GameEngineState,
        battleSquaddie: BattleSquaddie
    ) {
        battleActionDecisionSteps
            .filter(
                (battleActionDecisionStep) =>
                    battleActionDecisionStep.action.movement
            )
            .forEach((battleActionDecisionStep) => {
                MissionMapService.updateBattleSquaddieCoordinate({
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    coordinate:
                        battleActionDecisionStep.target.targetCoordinate,
                })
                MissionMapService.setOriginMapCoordinateToCurrentMapCoordinate(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                    battleSquaddie.battleSquaddieId
                )
            })
    }

    private createBattleActions(
        gameEngineState: GameEngineState,
        battleActionDecisionSteps: BattleActionDecisionStep[]
    ): BattleAction[] {
        return battleActionDecisionSteps.reduce(
            (
                battleActions: BattleAction[],
                battleActionDecisionStep: BattleActionDecisionStep
            ) => {
                const { currentMapCoordinate: startLocation } =
                    MissionMapService.getByBattleSquaddieId(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                        battleActionDecisionStep.actor.battleSquaddieId
                    )

                switch (true) {
                    case battleActionDecisionStep.action.endTurn:
                        battleActions.push(
                            BattleActionService.new({
                                actor: {
                                    actorBattleSquaddieId:
                                        battleActionDecisionStep.actor
                                            .battleSquaddieId,
                                },
                                action: { isEndTurn: true },
                                effect: { endTurn: true },
                            })
                        )
                        break
                    case battleActionDecisionStep.action.movement:
                        battleActions.push(
                            BattleActionService.new({
                                actor: {
                                    actorBattleSquaddieId:
                                        battleActionDecisionStep.actor
                                            .battleSquaddieId,
                                },
                                action: { isMovement: true },
                                effect: {
                                    movement: {
                                        startCoordinate: startLocation,
                                        endCoordinate:
                                            battleActionDecisionStep.target
                                                .targetCoordinate,
                                    },
                                },
                            })
                        )
                        break
                    case isValidValue(
                        battleActionDecisionStep.action.actionTemplateId
                    ):
                        BattleActionDecisionStepService.copy(
                            battleActionDecisionStep,
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionDecisionStep
                        )
                        ActionCalculator.calculateAndApplyResults({
                            battleActionDecisionStep:
                                gameEngineState.battleOrchestratorState
                                    .battleState.battleActionDecisionStep,
                            missionMap:
                                gameEngineState.battleOrchestratorState
                                    .battleState.missionMap,
                            objectRepository: gameEngineState.repository,
                            battleActionRecorder:
                                gameEngineState.battleOrchestratorState
                                    .battleState.battleActionRecorder,
                            numberGenerator:
                                gameEngineState.battleOrchestratorState
                                    .numberGenerator,
                            missionStatistics:
                                gameEngineState.battleOrchestratorState
                                    .battleState.missionStatistics,
                        }).changesPerEffect.forEach((result) => {
                            battleActions.push(
                                BattleActionService.new({
                                    actor: {
                                        actorBattleSquaddieId:
                                            battleActionDecisionStep.actor
                                                .battleSquaddieId,
                                        actorContext: result.actorContext,
                                    },
                                    action: {
                                        actionTemplateId:
                                            battleActionDecisionStep.action
                                                .actionTemplateId,
                                    },
                                    effect: {
                                        squaddie: [...result.squaddieChanges],
                                    },
                                })
                            )
                        })
                        break
                }
                return battleActions
            },
            []
        )
    }

    private calculateActionPointsSpentOnDecisionSteps(
        gameEngineState: GameEngineState,
        battleActionDecisionSteps: BattleActionDecisionStep[]
    ): {
        endTurn?: boolean
        actionTemplate?: ActionTemplate
        movement?: number
    } {
        if (battleActionDecisionSteps.some((step) => step.action.endTurn)) {
            return {
                endTurn: true,
            }
        }

        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleActionDecisionSteps[0].actor.battleSquaddieId
            )
        )

        let actionTemplateIdUsed: string = battleActionDecisionSteps.find(
            (step) => step.action.actionTemplateId !== undefined
        )?.action.actionTemplateId
        if (actionTemplateIdUsed !== undefined) {
            const actionTemplate =
                ObjectRepositoryService.getActionTemplateById(
                    gameEngineState.repository,
                    actionTemplateIdUsed
                )
            return {
                actionTemplate,
            }
        }

        let movementActionPointCost = 0
        battleActionDecisionSteps
            .filter((step) => step.action.movement === true)
            .forEach((movementStep) => {
                let numberOfActionPointsSpentMoving: number

                BattleSquaddieSelectorService.createSearchPathAndHighlightMovementPath(
                    {
                        squaddieTemplate,
                        battleSquaddie,
                        clickedHexCoordinate:
                            movementStep.target.targetCoordinate,
                        missionMap:
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap,
                        objectRepository: gameEngineState.repository,
                        campaignResources: gameEngineState.campaign.resources,
                        battleState:
                            gameEngineState.battleOrchestratorState.battleState,
                    }
                )

                let coordinatesByMoveActions: {
                    [movementActions: number]: HexCoordinate[]
                } =
                    SquaddieService.searchPathCoordinatesByNumberOfMovementActions(
                        {
                            searchPath:
                                gameEngineState.battleOrchestratorState
                                    .battleState.squaddieMovePath,
                            battleSquaddieId: battleSquaddie.battleSquaddieId,
                            repository: gameEngineState.repository,
                        }
                    )
                numberOfActionPointsSpentMoving =
                    Math.max(
                        ...Object.keys(coordinatesByMoveActions).map((str) =>
                            Number(str)
                        )
                    ) || 1
                movementActionPointCost += numberOfActionPointsSpentMoving
            })

        return {
            movement: movementActionPointCost,
        }
    }

    private isSquaddieActionWorthShowingToPlayer(
        gameEngineState: GameEngineState
    ): boolean {
        return this.mostRecentDecisionSteps.some((step) => {
            if (step.action.actionTemplateId != undefined) return true
            if (step.action.endTurn) return false
            if (!step.action.movement) return true

            return SearchPathAdapterService.getCoordinates(
                gameEngineState.battleOrchestratorState.battleState
                    .squaddieMovePath
            ).some((coordinate) =>
                GraphicsConfig.isMapCoordinateOnScreen({
                    mapCoordinate: coordinate,
                    camera: gameEngineState.battleOrchestratorState.battleState
                        .camera,
                })
            )
        })
    }
}

const drawSquaddieAtInitialPositionAsCameraPans = (
    gameEngineState: GameEngineState,
    graphicsContext: GraphicsBuffer,
    resourceHandler: ResourceHandler
) => {
    const battleAction = BattleActionRecorderService.peekAtAnimationQueue(
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder
    )
    const battleSquaddieId: string = battleAction.actor.actorBattleSquaddieId
    const startLocation =
        battleAction.effect?.movement?.startCoordinate ??
        MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddieId
        ).currentMapCoordinate

    DrawSquaddieIconOnMapUtilities.drawSquaddieMapIconAtMapCoordinate({
        graphics: graphicsContext,
        squaddieRepository: gameEngineState.repository,
        battleSquaddieId: battleSquaddieId,
        mapCoordinate: startLocation,
        camera: gameEngineState.battleOrchestratorState.battleState.camera,
        resourceHandler,
    })
}
