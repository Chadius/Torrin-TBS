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
import p5 from "p5";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {SquaddieEndTurnActivity} from "../history/squaddieEndTurnActivity";
import {isCoordinateOnScreen, ScreenDimensions} from "../../utils/graphicsConfig";
import {BattleEvent} from "../history/battleEvent";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {
    AddMovementInstruction,
    CalculateResults,
    createSearchPath,
    MaybeCreateSquaddieInstruction
} from "./battleSquaddieSelectorUtils";
import {Label} from "../../ui/label";
import {RectArea} from "../../ui/rectArea";
import {FormatIntent} from "../animation/activityResultTextWriter";
import {SquaddieInstructionActivity} from "../history/squaddieInstructionActivity";

export const SQUADDIE_SELECTOR_PANNING_TIME = 1000;
export const SHOW_SELECTED_ACTIVITY_TIME = 2000;

export class BattleComputerSquaddieSelector implements BattleOrchestratorComponent {
    private showSelectedActivityWaitTime?: number;
    private activityDescription: Label;
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

    update(state: BattleOrchestratorState, p: p5): void {
        const currentTeam: BattleSquaddieTeam = state.battlePhaseTracker.getCurrentTeam();
        if (this.mostRecentActivity === undefined && currentTeam.hasAnActingSquaddie() && !currentTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()) {
            this.askComputerControlSquaddie(state);
        }

        const showSelectedActivity = this.isPauseToShowSquaddieSelectionRequired(state)
            && !this.pauseToShowSquaddieSelectionCompleted(state)
            && !this.clickedToSkipActivityDescription;
        if (showSelectedActivity) {
            this.drawActivityDescription(state, p);
            return;
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
        state.hexMap.stopHighlightingTiles();
        if (!this.atLeastOneSquaddieOnCurrentTeamCanAct(state)) {
            state.battleSquaddieSelectedHUD.reset();
            state.battleSquaddieUIInput.reset();
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
        const ability = state.squaddieCurrentlyActing.currentSquaddieActivity;

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
        dynamicSquaddie.squaddieTurn.spendActionsOnActivity(state.squaddieCurrentlyActing.currentSquaddieActivity);
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
        this.activityDescription = undefined;
        this.clickedToSkipActivityDescription = false;
    }

    private askComputerControlSquaddie(state: BattleOrchestratorState) {
        if (this.mostRecentActivity === undefined) {
            const currentTeam: BattleSquaddieTeam = state.battlePhaseTracker.getCurrentTeam();
            const currentTeamStrategies: TeamStrategy[] = state.teamStrategyByAffiliation[currentTeam.affiliation];

            let strategyIndex = 0;
            let squaddieInstruction: SquaddieInstruction = undefined;
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
        if (!state.squaddieCurrentlyActing) {
            state.squaddieCurrentlyActing = new SquaddieInstructionInProgress({});
        }
        if (state.squaddieCurrentlyActing.isReadyForNewSquaddie()) {
            state.squaddieCurrentlyActing.addSquaddie({
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

    private askTeamStrategyToInstructSquaddie(state: BattleOrchestratorState, currentTeam: BattleSquaddieTeam, currentTeamStrategy: TeamStrategy): SquaddieInstruction {
        const teamStrategyState: TeamStrategyState = new TeamStrategyState({
            missionMap: state.missionMap,
            team: currentTeam,
            squaddieRepository: state.squaddieRepository,
        })

        let squaddieActivity: SquaddieInstruction = currentTeamStrategy.DetermineNextInstruction(teamStrategyState);
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

    private reactToComputerSelectedActivity(state: BattleOrchestratorState, squaddieInstruction: SquaddieInstruction) {
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

    private drawActivityDescription(state: BattleOrchestratorState, p: p5) {
        if (this.activityDescription === undefined) {
            const outputTextStrings = FormatIntent({
                squaddieRepository: state.squaddieRepository,
                currentActivity: state.squaddieCurrentlyActing.currentSquaddieActivity,
                actingDynamicId: state.squaddieCurrentlyActing.dynamicSquaddieId,
            });

            const textToDraw = outputTextStrings.join("\n");

            this.activityDescription = new Label({
                area: new RectArea({
                    startColumn: 4,
                    endColumn: 10,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    percentTop: 40,
                    percentHeight: 20,
                }),
                fillColor: [0, 0, 60],
                strokeColor: [0, 0, 0],
                strokeWeight: 4,

                text: textToDraw,
                textSize: 24,
                fontColor: [0, 0, 16],
                padding: [16, 0, 0, 16],
            });
        }

        this.activityDescription.draw(p);
    }
}
