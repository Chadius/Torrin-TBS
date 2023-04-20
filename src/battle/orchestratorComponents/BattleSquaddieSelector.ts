import {
    OrchestratorComponent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {convertScreenCoordinatesToMapCoordinates} from "../../hexMap/convertCoordinates";
import {HexCoordinate} from "../../hexMap/hexGrid";
import {BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {calculateNewBattleSquaddieUISelectionState} from "../battleSquaddieUIService";
import {SquaddieId} from "../../squaddie/id";
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

export class BattleSquaddieSelector implements OrchestratorComponent {
    constructor() {
    }

    hasCompleted(state: OrchestratorState): boolean {
        return state.battleSquaddieUIInput.getSelectionState() === BattleSquaddieUISelectionState.MOVING_SQUADDIE;
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            const currentTeam: BattleSquaddieTeam = state.battlePhaseTracker.getCurrentTeam();
            if (currentTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()) {
                this.updateBattleSquaddieUIMouseClicked(state, event.mouseX, event.mouseY);
                state.hexMap.mouseClicked(event.mouseX, event.mouseY, ...state.camera.getCoordinates());
            }
        }
    }

    private updateBattleSquaddieUIMouseClicked(state: OrchestratorState, mouseX: number, mouseY: number) {
        const clickedTileCoordinates: [number, number] = convertScreenCoordinatesToMapCoordinates(mouseX, mouseY, ...state.camera.getCoordinates());
        state.clickedHexCoordinate = {
            q: clickedTileCoordinates[0],
            r: clickedTileCoordinates[1]
        };

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

        const squaddieID: SquaddieId = state.missionMap.getSquaddieAtLocation(clickedHexCoordinate);
        if (!squaddieID) {
            state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }
        const {
            staticSquaddie,
            dynamicSquaddie,
            dynamicSquaddieId,
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByStaticIDAndLocation(squaddieID.id, clickedHexCoordinate));

        highlightSquaddieReach(dynamicSquaddie, staticSquaddie, state.pathfinder, state.missionMap, state.hexMap);
        state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.SELECTED_SQUADDIE, dynamicSquaddieId);
        state.battleSquaddieSelectedHUD.mouseClickedSquaddieSelected(dynamicSquaddieId, mouseX, mouseY);
    }

    private updateBattleSquaddieUISelectedSquaddie(state: OrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        if (
            !state.hexMap.areCoordinatesOnMap(clickedHexCoordinate)
        ) {
            state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }

        const squaddieID: SquaddieId = state.missionMap.getSquaddieAtLocation(clickedHexCoordinate);
        if (squaddieID) {
            this.focusOnSelectedSquaddie(state, squaddieID, clickedHexCoordinate, mouseX, mouseY);
        }

        const {
            staticSquaddie,
            dynamicSquaddie,
            dynamicSquaddieId,
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(state.battleSquaddieUIInput.selectedSquaddieDynamicID));

        const newSelectionState: BattleSquaddieUISelectionState = calculateNewBattleSquaddieUISelectionState(
            {
                tileClickedOn: clickedHexCoordinate,
                selectionState: state.battleSquaddieUIInput.selectionState,
                missionMap: state.missionMap,
                squaddieRepository: state.squaddieRepo,
                selectedSquaddieDynamicID: dynamicSquaddieId
            }
        );

        if (newSelectionState === BattleSquaddieUISelectionState.MOVING_SQUADDIE) {
            this.createSearchPath(state, staticSquaddie, dynamicSquaddie, clickedHexCoordinate);
        }
    }

    private createSearchPath(state: OrchestratorState, staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic, clickedHexCoordinate: HexCoordinate) {
        const searchResults: SearchResults = getResultOrThrowError(
            state.pathfinder.findPathToStopLocation(new SearchParams({
                missionMap: state.missionMap,
                squaddieMovement: staticSquaddie.movement,
                numberOfActions: dynamicSquaddie.squaddieTurn.getRemainingActions(),
                startLocation: {
                    q: dynamicSquaddie.mapLocation.q,
                    r: dynamicSquaddie.mapLocation.r,
                },
                stopLocation: {
                    q: clickedHexCoordinate.q,
                    r: clickedHexCoordinate.r
                },
                squaddieAffiliation: staticSquaddie.squaddieId.affiliation
            }))
        );

        const closestRoute: SearchPath = getResultOrThrowError(searchResults.getRouteToStopLocation());

        const noDirectRouteToDestination = closestRoute === null;
        if (noDirectRouteToDestination) {
            state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.SELECTED_SQUADDIE);
            return;
        }

        state.squaddieMovePath = closestRoute;
        state.animationTimer = Date.now();
        let routeSortedByNumberOfMovementActions: TileFoundDescription[][] = getResultOrThrowError(searchResults.getRouteToStopLocationSortedByNumberOfMovementActions());

        const routeTilesByDistance = getHighlightedTileDescriptionByNumberOfMovementActions(routeSortedByNumberOfMovementActions);
        state.hexMap.stopHighlightingTiles();
        state.hexMap.highlightTiles(routeTilesByDistance);

        state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.MOVING_SQUADDIE);
        state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
    }

    private focusOnSelectedSquaddie(state: OrchestratorState, squaddieID: SquaddieId, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        const {
            staticSquaddie,
            dynamicSquaddie,
            dynamicSquaddieId,
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByStaticIDAndLocation(squaddieID.id, clickedHexCoordinate));

        state.hexMap.stopHighlightingTiles();
        highlightSquaddieReach(dynamicSquaddie, staticSquaddie, state.pathfinder, state.missionMap, state.hexMap);
        state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.SELECTED_SQUADDIE, dynamicSquaddieId);
        state.battleSquaddieSelectedHUD.mouseClickedSquaddieSelected(dynamicSquaddieId, mouseX, mouseY);
    }

    update(state: OrchestratorState, p?: p5): void {
    }
}