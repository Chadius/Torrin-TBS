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
import {BattleSquaddie} from "../battleSquaddie";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {BattleSquaddieTeam, BattleSquaddieTeamHelper} from "../battleSquaddieTeam";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {
    SquaddieActionsForThisRoundService,
    SquaddieDecisionsDuringThisPhase
} from "../history/squaddieDecisionsDuringThisPhase";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";
import {isCoordinateOnScreen} from "../../utils/graphics/graphicsConfig";
import {BattleEvent} from "../history/battleEvent";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {ActionEffectSquaddie} from "../../decision/actionEffectSquaddie";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {AddMovementInstruction, createSearchPath, MaybeCreateSquaddieInstruction} from "./battleSquaddieSelectorUtils";
import {ActionEffect, ActionEffectType} from "../../decision/actionEffect";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {ActionCalculator} from "../actionCalculator/calculator";
import {GetTargetingShapeGenerator} from "../targeting/targetingShapeGenerator";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {CurrentlySelectedSquaddieDecisionService} from "../history/currentlySelectedSquaddieDecision";
import {RecordingHandler} from "../history/recording";
import {SquaddieTurnService} from "../../squaddie/turn";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {DetermineNextDecision} from "../teamStrategy/determineNextDecision";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";
import {DecisionService} from "../../decision/decision";
import {DecisionActionEffectIteratorService} from "./decisionActionEffectIterator";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {isValidValue} from "../../utils/validityCheck";

export const SQUADDIE_SELECTOR_PANNING_TIME = 1000;
export const SHOW_SELECTED_ACTION_TIME = 500;

export class BattleComputerSquaddieSelector implements BattleOrchestratorComponent {
    private showSelectedActionWaitTime?: number;
    private clickedToSkipActionDescription: boolean;
    private mostRecentAction: ActionEffect;

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
            this.mostRecentAction === undefined
            && currentTeam
            && BattleSquaddieTeamHelper.hasAnActingSquaddie(currentTeam, state.battleOrchestratorState.squaddieRepository)
            && !BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.battleOrchestratorState.squaddieRepository)) {
            this.askComputerControlSquaddie(state);
        }
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = undefined;

        if (this.mostRecentAction !== undefined) {
            let newAction = this.mostRecentAction;
            if (newAction.type === ActionEffectType.MOVEMENT) {
                nextMode = BattleOrchestratorMode.SQUADDIE_MOVER;
            }
            if (newAction.type === ActionEffectType.SQUADDIE) {
                nextMode = BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE;
            }
            if (newAction.type === ActionEffectType.END_TURN) {
                nextMode = BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP;
            }
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
            && BattleSquaddieTeamHelper.hasAnActingSquaddie(currentTeam, state.battleOrchestratorState.squaddieRepository);
    }

    private isPauseToShowSquaddieSelectionRequired(state: GameEngineState) {
        if (this.mostRecentAction === undefined) {
            return false;
        }

        return (this.mostRecentAction.type === ActionEffectType.SQUADDIE);
    }

    private pauseToShowSquaddieSelectionCompleted(state: GameEngineState) {
        return this.showSelectedActionWaitTime !== undefined && (Date.now() - this.showSelectedActionWaitTime) >= SHOW_SELECTED_ACTION_TIME;
    }

    private highlightTargetRange(
        state: BattleOrchestratorState,
        action: ActionEffectSquaddie,
    ) {
        let squaddieActionEffect = state.battleState.squaddieCurrentlyActing.currentlySelectedDecisionForPreview.actionEffects[0];
        if (squaddieActionEffect.type !== ActionEffectType.SQUADDIE) {
            return;
        }
        const actionEffectSquaddieTemplate = squaddieActionEffect.template;

        const searchResult: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [action.targetLocation],
                squaddieAffiliation: SquaddieAffiliation.UNKNOWN,
                maximumDistanceMoved: 0,
                minimumDistanceMoved: 0,
                canStopOnSquaddies: true,
                ignoreTerrainCost: false,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(actionEffectSquaddieTemplate.targetingShape)),
                movementPerAction: action.template.maximumRange,
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

    // TODO instead of immediately ending after animating, it should iterate to the next decision

    // TODO this should pass in a Decision, not an action effect
    private addSquaddieSquaddieActionEffect(
        state: BattleOrchestratorState,
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie,
        actionData: ActionEffectSquaddie,
    ) {
        MaybeCreateSquaddieInstruction(state, battleSquaddie, squaddieTemplate);


        const decision = DecisionService.new({
            actionEffects: [
                actionData
            ]
        });
        CurrentlySelectedSquaddieDecisionService.selectDecisionForPreview(state.battleState.squaddieCurrentlyActing, decision)
        CurrentlySelectedSquaddieDecisionService.addConfirmedDecision(state.battleState.squaddieCurrentlyActing, decision);

        SquaddieTurnService.spendActionPointsOnActionTemplate(battleSquaddie.squaddieTurn, actionData.template);
        const instructionResults = ActionCalculator.calculateResults({
            state,
            actingBattleSquaddie: battleSquaddie,
            validTargetLocation: actionData.targetLocation,
        });

        const newEvent: BattleEvent = {
            instruction: state.battleState.squaddieCurrentlyActing,
            results: instructionResults,
        };
        RecordingHandler.addEvent(state.battleState.recording, newEvent);

        // TODO this seems odd, like the iterator should be here.
        this.mostRecentAction = actionData;
        this.showSelectedActionWaitTime = Date.now();
    }

    private resetInternalState() {
        this.mostRecentAction = undefined;
        this.showSelectedActionWaitTime = undefined;
        this.clickedToSkipActionDescription = false;
    }

    private askComputerControlSquaddie(state: GameEngineState) {
        if (this.mostRecentAction === undefined) {
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

    private defaultSquaddieToEndTurn(state: GameEngineState, currentTeam: BattleSquaddieTeam) {
        const battleSquaddieId: string = BattleSquaddieTeamHelper.getBattleSquaddieIdThatCanActButNotPlayerControlled(currentTeam, state.battleOrchestratorState.squaddieRepository);
        return this.addEndTurnActionEffect(state, battleSquaddieId);
    }

    private addEndTurnActionEffect(state: GameEngineState, battleSquaddieId: string) {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.battleOrchestratorState.squaddieRepository, battleSquaddieId))
        const datum = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);

        // TODO should have triggered this if statement
        const createANewCurrentlySelectedSquaddieDecisionService = !isValidValue(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)
            || !OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state.battleOrchestratorState);
        if (createANewCurrentlySelectedSquaddieDecisionService) {
            state.battleOrchestratorState.battleState.squaddieCurrentlyActing =
                CurrentlySelectedSquaddieDecisionService.new({
                    squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                        battleSquaddieId: battleSquaddie.battleSquaddieId,
                        squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
                        startingLocation: datum.mapLocation,
                    }),
                });
        }

        CurrentlySelectedSquaddieDecisionService.addConfirmedDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing,
            DecisionService.new({
                actionEffects: [
                    ActionEffectEndTurnService.new()
                ]
            }));
        this.mostRecentAction = ActionEffectEndTurnService.new();

        RecordingHandler.addEvent(state.battleOrchestratorState.battleState.recording, {
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

    // TODO Make this a Decision
    private reactToComputerSelectedAction(state: GameEngineState, squaddieInstruction: SquaddieDecisionsDuringThisPhase) {
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.battleOrchestratorState.squaddieRepository, squaddieInstruction.battleSquaddieId));

        if (state.battleOrchestratorState.decisionActionEffectIterator === undefined) {
            state.battleOrchestratorState.decisionActionEffectIterator = DecisionActionEffectIteratorService.new({
                decision: squaddieInstruction.decisions[squaddieInstruction.decisions.length - 1] // TODO use the given decision
            });
        }

        const newActionEffect = DecisionActionEffectIteratorService.peekActionEffect(state.battleOrchestratorState.decisionActionEffectIterator);
        if (newActionEffect.type === ActionEffectType.MOVEMENT) {
            createSearchPath(state.battleOrchestratorState, squaddieTemplate, battleSquaddie, newActionEffect.destination);
            this.mostRecentAction = AddMovementInstruction(state.battleOrchestratorState, squaddieTemplate, battleSquaddie, newActionEffect.destination);
            return;
        }
        if (newActionEffect.type === ActionEffectType.SQUADDIE) {
            this.addSquaddieSquaddieActionEffect(state.battleOrchestratorState, squaddieTemplate, battleSquaddie, newActionEffect);
            this.highlightTargetRange(state.battleOrchestratorState, newActionEffect);
            return;
        }
        if (newActionEffect.type === ActionEffectType.END_TURN) {
            this.addEndTurnActionEffect(state, squaddieInstruction.battleSquaddieId);
        }
    }
}
