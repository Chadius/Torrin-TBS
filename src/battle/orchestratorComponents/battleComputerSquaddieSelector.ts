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
import {SquaddieMovementAction, SquaddieMovementActionData} from "../history/squaddieMovementAction";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {SquaddieEndTurnAction} from "../history/squaddieEndTurnAction";
import {isCoordinateOnScreen} from "../../utils/graphics/graphicsConfig";
import {BattleEvent} from "../history/battleEvent";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {SquaddieSquaddieAction, SquaddieSquaddieActionData} from "../history/squaddieSquaddieAction";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {AddMovementInstruction, createSearchPath, MaybeCreateSquaddieInstruction} from "./battleSquaddieSelectorUtils";
import {AnySquaddieAction, SquaddieActionType} from "../history/anySquaddieAction";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {CalculateResults} from "../actionCalculator/calculator";
import {GetTargetingShapeGenerator} from "../targeting/targetingShapeGenerator";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieInstructionInProgressHandler} from "../history/squaddieInstructionInProgress";
import {RecordingHandler} from "../history/recording";
import {SquaddieTurnHandler} from "../../squaddie/turn";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {DetermineNextInstruction} from "../teamStrategy/determineNextInstruction";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleStateHelper} from "../orchestrator/battleState";

export const SQUADDIE_SELECTOR_PANNING_TIME = 1000;
export const SHOW_SELECTED_ACTION_TIME = 500;

export class BattleComputerSquaddieSelector implements BattleOrchestratorComponent {
    private showSelectedActionWaitTime?: number;
    private clickedToSkipActionDescription: boolean;
    private mostRecentAction: AnySquaddieAction;

    constructor() {
        this.resetInternalState();
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        if (
            this.isPauseToShowSquaddieSelectionRequired(state)
            && !(this.pauseToShowSquaddieSelectionCompleted(state) || this.clickedToSkipActionDescription)
        ) {
            return false;
        }

        if (state.battleState.camera.isPanning()) {
            return false;
        }

        return true;
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED && !this.pauseToShowSquaddieSelectionCompleted(state)) {
            this.clickedToSkipActionDescription = true;
        }
    }

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
            pauseTimer: true,
        });
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        const currentTeam: BattleSquaddieTeam = BattleStateHelper.getCurrentTeam(state.battleState);
        if (
            this.mostRecentAction === undefined
            && currentTeam
            && BattleSquaddieTeamHelper.hasAnActingSquaddie(currentTeam, state.squaddieRepository)
            && !BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.squaddieRepository)) {
            this.askComputerControlSquaddie(state);
        }
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = undefined;

        if (this.mostRecentAction !== undefined) {
            let newAction = this.mostRecentAction;
            if (newAction instanceof SquaddieMovementAction) {
                nextMode = BattleOrchestratorMode.SQUADDIE_MOVER;
            }
            if (newAction instanceof SquaddieSquaddieAction) {
                nextMode = BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE;
            }
            if (newAction instanceof SquaddieEndTurnAction) {
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

    reset(state: BattleOrchestratorState) {
        this.resetInternalState();
        if (!this.atLeastOneSquaddieOnCurrentTeamCanAct(state)) {
            state.battleSquaddieSelectedHUD.reset();
        }
    }

    private atLeastOneSquaddieOnCurrentTeamCanAct(state: BattleOrchestratorState): boolean {
        const currentTeam = BattleStateHelper.getCurrentTeam(state.battleState);
        return currentTeam
            && BattleSquaddieTeamHelper.hasAnActingSquaddie(currentTeam, state.squaddieRepository);
    }

    private isPauseToShowSquaddieSelectionRequired(state: BattleOrchestratorState) {
        if (this.mostRecentAction === undefined) {
            return false;
        }

        if (this.mostRecentAction instanceof SquaddieMovementAction) {
            return false;
        } else if (this.mostRecentAction instanceof SquaddieEndTurnAction) {
            return false;
        }

        return true;
    }

    private pauseToShowSquaddieSelectionCompleted(state: BattleOrchestratorState) {
        return this.showSelectedActionWaitTime !== undefined && (Date.now() - this.showSelectedActionWaitTime) >= SHOW_SELECTED_ACTION_TIME;
    }

    private highlightTargetRange(
        state: BattleOrchestratorState,
        action: SquaddieSquaddieActionData,
    ) {
        const ability = state.battleState.squaddieCurrentlyActing.currentlySelectedAction;

        const tilesTargeted: HexCoordinate[] = getResultOrThrowError(Pathfinder.getAllReachableTiles(
            SearchParametersHelper.newUsingSearchSetupMovementStop(
                {
                    setup: {
                        startLocation: action.targetLocation,
                        affiliation: SquaddieAffiliation.UNKNOWN,
                    },
                    movement: {
                        maximumDistanceMoved: 0,
                        minimumDistanceMoved: 0,
                        canStopOnSquaddies: true,
                        ignoreTerrainPenalty: false,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(ability.targetingShape)),
                        movementPerAction: action.squaddieAction.maximumRange,
                        crossOverPits: false,
                        passThroughWalls: false,
                    },
                    stopCondition: {
                        stopLocation: undefined,
                        numberOfActions: 1,
                    }
                }
            ),
            state.battleState.missionMap,
            state.squaddieRepository,
        )).getReachableTiles();

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

    private addSquaddieSquaddieInstruction(
        state: BattleOrchestratorState,
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie,
        actionData: SquaddieSquaddieActionData,
    ) {
        MaybeCreateSquaddieInstruction(state, battleSquaddie, squaddieTemplate);

        const action = new SquaddieSquaddieAction({
            squaddieAction: undefined,
            targetLocation: undefined,
            data: actionData
        });

        SquaddieInstructionInProgressHandler.addConfirmedAction(state.battleState.squaddieCurrentlyActing, action);
        SquaddieTurnHandler.spendActionPointsOnAction(battleSquaddie.squaddieTurn, state.battleState.squaddieCurrentlyActing.currentlySelectedAction);
        const instructionResults = CalculateResults({
            state,
            actingBattleSquaddie: battleSquaddie,
            validTargetLocation: action.targetLocation,
        });

        const newEvent: BattleEvent = {
            instruction: state.battleState.squaddieCurrentlyActing,
            results: instructionResults,
        };
        RecordingHandler.addEvent(state.battleState.recording, newEvent);

        this.mostRecentAction = action;
        this.showSelectedActionWaitTime = Date.now();
    }

    private resetInternalState() {
        this.mostRecentAction = undefined;
        this.showSelectedActionWaitTime = undefined;
        this.clickedToSkipActionDescription = false;
    }

    private askComputerControlSquaddie(state: BattleOrchestratorState) {
        if (this.mostRecentAction === undefined) {
            const currentTeam: BattleSquaddieTeam = BattleStateHelper.getCurrentTeam(state.battleState);
            const currentTeamStrategies: TeamStrategy[] = state.battleState.teamStrategyByAffiliation[currentTeam.affiliation];

            let strategyIndex = 0;
            let squaddieInstruction: SquaddieActionsForThisRound = undefined;
            while (!squaddieInstruction && strategyIndex < currentTeamStrategies.length) {
                const nextStrategy: TeamStrategy = currentTeamStrategies[strategyIndex];
                squaddieInstruction = this.askTeamStrategyToInstructSquaddie(state, currentTeam, nextStrategy);
                strategyIndex++;
            }
            if (squaddieInstruction) {
                this.reactToComputerSelectedAction(state, squaddieInstruction);
            } else {
                this.defaultSquaddieToEndTurn(state, currentTeam);
            }

            this.panToSquaddieIfOffscreen(state);
        }
    }

    private defaultSquaddieToEndTurn(state: BattleOrchestratorState, currentTeam: BattleSquaddieTeam) {
        const battleSquaddieId: string = BattleSquaddieTeamHelper.getBattleSquaddieIdThatCanActButNotPlayerControlled(currentTeam, state.squaddieRepository);
        return this.addEndTurnInstruction(state, battleSquaddieId);
    }

    private addEndTurnInstruction(state: BattleOrchestratorState, battleSquaddieId: string) {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(battleSquaddieId))
        const datum = state.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        if (state.battleState.squaddieCurrentlyActing === undefined
            || SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.battleState.squaddieCurrentlyActing)
        ) {
            state.battleState.squaddieCurrentlyActing =
                {
                    movingBattleSquaddieIds: [],
                    squaddieActionsForThisRound: {
                        battleSquaddieId: battleSquaddie.battleSquaddieId,
                        squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
                        startingLocation: datum.mapLocation,
                        actions: [],
                    },
                    currentlySelectedAction: undefined,
                };
        }

        SquaddieInstructionInProgressHandler.addConfirmedAction(state.battleState.squaddieCurrentlyActing, new SquaddieEndTurnAction({}));
        this.mostRecentAction = new SquaddieEndTurnAction({});

        RecordingHandler.addEvent(state.battleState.recording, {
            instruction: state.battleState.squaddieCurrentlyActing,
            results: undefined,
        });
    }

    private askTeamStrategyToInstructSquaddie(state: BattleOrchestratorState, currentTeam: BattleSquaddieTeam, currentTeamStrategy: TeamStrategy): SquaddieActionsForThisRound {
        const teamStrategyState: TeamStrategyState = new TeamStrategyState({
            missionMap: state.battleState.missionMap,
            team: currentTeam,
            squaddieRepository: state.squaddieRepository,
        })

        let squaddieAction: SquaddieActionsForThisRound = DetermineNextInstruction({
            strategy: currentTeamStrategy,
            state: teamStrategyState,
            squaddieRepository: state.squaddieRepository,
        });

        if (!squaddieAction) {
            return;
        }

        return squaddieAction;
    }

    private panToSquaddieIfOffscreen(state: BattleOrchestratorState) {
        const battleSquaddieId: string = SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing);
        const datum = state.battleState.missionMap.getSquaddieByBattleId(battleSquaddieId);

        const squaddieScreenLocation: number[] = convertMapCoordinatesToScreenCoordinates(
            datum.mapLocation.q,
            datum.mapLocation.r,
            ...state.battleState.camera.getCoordinates(),
        )

        const squaddieWorldLocation: number[] = convertMapCoordinatesToWorldCoordinates(
            datum.mapLocation.q,
            datum.mapLocation.r,
        )

        if (!isCoordinateOnScreen(squaddieScreenLocation[0], squaddieScreenLocation[1])) {
            state.battleState.camera.pan({
                xDestination: squaddieWorldLocation[0],
                yDestination: squaddieWorldLocation[1],
                timeToPan: SQUADDIE_SELECTOR_PANNING_TIME,
                respectConstraints: true,
            });
        }
    }

    private reactToComputerSelectedAction(state: BattleOrchestratorState, squaddieInstruction: SquaddieActionsForThisRound) {
        state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(squaddieInstruction.battleSquaddieId));
        let newAction = SquaddieActionsForThisRoundHandler.getMostRecentAction(squaddieInstruction);
        if (newAction.type === SquaddieActionType.MOVEMENT) {
            createSearchPath(state, squaddieTemplate, battleSquaddie, (newAction.data as SquaddieMovementActionData).destination);
            this.mostRecentAction = AddMovementInstruction(state, squaddieTemplate, battleSquaddie, (newAction.data as SquaddieMovementActionData).destination);
            return;
        }
        if (newAction.type === SquaddieActionType.SQUADDIE) {
            this.addSquaddieSquaddieInstruction(state, squaddieTemplate, battleSquaddie, (newAction.data as SquaddieSquaddieActionData));
            this.highlightTargetRange(state, (newAction.data as SquaddieSquaddieActionData));
            return;
        }
        if (newAction.type === SquaddieActionType.END_TURN) {
            this.addEndTurnInstruction(state, squaddieInstruction.battleSquaddieId);
        }
    }
}
