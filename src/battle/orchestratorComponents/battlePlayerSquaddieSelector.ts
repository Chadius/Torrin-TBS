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
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetSquaddieAtMapLocation, OrchestratorUtilities} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {AddMovementInstruction, createSearchPath, MaybeCreateSquaddieInstruction} from "./battleSquaddieSelectorUtils";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {CanPlayerControlSquaddieRightNow, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {ActionEffect, ActionEffectType} from "../../decision/actionEffect";
import {CurrentlySelectedSquaddieDecisionService} from "../history/currentlySelectedSquaddieDecision";
import {SquaddieActionsForThisRoundService} from "../history/squaddieDecisionsDuringThisPhase";
import {RecordingService} from "../history/recording";
import {MissionMapSquaddieLocation, MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {MapHighlightHelper} from "../animation/mapHighlight";
import {DecisionService} from "../../decision/decision";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {DecisionActionEffectIteratorService} from "./decisionActionEffectIterator";
import {BattleSquaddieService} from "../battleSquaddie";
import {isValidValue} from "../../utils/validityCheck";

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
            const currentTeam: BattleSquaddieTeam = BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.battleOrchestratorState.squaddieRepository);
            if (BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.battleOrchestratorState.squaddieRepository)) {
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
            const currentTeam: BattleSquaddieTeam = BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.battleOrchestratorState.squaddieRepository);
            if (BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.battleOrchestratorState.squaddieRepository)) {
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
        const currentTeam: BattleSquaddieTeam = BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.battleOrchestratorState.squaddieRepository);
        if (
            BattleSquaddieTeamService.hasAnActingSquaddie(currentTeam, state.battleOrchestratorState.squaddieRepository)
            && !BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.battleOrchestratorState.squaddieRepository)
        ) {
            return;
        }
        if (this.selectedBattleSquaddieId === "" && CurrentlySelectedSquaddieDecisionService.squaddieHasActedThisTurn(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)) {
            this.selectedBattleSquaddieId = CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing);
        }
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = undefined;

        if (this.gaveCompleteInstruction) {
            let newAction: ActionEffect = DecisionActionEffectIteratorService.peekActionEffect(state.battleOrchestratorState.decisionActionEffectIterator);
            if (isValidValue(newAction)) {
                const typeToMode: { [t in ActionEffectType]: BattleOrchestratorMode } = {
                    [ActionEffectType.MOVEMENT]: BattleOrchestratorMode.SQUADDIE_MOVER,
                    [ActionEffectType.SQUADDIE]: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE,
                    [ActionEffectType.END_TURN]: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
                };
                nextMode = typeToMode[newAction.type];
            }
        } else if (this.gaveInstructionThatNeedsATarget) {
            nextMode = BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET;
        } else if (!this.playerCanControlAtLeastOneSquaddie(state.battleOrchestratorState)) {
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

        state.battleOrchestratorState.battleSquaddieSelectedHUD.reset();
    }

    private playerCanControlAtLeastOneSquaddie(state: BattleOrchestratorState): boolean {
        const currentTeam = BattleStateService.getCurrentTeam(state.battleState, state.squaddieRepository);
        if (!isValidValue(currentTeam)) {
            return false;
        }
        return BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.squaddieRepository);
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

        const squaddieReachHighlightedOnMap = MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
            repository: state.squaddieRepository,
            missionMap: state.battleState.missionMap,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startLocation: clickedHexCoordinate,
        })
        state.battleState.missionMap.terrainTileMap.highlightTiles(squaddieReachHighlightedOnMap);
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

        const startOfANewSquaddieTurn = !OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state);
        const battleSquaddieToHighlightId: string = startOfANewSquaddieTurn
            ? squaddieClickedOnInfoAndMapLocation.battleSquaddieId
            : CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleState.squaddieCurrentlyActing);

        const {mapLocation: startLocation} = state.battleState.missionMap.getSquaddieByBattleId(battleSquaddieToHighlightId)

        if (startOfANewSquaddieTurn) {
            this.selectedBattleSquaddieId = squaddieClickedOnInfoAndMapLocation.battleSquaddieId;
        }
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, battleSquaddieToHighlightId));

        state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        const squaddieReachHighlightedOnMap = MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
            repository: state.squaddieRepository,
            missionMap: state.battleState.missionMap,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startLocation: startLocation,
        })
        state.battleState.missionMap.terrainTileMap.highlightTiles(squaddieReachHighlightedOnMap);
    }

    private updateBattleSquaddieUISelectedSquaddieClickedOnMap(state: BattleOrchestratorState, clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, this.selectedBattleSquaddieId));

        const canPlayerControlSquaddieRightNow = CanPlayerControlSquaddieRightNow({squaddieTemplate, battleSquaddie});
        if (!canPlayerControlSquaddieRightNow.playerCanControlThisSquaddieRightNow) {
            return;
        }

        const squaddieDatum = state.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
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
                stopLocations: [clickedHexCoordinate],
                numberOfActions: actionPointsRemaining,
            }),
            missionMap: state.battleState.missionMap,
            repository: state.squaddieRepository,
        });

        const closestRoute: SearchPath = SearchResultsHelper.getShortestPathToLocation(searchResults, clickedHexCoordinate.q, clickedHexCoordinate.r);
        if (closestRoute != null) {
            createSearchPath(state, squaddieTemplate, battleSquaddie, clickedHexCoordinate);
            const actionEffectMovement = AddMovementInstruction(state, squaddieTemplate, battleSquaddie, clickedHexCoordinate);
            OrchestratorUtilities.updateSquaddieBasedOnActionEffect({
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                missionMap: state.battleState.missionMap,
                repository: state.squaddieRepository,
                actionEffect: actionEffectMovement
            });

            if (state.decisionActionEffectIterator === undefined) {
                state.decisionActionEffectIterator = DecisionActionEffectIteratorService.new({
                    decision: DecisionService.new({
                        actionEffects: [actionEffectMovement],
                    })
                });
            }

            this.gaveCompleteInstruction = true;
        }
    }

    private isHudInstructingTheCurrentlyActingSquaddie(state: BattleOrchestratorState): boolean {
        const startOfANewSquaddieTurn = OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)
        const squaddieShownInHUD = state.battleSquaddieSelectedHUD.getSelectedBattleSquaddieId();

        return startOfANewSquaddieTurn
            || squaddieShownInHUD !== CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleState.squaddieCurrentlyActing);
    }

    private reactToPlayerSelectedAction(state: BattleOrchestratorState) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return;
        }

        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, state.battleSquaddieSelectedHUD.getSelectedBattleSquaddieId()));
        const datum = state.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        MaybeCreateSquaddieInstruction(state, battleSquaddie, squaddieTemplate);
        if (!OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)) {
            state.battleState.squaddieCurrentlyActing = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
                    startingLocation: datum.mapLocation,
                }),
            });
        }

        if (state.battleSquaddieSelectedHUD.didPlayerSelectEndTurnAction()) {
            const endTurnDecision = DecisionService.new({
                actionEffects: [
                    ActionEffectEndTurnService.new()
                ]
            });

            CurrentlySelectedSquaddieDecisionService.addConfirmedDecision(state.battleState.squaddieCurrentlyActing, endTurnDecision);

            if (state.decisionActionEffectIterator === undefined) {
                state.decisionActionEffectIterator = DecisionActionEffectIteratorService.new({
                    decision: endTurnDecision
                });
            }

            state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
            RecordingService.addEvent(state.battleState.recording, {
                instruction: state.battleState.squaddieCurrentlyActing,
                results: undefined,
            });
            BattleSquaddieService.endTurn(battleSquaddie);
            this.gaveCompleteInstruction = true;
        } else if (state.battleSquaddieSelectedHUD.didPlayerSelectSquaddieAction()) {
            const newAction = state.battleSquaddieSelectedHUD.getSquaddieSquaddieAction();
            CurrentlySelectedSquaddieDecisionService.selectCurrentDecision(
                state.battleState.squaddieCurrentlyActing,
                DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            template: newAction,
                            targetLocation: undefined,
                            numberOfActionPointsSpent: newAction.actionPointCost,
                        })
                    ]
                })
            );
            this.gaveInstructionThatNeedsATarget = true;
        }

        state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
    }
}
