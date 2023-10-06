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
import {HighlightSquaddieReach} from "../animation/mapHighlight";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {SquaddieMovementAction} from "../history/squaddieMovementAction";
import {SquaddieEndTurnAction} from "../history/squaddieEndTurnAction";
import {BattleEvent} from "../history/battleEvent";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieAction} from "../../squaddie/action";
import {GetSquaddieAtMapLocation} from "./orchestratorUtils";
import {MissionMapSquaddieDatum} from "../../missionMap/missionMap";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {SquaddieSquaddieAction} from "../history/squaddieSquaddieAction";
import {AddMovementInstruction, createSearchPath, MaybeCreateSquaddieInstruction} from "./battleSquaddieSelectorUtils";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {CanPlayerControlSquaddieRightNow, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {SearchMovement, SearchParams, SearchSetup, SearchStopCondition} from "../../hexMap/pathfinder/searchParams";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";

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
        const selectedActionRequiresATarget = this.gaveInstructionThatNeedsATarget;
        return (gaveCompleteInstruction || selectedActionRequiresATarget) && cameraIsNotPanning;
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
                    if (state.battleSquaddieSelectedHUD.wasAnyActionSelected()) {
                        this.reactToPlayerSelectedAction(state);
                    }
                }
                if (hudUsedMouseClick) {
                    return;
                }

                this.updateBattleSquaddieUIMouseClicked(state, event.mouseX, event.mouseY);
                state.hexMap.mouseClicked(event.mouseX, event.mouseY, ...state.camera.getCoordinates());
            }
        }

        if (event.eventType === OrchestratorComponentMouseEventType.MOVED) {
            if (state.battleSquaddieSelectedHUD.shouldDrawTheHUD()) {
                state.battleSquaddieSelectedHUD.mouseMoved(event.mouseX, event.mouseY, state);
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
        if (this.selectedSquaddieDynamicId === "" && state.squaddieCurrentlyActing.squaddieHasActedThisTurn) {
            this.selectedSquaddieDynamicId = state.squaddieCurrentlyActing.dynamicSquaddieId;
        }
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = undefined;

        if (!this.playerCanControlAtLeastOneSquaddie(state)) {
            nextMode = BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR;
        } else if (this.gaveCompleteInstruction) {
            let newAction = state.squaddieCurrentlyActing.squaddieActionsForThisRound.getMostRecentAction();
            if (newAction instanceof SquaddieMovementAction) {
                nextMode = BattleOrchestratorMode.SQUADDIE_MOVER;
            }
            if (newAction instanceof SquaddieSquaddieAction) {
                nextMode = BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE;
            }
            if (newAction instanceof SquaddieEndTurnAction) {
                nextMode = BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP;
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

        HighlightSquaddieReach(dynamicSquaddie, staticSquaddie, state.pathfinder, state.missionMap, state.hexMap, state.squaddieRepository);
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

        if (startOfANewSquaddieTurn) {
            this.selectedSquaddieDynamicId = squaddieClickedOnInfoAndMapLocation.dynamicSquaddieId;
        }
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(squaddieToHighlightDynamicId));

        state.hexMap.stopHighlightingTiles();
        HighlightSquaddieReach(dynamicSquaddie, staticSquaddie, state.pathfinder, state.missionMap, state.hexMap, state.squaddieRepository);
    }

    private updateBattleSquaddieUISelectedSquaddieClickedOnMap(state: BattleOrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(this.selectedSquaddieDynamicId));

        const canPlayerControlSquaddieRightNow = CanPlayerControlSquaddieRightNow({staticSquaddie, dynamicSquaddie});
        if (!canPlayerControlSquaddieRightNow.playerCanControlThisSquaddieRightNow) {
            return;
        }

        const pathfinder: Pathfinder = new Pathfinder();
        const squaddieDatum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        const {actionPointsRemaining} = GetNumberOfActionPoints({staticSquaddie, dynamicSquaddie})
        const searchResults: SearchResults = getResultOrThrowError(
            pathfinder.findPathToStopLocation(new SearchParams({
                    setup: new SearchSetup({
                        startLocation: squaddieDatum.mapLocation,
                        missionMap: state.missionMap,
                        squaddieRepository: state.squaddieRepository,
                        affiliation: SquaddieAffiliation.PLAYER,
                    }),
                    movement: new SearchMovement({
                        movementPerAction: staticSquaddie.movement.movementPerAction,
                        passThroughWalls: staticSquaddie.movement.passThroughWalls,
                        crossOverPits: staticSquaddie.movement.crossOverPits,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                    }),
                    stopCondition: new SearchStopCondition({
                        stopLocation: clickedHexCoordinate,
                        numberOfActionPoints: actionPointsRemaining,
                    })
                })
            )
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

    private reactToPlayerSelectedAction(state: BattleOrchestratorState) {
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

        if (state.battleSquaddieSelectedHUD.getSelectedAction() instanceof SquaddieEndTurnAction) {
            state.squaddieCurrentlyActing.addConfirmedAction(new SquaddieEndTurnAction());

            state.hexMap.stopHighlightingTiles();
            this.gaveCompleteInstruction = true;

            state.battleEventRecording.addEvent(new BattleEvent({
                currentSquaddieInstruction: state.squaddieCurrentlyActing,
            }));
            this.gaveCompleteInstruction = true;
        } else if (state.battleSquaddieSelectedHUD.getSelectedAction() instanceof SquaddieAction) {
            const newAction = state.battleSquaddieSelectedHUD.getSelectedAction();
            state.squaddieCurrentlyActing.addSelectedAction(newAction as SquaddieAction);
            this.gaveInstructionThatNeedsATarget = true;
        }

        state.hexMap.stopHighlightingTiles();
    }
}
