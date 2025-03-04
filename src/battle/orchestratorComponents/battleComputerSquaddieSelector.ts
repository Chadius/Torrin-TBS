import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SearchParametersService } from "../../hexMap/pathfinder/searchParameters"
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
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleStateService } from "../battleState/battleState"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderService } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { DrawSquaddieUtilities } from "../animation/drawSquaddie"
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
    ActionPointCost,
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { CoordinateTraveled } from "../../hexMap/pathfinder/coordinateTraveled"
import { BattleSquaddieSelectorService } from "./battleSquaddieSelectorUtils"
import { SquaddieService } from "../../squaddie/squaddieService"
import { ActionCalculator } from "../calculator/actionCalculator/calculator"
import { MissionMapService } from "../../missionMap/missionMap"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { isValidValue } from "../../utils/validityCheck"
import { BattleSquaddie } from "../battleSquaddie"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { ResourceHandler } from "../../resource/resourceHandler"

export const SQUADDIE_SELECTOR_PANNING_TIME = 1000
export const SHOW_SELECTED_ACTION_TIME = 500

export class BattleComputerSquaddieSelector
    implements BattleOrchestratorComponent
{
    mostRecentDecisionSteps: BattleActionDecisionStep[]
    private showSelectedActionWaitTime?: number
    private clickedToSkipActionDescription: boolean

    constructor() {
        this.resetInternalState()
    }

    hasCompleted(state: GameEngineState): boolean {
        if (
            this.isPauseToShowSquaddieSelectionRequired(state) &&
            !(
                this.pauseToShowSquaddieSelectionCompleted(state) ||
                this.clickedToSkipActionDescription
            )
        ) {
            return false
        }

        return !state.battleOrchestratorState.battleState.camera.isPanning()
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
        action: ActionTemplate,
        targetCoordinate: HexCoordinate,
        battleSquaddieId: string
    ) {
        const searchResult: SearchResult = PathfinderService.search({
            searchParameters: SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [targetCoordinate],
                },
                pathSizeConstraints: {
                    maximumDistanceMoved: 0,
                    minimumDistanceMoved: 0,
                    movementPerAction: action.targetConstraints.maximumRange,
                    numberOfActions: 1,
                },
                pathStopConstraints: {
                    canStopOnSquaddies: true,
                },
                pathContinueConstraints: {
                    squaddieAffiliation: {
                        searchingSquaddieAffiliation:
                            SquaddieAffiliation.UNKNOWN,
                    },
                    ignoreTerrainCost: false,
                    canPassOverPits: false,
                    canPassThroughWalls: false,
                },
                goal: {},
            }),
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            objectRepository: gameEngineState.repository,
        })
        const tilesTargeted: HexCoordinate[] =
            SearchResultsService.getStoppableCoordinates(searchResult)

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
    }

    private askComputerControlSquaddie(gameEngineState: GameEngineState) {
        if (this.mostRecentDecisionSteps !== undefined) {
            return
        }
        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            undefined

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
            this.panToSquaddieIfOffscreen(gameEngineState)
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
                mapCoordinate: datum.mapCoordinate,
                cameraLocation:
                    gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
            })

        const { x: squaddieWorldLocationX, y: squaddieWorldLocationY } =
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: datum.mapCoordinate,
            })

        if (
            !GraphicsConfig.isCoordinateOnScreen(
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

        const { actionPointCost } =
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

        SquaddieTurnService.spendActionPoints(
            battleSquaddie.squaddieTurn,
            actionPointCost
        )

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

        const action = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            firstActionTemplateDecisionStep.action.actionTemplateId
        )

        this.showSelectedActionWaitTime = Date.now()
        this.highlightTargetRange(
            gameEngineState,
            action,
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
            .forEach((battleActionDecisionStep) =>
                MissionMapService.updateBattleSquaddieCoordinate(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                    battleSquaddie.battleSquaddieId,
                    battleActionDecisionStep.target.targetCoordinate
                )
            )
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
                const { mapCoordinate: startLocation } =
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
                        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                            battleActionDecisionStep
                        ActionCalculator.calculateAndApplyResults({
                            gameEngineState: gameEngineState,
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
        shouldEndTurn: boolean
        actionPointCost: ActionPointCost
    } {
        if (battleActionDecisionSteps.some((step) => step.action.endTurn)) {
            return {
                shouldEndTurn: true,
                actionPointCost: "End Turn",
            }
        }

        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleActionDecisionSteps[0].actor.battleSquaddieId
            )
        )

        let actionPointCost = 0

        let actionTemplateIdUsed: string = battleActionDecisionSteps.find(
            (step) => step.action.actionTemplateId !== undefined
        )?.action.actionTemplateId
        if (actionTemplateIdUsed !== undefined) {
            const actionTemplate =
                ObjectRepositoryService.getActionTemplateById(
                    gameEngineState.repository,
                    actionTemplateIdUsed
                )
            actionPointCost += actionTemplate.resourceCost.actionPoints
        }

        battleActionDecisionSteps
            .filter((step) => step.action.movement === true)
            .forEach((movementStep) => {
                let numberOfActionPointsSpentMoving: number
                BattleSquaddieSelectorService.createSearchPathAndHighlightMovementPath(
                    {
                        gameEngineState: gameEngineState,
                        squaddieTemplate,
                        battleSquaddie,
                        clickedHexCoordinate:
                            movementStep.target.targetCoordinate,
                    }
                )
                let coordinatesByMoveActions: {
                    [movementActions: number]: CoordinateTraveled[]
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
                actionPointCost += numberOfActionPointsSpentMoving
            })

        return {
            actionPointCost,
            shouldEndTurn: false,
        }
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
    const startLocation = battleAction.effect.movement.startCoordinate
    const { battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleSquaddieId
        )
    )

    DrawSquaddieUtilities.drawSquaddieMapIconAtMapCoordinate({
        graphics: graphicsContext,
        squaddieRepository: gameEngineState.repository,
        battleSquaddie: battleSquaddie,
        battleSquaddieId: battleSquaddieId,
        mapCoordinate: startLocation,
        camera: gameEngineState.battleOrchestratorState.battleState.camera,
        resourceHandler,
    })
}
