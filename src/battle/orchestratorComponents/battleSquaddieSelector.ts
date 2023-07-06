import {
    OrchestratorChanges,
    OrchestratorComponent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertScreenCoordinatesToMapCoordinates
} from "../../hexMap/convertCoordinates";
import {BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {calculateNewBattleSquaddieUISelectionState} from "../battleSquaddieUIService";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {
    getHighlightedTileDescriptionByNumberOfMovementActions,
    highlightSquaddieReach
} from "../animation/mapHighlight";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {TileFoundDescription} from "../../hexMap/pathfinder/tileFoundDescription";
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
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {SquaddieActivity} from "../../squaddie/activity";

import {GetSquaddieAtMapLocation} from "./orchestratorUtils";
import {MissionMapSquaddieDatum} from "../../missionMap/missionMap";
import {GetNumberOfActions} from "../../squaddie/squaddieService";

export const SQUADDIE_SELECTOR_PANNING_TIME = 1000;

export class BattleSquaddieSelector implements OrchestratorComponent {
    private gaveCompleteInstruction: boolean;
    private gaveInstructionThatNeedsATarget: boolean;
    private pannedCameraOnComputerControlledSquaddie: boolean;
    private initialFocusOnSquaddie: boolean;

    constructor() {
        this.gaveCompleteInstruction = false;
        this.gaveInstructionThatNeedsATarget = false;
        this.pannedCameraOnComputerControlledSquaddie = false;
        this.initialFocusOnSquaddie = false;
    }

    hasCompleted(state: OrchestratorState): boolean {
        if (!this.atLeastOneSquaddieOnCurrentTeamCanAct(state)) {
            return true;
        }

        const gaveCompleteInstruction = this.gaveCompleteInstruction;
        const cameraIsNotPanning = !state.camera.isPanning();
        const selectedActivityRequiresATarget = this.gaveInstructionThatNeedsATarget;
        return (gaveCompleteInstruction || selectedActivityRequiresATarget) && cameraIsNotPanning;
    }

    private atLeastOneSquaddieOnCurrentTeamCanAct(state: OrchestratorState): boolean {
        return state.battlePhaseTracker.getCurrentTeam().hasAnActingSquaddie();
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            const currentTeam: BattleSquaddieTeam = state.battlePhaseTracker.getCurrentTeam();
            if (currentTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()) {
                let hudUsedMouseClick: boolean = false;
                if (state.battleSquaddieSelectedHUD.shouldDrawTheHUD()) {
                    hudUsedMouseClick = state.battleSquaddieSelectedHUD.didMouseClickOnHUD(event.mouseX, event.mouseY);
                    if (hudUsedMouseClick) {
                        state.battleSquaddieSelectedHUD.mouseClicked(event.mouseX, event.mouseY);
                    }
                    if (state.battleSquaddieSelectedHUD.wasActivitySelected()) {
                        this.reactToPlayerSelectedActivity(state);
                    }
                }
                if (hudUsedMouseClick) {
                    return;
                }

                this.updateBattleSquaddieUIMouseClicked(state, event.mouseX, event.mouseY);
                state.hexMap.mouseClicked(event.mouseX, event.mouseY, ...state.camera.getCoordinates());
            }
        }
    }

    private updateBattleSquaddieUIMouseClicked(state: OrchestratorState, mouseX: number, mouseY: number) {
        const clickedTileCoordinates: [number, number] = convertScreenCoordinatesToMapCoordinates(mouseX, mouseY, ...state.camera.getCoordinates());
        state.clickedHexCoordinate = new HexCoordinate({
            q: clickedTileCoordinates[0],
            r: clickedTileCoordinates[1]
        });

        if (
            !state.hexMap.areCoordinatesOnMap(state.clickedHexCoordinate)
        ) {
            state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }

        switch (state.battleSquaddieUIInput.selectionState) {
            case BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED:
                this.updateBattleSquaddieUINoSquaddieSelected(state, state.clickedHexCoordinate, mouseX, mouseY);
                break;
            case BattleSquaddieUISelectionState.SELECTED_SQUADDIE:
                this.updateBattleSquaddieUISelectedSquaddie(state, state.clickedHexCoordinate, mouseX, mouseY);
                break;
        }
    }

    private updateBattleSquaddieUINoSquaddieSelected(state: OrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        const newSelectionState: BattleSquaddieUISelectionState = calculateNewBattleSquaddieUISelectionState(
            {
                tileClickedOn: clickedHexCoordinate,
                selectionState: state.battleSquaddieUIInput.selectionState,
                missionMap: state.missionMap,
                squaddieRepository: state.squaddieRepository,
                squaddieInstructionInProgress: state.squaddieCurrentlyActing,
            }
        );
        if (newSelectionState !== BattleSquaddieUISelectionState.SELECTED_SQUADDIE) {
            state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = GetSquaddieAtMapLocation({
            mapLocation: clickedHexCoordinate,
            map: state.missionMap,
            squaddieRepository: state.squaddieRepository,
        });

        if (!staticSquaddie) {
            state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }

        highlightSquaddieReach(dynamicSquaddie, staticSquaddie, state.pathfinder, state.missionMap, state.hexMap, state.squaddieRepository);
        state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.SELECTED_SQUADDIE, dynamicSquaddie.dynamicSquaddieId);
        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicID: dynamicSquaddie.dynamicSquaddieId,
            repositionWindow: {
                mouseX: mouseX,
                mouseY: mouseY

            }
        });
    }

    private updateBattleSquaddieUISelectedSquaddie(state: OrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        const squaddieClickedOnInfoAndMapLocation = state.missionMap.getSquaddieAtLocation(clickedHexCoordinate);
        const foundSquaddieAtLocation = squaddieClickedOnInfoAndMapLocation.isValid();

        if (foundSquaddieAtLocation) {
            this.updateBattleSquaddieUISelectedSquaddieClickedOnSquaddie(state, squaddieClickedOnInfoAndMapLocation, mouseX, mouseY);
        } else {
            this.updateBattleSquaddieUISelectedSquaddieClickedOnMap(state, clickedHexCoordinate, mouseX, mouseY);
        }
    }

    private updateBattleSquaddieUISelectedSquaddieClickedOnSquaddie(state: OrchestratorState, squaddieClickedOnInfoAndMapLocation: MissionMapSquaddieDatum, mouseX: number, mouseY: number) {
        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicID: squaddieClickedOnInfoAndMapLocation.dynamicSquaddieId,
            repositionWindow: {
                mouseX: mouseX,
                mouseY: mouseY
            }
        });

        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const startOfANewSquaddieTurn = !state.squaddieCurrentlyActing || state.squaddieCurrentlyActing.isReadyForNewSquaddie();
        const squaddieToHighlightDynamicId: string = startOfANewSquaddieTurn
            ? squaddieClickedOnInfoAndMapLocation.dynamicSquaddieId
            : state.battleSquaddieUIInput.selectedSquaddieDynamicID;
        state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.SELECTED_SQUADDIE, squaddieToHighlightDynamicId);

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicID(squaddieToHighlightDynamicId));

        state.hexMap.stopHighlightingTiles();
        highlightSquaddieReach(dynamicSquaddie, staticSquaddie, state.pathfinder, state.missionMap, state.hexMap, state.squaddieRepository);
    }

    private updateBattleSquaddieUISelectedSquaddieClickedOnMap(state: OrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicID(state.battleSquaddieUIInput.selectedSquaddieDynamicID));
        const newSelectionState: BattleSquaddieUISelectionState = calculateNewBattleSquaddieUISelectionState(
            {
                tileClickedOn: clickedHexCoordinate,
                selectionState: state.battleSquaddieUIInput.selectionState,
                missionMap: state.missionMap,
                squaddieRepository: state.squaddieRepository,
                selectedSquaddieDynamicID: dynamicSquaddie.dynamicSquaddieId,
                squaddieInstructionInProgress: state.squaddieCurrentlyActing,
            }
        );

        if (newSelectionState === BattleSquaddieUISelectionState.MOVING_SQUADDIE) {
            this.createSearchPath(state, staticSquaddie, dynamicSquaddie, clickedHexCoordinate);
            this.addMovementInstruction(state, staticSquaddie, dynamicSquaddie, clickedHexCoordinate);
        }
    }

    private createSearchPath(state: OrchestratorState, staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic, clickedHexCoordinate: HexCoordinate) {
        const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie})
        const searchResults: SearchResults = getResultOrThrowError(
            state.pathfinder.findPathToStopLocation(new SearchParams({
                missionMap: state.missionMap,
                squaddieMovement: staticSquaddie.movement,
                numberOfActions: normalActionsRemaining,
                startLocation: new HexCoordinate({
                    q: datum.mapLocation.q,
                    r: datum.mapLocation.r,
                }),
                stopLocation: new HexCoordinate({
                    q: clickedHexCoordinate.q,
                    r: clickedHexCoordinate.r
                }),
                squaddieAffiliation: staticSquaddie.squaddieId.affiliation,
                squaddieRepository: state.squaddieRepository,
                shapeGeneratorType: TargetingShape.Snake,
            }))
        );

        const closestRoute: SearchPath = getResultOrThrowError(searchResults.getRouteToStopLocation());

        const noDirectRouteToDestination = closestRoute === null;
        if (noDirectRouteToDestination) {
            state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.SELECTED_SQUADDIE);
            return;
        }

        state.squaddieMovePath = closestRoute;
        let routeSortedByNumberOfMovementActions: TileFoundDescription[][] = getResultOrThrowError(searchResults.getRouteToStopLocationSortedByNumberOfMovementActions());

        const routeTilesByDistance = getHighlightedTileDescriptionByNumberOfMovementActions(
            routeSortedByNumberOfMovementActions.map(
                tiles => tiles.map(
                    tile => tile.hexCoordinate
                )
            )
        );
        state.hexMap.stopHighlightingTiles();
        state.hexMap.highlightTiles(routeTilesByDistance);

        state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.MOVING_SQUADDIE);
        state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
    }

    private addMovementInstruction(state: OrchestratorState, staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic, destinationHexCoordinate: HexCoordinate) {
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

        state.squaddieCurrentlyActing.addConfirmedActivity(new SquaddieMovementActivity({
            destination: destinationHexCoordinate,
            numberOfActionsSpent: state.squaddieMovePath.getNumberOfMovementActions(),
        }));
        this.gaveCompleteInstruction = true;
        state.battleEventRecording.addEvent(new BattleEvent({
            currentSquaddieInstruction: state.squaddieCurrentlyActing,
        }));
    }

    private focusOnSelectedSquaddie(state: OrchestratorState, dynamicSquaddieId: string, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicID(dynamicSquaddieId));

        state.hexMap.stopHighlightingTiles();
        highlightSquaddieReach(dynamicSquaddie, staticSquaddie, state.pathfinder, state.missionMap, state.hexMap, state.squaddieRepository);
        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicID: dynamicSquaddie.dynamicSquaddieId,
            repositionWindow: {
                mouseX: mouseX,
                mouseY: mouseY
            }
        });
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
            if (newActivity instanceof SquaddieEndTurnActivity) {
                nextMode = BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY;
            }
        } else if (this.gaveInstructionThatNeedsATarget) {
            nextMode = BattleOrchestratorMode.SQUADDIE_TARGET;
        }

        return {
            displayMap: true,
            nextMode,
        }
    }

    reset(state: OrchestratorState) {
        this.gaveCompleteInstruction = false;
        this.pannedCameraOnComputerControlledSquaddie = false;
        this.gaveInstructionThatNeedsATarget = false;
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
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicID(dynamicSquaddieId))
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

    private isHudInstructingTheCurrentlyActingSquaddie(state: OrchestratorState): boolean {
        const startOfANewSquaddieTurn = !state.squaddieCurrentlyActing || state.squaddieCurrentlyActing.isReadyForNewSquaddie();
        const squaddieShownInHUD = state.battleSquaddieSelectedHUD.getSelectedSquaddieDynamicId();

        if (
            !startOfANewSquaddieTurn
            && squaddieShownInHUD !== state.squaddieCurrentlyActing.dynamicSquaddieId
        ) {
            return false;
        }
        return true;
    }

    private reactToPlayerSelectedActivity(state: OrchestratorState) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicID(state.battleSquaddieSelectedHUD.getSelectedSquaddieDynamicId()));
        const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        if (!state.squaddieCurrentlyActing) {
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
        if (state.squaddieCurrentlyActing.isReadyForNewSquaddie()) {
            state.squaddieCurrentlyActing.addSquaddie({
                dynamicSquaddieId: dynamicSquaddie.dynamicSquaddieId,
                staticSquaddieId: staticSquaddie.staticId,
                startingLocation: datum.mapLocation,
            });
        }

        if (state.battleSquaddieSelectedHUD.getSelectedActivity() instanceof SquaddieEndTurnActivity) {
            state.squaddieCurrentlyActing.addConfirmedActivity(new SquaddieEndTurnActivity());

            state.hexMap.stopHighlightingTiles();
            this.gaveCompleteInstruction = true;

            state.battleEventRecording.addEvent(new BattleEvent({
                currentSquaddieInstruction: state.squaddieCurrentlyActing,
            }));
            this.gaveCompleteInstruction = true;
        } else if (state.battleSquaddieSelectedHUD.getSelectedActivity() instanceof SquaddieActivity) {
            const newActivity = state.battleSquaddieSelectedHUD.getSelectedActivity();
            state.squaddieCurrentlyActing.addSelectedActivity(newActivity as SquaddieActivity);
            this.gaveInstructionThatNeedsATarget = true;
        }

        state.hexMap.stopHighlightingTiles();
    }

    private panToSquaddieIfOffscreen(state: OrchestratorState) {
        const dynamicSquaddieId: string = state.squaddieCurrentlyActing.dynamicSquaddieId;

        const {
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicID(dynamicSquaddieId));

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
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicID(squaddieInstruction.dynamicSquaddieId));
        let newActivity = squaddieInstruction.getMostRecentActivity();
        if (newActivity instanceof SquaddieMovementActivity) {
            this.createSearchPath(state, staticSquaddie, dynamicSquaddie, newActivity.destination);
            this.addMovementInstruction(state, staticSquaddie, dynamicSquaddie, newActivity.destination);
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
