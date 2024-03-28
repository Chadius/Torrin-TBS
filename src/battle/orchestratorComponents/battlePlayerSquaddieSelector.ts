import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertScreenCoordinatesToMapCoordinates
} from "../../hexMap/convertCoordinates";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {BattleSquaddieSelectorService} from "./battleSquaddieSelectorUtils";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {SquaddieService} from "../../squaddie/squaddieService";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {MissionMapSquaddieLocation, MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {SearchResult, SearchResultsService} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {MapHighlightHelper} from "../animation/mapHighlight";
import {BattleSquaddie, BattleSquaddieService} from "../battleSquaddie";
import {isValidValue} from "../../utils/validityCheck";
import {ActionsThisRoundService} from "../history/actionsThisRound";
import {ProcessedAction, ProcessedActionService} from "../../action/processed/processedAction";
import {DecidedActionService} from "../../action/decided/decidedAction";
import {DecidedActionEndTurnEffectService} from "../../action/decided/decidedActionEndTurnEffect";
import {ActionEffectEndTurnTemplateService} from "../../action/template/actionEffectEndTurnTemplate";
import {ActionEffectType} from "../../action/template/actionEffectTemplate";
import {ProcessedActionEndTurnEffectService} from "../../action/processed/processedActionEndTurnEffect";
import {RecordingService} from "../history/recording";
import {BattleEventService} from "../history/battleEvent";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {MissionMapService} from "../../missionMap/missionMap";
import {LocationTraveled} from "../../hexMap/pathfinder/locationTraveled";
import {SquaddieTurnService} from "../../squaddie/turn";
import {DecidedActionMovementEffectService} from "../../action/decided/decidedActionMovementEffect";
import {ProcessedActionMovementEffectService} from "../../action/processed/processedActionMovementEffect";
import {KeyButtonName, KeyWasPressed} from "../../utils/keyboardConfig";
import {BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {FileAccessHUDService} from "../hud/fileAccessHUD";
import {MouseButton} from "../../utils/mouseConfig";

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
        if (!this.playerCanControlAtLeastOneSquaddie(state)) {
            return true;
        }

        const gaveCompleteInstruction = this.gaveCompleteInstruction;
        const cameraIsNotPanning = !state.battleOrchestratorState.battleState.camera.isPanning();
        const selectedActionRequiresATarget = this.gaveInstructionThatNeedsATarget;
        return (gaveCompleteInstruction || selectedActionRequiresATarget) && cameraIsNotPanning;
    }

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.mouseClicked(state, event.mouseX, event.mouseY);
        }

        if (event.eventType === OrchestratorComponentMouseEventType.MOVED) {
            this.mouseMoved(state, event.mouseX, event.mouseY);
        }
    }

    mouseClicked(state: GameEngineState, mouseX: number, mouseY: number): void {
        const currentTeam: BattleSquaddieTeam = BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.repository);
        if (!BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.repository)) {
            return;
        }

        FileAccessHUDService.mouseClicked({
            fileAccessHUD: state.battleOrchestratorState.battleHUD.fileAccessHUD,
            mouseX,
            mouseY,
            mouseButton: MouseButton.LEFT,
            fileState: state.fileState,
        });

        if (state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.shouldDrawTheHUD()) {
            const playerClickOnHUD = state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.didMouseClickOnHUD(mouseX, mouseY);
            if (playerClickOnHUD) {
                state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.mouseClicked(mouseX, mouseY, state);
            }

            this.maybeReactToPlayerSelectedAction(state);

            if (playerClickOnHUD) {
                return;
            }
        }

        this.reactToClicking(state, mouseX, mouseY);
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.mouseClicked(mouseX, mouseY, ...state.battleOrchestratorState.battleState.camera.getCoordinates());
    }

    mouseMoved(state: GameEngineState, mouseX: number, mouseY: number): void {
        FileAccessHUDService.mouseMoved({
            fileAccessHUD: state.battleOrchestratorState.battleHUD.fileAccessHUD,
            mouseX,
            mouseY,
        });

        if (!state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.shouldDrawTheHUD()) {
            return;
        }

        state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.mouseMoved(mouseX, mouseY, state.battleOrchestratorState);
    }

    keyEventHappened(gameEngineState: GameEngineState, event: OrchestratorComponentKeyEvent): void {
        if (event.eventType === OrchestratorComponentKeyEventType.PRESSED) {
            const currentTeam: BattleSquaddieTeam = BattleStateService.getCurrentTeam(gameEngineState.battleOrchestratorState.battleState, gameEngineState.repository);
            if (BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, gameEngineState.repository)) {
                if (this.canSwapHUD(gameEngineState, event.keyCode)) {
                    BattleOrchestratorStateService.swapHUD({battleOrchestratorState: gameEngineState.battleOrchestratorState});
                }

                gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.keyPressed(event.keyCode, gameEngineState);

                if (gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.selectedBattleSquaddieId != "") {
                    const squaddieInfo = gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.selectedBattleSquaddieId);
                    if (MissionMapSquaddieLocationHandler.isValid(squaddieInfo) && gameEngineState.battleOrchestratorState.battleState.missionMap.areCoordinatesOnMap(squaddieInfo.mapLocation)) {
                        const squaddieScreenCoordinates = convertMapCoordinatesToScreenCoordinates(squaddieInfo.mapLocation.q, squaddieInfo.mapLocation.r, ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates());
                        this.reactToClicking(gameEngineState, squaddieScreenCoordinates[0], squaddieScreenCoordinates[1]);
                        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.mouseClicked(squaddieScreenCoordinates[0], squaddieScreenCoordinates[1], ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates());
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

    update(gameEngineState: GameEngineState, graphicsContext: GraphicsContext): void {
        if (!this.playerCanControlAnySquaddiesOnTheCurrentTeam(gameEngineState)) {
            return;
        }

        this.openHUDIfSquaddieWasSelected(gameEngineState);
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = undefined;

        if (this.gaveCompleteInstruction) {
            switch (ActionsThisRoundService.getProcessedActionEffectToShow(state.battleOrchestratorState.battleState.actionsThisRound).type) {
                case ActionEffectType.MOVEMENT:
                    nextMode = BattleOrchestratorMode.SQUADDIE_MOVER;
                    break;
                case ActionEffectType.END_TURN:
                    nextMode = BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP;
                    break;
            }
        } else if (this.gaveInstructionThatNeedsATarget) {
            nextMode = BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET;
        } else if (!this.playerCanControlAtLeastOneSquaddie(state)) {
            nextMode = BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR;
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

        state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.reset();
    }

    private canSwapHUD(gameEngineState: GameEngineState, keyCode: number): boolean {
        return KeyWasPressed(KeyButtonName.SWAP_HUD, keyCode)
            && !OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)
    }

    private playerCanControlAnySquaddiesOnTheCurrentTeam(gameEngineState: GameEngineState): boolean {
        const currentTeam: BattleSquaddieTeam = BattleStateService.getCurrentTeam(gameEngineState.battleOrchestratorState.battleState, gameEngineState.repository);
        return BattleSquaddieTeamService.hasAnActingSquaddie(currentTeam, gameEngineState.repository)
            && BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, gameEngineState.repository);
    }

    private openHUDIfSquaddieWasSelected(gameEngineState: GameEngineState) {
        if (
            this.selectedBattleSquaddieId === ""
            && OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)
        ) {
            this.selectedBattleSquaddieId = gameEngineState.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId;
            gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
                battleId: this.selectedBattleSquaddieId,
                state: gameEngineState,
            });
        }
    }

    private maybeReactToPlayerSelectedAction(state: GameEngineState) {
        if (
            state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.didPlayerSelectSquaddieAction()
            || state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.didPlayerSelectEndTurnAction()
        ) {
            this.reactToPlayerSelectedAction(state);
        }
    }

    private playerCanControlAtLeastOneSquaddie(state: GameEngineState): boolean {
        const currentTeam = BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.repository);
        if (!isValidValue(currentTeam)) {
            return false;
        }
        return BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.repository);
    }

    private reactToClicking(state: GameEngineState, mouseX: number, mouseY: number) {
        const {areCoordinatesOnMap, clickedHexCoordinate} = getMouseClickHexCoordinates(state, mouseX, mouseY);
        if (
            !OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)
            && !areCoordinatesOnMap
        ) {
            state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.clearSelectedSquaddie();
            return;
        }

        if (
            !isValidValue(this.selectedBattleSquaddieId)
            || this.selectedBattleSquaddieId == ""
        ) {
            this.reactToClickingOnMapWhenNoSquaddieSelected(state, clickedHexCoordinate, mouseX, mouseY);
        }
        this.reactToClickingOnMapWhenSquaddieAlreadySelected(state, clickedHexCoordinate, mouseX, mouseY);
    }

    private reactToClickingOnMapWhenNoSquaddieSelected(state: GameEngineState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = OrchestratorUtilities.getSquaddieAtMapLocation({
            mapLocation: clickedHexCoordinate,
            map: state.battleOrchestratorState.battleState.missionMap,
            squaddieRepository: state.repository,
        });

        if (!squaddieTemplate) {
            state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.clearSelectedSquaddie();
            return;
        }

        OrchestratorUtilities.highlightSquaddieRange(state, battleSquaddie.battleSquaddieId);

        this.selectSquaddieAndOpenHUD(state, battleSquaddie.battleSquaddieId, mouseX, mouseY);
    }

    private reactToClickingOnMapWhenSquaddieAlreadySelected(state: GameEngineState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const squaddieClickedOnInfoAndMapLocation = state.battleOrchestratorState.battleState.missionMap.getSquaddieAtLocation(clickedHexCoordinate);
        const foundSquaddieAtLocation = MissionMapSquaddieLocationHandler.isValid(squaddieClickedOnInfoAndMapLocation);
        if (foundSquaddieAtLocation) {
            this.reactToSelectingSquaddieThenSelectingSquaddie(state, squaddieClickedOnInfoAndMapLocation, mouseX, mouseY);
            return;
        }

        this.reactToSelectingSquaddieThenSelectingMap(state, clickedHexCoordinate, mouseX, mouseY);
    }

    private reactToSelectingSquaddieThenSelectingSquaddie(state: GameEngineState, squaddieClickedOnInfoAndMapLocation: MissionMapSquaddieLocation, mouseX: number, mouseY: number) {
        const battleSquaddieToHighlightId: string = OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)
            ? state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId
            : squaddieClickedOnInfoAndMapLocation.battleSquaddieId;

        if (
            !OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)
            && this.selectedBattleSquaddieId != battleSquaddieToHighlightId
        ) {
            this.selectSquaddieAndOpenHUD(state, squaddieClickedOnInfoAndMapLocation.battleSquaddieId, mouseX, mouseY);
        }

        this.highlightSquaddieOnMap(state, battleSquaddieToHighlightId);
    }

    private highlightSquaddieOnMap = (state: GameEngineState, battleSquaddieToHighlightId: string) => {
        const {mapLocation: startLocation} = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(battleSquaddieToHighlightId)
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        const squaddieReachHighlightedOnMap = MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
            repository: state.repository,
            missionMap: state.battleOrchestratorState.battleState.missionMap,
            battleSquaddieId: battleSquaddieToHighlightId,
            startLocation: startLocation,
            campaignResources: state.campaign.resources,
        })
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.highlightTiles(squaddieReachHighlightedOnMap);
    };

    private selectSquaddieAndOpenHUD = (gameEngineState: GameEngineState, battleSquaddieId: string, mouseX: number, mouseY: number) => {
        gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            battleId: battleSquaddieId,
            repositionWindow: {
                mouseX: mouseX,
                mouseY: mouseY
            },
            state: gameEngineState,
        });
        this.selectedBattleSquaddieId = battleSquaddieId;
    }

    private reactToSelectingSquaddieThenSelectingMap(state: GameEngineState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, this.selectedBattleSquaddieId));

        const canPlayerControlSquaddieRightNow = SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie
        });
        if (!canPlayerControlSquaddieRightNow.playerCanControlThisSquaddieRightNow) {
            return;
        }
        this.moveSquaddieAndCompleteInstruction(state, battleSquaddie, squaddieTemplate, clickedHexCoordinate);
    }

    private moveSquaddieAndCompleteInstruction(state: GameEngineState, battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate, clickedHexCoordinate: HexCoordinate) {
        if (!this.isMovementRoutePossible({
            gameEngineState: state,
            battleSquaddie,
            squaddieTemplate,
            destination: clickedHexCoordinate,
        })) {
            return;
        }

        BattleSquaddieSelectorService.createSearchPath({
            state,
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate
        });
        const {processedAction, destination} = this.createMovementProcessedAction({
            state,
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate
        });
        SquaddieTurnService.spendActionPoints(battleSquaddie.squaddieTurn, processedAction.decidedAction.actionPointCost);
        ActionsThisRoundService.updateActionsThisRound({
            state,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startingLocation: MissionMapService.getByBattleSquaddieId(state.battleOrchestratorState.battleState.missionMap, battleSquaddie.battleSquaddieId).mapLocation,
            processedAction,
        });
        state.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(battleSquaddie.battleSquaddieId, destination);

        RecordingService.addEvent(state.battleOrchestratorState.battleState.recording, BattleEventService.new({
            processedAction,
            results: undefined,
        }));
        this.selectedBattleSquaddieId = battleSquaddie.battleSquaddieId;
        this.gaveCompleteInstruction = true;
    }

    private isMovementRoutePossible(
        {
            gameEngineState,
            battleSquaddie,
            squaddieTemplate,
            destination,
        }: {
            gameEngineState: GameEngineState,
            battleSquaddie: BattleSquaddie,
            squaddieTemplate: SquaddieTemplate,
            destination: HexCoordinate
        }
    ): boolean {
        const squaddieDatum = gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        const {actionPointsRemaining} = SquaddieService.getNumberOfActionPoints({squaddieTemplate, battleSquaddie})
        const searchResults: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [squaddieDatum.mapLocation],
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                movementPerAction: squaddieTemplate.attributes.movement.movementPerAction,
                canPassThroughWalls: squaddieTemplate.attributes.movement.passThroughWalls,
                canPassOverPits: squaddieTemplate.attributes.movement.crossOverPits,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                maximumDistanceMoved: undefined,
                minimumDistanceMoved: undefined,
                canStopOnSquaddies: true,
                ignoreTerrainCost: false,
                stopLocations: [destination],
                numberOfActions: actionPointsRemaining,
            }),
            missionMap: gameEngineState.battleOrchestratorState.battleState.missionMap,
            repository: gameEngineState.repository,
        });

        const closestRoute: SearchPath = SearchResultsService.getShortestPathToLocation(searchResults, destination.q, destination.r);
        return isValidValue(closestRoute);
    }

    private isHudInstructingTheCurrentlyActingSquaddie(state: GameEngineState): boolean {
        const startOfANewSquaddieTurn = !OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)
        const squaddieShownInHUD = state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.getSelectedBattleSquaddieId();

        return startOfANewSquaddieTurn
            || squaddieShownInHUD === state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId;
    }

    private reactToPlayerSelectedAction(state: GameEngineState) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const {
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.getSelectedBattleSquaddieId()));

        const {mapLocation} = MissionMapService.getByBattleSquaddieId(
            state.battleOrchestratorState.battleState.missionMap,
            battleSquaddie.battleSquaddieId,
        );

        if (state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.didPlayerSelectEndTurnAction()) {
            this.processEndTurnAction(state, battleSquaddie, mapLocation);
        } else if (state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.didPlayerSelectSquaddieAction()) {
            this.playerSelectsAction(state, battleSquaddie, mapLocation);
        }

        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
    }

    private playerSelectsAction(state: GameEngineState, battleSquaddie: BattleSquaddie, mapLocation: HexCoordinate) {
        const newAction = state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.getSquaddieSquaddieAction();
        ActionsThisRoundService.updateActionsThisRound({
            state,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startingLocation: mapLocation,
            previewedActionTemplateId: newAction.id,
        });
        this.selectedBattleSquaddieId = battleSquaddie.battleSquaddieId;
        this.gaveInstructionThatNeedsATarget = true;
    }

    private processEndTurnAction(state: GameEngineState, battleSquaddie: BattleSquaddie, mapLocation: HexCoordinate) {
        const decidedActionEndTurnEffect = DecidedActionEndTurnEffectService.new({
            template: ActionEffectEndTurnTemplateService.new({})
        });
        const processedAction = ProcessedActionService.new({
            decidedAction: DecidedActionService.new({
                actionTemplateName: "End Turn",
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                actionEffects: [
                    decidedActionEndTurnEffect
                ]
            }),
            processedActionEffects: [
                ProcessedActionEndTurnEffectService.new({
                    decidedActionEffect: decidedActionEndTurnEffect,
                })
            ]
        });

        ActionsThisRoundService.updateActionsThisRound({
            state,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startingLocation: mapLocation,
            processedAction,
        });

        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        RecordingService.addEvent(state.battleOrchestratorState.battleState.recording, BattleEventService.new({
            processedAction,
            results: undefined,
        }));
        BattleSquaddieService.endTurn(battleSquaddie);
        this.selectedBattleSquaddieId = battleSquaddie.battleSquaddieId;
        this.gaveCompleteInstruction = true;
    }

    private createMovementProcessedAction({
                                              state,
                                              battleSquaddie,
                                              squaddieTemplate,
                                              clickedHexCoordinate,
                                          }: {
        state: GameEngineState,
        battleSquaddie: BattleSquaddie,
        squaddieTemplate: SquaddieTemplate,
        clickedHexCoordinate: HexCoordinate
    }): {
        processedAction: ProcessedAction,
        destination: HexCoordinate,
    } {
        const locationsByMoveActions: {
            [movementActions: number]: LocationTraveled[]
        } = SquaddieService.searchPathLocationsByNumberOfMovementActions({
            searchPath: state.battleOrchestratorState.battleState.squaddieMovePath,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            repository: state.repository,
        });
        const numberOfActionPointsSpentMoving: number = Math.max(...Object.keys(locationsByMoveActions).map(str => Number(str))) || 1;

        const decidedActionMovementEffect = DecidedActionMovementEffectService.new({
            template: undefined,
            destination: clickedHexCoordinate,
        });

        return {
            processedAction: ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    actionTemplateName: "Move",
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    actionPointCost: numberOfActionPointsSpentMoving,
                    actionEffects: [decidedActionMovementEffect],
                }),
                processedActionEffects: [
                    ProcessedActionMovementEffectService.new({
                        decidedActionEffect: decidedActionMovementEffect,
                    })
                ]
            }),
            destination: decidedActionMovementEffect.destination,
        }
    }
}

const getMouseClickHexCoordinates = (gameEngineState: GameEngineState, mouseX: number, mouseY: number) => {
    const clickedTileCoordinates: [number, number] = convertScreenCoordinatesToMapCoordinates(
        mouseX,
        mouseY,
        ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
    );
    const clickedHexCoordinate = {
        q: clickedTileCoordinates[0],
        r: clickedTileCoordinates[1]
    };

    return {
        areCoordinatesOnMap: gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.areCoordinatesOnMap(clickedHexCoordinate),
        clickedHexCoordinate,
    }
}
