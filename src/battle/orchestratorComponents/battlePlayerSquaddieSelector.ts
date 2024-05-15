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
import {PlayerBattleActionBuilderStateService} from "../actionBuilder/playerBattleActionBuilderState";
import {MessageBoardMessageType} from "../../message/messageBoardMessage";

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
        const selectedActionRequiresATarget = this.gaveInstructionThatNeedsATarget;
        const cameraIsNotPanning = !state.battleOrchestratorState.battleState.camera.isPanning();
        return (gaveCompleteInstruction || selectedActionRequiresATarget) && cameraIsNotPanning;
    }

    mouseEventHappened(gameEngineState: GameEngineState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.mouseClicked(
                {mouseX: event.mouseX, mouseY: event.mouseY, mouseButton: event.mouseButton, gameEngineState}
            );
        }

        if (event.eventType === OrchestratorComponentMouseEventType.MOVED) {
            this.mouseMoved(gameEngineState, event.mouseX, event.mouseY);
        }
    }

    mouseClicked({
                     gameEngineState, mouseX, mouseY, mouseButton
                 }: {
        gameEngineState: GameEngineState,
        mouseX: number,
        mouseY: number,
        mouseButton: MouseButton
    }): void {
        const currentTeam: BattleSquaddieTeam = BattleStateService.getCurrentTeam(gameEngineState.battleOrchestratorState.battleState, gameEngineState.repository);
        if (!BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, gameEngineState.repository)) {
            return;
        }

        FileAccessHUDService.mouseClicked({
            fileAccessHUD: gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            mouseX,
            mouseY,
            mouseButton,
            fileState: gameEngineState.fileState,
        });

        if (gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.shouldDrawTheHUD()) {
            const playerClickOnHUD = gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.didMouseClickOnHUD(mouseX, mouseY);
            if (playerClickOnHUD) {
                gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.mouseClicked({
                    mouseX,
                    mouseY,
                    mouseButton,
                    gameEngineState
                });
            }

            this.maybeReactToPlayerSelectedAction(gameEngineState);

            if (playerClickOnHUD) {
                return;
            }
        }
        this.reactToClicking({gameEngineState, mouseX, mouseY, mouseButton});
        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.mouseClicked({
            mouseX,
            mouseY,
            mouseButton,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinatesAsObject()
        });
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
                        this.reactToClicking({
                            mouseButton: MouseButton.ACCEPT,
                            gameEngineState,
                            mouseX: squaddieScreenCoordinates[0],
                            mouseY: squaddieScreenCoordinates[1],
                        });
                        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.mouseClicked({
                            mouseX: squaddieScreenCoordinates[0],
                            mouseY: squaddieScreenCoordinates[1],
                            mouseButton: MouseButton.ACCEPT,
                            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinatesAsObject()
                        });
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

        if (
            this.gaveCompleteInstruction
            || this.gaveInstructionThatNeedsATarget
        ) {
            nextMode = BattleOrchestratorMode.PLAYER_HUD_CONTROLLER;
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
        if (!OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)) {
            return;
        }

        if (this.selectedBattleSquaddieId !== "") {
            return;
        }

        this.selectedBattleSquaddieId = gameEngineState.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId;
        this.highlightSquaddieOnMap(gameEngineState, this.selectedBattleSquaddieId);
        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState = PlayerBattleActionBuilderStateService.new({});
        gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            battleId: this.selectedBattleSquaddieId,
            state: gameEngineState,
        });
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

    private reactToClicking({mouseButton, gameEngineState, mouseX, mouseY}: {
        mouseButton: MouseButton,
        gameEngineState: GameEngineState,
        mouseX: number,
        mouseY: number
    }) {
        const {
            areCoordinatesOnMap,
            clickedHexCoordinate
        } = getMouseClickHexCoordinates(gameEngineState, mouseX, mouseY);
        if (
            !OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)
            && !areCoordinatesOnMap
        ) {
            gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.clearSelectedSquaddie();
            gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState = PlayerBattleActionBuilderStateService.new({});
            return;
        }

        if (
            !isValidValue(this.selectedBattleSquaddieId)
            || this.selectedBattleSquaddieId == ""
        ) {
            this.reactToClickingOnMapWhenNoSquaddieSelected(gameEngineState, clickedHexCoordinate, mouseX, mouseY);
        }
        this.reactToClickingOnMapWhenSquaddieAlreadySelected(gameEngineState, clickedHexCoordinate, mouseX, mouseY);
    }

    private reactToClickingOnMapWhenNoSquaddieSelected(gameEngineState: GameEngineState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = OrchestratorUtilities.getSquaddieAtMapLocation({
            mapLocation: clickedHexCoordinate,
            map: gameEngineState.battleOrchestratorState.battleState.missionMap,
            squaddieRepository: gameEngineState.repository,
        });

        if (!squaddieTemplate) {
            gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.clearSelectedSquaddie();
            return;
        }

        OrchestratorUtilities.highlightSquaddieRange(gameEngineState, battleSquaddie.battleSquaddieId);

        this.selectSquaddieAndOpenHUD(gameEngineState, battleSquaddie.battleSquaddieId, mouseX, mouseY);
        addActorActionForPlayableSquaddie({battleSquaddie, squaddieTemplate, gameEngineState});
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

    private reactToSelectingSquaddieThenSelectingSquaddie(gameEngineState: GameEngineState, squaddieClickedOnInfoAndMapLocation: MissionMapSquaddieLocation, mouseX: number, mouseY: number) {
        if (OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)) {
            this.reactToSelectingSquaddieThenSelectingSquaddieDuringTurn(gameEngineState, squaddieClickedOnInfoAndMapLocation, mouseX, mouseY)
            return
        }
        this.reactToSelectingSquaddieThenSelectingSquaddieNotDuringTurn(gameEngineState, squaddieClickedOnInfoAndMapLocation, mouseX, mouseY)
    }

    private reactToSelectingSquaddieThenSelectingSquaddieNotDuringTurn(gameEngineState: GameEngineState, squaddieClickedOnInfoAndMapLocation: MissionMapSquaddieLocation, mouseX: number, mouseY: number) {
        const battleSquaddieToHighlightId: string = squaddieClickedOnInfoAndMapLocation.battleSquaddieId;
        const differentSquaddieWasSelected: boolean = this.selectedBattleSquaddieId != battleSquaddieToHighlightId

        this.highlightSquaddieOnMap(gameEngineState, battleSquaddieToHighlightId);

        if (!differentSquaddieWasSelected) {
            return
        }

        this.selectSquaddieAndOpenHUD(gameEngineState, squaddieClickedOnInfoAndMapLocation.battleSquaddieId, mouseX, mouseY);

        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleSquaddieToHighlightId
        ));
        addActorActionForPlayableSquaddie({
            battleSquaddie,
            squaddieTemplate,
            gameEngineState: gameEngineState
        });
    }

    private reactToSelectingSquaddieThenSelectingSquaddieDuringTurn(gameEngineState: GameEngineState, squaddieClickedOnInfoAndMapLocation: MissionMapSquaddieLocation, mouseX: number, mouseY: number) {
        const battleSquaddieToHighlightId: string = gameEngineState.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId
        const differentSquaddieWasSelected: boolean = battleSquaddieToHighlightId !== squaddieClickedOnInfoAndMapLocation.battleSquaddieId

        if (
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)
            && differentSquaddieWasSelected
        ) {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN,
                gameEngineState
            })
        }
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
        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState = PlayerBattleActionBuilderStateService.new({});
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
        if (this.selectedBattleSquaddieId === "") {
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

    private moveSquaddieAndCompleteInstruction(gameEngineState: GameEngineState, battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate, clickedHexCoordinate: HexCoordinate) {
        if (!this.isMovementRoutePossible({
            gameEngineState: gameEngineState,
            battleSquaddie,
            squaddieTemplate,
            destination: clickedHexCoordinate,
        })) {
            return;
        }

        BattleSquaddieSelectorService.createSearchPath({
            state: gameEngineState,
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate
        });
        const {processedAction, destination} = this.createMovementProcessedAction({
            state: gameEngineState,
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate
        });
        SquaddieTurnService.spendActionPoints(battleSquaddie.squaddieTurn, processedAction.decidedAction.actionPointCost);
        ActionsThisRoundService.updateActionsThisRound({
            state: gameEngineState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startingLocation: MissionMapService.getByBattleSquaddieId(gameEngineState.battleOrchestratorState.battleState.missionMap, battleSquaddie.battleSquaddieId).mapLocation,
            processedAction,
        });

        PlayerBattleActionBuilderStateService.setActor({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        });
        PlayerBattleActionBuilderStateService.addAction({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            movement: true,
        });
        PlayerBattleActionBuilderStateService.setConsideredTarget({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            targetLocation: destination,
        });
        PlayerBattleActionBuilderStateService.setConfirmedTarget({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            targetLocation: destination,
        });
        gameEngineState.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(battleSquaddie.battleSquaddieId, destination);

        RecordingService.addEvent(gameEngineState.battleOrchestratorState.battleState.recording, BattleEventService.new({
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

    private playerSelectsAction = (gameEngineState: GameEngineState, battleSquaddie: BattleSquaddie, mapLocation: HexCoordinate) => {
        const newAction = gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.getSquaddieSquaddieAction();
        ActionsThisRoundService.updateActionsThisRound({
            state: gameEngineState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startingLocation: mapLocation,
            previewedActionTemplateId: newAction.id,
        });
        PlayerBattleActionBuilderStateService.setActor({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        });
        PlayerBattleActionBuilderStateService.addAction({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            actionTemplate: newAction,
        })
        this.selectedBattleSquaddieId = battleSquaddie.battleSquaddieId;
        this.gaveInstructionThatNeedsATarget = true;
    };

    private processEndTurnAction(gameEngineState: GameEngineState, battleSquaddie: BattleSquaddie, mapLocation: HexCoordinate) {
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
            state: gameEngineState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startingLocation: mapLocation,
            processedAction,
        });

        PlayerBattleActionBuilderStateService.setActor({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        });
        PlayerBattleActionBuilderStateService.addAction({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            endTurn: true
        });
        PlayerBattleActionBuilderStateService.setConfirmedTarget({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            targetLocation: mapLocation,
        });

        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        RecordingService.addEvent(gameEngineState.battleOrchestratorState.battleState.recording, BattleEventService.new({
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

const addActorActionForPlayableSquaddie = ({
                                               battleSquaddie,
                                               squaddieTemplate,
                                               gameEngineState,
                                           }: {
    battleSquaddie: BattleSquaddie,
    squaddieTemplate: SquaddieTemplate,
    gameEngineState: GameEngineState
}) => {
    const {
        playerCanControlThisSquaddieRightNow,
    } = SquaddieService.canPlayerControlSquaddieRightNow({battleSquaddie, squaddieTemplate});

    if (playerCanControlThisSquaddieRightNow) {
        PlayerBattleActionBuilderStateService.setActor({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        });
    }
}
