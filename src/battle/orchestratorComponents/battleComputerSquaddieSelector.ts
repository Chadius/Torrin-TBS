import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {SquaddieActivitiesForThisRound} from "../history/squaddieActivitiesForThisRound";
import {SquaddieEndTurnActivity} from "../history/squaddieEndTurnActivity";
import {isCoordinateOnScreen} from "../../utils/graphics/graphicsConfig";
import {BattleEvent} from "../history/battleEvent";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {
    AddMovementInstruction,
    CalculateResults,
    createSearchPath,
    MaybeCreateSquaddieInstruction
} from "./battleSquaddieSelectorUtils";
import {SquaddieInstructionActivity} from "../history/squaddieInstructionActivity";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

export const SQUADDIE_SELECTOR_PANNING_TIME = 1000;
export const SHOW_SELECTED_ACTIVITY_TIME = 500;

export class BattleComputerSquaddieSelector implements BattleOrchestratorComponent {
    private showSelectedActivityWaitTime?: number;
    private clickedToSkipActivityDescription: boolean;
    private mostRecentActivity: SquaddieInstructionActivity;

    constructor() {
        this.resetInternalState();
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        if (
            this.isPauseToShowSquaddieSelectionRequired(state)
            && !(this.pauseToShowSquaddieSelectionCompleted(state) || this.clickedToSkipActivityDescription)
        ) {
            return false;
        }

        if (state.camera.isPanning()) {
            return false;
        }

        return true;
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED && !this.pauseToShowSquaddieSelectionCompleted(state)) {
            this.clickedToSkipActivityDescription = true;
        }
    }

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
        });
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        const currentTeam: BattleSquaddieTeam = state.battlePhaseTracker.getCurrentTeam();
        if (this.mostRecentActivity === undefined && currentTeam.hasAnActingSquaddie() && !currentTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()) {
            this.askComputerControlSquaddie(state);
        }
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = undefined;

        if (this.mostRecentActivity !== undefined) {
            let newActivity = this.mostRecentActivity;
            if (newActivity instanceof SquaddieMovementActivity) {
                nextMode = BattleOrchestratorMode.SQUADDIE_MOVER;
            }
            if (newActivity instanceof SquaddieSquaddieActivity) {
                nextMode = BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY;
            }
            if (newActivity instanceof SquaddieEndTurnActivity) {
                nextMode = BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY;
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
        return state.battlePhaseTracker.getCurrentTeam() && state.battlePhaseTracker.getCurrentTeam().hasAnActingSquaddie();
    }

    private isPauseToShowSquaddieSelectionRequired(state: BattleOrchestratorState) {
        if (this.mostRecentActivity === undefined) {
            return false;
        }

        if (this.mostRecentActivity instanceof SquaddieMovementActivity) {
            return false;
        } else if (this.mostRecentActivity instanceof SquaddieEndTurnActivity) {
            return false;
        }

        return true;
    }

    private pauseToShowSquaddieSelectionCompleted(state: BattleOrchestratorState) {
        return this.showSelectedActivityWaitTime !== undefined && (Date.now() - this.showSelectedActivityWaitTime) >= SHOW_SELECTED_ACTIVITY_TIME;
    }

    private highlightTargetRange(
        state: BattleOrchestratorState,
        activity: SquaddieSquaddieActivity,
    ) {
        const ability = state.squaddieCurrentlyActing.currentlySelectedActivity;

        const tilesTargeted: HexCoordinate[] = getResultOrThrowError(state.pathfinder.getAllReachableTiles(new SearchParams({
                canStopOnSquaddies: true,
                missionMap: state.missionMap,
                minimumDistanceMoved: 0,
                maximumDistanceMoved: 0,
                startLocation: activity.targetLocation,
                shapeGeneratorType: ability.targetingShape,
                squaddieRepository: state.squaddieRepository,
            }),
        )).getReachableTiles();

        state.hexMap.stopHighlightingTiles();
        state.hexMap.highlightTiles([
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
        staticSquaddie: BattleSquaddieStatic,
        dynamicSquaddie: BattleSquaddieDynamic,
        activity: SquaddieSquaddieActivity,
    ) {
        MaybeCreateSquaddieInstruction(state, dynamicSquaddie, staticSquaddie);

        state.squaddieCurrentlyActing.addConfirmedActivity(activity);
        dynamicSquaddie.squaddieTurn.spendActionsOnActivity(state.squaddieCurrentlyActing.currentlySelectedActivity);
        const instructionResults = CalculateResults(state, dynamicSquaddie, activity.targetLocation);

        const newEvent: BattleEvent = new BattleEvent({
            currentSquaddieInstruction: state.squaddieCurrentlyActing,
            results: instructionResults,
        });
        state.battleEventRecording.addEvent(newEvent);

        this.mostRecentActivity = activity;
        this.showSelectedActivityWaitTime = Date.now();
    }

    private resetInternalState() {
        this.mostRecentActivity = undefined;
        this.showSelectedActivityWaitTime = undefined;
        this.clickedToSkipActivityDescription = false;
    }

    private askComputerControlSquaddie(state: BattleOrchestratorState) {
        if (this.mostRecentActivity === undefined) {
            const currentTeam: BattleSquaddieTeam = state.battlePhaseTracker.getCurrentTeam();
            const currentTeamStrategies: TeamStrategy[] = state.teamStrategyByAffiliation[currentTeam.affiliation];

            let strategyIndex = 0;
            let squaddieInstruction: SquaddieActivitiesForThisRound = undefined;
            while (!squaddieInstruction && strategyIndex < currentTeamStrategies.length) {
                const nextStrategy: TeamStrategy = currentTeamStrategies[strategyIndex];
                squaddieInstruction = this.askTeamStrategyToInstructSquaddie(state, currentTeam, nextStrategy);
                strategyIndex++;
            }
            if (squaddieInstruction) {
                this.reactToComputerSelectedActivity(state, squaddieInstruction);
            } else {
                this.defaultSquaddieToEndTurn(state, currentTeam);
            }

            this.panToSquaddieIfOffscreen(state);
        }
    }

    private defaultSquaddieToEndTurn(state: BattleOrchestratorState, currentTeam: BattleSquaddieTeam) {
        const dynamicSquaddieId: string = currentTeam.getDynamicSquaddieIdThatCanActButNotPlayerControlled();
        return this.addEndTurnInstruction(state, dynamicSquaddieId);
    }

    private addEndTurnInstruction(state: BattleOrchestratorState, dynamicSquaddieId: string) {
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(dynamicSquaddieId))
        const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        if (state.squaddieCurrentlyActing.isReadyForNewSquaddie) {
            state.squaddieCurrentlyActing.addInitialState({
                dynamicSquaddieId: dynamicSquaddie.dynamicSquaddieId,
                staticSquaddieId: staticSquaddie.staticId,
                startingLocation: datum.mapLocation,
            });
        }

        state.squaddieCurrentlyActing.addConfirmedActivity(new SquaddieEndTurnActivity());
        this.mostRecentActivity = new SquaddieEndTurnActivity();

        state.battleEventRecording.addEvent(new BattleEvent({
            currentSquaddieInstruction: state.squaddieCurrentlyActing,
        }));
    }

    private askTeamStrategyToInstructSquaddie(state: BattleOrchestratorState, currentTeam: BattleSquaddieTeam, currentTeamStrategy: TeamStrategy): SquaddieActivitiesForThisRound {
        const teamStrategyState: TeamStrategyState = new TeamStrategyState({
            missionMap: state.missionMap,
            team: currentTeam,
            squaddieRepository: state.squaddieRepository,
        })

        let squaddieActivity: SquaddieActivitiesForThisRound = currentTeamStrategy.DetermineNextInstruction(teamStrategyState);
        if (!squaddieActivity) {
            return;
        }

        return squaddieActivity;
    }

    private panToSquaddieIfOffscreen(state: BattleOrchestratorState) {
        const dynamicSquaddieId: string = state.squaddieCurrentlyActing.dynamicSquaddieId;

        const {
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(dynamicSquaddieId));

        const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddieId);

        const squaddieScreenLocation: number[] = convertMapCoordinatesToScreenCoordinates(
            datum.mapLocation.q,
            datum.mapLocation.r,
            ...state.camera.getCoordinates(),
        )

        if (!isCoordinateOnScreen(squaddieScreenLocation[0], squaddieScreenLocation[1])) {
            state.camera.pan({
                xDestination: datum.mapLocation.q,
                yDestination: datum.mapLocation.r,
                timeToPan: SQUADDIE_SELECTOR_PANNING_TIME,
                respectConstraints: true,
            });
        }
    }

    private reactToComputerSelectedActivity(state: BattleOrchestratorState, squaddieInstruction: SquaddieActivitiesForThisRound) {
        state.hexMap.stopHighlightingTiles();
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(squaddieInstruction.dynamicSquaddieId));
        let newActivity = squaddieInstruction.getMostRecentActivity();
        if (newActivity instanceof SquaddieMovementActivity) {
            createSearchPath(state, staticSquaddie, dynamicSquaddie, newActivity.destination);
            this.mostRecentActivity = AddMovementInstruction(state, staticSquaddie, dynamicSquaddie, newActivity.destination);
            return;
        }
        if (newActivity instanceof SquaddieSquaddieActivity) {
            this.addSquaddieSquaddieInstruction(state, staticSquaddie, dynamicSquaddie, newActivity);
            this.highlightTargetRange(state, newActivity);
            return;
        }
        if (newActivity instanceof SquaddieEndTurnActivity) {
            this.addEndTurnInstruction(state, squaddieInstruction.dynamicSquaddieId);
        }
    }
}
