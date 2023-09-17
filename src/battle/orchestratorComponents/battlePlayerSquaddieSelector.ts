import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertScreenCoordinatesToMapCoordinates
} from "../../hexMap/convertCoordinates";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {highlightSquaddieReach} from "../animation/mapHighlight";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {SquaddieEndTurnActivity} from "../history/squaddieEndTurnActivity";
import {BattleEvent} from "../history/battleEvent";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieActivity} from "../../squaddie/activity";
import {GetSquaddieAtMapLocation} from "./orchestratorUtils";
import {MissionMapSquaddieDatum} from "../../missionMap/missionMap";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {AddMovementInstruction, createSearchPath, MaybeCreateSquaddieInstruction} from "./battleSquaddieSelectorUtils";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {GetNumberOfActions} from "../../squaddie/squaddieService";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TargetingShape} from "../targeting/targetingShapeGenerator";

export class BattlePlayerSquaddieSelector implements BattleOrchestratorComponent {
    private gaveCompleteInstruction: boolean;
    private gaveInstructionThatNeedsATarget: boolean;
    private selectedSquaddieDynamicId: string;

    constructor() {
        this.gaveCompleteInstruction = false;
        this.gaveInstructionThatNeedsATarget = false;
        this.selectedSquaddieDynamicId = "";
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        if (!this.playerCanControlAtLeastOneSquaddie(state)) {
            return true;
        }

        const gaveCompleteInstruction = this.gaveCompleteInstruction;
        const cameraIsNotPanning = !state.camera.isPanning();
        const selectedActivityRequiresATarget = this.gaveInstructionThatNeedsATarget;
        return (gaveCompleteInstruction || selectedActivityRequiresATarget) && cameraIsNotPanning;
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            const currentTeam: BattleSquaddieTeam = state.getCurrentTeam();
            if (currentTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()) {
                let hudUsedMouseClick: boolean = false;
                if (state.battleSquaddieSelectedHUD.shouldDrawTheHUD()) {
                    hudUsedMouseClick = state.battleSquaddieSelectedHUD.didMouseClickOnHUD(event.mouseX, event.mouseY);
                    if (hudUsedMouseClick) {
                        state.battleSquaddieSelectedHUD.mouseClicked(event.mouseX, event.mouseY, state);
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

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
        if (event.eventType === OrchestratorComponentKeyEventType.PRESSED) {
            const currentTeam: BattleSquaddieTeam = state.getCurrentTeam();
            if (currentTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()) {
                state.battleSquaddieSelectedHUD.keyPressed(event.keyCode, state);

                if (state.battleSquaddieSelectedHUD.selectedSquaddieDynamicId != "") {
                    const squaddieInfo = state.missionMap.getSquaddieByDynamicId(state.battleSquaddieSelectedHUD.selectedSquaddieDynamicId);
                    if (squaddieInfo.isValid() && state.missionMap.areCoordinatesOnMap(squaddieInfo.mapLocation)) {
                        const squaddieScreenCoordinates = convertMapCoordinatesToScreenCoordinates(squaddieInfo.mapLocation.q, squaddieInfo.mapLocation.r, ...state.camera.getCoordinates());
                        this.updateBattleSquaddieUIMouseClicked(state, squaddieScreenCoordinates[0], squaddieScreenCoordinates[1]);
                        state.hexMap.mouseClicked(squaddieScreenCoordinates[0], squaddieScreenCoordinates[1], ...state.camera.getCoordinates());
                        return;
                    }
                }
            }
        }
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: true,
            displayMap: true,
        });
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        const currentTeam: BattleSquaddieTeam = state.getCurrentTeam();
        if (currentTeam.hasAnActingSquaddie() && !currentTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()) {
            return;
        }
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = undefined;

        if (!this.playerCanControlAtLeastOneSquaddie(state)) {
            nextMode = BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR;
        } else if (this.gaveCompleteInstruction) {
            let newActivity = state.squaddieCurrentlyActing.squaddieActivitiesForThisRound.getMostRecentActivity();
            if (newActivity instanceof SquaddieMovementActivity) {
                nextMode = BattleOrchestratorMode.SQUADDIE_MOVER;
            }
            if (newActivity instanceof SquaddieSquaddieActivity) {
                nextMode = BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY;
            }
            if (newActivity instanceof SquaddieEndTurnActivity) {
                nextMode = BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY;
            }
        } else if (this.gaveInstructionThatNeedsATarget) {
            nextMode = BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET;
        }

        return {
            displayMap: true,
            nextMode,
        }
    }

    reset(state: BattleOrchestratorState) {
        this.gaveCompleteInstruction = false;
        this.gaveInstructionThatNeedsATarget = false;
        this.selectedSquaddieDynamicId = "";

        state.battleSquaddieSelectedHUD.reset();
    }

    private playerCanControlAtLeastOneSquaddie(state: BattleOrchestratorState): boolean {
        return state.getCurrentTeam().canPlayerControlAnySquaddieOnThisTeamRightNow();
    }

    private updateBattleSquaddieUIMouseClicked(state: BattleOrchestratorState, mouseX: number, mouseY: number) {
        const clickedTileCoordinates: [number, number] = convertScreenCoordinatesToMapCoordinates(mouseX, mouseY, ...state.camera.getCoordinates());
        const clickedHexCoordinate = new HexCoordinate({
            q: clickedTileCoordinates[0],
            r: clickedTileCoordinates[1]
        });

        if (
            !state.hexMap.areCoordinatesOnMap(clickedHexCoordinate)
        ) {
            state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }

        if (this.selectedSquaddieDynamicId != "") {
            this.updateBattleSquaddieUISelectedSquaddie(state, clickedHexCoordinate, mouseX, mouseY);
        } else {
            this.updateBattleSquaddieUINoSquaddieSelected(state, clickedHexCoordinate, mouseX, mouseY);
        }
    }

    private updateBattleSquaddieUINoSquaddieSelected(state: BattleOrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
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
        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicId: dynamicSquaddie.dynamicSquaddieId,
            repositionWindow: {
                mouseX: mouseX,
                mouseY: mouseY
            },
            state,
        });
        this.selectedSquaddieDynamicId = dynamicSquaddie.dynamicSquaddieId;
    }

    private updateBattleSquaddieUISelectedSquaddie(state: BattleOrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        const squaddieClickedOnInfoAndMapLocation = state.missionMap.getSquaddieAtLocation(clickedHexCoordinate);
        const foundSquaddieAtLocation = squaddieClickedOnInfoAndMapLocation.isValid();

        if (foundSquaddieAtLocation) {
            this.updateBattleSquaddieUISelectedSquaddieClickedOnSquaddie(state, squaddieClickedOnInfoAndMapLocation, mouseX, mouseY);
        } else {
            this.updateBattleSquaddieUISelectedSquaddieClickedOnMap(state, clickedHexCoordinate, mouseX, mouseY);
        }
    }

    private updateBattleSquaddieUISelectedSquaddieClickedOnSquaddie(state: BattleOrchestratorState, squaddieClickedOnInfoAndMapLocation: MissionMapSquaddieDatum, mouseX: number, mouseY: number) {
        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicId: squaddieClickedOnInfoAndMapLocation.dynamicSquaddieId,
            repositionWindow: {
                mouseX: mouseX,
                mouseY: mouseY
            },
            state,
        });

        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const startOfANewSquaddieTurn = !state.squaddieCurrentlyActing || state.squaddieCurrentlyActing.isReadyForNewSquaddie;
        const squaddieToHighlightDynamicId: string = startOfANewSquaddieTurn
            ? squaddieClickedOnInfoAndMapLocation.dynamicSquaddieId
            : state.squaddieCurrentlyActing.dynamicSquaddieId;

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(squaddieToHighlightDynamicId));

        state.hexMap.stopHighlightingTiles();
        highlightSquaddieReach(dynamicSquaddie, staticSquaddie, state.pathfinder, state.missionMap, state.hexMap, state.squaddieRepository);
    }

    private updateBattleSquaddieUISelectedSquaddieClickedOnMap(state: BattleOrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(this.selectedSquaddieDynamicId));
        const pathfinder: Pathfinder = new Pathfinder();
        const squaddieDatum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie})
        const searchResults: SearchResults = getResultOrThrowError(
            pathfinder.findPathToStopLocation(new SearchParams({
                missionMap: state.missionMap,
                squaddieMovement: staticSquaddie.movement,
                startLocation: squaddieDatum.mapLocation,
                stopLocation: clickedHexCoordinate,
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository: state.squaddieRepository,
                numberOfActions: normalActionsRemaining,
                shapeGeneratorType: TargetingShape.Snake,
            }))
        );
        const closestRoute = getResultOrThrowError(searchResults.getRouteToStopLocation());
        if (closestRoute != null) {
            createSearchPath(state, staticSquaddie, dynamicSquaddie, clickedHexCoordinate);
            AddMovementInstruction(state, staticSquaddie, dynamicSquaddie, clickedHexCoordinate);
            this.gaveCompleteInstruction = true;
        }
    }

    private isHudInstructingTheCurrentlyActingSquaddie(state: BattleOrchestratorState): boolean {
        const startOfANewSquaddieTurn = !state.squaddieCurrentlyActing || state.squaddieCurrentlyActing.isReadyForNewSquaddie;
        const squaddieShownInHUD = state.battleSquaddieSelectedHUD.getSelectedSquaddieDynamicId();

        if (
            !startOfANewSquaddieTurn
            && squaddieShownInHUD !== state.squaddieCurrentlyActing.dynamicSquaddieId
        ) {
            return false;
        }
        return true;
    }

    private reactToPlayerSelectedActivity(state: BattleOrchestratorState) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(state.battleSquaddieSelectedHUD.getSelectedSquaddieDynamicId()));
        const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        MaybeCreateSquaddieInstruction(state, dynamicSquaddie, staticSquaddie);
        if (state.squaddieCurrentlyActing.isReadyForNewSquaddie) {
            state.squaddieCurrentlyActing.addInitialState({
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
}
