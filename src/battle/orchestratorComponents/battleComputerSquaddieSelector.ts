import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import {
    ConvertCoordinateService,
    convertMapCoordinatesToScreenCoordinates,
} from "../../hexMap/convertCoordinates"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SearchParametersService } from "../../hexMap/pathfinder/searchParams"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { GraphicsConfig } from "../../utils/graphics/graphicsConfig"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { HIGHLIGHT_PULSE_COLOR } from "../../hexMap/hexDrawingUtils"
import { GetTargetingShapeGenerator } from "../targeting/targetingShapeGenerator"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { TeamStrategy } from "../teamStrategy/teamStrategy"
import { DetermineNextDecisionService } from "../teamStrategy/determineNextDecision"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleStateService } from "../orchestrator/battleState"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderService } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { SquaddieSquaddieResults } from "../history/squaddieSquaddieResults"
import { DrawSquaddieUtilities } from "../animation/drawSquaddie"
import {
    ProcessedAction,
    ProcessedActionService,
} from "../../action/processed/processedAction"
import { SquaddieTurnService } from "../../squaddie/turn"
import { ActionEffectSquaddieTemplate } from "../../action/template/actionEffectSquaddieTemplate"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { ActionComponentCalculator } from "../actionDecision/actionComponentCalculator"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../hexMap/mapGraphicsLayer"
import { ActionPointCost, BattleActionService } from "../history/battleAction"
import { LocationTraveled } from "../../hexMap/pathfinder/locationTraveled"
import { BattleSquaddieSelectorService } from "./battleSquaddieSelectorUtils"
import { SquaddieService } from "../../squaddie/squaddieService"
import { ProcessedActionEndTurnEffectService } from "../../action/processed/processedActionEndTurnEffect"
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import { ActionCalculator } from "../calculator/actionCalculator/calculator"
import { ProcessedActionSquaddieEffectService } from "../../action/processed/processedActionSquaddieEffect"
import { MissionMapService } from "../../missionMap/missionMap"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { RecordingService } from "../history/recording"
import { BattleEventService } from "../history/battleEvent"
import { BattleActionQueueService } from "../history/battleActionQueue"

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
            event.eventType === OrchestratorComponentMouseEventType.CLICKED &&
            !this.pauseToShowSquaddieSelectionCompleted(state)
        ) {
            this.clickedToSkipActionDescription = true
        }
    }

    keyEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance but does nothing
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
            pauseTimer: true,
        })
    }

    update(state: GameEngineState, graphicsContext: GraphicsBuffer): void {
        const currentTeam: BattleSquaddieTeam =
            BattleStateService.getCurrentTeam(
                state.battleOrchestratorState.battleState,
                state.repository
            )
        if (
            this.mostRecentDecisionSteps === undefined &&
            currentTeam &&
            BattleSquaddieTeamService.hasAnActingSquaddie(
                currentTeam,
                state.repository
            ) &&
            !BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(
                currentTeam,
                state.repository
            )
        ) {
            this.askComputerControlSquaddie(state)
        }

        if (
            state.battleOrchestratorState.battleState.camera.isPanning() &&
            this.mostRecentDecisionSteps !== undefined
        ) {
            drawSquaddieAtInitialPositionAsCameraPans(state, graphicsContext)
        }
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode
        if (this.mostRecentDecisionSteps !== undefined) {
            nextMode =
                ActionComponentCalculator.getNextModeBasedOnBattleActionQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionQueue
                )
        } else if (
            !this.atLeastOneSquaddieOnCurrentTeamCanAct(gameEngineState)
        ) {
            nextMode = BattleOrchestratorMode.PHASE_CONTROLLER
        }
        return {
            displayMap: true,
            nextMode,
        }
    }

    reset(state: GameEngineState) {
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

    private isPauseToShowSquaddieSelectionRequired(state: GameEngineState) {
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

    private pauseToShowSquaddieSelectionCompleted(state: GameEngineState) {
        return (
            this.showSelectedActionWaitTime !== undefined &&
            Date.now() - this.showSelectedActionWaitTime >=
                SHOW_SELECTED_ACTION_TIME
        )
    }

    private highlightTargetRange(
        gameEngineState: GameEngineState,
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate,
        targetLocation: HexCoordinate,
        battleSquaddieId: string
    ) {
        const searchResult: SearchResult = PathfinderService.search({
            searchParameters: SearchParametersService.new({
                startLocations: [targetLocation],
                squaddieAffiliation: SquaddieAffiliation.UNKNOWN,
                maximumDistanceMoved: 0,
                minimumDistanceMoved: 0,
                canStopOnSquaddies: true,
                ignoreTerrainCost: false,
                shapeGenerator: getResultOrThrowError(
                    GetTargetingShapeGenerator(
                        actionEffectSquaddieTemplate.targetingShape
                    )
                ),
                movementPerAction: actionEffectSquaddieTemplate.maximumRange,
                canPassOverPits: false,
                canPassThroughWalls: false,
                numberOfActions: 1,
            }),
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            repository: gameEngineState.repository,
        })
        const tilesTargeted: HexCoordinate[] =
            SearchResultsService.getStoppableLocations(searchResult)

        const actionRangeOnMap = MapGraphicsLayerService.new({
            id: battleSquaddieId,
            highlightedTileDescriptions: [
                {
                    tiles: tilesTargeted,
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
        state: GameEngineState,
        currentTeam: BattleSquaddieTeam,
        currentTeamStrategy: TeamStrategy
    ): BattleActionDecisionStep[] {
        return DetermineNextDecisionService.determineNextDecision({
            strategy: currentTeamStrategy,
            team: currentTeam,
            repository: state.repository,
            actionsThisRound:
                state.battleOrchestratorState.battleState.actionsThisRound,
            missionMap: state.battleOrchestratorState.battleState.missionMap,
        })
    }

    private panToSquaddieIfOffscreen(state: GameEngineState) {
        const battleSquaddieId: string =
            state.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId
        const datum =
            state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                battleSquaddieId
            )

        const squaddieScreenLocation: number[] =
            convertMapCoordinatesToScreenCoordinates(
                datum.mapLocation.q,
                datum.mapLocation.r,
                ...state.battleOrchestratorState.battleState.camera.getCoordinates()
            )

        const squaddieWorldLocation: number[] =
            ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                datum.mapLocation.q,
                datum.mapLocation.r
            )

        if (
            !GraphicsConfig.isCoordinateOnScreen(
                squaddieScreenLocation[0],
                squaddieScreenLocation[1]
            )
        ) {
            state.battleOrchestratorState.battleState.camera.pan({
                xDestination: squaddieWorldLocation[0],
                yDestination: squaddieWorldLocation[1],
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

        const { shouldEndTurn, actionPointCost } =
            this.calculateActionPointsSpentOnDecisionSteps(
                gameEngineState,
                battleActionDecisionSteps
            )

        const { processedAction, results } =
            this.createProcessedActionAndResults(
                actionPointCost,
                gameEngineState,
                battleActionDecisionSteps
            )

        battleActionDecisionSteps.forEach((battleActionDecisionStep) => {
            if (battleActionDecisionStep.action.movement) {
                gameEngineState.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(
                    battleSquaddie.battleSquaddieId,
                    battleActionDecisionStep.target.targetLocation
                )
                this.setActionBuilderStateToMove(
                    gameEngineState,
                    battleActionDecisionStep.target.targetLocation
                )

                const { mapLocation } = MissionMapService.getByBattleSquaddieId(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                    battleActionDecisionStep.actor.battleSquaddieId
                )

                const battleAction = BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId:
                            battleActionDecisionStep.actor.battleSquaddieId,
                    },
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startLocation: mapLocation,
                            endLocation:
                                battleActionDecisionStep.target.targetLocation,
                        },
                    },
                })

                BattleActionQueueService.add(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionQueue,
                    battleAction
                )
                return
            }

            if (
                battleActionDecisionStep.action.actionTemplateId !== undefined
            ) {
                const action = ObjectRepositoryService.getActionTemplateById(
                    gameEngineState.repository,
                    battleActionDecisionStep.action.actionTemplateId
                )

                this.showSelectedActionWaitTime = Date.now()
                this.highlightTargetRange(
                    gameEngineState,
                    action
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                    battleActionDecisionStep.target.targetLocation,
                    battleSquaddie.battleSquaddieId
                )
                this.setActionBuilderStateToAffectSquaddie({
                    gameEngineState,
                    targetLocation:
                        battleActionDecisionStep.target.targetLocation,
                    actionTemplateId:
                        battleActionDecisionStep.action.actionTemplateId,
                })

                BattleActionQueueService.add(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionQueue,
                    BattleActionService.new({
                        actor: {
                            actorBattleSquaddieId:
                                battleSquaddie.battleSquaddieId,
                            actorContext: results.actingContext,
                        },
                        action: {
                            actionTemplateId:
                                battleActionDecisionStep.action
                                    .actionTemplateId,
                        },
                        effect: { squaddie: [...results.squaddieChanges] },
                    })
                )
            }
        })

        if (
            battleActionDecisionSteps.some(
                (battleActionDecisionStep) =>
                    battleActionDecisionStep.action.endTurn
            )
        ) {
            BattleActionQueueService.add(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionQueue,
                BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId:
                            battleActionDecisionStep.actor.battleSquaddieId,
                    },
                    action: { isEndTurn: true },
                    effect: {
                        endTurn: true,
                    },
                })
            )
        }

        SquaddieTurnService.spendActionPoints(
            battleSquaddie.squaddieTurn,
            actionPointCost
        )

        const startingLocation = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddie.battleSquaddieId
        ).mapLocation
        if (shouldEndTurn) {
            this.setActionBuilderStateToEndTurn(
                gameEngineState,
                startingLocation
            )
        }

        ActionsThisRoundService.updateActionsThisRound({
            state: gameEngineState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startingLocation,
            processedAction,
        })

        RecordingService.addEvent(
            gameEngineState.battleOrchestratorState.battleState.recording,
            BattleEventService.new({
                results,
                processedAction,
            })
        )
        this.mostRecentDecisionSteps = battleActionDecisionSteps
    }

    private setActionBuilderStateToEndTurn(
        gameEngineState: GameEngineState,
        startingLocation: HexCoordinate
    ) {
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            endTurn: true,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            targetLocation: startingLocation,
        })
    }

    private setActionBuilderStateToAffectSquaddie({
        gameEngineState,
        actionTemplateId,
        targetLocation,
    }: {
        gameEngineState: GameEngineState
        actionTemplateId: string
        targetLocation: HexCoordinate
    }) {
        const actionTemplate: ActionTemplate =
            ObjectRepositoryService.getActionTemplateById(
                gameEngineState.repository,
                actionTemplateId
            )

        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            actionTemplateId: actionTemplate.id,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            targetLocation,
        })
    }

    private setActionBuilderStateToMove(
        gameEngineState: GameEngineState,
        targetLocation: HexCoordinate
    ) {
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            movement: true,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            targetLocation,
        })
    }

    private createProcessedActionAndResults(
        actionPointCost: ActionPointCost,
        gameEngineState: GameEngineState,
        battleActionDecisionSteps: BattleActionDecisionStep[]
    ): {
        processedAction: ProcessedAction
        results: SquaddieSquaddieResults
    } {
        const processedAction: ProcessedAction = ProcessedActionService.new({
            actionPointCost,
            processedActionEffects: [],
        })

        let results: SquaddieSquaddieResults
        battleActionDecisionSteps.forEach((step) => {
            if (step.action.movement) {
                processedAction.processedActionEffects.push(
                    ProcessedActionMovementEffectService.new({
                        battleActionDecisionStep: step,
                    })
                )
            }
            if (step.action.endTurn) {
                processedAction.processedActionEffects.push(
                    ProcessedActionEndTurnEffectService.new({
                        battleActionDecisionStep: step,
                    })
                )
            }
            if (step.action.actionTemplateId !== undefined) {
                const { battleSquaddie } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository,
                        step.actor.battleSquaddieId
                    )
                )

                results = ActionCalculator.calculateResults({
                    gameEngineState: gameEngineState,
                    actingBattleSquaddie: battleSquaddie,
                    validTargetLocation: step.target.targetLocation,
                    actionsThisRound:
                        gameEngineState.battleOrchestratorState.battleState
                            .actionsThisRound,
                    battleActionDecisionStep: step,
                })

                processedAction.processedActionEffects.push(
                    ProcessedActionSquaddieEffectService.new({
                        battleActionDecisionStep: step,
                        battleActionSquaddieChange: results.squaddieChanges[0],
                        objectRepository: gameEngineState.repository,
                    })
                )
            }
        })

        return {
            processedAction,
            results,
        }
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
            actionPointCost += actionTemplate.actionPoints
        }

        battleActionDecisionSteps
            .filter((step) => step.action.movement === true)
            .forEach((movementStep) => {
                let numberOfActionPointsSpentMoving: number
                BattleSquaddieSelectorService.createSearchPathAndHighlightMovementPath(
                    {
                        state: gameEngineState,
                        squaddieTemplate,
                        battleSquaddie,
                        clickedHexCoordinate:
                            movementStep.target.targetLocation,
                    }
                )
                let locationsByMoveActions: {
                    [movementActions: number]: LocationTraveled[]
                } =
                    SquaddieService.searchPathLocationsByNumberOfMovementActions(
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
                        ...Object.keys(locationsByMoveActions).map((str) =>
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
    graphicsContext: GraphicsBuffer
) => {
    const startLocation =
        gameEngineState.battleOrchestratorState.battleState.actionsThisRound
            .startingLocation
    const battleSquaddieId =
        gameEngineState.battleOrchestratorState.battleState.actionsThisRound
            .battleSquaddieId
    const { battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleSquaddieId
        )
    )

    DrawSquaddieUtilities.drawSquaddieMapIconAtMapLocation(
        graphicsContext,
        gameEngineState.repository,
        battleSquaddie,
        battleSquaddieId,
        startLocation,
        gameEngineState.battleOrchestratorState.battleState.camera
    )
}
