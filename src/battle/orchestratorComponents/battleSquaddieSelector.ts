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
import {ACTIVITY_END_TURN_ID} from "../../squaddie/endTurnActivity";
import {BattleEvent} from "../history/battleEvent";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {CurrentSquaddieInstruction} from "../history/currentSquaddieInstruction";

export const SQUADDIE_SELECTOR_PANNING_TIME = 1000;

export class BattleSquaddieSelector implements OrchestratorComponent {
    gaveInstruction: boolean;
    pannedCameraOnComputerControlledSquaddie: boolean;

    constructor() {
        this.gaveInstruction = false;
        this.pannedCameraOnComputerControlledSquaddie = false;
    }

    hasCompleted(state: OrchestratorState): boolean {
        return (this.gaveInstruction && !state.camera.isPanning()) || !this.atLeastOneSquaddieOnCurrentTeamCanAct(state);
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
                squaddieRepository: state.squaddieRepo,
            }
        );
        if (newSelectionState !== BattleSquaddieUISelectionState.SELECTED_SQUADDIE) {
            state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }
        const squaddieDatum = state.missionMap.getSquaddieAtLocation(clickedHexCoordinate);
        if (!squaddieDatum.isValid()) {
            state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(squaddieDatum.dynamicSquaddieId));

        highlightSquaddieReach(dynamicSquaddie, staticSquaddie, state.pathfinder, state.missionMap, state.hexMap, state.squaddieRepo);
        state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.SELECTED_SQUADDIE, dynamicSquaddie.dynamicSquaddieId);
        state.battleSquaddieSelectedHUD.mouseClickedSquaddieSelected(dynamicSquaddie.dynamicSquaddieId, mouseX, mouseY);
    }

    private updateBattleSquaddieUISelectedSquaddie(state: OrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        if (
            !state.hexMap.areCoordinatesOnMap(clickedHexCoordinate)
        ) {
            state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }

        const squaddieDatum = state.missionMap.getSquaddieAtLocation(clickedHexCoordinate);
        if (squaddieDatum.isValid()) {
            this.focusOnSelectedSquaddie(state, squaddieDatum.dynamicSquaddieId, clickedHexCoordinate, mouseX, mouseY);
        }

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(state.battleSquaddieUIInput.selectedSquaddieDynamicID));

        const newSelectionState: BattleSquaddieUISelectionState = calculateNewBattleSquaddieUISelectionState(
            {
                tileClickedOn: clickedHexCoordinate,
                selectionState: state.battleSquaddieUIInput.selectionState,
                missionMap: state.missionMap,
                squaddieRepository: state.squaddieRepo,
                selectedSquaddieDynamicID: dynamicSquaddie.dynamicSquaddieId
            }
        );

        if (newSelectionState === BattleSquaddieUISelectionState.MOVING_SQUADDIE) {
            this.createSearchPath(state, staticSquaddie, dynamicSquaddie, clickedHexCoordinate);
            this.addMovementInstruction(state, staticSquaddie, dynamicSquaddie, clickedHexCoordinate);
        }
    }

    private createSearchPath(state: OrchestratorState, staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic, clickedHexCoordinate: HexCoordinate) {
        const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);

        const searchResults: SearchResults = getResultOrThrowError(
            state.pathfinder.findPathToStopLocation(new SearchParams({
                missionMap: state.missionMap,
                squaddieMovement: staticSquaddie.movement,
                numberOfActions: dynamicSquaddie.squaddieTurn.getRemainingActions(),
                startLocation: new HexCoordinate({
                    q: datum.mapLocation.q,
                    r: datum.mapLocation.r,
                }),
                stopLocation: new HexCoordinate({
                    q: clickedHexCoordinate.q,
                    r: clickedHexCoordinate.r
                }),
                squaddieAffiliation: staticSquaddie.squaddieId.affiliation,
                squaddieRepository: state.squaddieRepo,
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
        if (!state.squaddieCurrentlyActing) {
            const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
            const dynamicSquaddieId = dynamicSquaddie.dynamicSquaddieId;

            state.squaddieCurrentlyActing = new CurrentSquaddieInstruction({
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

        state.squaddieCurrentlyActing.instruction.addMovement(new SquaddieMovementActivity({
            destination: destinationHexCoordinate,
            numberOfActionsSpent: state.squaddieMovePath.getNumberOfMovementActions(),
        }));
        this.gaveInstruction = true;
        state.battleEventRecording.addEvent(new BattleEvent({
            instruction: state.squaddieCurrentlyActing.instruction
        }));
    }

    private focusOnSelectedSquaddie(state: OrchestratorState, dynamicSquaddieId: string, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(dynamicSquaddieId));

        state.hexMap.stopHighlightingTiles();
        highlightSquaddieReach(dynamicSquaddie, staticSquaddie, state.pathfinder, state.missionMap, state.hexMap, state.squaddieRepo);
        state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.SELECTED_SQUADDIE, dynamicSquaddie.dynamicSquaddieId);
        state.battleSquaddieSelectedHUD.mouseClickedSquaddieSelected(dynamicSquaddie.dynamicSquaddieId, mouseX, mouseY);
    }

    update(state: OrchestratorState, p: p5): void {
        const currentTeam: BattleSquaddieTeam = state.battlePhaseTracker.getCurrentTeam();
        if (currentTeam.hasAnActingSquaddie() && !currentTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()) {
            this.askComputerControlSquaddie(state);
        }
    }

    recommendStateChanges(state: OrchestratorState): OrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = undefined;

        if (this.gaveInstruction) {
            let newActivity = state.squaddieCurrentlyActing.instruction.getMostRecentActivity();
            if (newActivity instanceof SquaddieMovementActivity) {
                nextMode = BattleOrchestratorMode.SQUADDIE_MOVER;
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

    reset(state: OrchestratorState) {
        this.gaveInstruction = false;
        this.pannedCameraOnComputerControlledSquaddie = false;

        state.battleSquaddieSelectedHUD.reset();
    }

    private askComputerControlSquaddie(state: OrchestratorState) {
        if (!this.gaveInstruction) {
            const currentTeam: BattleSquaddieTeam = state.battlePhaseTracker.getCurrentTeam();
            const currentTeamStrategies: TeamStrategy[] = state.teamStrategyByAffiliation[currentTeam.getAffiliation()];

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
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(dynamicSquaddieId))
        const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        let squaddieActivity: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: staticSquaddie.squaddieId.staticId,
            dynamicSquaddieId,
            startingLocation: datum.mapLocation,
        });

        squaddieActivity.endTurn();
        state.squaddieCurrentlyActing = new CurrentSquaddieInstruction({
            instruction: squaddieActivity,
        });

        this.gaveInstruction = true;

        state.battleEventRecording.addEvent(new BattleEvent({
            instruction: squaddieActivity
        }));

        return squaddieActivity;
    }

    private askTeamStrategyToInstructSquaddie(state: OrchestratorState, currentTeam: BattleSquaddieTeam, currentTeamStrategy: TeamStrategy): SquaddieInstruction {
        const teamStrategyState: TeamStrategyState = new TeamStrategyState({
            missionMap: state.missionMap,
            team: currentTeam,
            squaddieRepository: state.squaddieRepo,
        })

        let squaddieActivity: SquaddieInstruction = currentTeamStrategy.DetermineNextInstruction(teamStrategyState);
        if (!squaddieActivity) {
            return;
        }

        return squaddieActivity;
    }

    private reactToPlayerSelectedActivity(state: OrchestratorState) {
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(state.battleSquaddieSelectedHUD.getSelectedSquaddieDynamicId()));
        const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        if (state.battleSquaddieSelectedHUD.getSelectedActivity().id === ACTIVITY_END_TURN_ID) {
            const endTurnActivity: SquaddieInstruction = new SquaddieInstruction({
                staticSquaddieId: staticSquaddie.squaddieId.staticId,
                dynamicSquaddieId: dynamicSquaddie.dynamicSquaddieId,
                startingLocation: datum.mapLocation,
            });
            endTurnActivity.endTurn();

            state.squaddieCurrentlyActing = new CurrentSquaddieInstruction({
                instruction: endTurnActivity,
            });

            state.hexMap.stopHighlightingTiles();
            this.gaveInstruction = true;

            state.battleEventRecording.addEvent(new BattleEvent({
                instruction: endTurnActivity
            }));
        }
    }

    private panToSquaddieIfOffscreen(state: OrchestratorState) {
        const dynamicSquaddieId: string = state.squaddieCurrentlyActing.dynamicSquaddieId;

        const {
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(dynamicSquaddieId));

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
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(squaddieInstruction.dynamicSquaddieId));
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
}
