import {
    OrchestratorChanges,
    OrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import p5 from "p5";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleOrchestratorMode} from "../orchestrator/orchestrator";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {SquaddieEndTurnActivity} from "../history/squaddieEndTurnActivity";
import {isCoordinateOnScreen} from "../../utils/graphicsConfig";
import {BattleEvent} from "../history/battleEvent";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {addMovementInstruction, createSearchPath} from "./battleSquaddieSelectorUtils";

export const SQUADDIE_SELECTOR_PANNING_TIME = 1000;

export class BattleComputerSquaddieSelector implements OrchestratorComponent {
    private gaveCompleteInstruction: boolean;
    private initialFocusOnSquaddie: boolean;

    constructor() {
        this.gaveCompleteInstruction = false;
        this.initialFocusOnSquaddie = false;
    }

    hasCompleted(state: OrchestratorState): boolean {
        if (!this.atLeastOneSquaddieOnCurrentTeamCanAct(state)) {
            return true;
        }

        const gaveCompleteInstruction = this.gaveCompleteInstruction;
        const cameraIsNotPanning = !state.camera.isPanning();
        return gaveCompleteInstruction && cameraIsNotPanning;
    }

    private atLeastOneSquaddieOnCurrentTeamCanAct(state: OrchestratorState): boolean {
        return state.battlePhaseTracker.getCurrentTeam().hasAnActingSquaddie();
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    keyEventHappened(state: OrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: OrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
        });
    }


    private highlightTargetRange(state: OrchestratorState) {
        const ability = state.squaddieCurrentlyActing.currentSquaddieActivity;

        const {mapLocation} = state.missionMap.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId);
        const {staticSquaddie} = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId));
        const abilityRange: HexCoordinate[] = state.pathfinder.getTilesInRange(new SearchParams({
                canStopOnSquaddies: true,
                missionMap: state.missionMap,
                minimumDistanceMoved: ability.minimumRange,
                maximumDistanceMoved: ability.maximumRange,
                startLocation: mapLocation,
                shapeGeneratorType: ability.targetingShape,
                squaddieRepository: state.squaddieRepository,
            }),
            staticSquaddie.activities[0].maximumRange,
            [mapLocation],
        );

        state.hexMap.stopHighlightingTiles();
        state.hexMap.highlightTiles([
                {
                    tiles: abilityRange,
                    pulseColor: HighlightPulseRedColor,
                    overlayImageResourceName: "map icon attack 1 action"
                }
            ]
        );
    }

    private addSquaddieSquaddieInstruction(
        state: OrchestratorState,
        staticSquaddie: BattleSquaddieStatic,
        dynamicSquaddie: BattleSquaddieDynamic,
        activity: SquaddieSquaddieActivity,
    ) {
        // TODO Extract to a common function
        if (!(state.squaddieCurrentlyActing && state.squaddieCurrentlyActing.instruction)) {
            const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
            const dynamicSquaddieId = dynamicSquaddie.dynamicSquaddieId;

            state.squaddieCurrentlyActing = new SquaddieInstructionInProgress({
                instruction: new SquaddieInstruction({
                    staticSquaddieId: staticSquaddie.squaddieId.staticId,
                    dynamicSquaddieId,
                    startingLocation: new HexCoordinate({
                        q: datum.mapLocation.q,
                        r: datum.mapLocation.r,
                    }),
                }),
            });
        }

        state.squaddieCurrentlyActing.addConfirmedActivity(activity);
        this.gaveCompleteInstruction = true;
        state.battleEventRecording.addEvent(new BattleEvent({
            currentSquaddieInstruction: state.squaddieCurrentlyActing,
        }));
    }

    update(state: OrchestratorState, p: p5): void {
        const currentTeam: BattleSquaddieTeam = state.battlePhaseTracker.getCurrentTeam();
        if (currentTeam.hasAnActingSquaddie() && !currentTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()) {
            this.askComputerControlSquaddie(state);
        }
        this.beginSelectionOnCurrentlyActingSquaddie(state);
    }

    recommendStateChanges(state: OrchestratorState): OrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = undefined;

        if (!this.atLeastOneSquaddieOnCurrentTeamCanAct(state)) {
            nextMode = BattleOrchestratorMode.PHASE_CONTROLLER;
        } else if (this.gaveCompleteInstruction) {
            let newActivity = state.squaddieCurrentlyActing.instruction.getMostRecentActivity();
            if (newActivity instanceof SquaddieMovementActivity) {
                nextMode = BattleOrchestratorMode.SQUADDIE_MOVER;
            }
            if (newActivity instanceof SquaddieSquaddieActivity) {
                nextMode = BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY;
            }
            if (newActivity instanceof SquaddieEndTurnActivity) {
                nextMode = BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY;
            }
        }

        return {
            displayMap: true,
            nextMode,
        }
    }

    reset(state: OrchestratorState) {
        this.gaveCompleteInstruction = false;
        this.initialFocusOnSquaddie = false;

        state.battleSquaddieSelectedHUD.reset();
    }

    private askComputerControlSquaddie(state: OrchestratorState) {
        if (!this.gaveCompleteInstruction) {
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

    private defaultSquaddieToEndTurn(state: OrchestratorState, currentTeam: BattleSquaddieTeam) {
        const dynamicSquaddieId: string = currentTeam.getDynamicSquaddieIdThatCanActButNotPlayerControlled();
        return this.addEndTurnInstruction(state, dynamicSquaddieId);
    }

    private addEndTurnInstruction(state: OrchestratorState, dynamicSquaddieId: string) {
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
        this.gaveCompleteInstruction = true;

        state.battleEventRecording.addEvent(new BattleEvent({
            currentSquaddieInstruction: state.squaddieCurrentlyActing,
        }));
    }

    private askTeamStrategyToInstructSquaddie(state: OrchestratorState, currentTeam: BattleSquaddieTeam, currentTeamStrategy: TeamStrategy): SquaddieInstruction {
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

    private panToSquaddieIfOffscreen(state: OrchestratorState) {
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

    private reactToComputerSelectedActivity(state: OrchestratorState, squaddieInstruction: SquaddieInstruction) {
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(squaddieInstruction.dynamicSquaddieId));
        let newActivity = squaddieInstruction.getMostRecentActivity();
        if (newActivity instanceof SquaddieMovementActivity) {
            createSearchPath(state, staticSquaddie, dynamicSquaddie, newActivity.destination);
            addMovementInstruction(state, staticSquaddie, dynamicSquaddie, newActivity.destination);
            this.gaveCompleteInstruction = true;
            return;
        }
        if (newActivity instanceof SquaddieSquaddieActivity) {
            this.addSquaddieSquaddieInstruction(state, staticSquaddie, dynamicSquaddie, newActivity);
            this.highlightTargetRange(state);
            return;
        }
        if (newActivity instanceof SquaddieEndTurnActivity) {
            this.addEndTurnInstruction(state, squaddieInstruction.dynamicSquaddieId);
        }
    }

    private beginSelectionOnCurrentlyActingSquaddie(state: OrchestratorState) {
        if (
            !this.initialFocusOnSquaddie
            && state.squaddieCurrentlyActing
            && !state.squaddieCurrentlyActing.isReadyForNewSquaddie()
        ) {
            state.battleSquaddieUIInput.changeSelectionState(
                BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
                state.squaddieCurrentlyActing.dynamicSquaddieId
            );
            this.initialFocusOnSquaddie = true;
        }
    }
}
