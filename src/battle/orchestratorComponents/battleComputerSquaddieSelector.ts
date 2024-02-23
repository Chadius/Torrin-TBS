import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates
} from "../../hexMap/convertCoordinates";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleSquaddieService} from "../battleSquaddie";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {GraphicsConfig} from "../../utils/graphics/graphicsConfig";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {ActionCalculator} from "../actionCalculator/calculator";
import {GetTargetingShapeGenerator} from "../targeting/targetingShapeGenerator";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {RecordingService} from "../history/recording";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {DetermineNextDecisionService} from "../teamStrategy/determineNextDecision";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {MissionMapService} from "../../missionMap/missionMap";
import {DrawSquaddieUtilities} from "../animation/drawSquaddie";
import {DecidedAction, DecidedActionService} from "../../action/decided/decidedAction";
import {BattleEventService} from "../history/battleEvent";
import {ActionsThisRoundService} from "../history/actionsThisRound";
import {ProcessedAction, ProcessedActionService} from "../../action/processed/processedAction";
import {LocationTraveled} from "../../hexMap/pathfinder/locationTraveled";
import {SquaddieService} from "../../squaddie/squaddieService";
import {SquaddieTurnService} from "../../squaddie/turn";
import {DecidedActionMovementEffectService} from "../../action/decided/decidedActionMovementEffect";
import {ProcessedActionMovementEffectService} from "../../action/processed/processedActionMovementEffect";
import {ActionEffectType} from "../../action/template/actionEffectTemplate";
import {ProcessedActionSquaddieEffectService} from "../../action/processed/processedActionSquaddieEffect";
import {ActionEffectSquaddieTemplate} from "../../action/template/actionEffectSquaddieTemplate";
import {ProcessedActionEndTurnEffectService} from "../../action/processed/processedActionEndTurnEffect";
import {ActionEffectEndTurnTemplateService} from "../../action/template/actionEffectEndTurnTemplate";
import {BattleSquaddieSelectorService} from "./battleSquaddieSelectorUtils";

export const SQUADDIE_SELECTOR_PANNING_TIME = 1000;
export const SHOW_SELECTED_ACTION_TIME = 500;

export class BattleComputerSquaddieSelector implements BattleOrchestratorComponent {
    mostRecentDecision: DecidedAction;
    private showSelectedActionWaitTime?: number;
    private clickedToSkipActionDescription: boolean;

    constructor() {
        this.resetInternalState();
    }

    hasCompleted(state: GameEngineState): boolean {
        if (
            this.isPauseToShowSquaddieSelectionRequired(state)
            && !(this.pauseToShowSquaddieSelectionCompleted(state) || this.clickedToSkipActionDescription)
        ) {
            return false;
        }

        return !state.battleOrchestratorState.battleState.camera.isPanning();
    }

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED && !this.pauseToShowSquaddieSelectionCompleted(state)) {
            this.clickedToSkipActionDescription = true;
        }
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
        const currentTeam: BattleSquaddieTeam = BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.repository);
        if (
            this.mostRecentDecision === undefined
            && currentTeam
            && BattleSquaddieTeamService.hasAnActingSquaddie(currentTeam, state.repository)
            && !BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.repository)) {
            this.askComputerControlSquaddie(state);
        }

        if (
            state.battleOrchestratorState.battleState.camera.isPanning()
            && this.mostRecentDecision !== undefined
        ) {
            drawSquaddieAtInitialPositionAsCameraPans(state, graphicsContext);
        }
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode;
        if (this.mostRecentDecision !== undefined) {
            const processedActionEffectToShow = ActionsThisRoundService.getProcessedActionEffectToShow(state.battleOrchestratorState.battleState.actionsThisRound);
            nextMode = OrchestratorUtilities.getNextModeBasedOnProcessedActionEffect(processedActionEffectToShow);
        } else if (!this.atLeastOneSquaddieOnCurrentTeamCanAct(state)) {
            nextMode = BattleOrchestratorMode.PHASE_CONTROLLER;
        }

        return {
            displayMap: true,
            nextMode,
        }
    }

    reset(state: GameEngineState) {
        this.resetInternalState();
        if (!this.atLeastOneSquaddieOnCurrentTeamCanAct(state)) {
            state.battleOrchestratorState.battleSquaddieSelectedHUD.reset();
        }
    }

    private atLeastOneSquaddieOnCurrentTeamCanAct(state: GameEngineState): boolean {
        const currentTeam = BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.repository);
        return currentTeam
            && BattleSquaddieTeamService.hasAnActingSquaddie(currentTeam, state.repository);
    }

    private isPauseToShowSquaddieSelectionRequired(state: GameEngineState) {
        if (this.mostRecentDecision === undefined) {
            return false;
        }

        return this.mostRecentDecision.actionEffects.some(actionEffect => actionEffect.type === ActionEffectType.SQUADDIE);
    }

    private pauseToShowSquaddieSelectionCompleted(state: GameEngineState) {
        return this.showSelectedActionWaitTime !== undefined && (Date.now() - this.showSelectedActionWaitTime) >= SHOW_SELECTED_ACTION_TIME;
    }

    private highlightTargetRange(
        state: GameEngineState,
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate,
        targetLocation: HexCoordinate,
    ) {
        const searchResult: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [targetLocation],
                squaddieAffiliation: SquaddieAffiliation.UNKNOWN,
                maximumDistanceMoved: 0,
                minimumDistanceMoved: 0,
                canStopOnSquaddies: true,
                ignoreTerrainCost: false,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(actionEffectSquaddieTemplate.targetingShape)),
                movementPerAction: actionEffectSquaddieTemplate.maximumRange,
                canPassOverPits: false,
                canPassThroughWalls: false,
                numberOfActions: 1,
            }),
            missionMap: state.battleOrchestratorState.battleState.missionMap,
            repository: state.repository,
        });
        const tilesTargeted: HexCoordinate[] = SearchResultsHelper.getStoppableLocations(searchResult);

        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.highlightTiles([
                {
                    tiles: tilesTargeted,
                    pulseColor: HighlightPulseRedColor,
                    overlayImageResourceName: "map icon attack 1 action"
                }
            ]
        );
    }

    private resetInternalState() {
        this.mostRecentDecision = undefined;
        this.showSelectedActionWaitTime = undefined;
        this.clickedToSkipActionDescription = false;
    }

    private askComputerControlSquaddie(state: GameEngineState) {
        if (this.mostRecentDecision === undefined) {
            const currentTeam: BattleSquaddieTeam = BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.repository);
            const currentTeamStrategies: TeamStrategy[] = state.battleOrchestratorState.battleState.teamStrategiesById[currentTeam.id] || [];

            let strategyIndex = 0;
            let decidedAction: DecidedAction = undefined;
            while (!decidedAction && strategyIndex < currentTeamStrategies.length) {
                const nextStrategy: TeamStrategy = currentTeamStrategies[strategyIndex];
                decidedAction = this.askTeamStrategyToInstructSquaddie(state, currentTeam, nextStrategy);
                strategyIndex++;
            }

            if (decidedAction) {
                this.reactToComputerSelectedAction(state, decidedAction);
                this.panToSquaddieIfOffscreen(state);
            } else {
                this.defaultSquaddieToEndTurn(state, currentTeam);
            }
        }
    }

    private defaultSquaddieToEndTurn(state: GameEngineState, currentTeam: BattleSquaddieTeam) {
        const battleSquaddieId: string = BattleSquaddieTeamService.getBattleSquaddieIdThatCanActButNotPlayerControlled(currentTeam, state.repository);

        const decidedAction = DecidedActionService.new({
            actionTemplateName: "End Turn",
            battleSquaddieId,
            actionEffects: [
                ActionEffectEndTurnTemplateService.new({})
            ],
        });
        this.reactToComputerSelectedAction(state, decidedAction);
    }

    private askTeamStrategyToInstructSquaddie(state: GameEngineState, currentTeam: BattleSquaddieTeam, currentTeamStrategy: TeamStrategy): DecidedAction {
        return DetermineNextDecisionService.determineNextDecision({
            strategy: currentTeamStrategy,
            team: currentTeam,
            repository: state.repository,
            actionsThisRound: state.battleOrchestratorState.battleState.actionsThisRound,
            missionMap: state.battleOrchestratorState.battleState.missionMap,
        });
    }

    private panToSquaddieIfOffscreen(state: GameEngineState) {
        const battleSquaddieId: string = state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId;
        const datum = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(battleSquaddieId);

        const squaddieScreenLocation: number[] = convertMapCoordinatesToScreenCoordinates(
            datum.mapLocation.q,
            datum.mapLocation.r,
            ...state.battleOrchestratorState.battleState.camera.getCoordinates(),
        )

        const squaddieWorldLocation: number[] = convertMapCoordinatesToWorldCoordinates(
            datum.mapLocation.q,
            datum.mapLocation.r,
        )

        if (!GraphicsConfig.isCoordinateOnScreen(squaddieScreenLocation[0], squaddieScreenLocation[1])) {
            state.battleOrchestratorState.battleState.camera.pan({
                xDestination: squaddieWorldLocation[0],
                yDestination: squaddieWorldLocation[1],
                timeToPan: SQUADDIE_SELECTOR_PANNING_TIME,
                respectConstraints: true,
            });
        }
    }

    private reactToComputerSelectedAction(state: GameEngineState, decidedAction: DecidedAction) {
        const {
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, decidedAction.battleSquaddieId));
        const startingLocation = MissionMapService.getByBattleSquaddieId(state.battleOrchestratorState.battleState.missionMap, battleSquaddie.battleSquaddieId).mapLocation;

        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();

        const {shouldEndTurn, actionPointCost} = this.calculateActionPointsSpentOnDecidedAction(state, decidedAction);
        const {processedAction, results} = this.createProcessedActionAndResults(state, decidedAction);

        decidedAction.actionEffects.forEach(decidedActionEffect => {
            switch (decidedActionEffect.type) {
                case ActionEffectType.MOVEMENT:
                    state.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(battleSquaddie.battleSquaddieId, decidedActionEffect.destination);
                    break;
                case ActionEffectType.SQUADDIE:
                    this.showSelectedActionWaitTime = Date.now();
                    this.highlightTargetRange(
                        state,
                        decidedActionEffect.template,
                        decidedActionEffect.target
                    );
                    break;
            }
        });

        if (shouldEndTurn) {
            BattleSquaddieService.endTurn(battleSquaddie);
        } else {
            SquaddieTurnService.spendActionPoints(battleSquaddie.squaddieTurn, actionPointCost);
        }
        ActionsThisRoundService.updateActionsThisRound({
            state,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startingLocation,
            processedAction,
        });
        RecordingService.addEvent(state.battleOrchestratorState.battleState.recording, BattleEventService.new({
            results,
            processedAction,
        }));

        this.mostRecentDecision = decidedAction;
    }

    private createProcessedActionAndResults(gameEngineState: GameEngineState, decidedAction: DecidedAction): {
        processedAction: ProcessedAction,
        results: SquaddieSquaddieResults,
    } {
        const {
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(gameEngineState.repository, decidedAction.battleSquaddieId));

        const processedAction: ProcessedAction = ProcessedActionService.new({
            decidedAction,
            processedActionEffects: [],
        })

        let results: SquaddieSquaddieResults;
        decidedAction.actionEffects.forEach(decidedActionEffect => {
            switch (decidedActionEffect.type) {
                case ActionEffectType.MOVEMENT:
                    const decidedActionMovementEffect = DecidedActionMovementEffectService.new({
                        template: undefined,
                        destination: decidedActionEffect.destination,
                    });
                    processedAction.processedActionEffects.push(
                        ProcessedActionMovementEffectService.new({
                            decidedActionEffect: decidedActionMovementEffect,
                        })
                    );
                    break;
                case ActionEffectType.SQUADDIE:
                    results = ActionCalculator.calculateResults({
                        state: gameEngineState,
                        actingBattleSquaddie: battleSquaddie,
                        validTargetLocation: decidedActionEffect.target,
                        actionsThisRound: gameEngineState.battleOrchestratorState.battleState.actionsThisRound,
                        actionEffect: decidedActionEffect,
                    });

                    processedAction.processedActionEffects.push(
                        ProcessedActionSquaddieEffectService.new({
                            decidedActionEffect: decidedActionEffect,
                            results,
                        })
                    );
                    break;
                case ActionEffectType.END_TURN:
                    processedAction.processedActionEffects.push(
                        ProcessedActionEndTurnEffectService.new({
                            decidedActionEffect: decidedActionEffect,
                        })
                    );
                    break;
            }
        });
        return {
            processedAction,
            results,
        };
    }

    private calculateActionPointsSpentOnDecidedAction(state: GameEngineState, decidedAction: DecidedAction): {
        shouldEndTurn: boolean,
        actionPointCost: number,
    } {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, decidedAction.battleSquaddieId));

        if (decidedAction.actionEffects.some(decidedActionEffect => decidedActionEffect.type === ActionEffectType.END_TURN)) {
            return {
                shouldEndTurn: true,
                actionPointCost: undefined,
            }
        }

        let actionPointCost = 0;
        let addActionPointCostForTemplate = false;
        decidedAction.actionEffects.forEach(decidedActionEffect => {
            switch (decidedActionEffect.type) {
                case ActionEffectType.MOVEMENT:
                    BattleSquaddieSelectorService.createSearchPath({
                        state,
                        squaddieTemplate,
                        battleSquaddie,
                        clickedHexCoordinate: decidedActionEffect.destination,
                    });
                    const locationsByMoveActions: {
                        [movementActions: number]: LocationTraveled[]
                    } = SquaddieService.searchPathLocationsByNumberOfMovementActions({
                        searchPath: state.battleOrchestratorState.battleState.squaddieMovePath,
                        battleSquaddieId: battleSquaddie.battleSquaddieId,
                        repository: state.repository,
                    });
                    const numberOfActionPointsSpentMoving: number = Math.max(...Object.keys(locationsByMoveActions).map(str => Number(str))) || 1;
                    actionPointCost += numberOfActionPointsSpentMoving;
                    break;
                case ActionEffectType.SQUADDIE:
                    addActionPointCostForTemplate = true;
                    break;
            }
        });

        if (addActionPointCostForTemplate) {
            const actionTemplate = squaddieTemplate.actionTemplates.find(actionTemplate => actionTemplate.id === decidedAction.actionTemplateId);
            actionPointCost += actionTemplate.actionPoints;
        }

        return {
            actionPointCost,
            shouldEndTurn: false,
        }
    }
}

const drawSquaddieAtInitialPositionAsCameraPans = (gameEngineState: GameEngineState, graphicsContext: GraphicsContext) => {
    const startLocation = gameEngineState.battleOrchestratorState.battleState.actionsThisRound.startingLocation;
    const battleSquaddieId = gameEngineState.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId;
    const {battleSquaddie} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(
        gameEngineState.repository,
        battleSquaddieId
    ));

    DrawSquaddieUtilities.drawSquaddieMapIconAtMapLocation(
        graphicsContext,
        gameEngineState.repository,
        battleSquaddie,
        battleSquaddieId,
        startLocation,
        gameEngineState.battleOrchestratorState.battleState.camera
    );
};
