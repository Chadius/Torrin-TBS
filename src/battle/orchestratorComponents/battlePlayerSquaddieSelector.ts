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
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {SquaddieInstructionInProgressHandler} from "../history/squaddieInstructionInProgress";
import {SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {RecordingHandler} from "../history/recording";
import {MissionMapSquaddieLocation, MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
import {BattleStateHelper} from "../orchestrator/battleState";
import {GameEngineState} from "../../gameEngine/gameEngine";

export class BattlePlayerSquaddieSelector implements BattleOrchestratorComponent {
    private gaveCompleteInstruction: boolean;
    private gaveInstructionThatNeedsATarget: boolean;
    private selectedBattleSquaddieId: string;

    constructor() {
        this.gaveCompleteInstruction = false;
        this.gaveInstructionThatNeedsATarget = false;
        this.selectedBattleSquaddieId = "";
    }

    hasCompleted(state: GameEngineState): boolean {
        if (!this.playerCanControlAtLeastOneSquaddie(state.battleOrchestratorState)) {
            return true;
        }

        const gaveCompleteInstruction = this.gaveCompleteInstruction;
        const cameraIsNotPanning = !state.battleOrchestratorState.battleState.camera.isPanning();
        const selectedActionRequiresATarget = this.gaveInstructionThatNeedsATarget;
        return (gaveCompleteInstruction || selectedActionRequiresATarget) && cameraIsNotPanning;
    }

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            const currentTeam: BattleSquaddieTeam = BattleStateHelper.getCurrentTeam(state.battleOrchestratorState.battleState);
            if (BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.battleOrchestratorState.squaddieRepository)) {
                let hudUsedMouseClick: boolean = false;
                if (state.battleOrchestratorState.battleSquaddieSelectedHUD.shouldDrawTheHUD()) {
                    hudUsedMouseClick = state.battleOrchestratorState.battleSquaddieSelectedHUD.didMouseClickOnHUD(event.mouseX, event.mouseY);
                    if (hudUsedMouseClick) {
                        state.battleOrchestratorState.battleSquaddieSelectedHUD.mouseClicked(event.mouseX, event.mouseY, state);
                    }
                    if (state.battleOrchestratorState.battleSquaddieSelectedHUD.wasAnyActionSelected()) {
                        this.reactToPlayerSelectedAction(state.battleOrchestratorState);
                    }
                }
                if (hudUsedMouseClick) {
                    return;
                }

                this.updateBattleSquaddieUIMouseClicked(state.battleOrchestratorState, event.mouseX, event.mouseY);
                state.battleOrchestratorState.battleState.missionMap.terrainTileMap.mouseClicked(event.mouseX, event.mouseY, ...state.battleOrchestratorState.battleState.camera.getCoordinates());
            }
        }

        if (event.eventType === OrchestratorComponentMouseEventType.MOVED) {
            if (state.battleOrchestratorState.battleSquaddieSelectedHUD.shouldDrawTheHUD()) {
                state.battleOrchestratorState.battleSquaddieSelectedHUD.mouseMoved(event.mouseX, event.mouseY, state.battleOrchestratorState);
            }
        }
    }

    keyEventHappened(state: GameEngineState, event: OrchestratorComponentKeyEvent): void {
        if (event.eventType === OrchestratorComponentKeyEventType.PRESSED) {
            const currentTeam: BattleSquaddieTeam = BattleStateHelper.getCurrentTeam(state.battleOrchestratorState.battleState);
            if (BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.battleOrchestratorState.squaddieRepository)) {
                state.battleOrchestratorState.battleSquaddieSelectedHUD.keyPressed(event.keyCode, state.battleOrchestratorState);

                if (state.battleOrchestratorState.battleSquaddieSelectedHUD.selectedBattleSquaddieId != "") {
                    const squaddieInfo = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(state.battleOrchestratorState.battleSquaddieSelectedHUD.selectedBattleSquaddieId);
                    if (MissionMapSquaddieLocationHandler.isValid(squaddieInfo) && state.battleOrchestratorState.battleState.missionMap.areCoordinatesOnMap(squaddieInfo.mapLocation)) {
                        const squaddieScreenCoordinates = convertMapCoordinatesToScreenCoordinates(squaddieInfo.mapLocation.q, squaddieInfo.mapLocation.r, ...state.battleOrchestratorState.battleState.camera.getCoordinates());
                        this.updateBattleSquaddieUIMouseClicked(state.battleOrchestratorState, squaddieScreenCoordinates[0], squaddieScreenCoordinates[1]);
                        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.mouseClicked(squaddieScreenCoordinates[0], squaddieScreenCoordinates[1], ...state.battleOrchestratorState.battleState.camera.getCoordinates());
                        return;
                    }
                }
            }
        }
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: true,
            displayMap: true,
            pauseTimer: false,
        });
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
        const currentTeam: BattleSquaddieTeam = BattleStateHelper.getCurrentTeam(state.battleOrchestratorState.battleState);
        if (
            BattleSquaddieTeamHelper.hasAnActingSquaddie(currentTeam, state.battleOrchestratorState.squaddieRepository)
            && !BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.battleOrchestratorState.squaddieRepository)
        ) {
            return;
        }
        if (this.selectedBattleSquaddieId === "" && SquaddieInstructionInProgressHandler.squaddieHasActedThisTurn(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)) {
            this.selectedBattleSquaddieId = SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing);
        }
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = undefined;

        if (!this.playerCanControlAtLeastOneSquaddie(state.battleOrchestratorState)) {
            nextMode = BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR;
        } else if (this.gaveCompleteInstruction) {
            let newAction = SquaddieActionsForThisRoundHandler.getMostRecentAction(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound);
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

    reset(state: GameEngineState) {
        this.gaveCompleteInstruction = false;
        this.gaveInstructionThatNeedsATarget = false;
        this.selectedBattleSquaddieId = "";

        state.battleOrchestratorState.battleSquaddieSelectedHUD.reset();
    }

    private playerCanControlAtLeastOneSquaddie(state: BattleOrchestratorState): boolean {
        return BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(BattleStateHelper.getCurrentTeam(state.battleState), state.squaddieRepository);
    }

    private updateBattleSquaddieUIMouseClicked(state: BattleOrchestratorState, mouseX: number, mouseY: number) {
        const clickedTileCoordinates: [number, number] = convertScreenCoordinatesToMapCoordinates(mouseX, mouseY, ...state.battleState.camera.getCoordinates());
        const clickedHexCoordinate = {
            q: clickedTileCoordinates[0],
            r: clickedTileCoordinates[1]
        };

        if (
            !state.battleState.missionMap.terrainTileMap.areCoordinatesOnMap(clickedHexCoordinate)
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
            map: state.battleState.missionMap,
            squaddieRepository: state.squaddieRepository,
        });

        if (!squaddieTemplate) {
            state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }

        HighlightSquaddieReach(battleSquaddie, squaddieTemplate, state.battleState.missionMap, state.battleState.missionMap.terrainTileMap, state.squaddieRepository);
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
        const squaddieClickedOnInfoAndMapLocation = state.battleState.missionMap.getSquaddieAtLocation(clickedHexCoordinate);
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

        const startOfANewSquaddieTurn = !state.battleState.squaddieCurrentlyActing || SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.battleState.squaddieCurrentlyActing);
        const battleSquaddieToHighlightId: string = startOfANewSquaddieTurn
            ? squaddieClickedOnInfoAndMapLocation.battleSquaddieId
            : SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing);

        if (startOfANewSquaddieTurn) {
            this.selectedBattleSquaddieId = squaddieClickedOnInfoAndMapLocation.battleSquaddieId;
        }
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(battleSquaddieToHighlightId));

        state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        HighlightSquaddieReach(battleSquaddie, squaddieTemplate, state.battleState.missionMap, state.battleState.missionMap.terrainTileMap, state.squaddieRepository);
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

        const squaddieDatum = state.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
        const searchResults: SearchResults = getResultOrThrowError(
            Pathfinder.findPathToStopLocation(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: squaddieDatum.mapLocation,
                            affiliation: SquaddieAffiliation.PLAYER,
                        },
                        movement: {
                            movementPerAction: squaddieTemplate.attributes.movement.movementPerAction,
                            passThroughWalls: squaddieTemplate.attributes.movement.passThroughWalls,
                            crossOverPits: squaddieTemplate.attributes.movement.crossOverPits,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                        },
                        stopCondition: {
                            stopLocation: clickedHexCoordinate,
                            numberOfActions: actionPointsRemaining,
                        }
                    }
                ),
                state.battleState.missionMap,
                state.squaddieRepository,
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
        const startOfANewSquaddieTurn = !state.battleState.squaddieCurrentlyActing || SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.battleState.squaddieCurrentlyActing);
        const squaddieShownInHUD = state.battleSquaddieSelectedHUD.getSelectedBattleSquaddieId();

        if (
            !startOfANewSquaddieTurn
            && squaddieShownInHUD !== SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing)
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
        const datum = state.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        MaybeCreateSquaddieInstruction(state, battleSquaddie, squaddieTemplate);
        if (SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.battleState.squaddieCurrentlyActing)) {
            state.battleState.squaddieCurrentlyActing = {
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

        if (state.battleSquaddieSelectedHUD.getSelectedAction() instanceof SquaddieEndTurnAction) {
            SquaddieInstructionInProgressHandler.addConfirmedAction(state.battleState.squaddieCurrentlyActing, new SquaddieEndTurnAction({}));

            state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
            this.gaveCompleteInstruction = true;

            RecordingHandler.addEvent(state.battleState.recording, {
                instruction: state.battleState.squaddieCurrentlyActing,
                results: undefined,
            });
            this.gaveCompleteInstruction = true;
        } else {
            const newAction = state.battleSquaddieSelectedHUD.getSelectedAction();
            SquaddieInstructionInProgressHandler.addSelectedAction(state.battleState.squaddieCurrentlyActing, newAction as SquaddieAction);
            this.gaveInstructionThatNeedsATarget = true;
        }

        state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
    }
}
