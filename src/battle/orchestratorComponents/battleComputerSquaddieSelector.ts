import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates
} from "../../hexMap/convertCoordinates";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleSquaddie, BattleSquaddieService} from "../battleSquaddie";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {
    SquaddieActionsForThisRoundService,
    SquaddieDecisionsDuringThisPhase
} from "../history/squaddieDecisionsDuringThisPhase";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";
import {isCoordinateOnScreen} from "../../utils/graphics/graphicsConfig";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {ActionEffectSquaddie} from "../../decision/actionEffectSquaddie";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {createSearchPath, MaybeCreateSquaddieInstruction} from "./battleSquaddieSelectorUtils";
import {ActionEffectType} from "../../decision/actionEffect";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {ActionCalculator} from "../actionCalculator/calculator";
import {GetTargetingShapeGenerator} from "../targeting/targetingShapeGenerator";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {CurrentlySelectedSquaddieDecisionService} from "../history/currentlySelectedSquaddieDecision";
import {RecordingService} from "../history/recording";
import {SquaddieTurnService} from "../../squaddie/turn";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {DetermineNextDecision} from "../teamStrategy/determineNextDecision";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";
import {Decision, DecisionService} from "../../decision/decision";
import {DecisionActionEffectIteratorService} from "./decisionActionEffectIterator";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {LocationTraveled} from "../../hexMap/pathfinder/locationTraveled";
import {SquaddieService} from "../../squaddie/squaddieService";
import {ActionEffectMovement, ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";

export const SQUADDIE_SELECTOR_PANNING_TIME = 1000;
export const SHOW_SELECTED_ACTION_TIME = 500;

export class BattleComputerSquaddieSelector implements BattleOrchestratorComponent {
    private showSelectedActionWaitTime?: number;
    private clickedToSkipActionDescription: boolean;
    mostRecentDecision: Decision;

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

        if (state.battleOrchestratorState.battleState.camera.isPanning()) {
            return false;
        }

        return true;
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
        const currentTeam: BattleSquaddieTeam = BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.battleOrchestratorState.squaddieRepository);
        if (
            this.mostRecentDecision === undefined
            && currentTeam
            && BattleSquaddieTeamService.hasAnActingSquaddie(currentTeam, state.battleOrchestratorState.squaddieRepository)
            && !BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.battleOrchestratorState.squaddieRepository)) {
            this.askComputerControlSquaddie(state);
        }
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode;
        if (this.mostRecentDecision !== undefined) {
            const nextActionEffect = OrchestratorUtilities.peekActionEffect(
                state.battleOrchestratorState,
                state.battleOrchestratorState.battleState.squaddieCurrentlyActing
            );

            nextMode = OrchestratorUtilities.getNextModeBasedOnActionEffect(nextActionEffect);
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
        const currentTeam = BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.battleOrchestratorState.squaddieRepository);
        return currentTeam
            && BattleSquaddieTeamService.hasAnActingSquaddie(currentTeam, state.battleOrchestratorState.squaddieRepository);
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
        state: BattleOrchestratorState,
        actionEffectSquaddie: ActionEffectSquaddie,
    ) {
        const actionEffectSquaddieTemplate = actionEffectSquaddie.template;

        const searchResult: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [actionEffectSquaddie.targetLocation],
                squaddieAffiliation: SquaddieAffiliation.UNKNOWN,
                maximumDistanceMoved: 0,
                minimumDistanceMoved: 0,
                canStopOnSquaddies: true,
                ignoreTerrainCost: false,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(actionEffectSquaddieTemplate.targetingShape)),
                movementPerAction: actionEffectSquaddie.template.maximumRange,
                canPassOverPits: false,
                canPassThroughWalls: false,
                numberOfActions: 1,
            }),
            missionMap: state.battleState.missionMap,
            repository: state.squaddieRepository,
        });
        const tilesTargeted: HexCoordinate[] = SearchResultsHelper.getStoppableLocations(searchResult);

        state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        state.battleState.missionMap.terrainTileMap.highlightTiles([
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
            const currentTeam: BattleSquaddieTeam = BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.battleOrchestratorState.squaddieRepository);
            const currentTeamStrategies: TeamStrategy[] = state.battleOrchestratorState.battleState.teamStrategiesById[currentTeam.id] || [];

            let strategyIndex = 0;
            let squaddieInstruction: SquaddieDecisionsDuringThisPhase = undefined;
            while (!squaddieInstruction && strategyIndex < currentTeamStrategies.length) {
                const nextStrategy: TeamStrategy = currentTeamStrategies[strategyIndex];
                squaddieInstruction = this.askTeamStrategyToInstructSquaddie(state, currentTeam, nextStrategy);
                strategyIndex++;
            }

            // TODO The SquaddieDecisionsThisRound have a list of decisions they can make.
            // TODO For now, assume they make 1 decision and pass that into reactToComputerSelectedAction.

            if (squaddieInstruction) {
                this.reactToComputerSelectedAction(state, squaddieInstruction);
            } else {
                this.defaultSquaddieToEndTurn(state, currentTeam);
            }

            this.panToSquaddieIfOffscreen(state);
        }
    }

    // TODO double check the player ends their turn when they click the end turn button
    private defaultSquaddieToEndTurn(state: GameEngineState, currentTeam: BattleSquaddieTeam) {
        const battleSquaddieId: string = BattleSquaddieTeamService.getBattleSquaddieIdThatCanActButNotPlayerControlled(currentTeam, state.battleOrchestratorState.squaddieRepository);
        const {battleSquaddie} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.battleOrchestratorState.squaddieRepository, battleSquaddieId));
        BattleSquaddieService.endTurn(battleSquaddie);
        return this.addEndTurnActionEffect(state, battleSquaddieId);
    }

    private addEndTurnActionEffect(state: GameEngineState, battleSquaddieId: string) {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.battleOrchestratorState.squaddieRepository, battleSquaddieId))

        MaybeCreateSquaddieInstruction(state.battleOrchestratorState, battleSquaddie, squaddieTemplate);

        const decision = DecisionService.new({
            actionEffects: [
                ActionEffectEndTurnService.new()
            ]
        });
        CurrentlySelectedSquaddieDecisionService.addConfirmedDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, decision);
        this.mostRecentDecision = decision;

        RecordingService.addEvent(state.battleOrchestratorState.battleState.recording, {
            instruction: state.battleOrchestratorState.battleState.squaddieCurrentlyActing,
            results: undefined,
        });
    }

    private askTeamStrategyToInstructSquaddie(state: GameEngineState, currentTeam: BattleSquaddieTeam, currentTeamStrategy: TeamStrategy): SquaddieDecisionsDuringThisPhase {
        const teamStrategyState: TeamStrategyState = new TeamStrategyState({
            missionMap: state.battleOrchestratorState.battleState.missionMap,
            team: currentTeam,
            squaddieRepository: state.battleOrchestratorState.squaddieRepository,
        })

        let decisionsDuringThisPhase: SquaddieDecisionsDuringThisPhase = DetermineNextDecision({
            strategy: currentTeamStrategy,
            state: teamStrategyState,
            squaddieRepository: state.battleOrchestratorState.squaddieRepository,
        });

        if (!decisionsDuringThisPhase) {
            return;
        }

        return decisionsDuringThisPhase;
    }

    private panToSquaddieIfOffscreen(state: GameEngineState) {
        const battleSquaddieId: string = CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing);
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

        if (!isCoordinateOnScreen(squaddieScreenLocation[0], squaddieScreenLocation[1])) {
            state.battleOrchestratorState.battleState.camera.pan({
                xDestination: squaddieWorldLocation[0],
                yDestination: squaddieWorldLocation[1],
                timeToPan: SQUADDIE_SELECTOR_PANNING_TIME,
                respectConstraints: true,
            });
        }
    }

    private reactToComputerSelectedAction(state: GameEngineState, squaddieInstruction: SquaddieDecisionsDuringThisPhase) {
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.battleOrchestratorState.squaddieRepository, squaddieInstruction.battleSquaddieId));

        let newDecision = SquaddieActionsForThisRoundService.getMostRecentDecision(
            squaddieInstruction
        );

        if (state.battleOrchestratorState.decisionActionEffectIterator === undefined) {
            state.battleOrchestratorState.decisionActionEffectIterator = DecisionActionEffectIteratorService.new({
                decision: newDecision,
            });
        }

        let results: SquaddieSquaddieResults;

        MaybeCreateSquaddieInstruction(state.battleOrchestratorState, battleSquaddie, squaddieTemplate);
        CurrentlySelectedSquaddieDecisionService.selectDecisionForPreview(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, newDecision);

        newDecision.actionEffects.forEach(actionEffect => {
            switch (actionEffect.type) {
                case ActionEffectType.MOVEMENT:
                    spendActionPointsOnMovement({
                        state,
                        squaddieTemplate,
                        battleSquaddie,
                        actionEffectMovement: actionEffect,
                    });
                    break;
                case ActionEffectType.SQUADDIE:
                    results = spendActionPointsOnSquaddieSquaddieAndCalculateResults({
                        state: state.battleOrchestratorState,
                        battleSquaddie,
                        actionEffectSquaddie: actionEffect,
                    })
                    this.showSelectedActionWaitTime = Date.now();
                    this.highlightTargetRange(state.battleOrchestratorState, actionEffect);
                    break;
                case ActionEffectType.END_TURN:
                    BattleSquaddieService.endTurn(battleSquaddie);
                    break;
            }
        });

        CurrentlySelectedSquaddieDecisionService.addConfirmedDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, newDecision)
        RecordingService.addEvent(state.battleOrchestratorState.battleState.recording, {
            instruction: state.battleOrchestratorState.battleState.squaddieCurrentlyActing,
            results,
        });
        this.mostRecentDecision = newDecision;
    }
}

const spendActionPointsOnMovement = ({
                                         state,
                                         squaddieTemplate,
                                         battleSquaddie,
                                         actionEffectMovement,
                                     }: {
    state: GameEngineState,
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    actionEffectMovement: ActionEffectMovement
}): ActionEffectMovement => {
    createSearchPath(state.battleOrchestratorState, squaddieTemplate, battleSquaddie, actionEffectMovement.destination);

    const destinationHexCoordinate = actionEffectMovement.destination;
    const locationsByMoveActions: {
        [movementActions: number]: LocationTraveled[]
    } = SquaddieService.searchPathLocationsByNumberOfMovementActions({
        searchPath: state.battleOrchestratorState.battleState.squaddieMovePath,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        repository: state.battleOrchestratorState.squaddieRepository,
    });
    const numberOfActionPointsSpentMoving: number = Math.max(...Object.keys(locationsByMoveActions).map(str => Number(str))) || 1;

    return ActionEffectMovementService.new({
        destination: destinationHexCoordinate,
        numberOfActionPointsSpent: numberOfActionPointsSpentMoving,
    });
}

const spendActionPointsOnSquaddieSquaddieAndCalculateResults = ({
                                                                    state,
                                                                    battleSquaddie,
                                                                    actionEffectSquaddie,
                                                                }: {
                                                                    state: BattleOrchestratorState,
                                                                    battleSquaddie: BattleSquaddie,
                                                                    actionEffectSquaddie: ActionEffectSquaddie,
                                                                }
): SquaddieSquaddieResults => {
    SquaddieTurnService.spendActionPointsOnActionTemplate(battleSquaddie.squaddieTurn, actionEffectSquaddie.template);
    return ActionCalculator.calculateResults({
        state,
        actingBattleSquaddie: battleSquaddie,
        validTargetLocation: actionEffectSquaddie.targetLocation,
    });
}
