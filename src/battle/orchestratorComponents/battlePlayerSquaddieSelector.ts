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
import {BattleSquaddieTeam, BattleSquaddieTeamHelper} from "../battleSquaddieTeam";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {SquaddieEndTurnAction} from "../history/squaddieEndTurnAction";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieAction} from "../../squaddie/action";
import {GetSquaddieAtMapLocation} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {AddMovementInstruction, createSearchPath, MaybeCreateSquaddieInstruction} from "./battleSquaddieSelectorUtils";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {CanPlayerControlSquaddieRightNow, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {SearchMovement, SearchParams, SearchSetup, SearchStopCondition} from "../../hexMap/pathfinder/searchParams";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {SquaddieInstructionInProgressHandler} from "../history/squaddieInstructionInProgress";
import {SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {RecordingHandler} from "../history/recording";
import {MissionMapSquaddieLocation, MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";

export class BattlePlayerSquaddieSelector implements BattleOrchestratorComponent {
    private gaveCompleteInstruction: boolean;
    private gaveInstructionThatNeedsATarget: boolean;
    private selectedBattleSquaddieId: string;

    constructor() {
        this.gaveCompleteInstruction = false;
        this.gaveInstructionThatNeedsATarget = false;
        this.selectedBattleSquaddieId = "";
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
            if (BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.squaddieRepository)) {
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
            if (BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.squaddieRepository)) {
                state.battleSquaddieSelectedHUD.keyPressed(event.keyCode, state);

                if (state.battleSquaddieSelectedHUD.selectedBattleSquaddieId != "") {
                    const squaddieInfo = state.missionMap.getSquaddieByBattleId(state.battleSquaddieSelectedHUD.selectedBattleSquaddieId);
                    if (MissionMapSquaddieLocationHandler.isValid(squaddieInfo) && state.missionMap.areCoordinatesOnMap(squaddieInfo.mapLocation)) {
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
            pauseTimer: false,
        });
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        const currentTeam: BattleSquaddieTeam = state.getCurrentTeam();
        if (
            BattleSquaddieTeamHelper.hasAnActingSquaddie(currentTeam, state.squaddieRepository)
            && !BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.squaddieRepository)
        ) {
            return;
        }
        if (this.selectedBattleSquaddieId === "" && SquaddieInstructionInProgressHandler.squaddieHasActedThisTurn(state.squaddieCurrentlyActing)) {
            this.selectedBattleSquaddieId = SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing);
        }
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = undefined;

        if (!this.playerCanControlAtLeastOneSquaddie(state)) {
            nextMode = BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR;
        } else if (this.gaveCompleteInstruction) {
            let newAction = SquaddieActionsForThisRoundHandler.getMostRecentAction(state.squaddieCurrentlyActing.squaddieActionsForThisRound);
            if (newAction.type === SquaddieActionType.MOVEMENT) {
                nextMode = BattleOrchestratorMode.SQUADDIE_MOVER;
            }
            if (newAction.type === SquaddieActionType.SQUADDIE) {
                nextMode = BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE;
            }
            if (newAction.type === SquaddieActionType.END_TURN) {
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
        this.selectedBattleSquaddieId = "";

        state.battleSquaddieSelectedHUD.reset();
    }

    private playerCanControlAtLeastOneSquaddie(state: BattleOrchestratorState): boolean {
        return BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(state.getCurrentTeam(), state.squaddieRepository);
    }

    private updateBattleSquaddieUIMouseClicked(state: BattleOrchestratorState, mouseX: number, mouseY: number) {
        const clickedTileCoordinates: [number, number] = convertScreenCoordinatesToMapCoordinates(mouseX, mouseY, ...state.camera.getCoordinates());
        const clickedHexCoordinate = {
            q: clickedTileCoordinates[0],
            r: clickedTileCoordinates[1]
        };

        if (
            !state.hexMap.areCoordinatesOnMap(clickedHexCoordinate)
        ) {
            state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }

        if (this.selectedBattleSquaddieId != "") {
            this.updateBattleSquaddieUISelectedSquaddie(state, clickedHexCoordinate, mouseX, mouseY);
        } else {
            this.updateBattleSquaddieUINoSquaddieSelected(state, clickedHexCoordinate, mouseX, mouseY);
        }
    }

    private updateBattleSquaddieUINoSquaddieSelected(state: BattleOrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = GetSquaddieAtMapLocation({
            mapLocation: clickedHexCoordinate,
            map: state.missionMap,
            squaddieRepository: state.squaddieRepository,
        });

        if (!squaddieTemplate) {
            state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }

        HighlightSquaddieReach(battleSquaddie, squaddieTemplate, state.pathfinder, state.missionMap, state.hexMap, state.squaddieRepository);
        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            battleId: battleSquaddie.battleSquaddieId,
            repositionWindow: {
                mouseX: mouseX,
                mouseY: mouseY
            },
            state,
        });
        this.selectedBattleSquaddieId = battleSquaddie.battleSquaddieId;
    }

    private updateBattleSquaddieUISelectedSquaddie(state: BattleOrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        const squaddieClickedOnInfoAndMapLocation = state.missionMap.getSquaddieAtLocation(clickedHexCoordinate);
        const foundSquaddieAtLocation = MissionMapSquaddieLocationHandler.isValid(squaddieClickedOnInfoAndMapLocation);

        if (foundSquaddieAtLocation) {
            this.updateBattleSquaddieUISelectedSquaddieClickedOnSquaddie(state, squaddieClickedOnInfoAndMapLocation, mouseX, mouseY);
        } else {
            this.updateBattleSquaddieUISelectedSquaddieClickedOnMap(state, clickedHexCoordinate, mouseX, mouseY);
        }
    }

    private updateBattleSquaddieUISelectedSquaddieClickedOnSquaddie(state: BattleOrchestratorState, squaddieClickedOnInfoAndMapLocation: MissionMapSquaddieLocation, mouseX: number, mouseY: number) {
        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            battleId: squaddieClickedOnInfoAndMapLocation.battleSquaddieId,
            repositionWindow: {
                mouseX: mouseX,
                mouseY: mouseY
            },
            state,
        });

        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const startOfANewSquaddieTurn = !state.squaddieCurrentlyActing || SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.squaddieCurrentlyActing);
        const battleSquaddieToHighlightId: string = startOfANewSquaddieTurn
            ? squaddieClickedOnInfoAndMapLocation.battleSquaddieId
            : SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing);

        if (startOfANewSquaddieTurn) {
            this.selectedBattleSquaddieId = squaddieClickedOnInfoAndMapLocation.battleSquaddieId;
        }
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(battleSquaddieToHighlightId));

        state.hexMap.stopHighlightingTiles();
        HighlightSquaddieReach(battleSquaddie, squaddieTemplate, state.pathfinder, state.missionMap, state.hexMap, state.squaddieRepository);
    }

    private updateBattleSquaddieUISelectedSquaddieClickedOnMap(state: BattleOrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(this.selectedBattleSquaddieId));

        const canPlayerControlSquaddieRightNow = CanPlayerControlSquaddieRightNow({squaddieTemplate, battleSquaddie});
        if (!canPlayerControlSquaddieRightNow.playerCanControlThisSquaddieRightNow) {
            return;
        }

        const pathfinder: Pathfinder = new Pathfinder();
        const squaddieDatum = state.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
        const searchResults: SearchResults = getResultOrThrowError(
            pathfinder.findPathToStopLocation(new SearchParams({
                    setup: new SearchSetup({
                        startLocation: squaddieDatum.mapLocation,
                        missionMap: state.missionMap,
                        squaddieRepository: state.squaddieRepository,
                        affiliation: SquaddieAffiliation.PLAYER,
                    }),
                    movement: new SearchMovement({
                        movementPerAction: squaddieTemplate.movement.movementPerAction,
                        passThroughWalls: squaddieTemplate.movement.passThroughWalls,
                        crossOverPits: squaddieTemplate.movement.crossOverPits,
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
            createSearchPath(state, squaddieTemplate, battleSquaddie, clickedHexCoordinate);
            AddMovementInstruction(state, squaddieTemplate, battleSquaddie, clickedHexCoordinate);
            this.gaveCompleteInstruction = true;
        }
    }

    private isHudInstructingTheCurrentlyActingSquaddie(state: BattleOrchestratorState): boolean {
        const startOfANewSquaddieTurn = !state.squaddieCurrentlyActing || SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.squaddieCurrentlyActing);
        const squaddieShownInHUD = state.battleSquaddieSelectedHUD.getSelectedBattleSquaddieId();

        if (
            !startOfANewSquaddieTurn
            && squaddieShownInHUD !== SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing)
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
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(state.battleSquaddieSelectedHUD.getSelectedBattleSquaddieId()));
        const datum = state.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        MaybeCreateSquaddieInstruction(state, battleSquaddie, squaddieTemplate);
        if (SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.squaddieCurrentlyActing)) {
            state.squaddieCurrentlyActing = {
                movingBattleSquaddieIds: [],
                squaddieActionsForThisRound: {
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    squaddieTemplateId: squaddieTemplate.templateId,
                    startingLocation: datum.mapLocation,
                    actions: [],
                },
                currentlySelectedAction: undefined,
            };
        }

        if (state.battleSquaddieSelectedHUD.getSelectedAction() instanceof SquaddieEndTurnAction) {
            SquaddieInstructionInProgressHandler.addConfirmedAction(state.squaddieCurrentlyActing, new SquaddieEndTurnAction({}));

            state.hexMap.stopHighlightingTiles();
            this.gaveCompleteInstruction = true;

            RecordingHandler.addEvent(state.battleEventRecording, {
                instruction: state.squaddieCurrentlyActing,
                results: undefined,
            });
            this.gaveCompleteInstruction = true;
        } else {
            const newAction = state.battleSquaddieSelectedHUD.getSelectedAction();
            SquaddieInstructionInProgressHandler.addSelectedAction(state.squaddieCurrentlyActing, newAction as SquaddieAction);
            this.gaveInstructionThatNeedsATarget = true;
        }

        state.hexMap.stopHighlightingTiles();
    }
}
