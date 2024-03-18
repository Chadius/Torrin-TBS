import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {MissionMap} from "../../missionMap/missionMap";
import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleSquaddieSelectedHUD, FILE_MESSAGE_DISPLAY_DURATION} from "./battleSquaddieSelectedHUD";
import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {MakeDecisionButton} from "../../squaddie/makeDecisionButton";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {RectArea, RectAreaService} from "../../ui/rectArea";
import {getResultOrThrowError, makeResult} from "../../utils/ResultOrError";
import {CreateNewSquaddieAndAddToRepository, SquaddieAndObjectRepositoryService} from "../../utils/test/squaddie";
import {BattleCamera} from "../battleCamera";
import {convertMapCoordinatesToWorldCoordinates} from "../../hexMap/convertCoordinates";
import {BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {KeyButtonName} from "../../utils/keyboardConfig";
import {config} from "../../configuration/config";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {ButtonStatus} from "../../ui/button";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {SquaddieTurnService} from "../../squaddie/turn";
import {isValidValue} from "../../utils/validityCheck";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {BattlePhaseStateService} from "../orchestratorComponents/battlePhaseController";
import {LoadSaveState} from "../../dataLoader/loadSaveState";
import {ActionTemplate, ActionTemplateService} from "../../action/template/actionTemplate";
import {ActionEffectSquaddieTemplateService} from "../../action/template/actionEffectSquaddieTemplate";
import {ActionsThisRoundService} from "../history/actionsThisRound";
import {ProcessedActionService} from "../../action/processed/processedAction";
import {CampaignService} from "../../campaign/campaign";
import {ProcessedActionMovementEffectService} from "../../action/processed/processedActionMovementEffect";
import {DecidedActionMovementEffectService} from "../../action/decided/decidedActionMovementEffect";
import {ActionEffectMovementTemplateService} from "../../action/template/actionEffectMovementTemplate";
import {SaveSaveStateService} from "../../dataLoader/saveSaveState";

describe('BattleSquaddieSelectedHUD', () => {
    let hud: BattleSquaddieSelectedHUD;
    let squaddieRepository: ObjectRepository;
    let missionMap: MissionMap;
    let resourceHandler: ResourceHandler;
    let playerSquaddieDynamicID: string = "player_squaddie_0";
    let playerSquaddieStatic: SquaddieTemplate;
    let playerBattleSquaddie: BattleSquaddie;
    let enemySquaddieDynamicID: string = "enemy_squaddie_0";
    let enemySquaddieStatic: SquaddieTemplate;
    let enemySquaddieDynamic: BattleSquaddie;
    let player2SquaddieDynamicId: string = "player_squaddie_2";
    let player2SquaddieStatic: SquaddieTemplate;
    let player2SquaddieDynamic: BattleSquaddie;
    let longswordAction: ActionTemplate;
    let warnUserNotEnoughActionPointsToPerformActionSpy: jest.SpyInstance;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        })

        squaddieRepository = ObjectRepositoryService.new();

        resourceHandler = mocks.mockResourceHandler();
        resourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
        resourceHandler.getResource = jest.fn().mockReturnValue(makeResult({width: 1, height: 1}));

        longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                    minimumRange: 0,
                    maximumRange: 1,
                    targetingShape: TargetingShape.SNAKE,
                })
            ]
        });

        ({
                squaddieTemplate: playerSquaddieStatic,
                battleSquaddie: playerBattleSquaddie,
            } =
                CreateNewSquaddieAndAddToRepository({
                    templateId: "player_soldier",
                    name: "Player Soldier",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleId: playerSquaddieDynamicID,
                    squaddieRepository,
                    actionTemplates: [longswordAction],
                })
        );

        ({
                squaddieTemplate: player2SquaddieStatic,
                battleSquaddie: player2SquaddieDynamic,
            } =
                CreateNewSquaddieAndAddToRepository({
                    templateId: "player_soldier2",
                    name: "Player Soldier 2",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleId: player2SquaddieDynamicId,
                    squaddieRepository,
                    actionTemplates: [longswordAction],
                })
        );

        ({
                squaddieTemplate: enemySquaddieStatic,
                battleSquaddie: enemySquaddieDynamic,
            } =
                CreateNewSquaddieAndAddToRepository({
                    templateId: "enemy_soldier",
                    name: "Enemy Soldier",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleId: enemySquaddieDynamicID,
                    squaddieRepository,
                    actionTemplates: [longswordAction],
                })
        );

        hud = new BattleSquaddieSelectedHUD();
        warnUserNotEnoughActionPointsToPerformActionSpy = jest.spyOn((hud as any), "warnUserNotEnoughActionPointsToPerformAction").mockReturnValue(null);

        mockedP5GraphicsContext = new MockedP5GraphicsContext();
    });

    it('reports when an action button is clicked', () => {
        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera: new BattleCamera(0, 0),
                }),
            }),
            campaign: CampaignService.default({}),
            repository: squaddieRepository,
        });
        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedActionTemplate()).toBeUndefined();

        const longswordButton = hud.getUseActionButtons().find((button) =>
            button.actionTemplate.id === longswordAction.id
        );
        hud.mouseClicked(longswordButton.buttonArea.left, longswordButton.buttonArea.top, state);

        expect(hud.didPlayerSelectSquaddieAction()).toBeTruthy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedActionTemplate()).toBe(longswordAction);

        hud.reset();
        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedActionTemplate()).toBeUndefined();
    });

    it('reports when an action button is hovered', () => {
        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera: new BattleCamera(0, 0),
                }),
            }),
            campaign: CampaignService.default({}),
            repository: squaddieRepository,
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedActionTemplate()).toBeUndefined();

        const longswordButton = hud.getUseActionButtons().find((button) =>
            button.actionTemplate.id === longswordAction.id
        );
        hud.mouseMoved(longswordButton.buttonArea.left, longswordButton.buttonArea.top, state.battleOrchestratorState);

        expect(longswordButton.status).toBe(ButtonStatus.HOVER);
    });

    it('generates an end turn action button when a squaddie is selected', () => {
        const team = BattleSquaddieTeamService.new({
            id: "player team",
            name: "player team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
        });

        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera: new BattleCamera(0, 0),
                    teams: [team],
                    battlePhaseState: BattlePhaseStateService.new({
                        currentAffiliation: BattlePhase.PLAYER,
                    }),
                }),
            }),
            campaign: CampaignService.default({}),
            repository: squaddieRepository,
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });

        const actionButtons: MakeDecisionButton[] = hud.getUseActionButtons();
        expect(actionButtons).toBeTruthy();

        expect(hud.shouldDrawEndTurnButton(state)).toBeTruthy();
    });

    it('reports when the End Turn action button was clicked on', () => {
        const team = BattleSquaddieTeamService.new({
            id: "player team",
            name: "player team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
        });

        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera: new BattleCamera(0, 0),
                    teams: [team],
                    battlePhaseState: BattlePhaseStateService.new({
                        currentAffiliation: BattlePhase.PLAYER,
                    }),
                }),
            }),
            campaign: CampaignService.default({}),
            repository: squaddieRepository,
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.getSelectedActionTemplate()).toBeUndefined();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();

        hud.mouseClicked(
            RectAreaService.left(hud.endTurnButton.rectangle.area),
            RectAreaService.top(hud.endTurnButton.rectangle.area),
            state
        );

        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeTruthy();
        expect(hud.getSelectedActionTemplate()).toBeUndefined();

        hud.reset();
        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.getSelectedActionTemplate()).toBeUndefined();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
    });

    it('can reopen the window in the previous position if no mouse location is given', () => {
        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera: new BattleCamera(0, 0),
                }),
            }),
            campaign: CampaignService.default({}),
            repository: squaddieRepository,
        })

        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        const initialWindowPosition: RectArea = RectAreaService.new({
            baseRectangle: hud.background.area,
            left: 0,
            top: 0
        });
        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            state,
        });
        expect(hud.background.area).toStrictEqual(initialWindowPosition);
    });

    it('will warn the user if the squaddie does not have enough actions to perform the action', () => {
        let notEnoughActionPointsAction = ActionTemplateService.new({
                name: "not enough actions",
                id: "not enough actions",
                actionPoints: 9001,
            }
        );

        const {squaddieTemplate} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, playerSquaddieDynamicID));
        squaddieTemplate.actionTemplates.push(notEnoughActionPointsAction);

        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera: new BattleCamera(0, 0),
                }),
            }),
            campaign: CampaignService.default({}),
            repository: squaddieRepository,
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedActionTemplate()).toBeUndefined();

        const notEnoughActionPointsButton: MakeDecisionButton = hud.getUseActionButtons().find((button) =>
            button.actionTemplate.id === "not enough actions"
        );

        hud.mouseClicked(
            notEnoughActionPointsButton.buttonArea.left,
            notEnoughActionPointsButton.buttonArea.top,
            state,
        );

        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.getSelectedActionTemplate()).toBeUndefined();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(warnUserNotEnoughActionPointsToPerformActionSpy).toBeCalled();
    });

    it('will warn the user they cannot control enemy squaddies', () => {
        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera: new BattleCamera(0, 0),
                }),
            }),
            campaign: CampaignService.default({}),
            repository: squaddieRepository,
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: enemySquaddieDynamic.battleSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state: state,
        });

        const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        hud.draw(state, mockedP5GraphicsContext);

        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith(expect.stringMatching(`cannot control ${enemySquaddieStatic.squaddieId.name}`),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        );
    });

    it('will not let the player command uncontrollable enemy squaddies', () => {
        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera: new BattleCamera(0, 0),
                }),
            }),
            repository: squaddieRepository,
            campaign: CampaignService.default({}),
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: enemySquaddieDynamic.battleSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state: state,
        });

        hud.draw(state, mockedP5GraphicsContext);

        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedActionTemplate()).toBeUndefined();

        hud.mouseClicked(
            RectAreaService.left(hud.endTurnButton.rectangle.area),
            RectAreaService.top(hud.endTurnButton.rectangle.area),
            state
        );

        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedActionTemplate()).toBeUndefined();
    });

    describe("Save game button", () => {
        it('should show the button during the player phase', () => {
            const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                        battlePhaseState: {
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        },
                    }),
                }),
                repository: squaddieRepository,
                campaign: CampaignService.default({}),
            });

            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawSaveAndLoadButton(state)).toBeTruthy();
        });
        it('should not show the button during other phases', () => {
            const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                        battlePhaseState: {
                            currentAffiliation: BattlePhase.ENEMY,
                            turnCount: 0,
                        },
                    }),
                }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            });

            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawSaveAndLoadButton(state)).toBeFalsy();
        })
        ;
        it('should not show the button if the player controlled squaddie is mid way through their turn', () => {
            const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                        battlePhaseState: {
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        },
                        actionsThisRound: ActionsThisRoundService.new({
                            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                            startingLocation: {q: 0, r: 0},
                            previewedActionTemplateId: "purifying_stream",
                            processedActions: [
                                ProcessedActionService.new({
                                    decidedAction: undefined,
                                    processedActionEffects: [],
                                })
                            ]
                        }),
                    }),
                }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            });

            hud = new BattleSquaddieSelectedHUD();
            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawSaveAndLoadButton(state)).toBeFalsy();
        });
        describe('user clicks the save button', () => {
            let state: GameEngineState;

            beforeEach(() => {
                state =
                    GameEngineStateService.new({
                        repository: squaddieRepository,
                        resourceHandler: resourceHandler,
                        battleOrchestratorState:
                            BattleOrchestratorStateService.newOrchestratorState({
                                battleSquaddieSelectedHUD: undefined,
                                battleState: BattleStateService.newBattleState({
                                    missionId: "test mission",
                                    missionMap,
                                    camera: new BattleCamera(0, 0),
                                    battlePhaseState: {
                                        currentAffiliation: BattlePhase.PLAYER,
                                        turnCount: 0,
                                    },
                                }),
                            }),
                        campaign: CampaignService.default({}),
                    });

                hud = new BattleSquaddieSelectedHUD();
            });
            it('should call the game engine save function', () => {
                const saveGame = jest.spyOn(hud, "markGameToBeSaved");
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerBattleSquaddie.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state: state,
                });

                hud.mouseClicked(RectAreaService.centerX(hud.saveGameButton.rectangle.area), RectAreaService.centerY(hud.saveGameButton.rectangle.area), state,);
                expect(saveGame).toBeCalled();

                expect(state.saveSaveState.savingInProgress).toBeTruthy();
            });
            it('should ignore other inputs while saving', () => {
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerBattleSquaddie.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state: state,
                });
                hud.mouseClicked(RectAreaService.centerX(hud.saveGameButton.rectangle.area), RectAreaService.centerY(hud.saveGameButton.rectangle.area), state,);

                expect(hud.selectedBattleSquaddieId).toBe(playerBattleSquaddie.battleSquaddieId);
                hud.mouseClicked(RectAreaService.centerX(hud.nextSquaddieButton.rectangle.area), RectAreaService.centerY(hud.nextSquaddieButton.rectangle.area), state,);
                expect(hud.selectedBattleSquaddieId).toBe(playerBattleSquaddie.battleSquaddieId);
            });
            it('should show a Saving message while saving is active', () => {
                const saveGame = jest.spyOn(hud, "markGameToBeSaved");
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerBattleSquaddie.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state: state,
                });

                hud.mouseClicked(RectAreaService.centerX(hud.saveGameButton.rectangle.area), RectAreaService.centerY(hud.saveGameButton.rectangle.area), state,);

                const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
                hud.draw(state, mockedP5GraphicsContext);

                expect(textSpy).toBeCalled();
                expect(textSpy).toBeCalledWith(expect.stringMatching(`Saving...`),
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    expect.anything()
                );
                expect(saveGame).toBeCalled();
            });
            it('should show a failure message if the save failed', () => {
                jest.spyOn(Date, "now").mockReturnValue(0);
                const saveGame = jest.spyOn(hud, "markGameToBeSaved");
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerBattleSquaddie.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state: state,
                });

                hud.mouseClicked(RectAreaService.centerX(hud.saveGameButton.rectangle.area), RectAreaService.centerY(hud.saveGameButton.rectangle.area), state,);
                SaveSaveStateService.foundErrorDuringSaving(state.saveSaveState);

                const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
                hud.draw(state, mockedP5GraphicsContext);

                expect(textSpy).toBeCalled();
                expect(textSpy).toBeCalledWith(expect.stringMatching(`Saving failed. Check logs.`),
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    expect.anything()
                );
                expect(saveGame).toBeCalled();
                expect(state.saveSaveState.errorDuringSaving).toBeFalsy();

                jest.spyOn(Date, "now").mockReturnValue(FILE_MESSAGE_DISPLAY_DURATION);
                textSpy.mockClear();
                hud.draw(state, mockedP5GraphicsContext);
                expect(textSpy).not.toBeCalledWith(expect.stringMatching(`Saving failed. Check logs.`),
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    expect.anything()
                );
            });
        });
    });

    describe("Load game button", () => {
        it('should remember the user requested a load function', () => {
            const state: GameEngineState = GameEngineStateService.new({
                repository: squaddieRepository,
                resourceHandler: resourceHandler,
                campaign: CampaignService.default({}),
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                        battlePhaseState: {
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        },
                    }),
                })
            });

            hud = new BattleSquaddieSelectedHUD();
            const loadGame = jest.spyOn(hud, "markGameToBeLoaded");
            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state: state,
            });

            hud.mouseClicked(RectAreaService.centerX(hud.loadGameButton.rectangle.area), RectAreaService.centerY(hud.loadGameButton.rectangle.area), state);
            expect(loadGame).toBeCalled();

            expect(state.loadSaveState.userRequestedLoad).toBeTruthy();
        });
        describe('user clicks the load button', () => {
            let state: GameEngineState;

            beforeEach(() => {
                state = GameEngineStateService.new({
                    repository: squaddieRepository,
                    resourceHandler: resourceHandler,
                    battleOrchestratorState:
                        BattleOrchestratorStateService.newOrchestratorState({
                            battleSquaddieSelectedHUD: undefined,
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                missionMap,
                                camera: new BattleCamera(0, 0),
                                battlePhaseState: {
                                    currentAffiliation: BattlePhase.PLAYER,
                                    turnCount: 0,
                                },
                            }),
                        }),
                    campaign: CampaignService.default({}),
                });

                hud = new BattleSquaddieSelectedHUD();
            });
            it('should ignore other inputs while loading', () => {
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerBattleSquaddie.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state: state,
                });
                hud.mouseClicked(RectAreaService.centerX(hud.loadGameButton.rectangle.area), RectAreaService.centerY(hud.loadGameButton.rectangle.area), state,);

                expect(hud.selectedBattleSquaddieId).toBe(playerBattleSquaddie.battleSquaddieId);
                hud.mouseClicked(RectAreaService.centerX(hud.nextSquaddieButton.rectangle.area), RectAreaService.centerY(hud.nextSquaddieButton.rectangle.area), state,);
                expect(hud.selectedBattleSquaddieId).toBe(playerBattleSquaddie.battleSquaddieId);
            });
            it('should show a Loading message while loading is active', () => {
                const loadGame = jest.spyOn(hud, "markGameToBeLoaded");
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerBattleSquaddie.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state: state,
                });

                hud.mouseClicked(RectAreaService.centerX(hud.loadGameButton.rectangle.area), RectAreaService.centerY(hud.loadGameButton.rectangle.area), state,);

                const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
                hud.draw(state, mockedP5GraphicsContext);

                expect(textSpy).toBeCalled();
                expect(textSpy).toBeCalledWith(expect.stringMatching(`Loading...`),
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    expect.anything()
                );
                expect(loadGame).toBeCalled();
            });
            describe('should show an error message when nothing is loaded', () => {
                const tests = [
                    {
                        name: "application errors",
                        loadSaveStateChange: (loadSaveState: LoadSaveState): void => {
                            loadSaveState.applicationErroredWhileLoading = true;
                        },
                        expectedSaveStateField: (loadSaveState: LoadSaveState): boolean => {
                            return loadSaveState.applicationErroredWhileLoading;
                        },
                        expectedErrorMessage: `Loading failed. Check logs.`,
                    },
                    {
                        name: "user cancels",
                        loadSaveStateChange: (loadSaveState: LoadSaveState): void => {
                            loadSaveState.userCanceledLoad = true;
                        },
                        expectedSaveStateField: (loadSaveState: LoadSaveState): boolean => {
                            return loadSaveState.userCanceledLoad;
                        },
                        expectedErrorMessage: `Canceled loading.`,
                    },
                ]

                it.each(tests)(`$name`, ({
                                             name,
                                             loadSaveStateChange,
                                             expectedSaveStateField,
                                             expectedErrorMessage,
                                         }) => {
                    jest.spyOn(Date, "now").mockReturnValue(0);
                    const loadGame = jest.spyOn(hud, "markGameToBeLoaded");
                    hud.selectSquaddieAndDrawWindow({
                        battleId: playerBattleSquaddie.battleSquaddieId,
                        repositionWindow: {mouseX: 0, mouseY: 0},
                        state: state,
                    });

                    hud.mouseClicked(RectAreaService.centerX(hud.loadGameButton.rectangle.area), RectAreaService.centerY(hud.loadGameButton.rectangle.area), state,);
                    loadSaveStateChange(state.loadSaveState);

                    const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
                    hud.draw(state, mockedP5GraphicsContext);

                    expect(textSpy).toBeCalled();
                    expect(textSpy).toBeCalledWith(expect.stringMatching(expectedErrorMessage),
                        expect.anything(),
                        expect.anything(),
                        expect.anything(),
                        expect.anything()
                    );
                    expect(loadGame).toBeCalled();
                    expect(expectedSaveStateField(state.loadSaveState)).toBeTruthy();

                    jest.spyOn(Date, "now").mockReturnValue(FILE_MESSAGE_DISPLAY_DURATION);
                    textSpy.mockClear();
                    hud.draw(state, mockedP5GraphicsContext);
                    expect(textSpy).not.toBeCalledWith(expect.stringMatching(expectedErrorMessage),
                        expect.anything(),
                        expect.anything(),
                        expect.anything(),
                        expect.anything()
                    );
                    expect(expectedSaveStateField(state.loadSaveState)).toBeFalsy();
                });
            });
        });
    });

    describe("Next Squaddie button", () => {
        it('should show the button if there are at least 2 player controllable squaddies on the map', () => {
            const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                    }),
                }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            });
            missionMap.addSquaddie(playerSquaddieStatic.squaddieId.templateId, playerBattleSquaddie.battleSquaddieId, {
                q: 0,
                r: 0
            });
            missionMap.addSquaddie(player2SquaddieStatic.squaddieId.templateId, player2SquaddieDynamic.battleSquaddieId, {
                q: 0,
                r: 1
            });
            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawNextButton(state)).toBeTruthy();
        });
        it('should not show the button if a squaddie is partway through their turn', () => {
            const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                        actionsThisRound: ActionsThisRoundService.new({
                            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                            startingLocation: {q: 0, r: 0},
                            processedActions: [
                                ProcessedActionService.new({
                                    decidedAction: undefined,
                                    processedActionEffects: [
                                        ProcessedActionMovementEffectService.new({
                                            decidedActionEffect: DecidedActionMovementEffectService.new({
                                                destination: {q: 0, r: 1},
                                                template: ActionEffectMovementTemplateService.new({})
                                            })
                                        }),
                                    ]
                                }),
                            ]
                        })
                    }),
                }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            });
            missionMap.addSquaddie(playerSquaddieStatic.squaddieId.templateId, playerBattleSquaddie.battleSquaddieId, {
                q: 0,
                r: 0
            });
            missionMap.addSquaddie(player2SquaddieStatic.squaddieId.templateId, player2SquaddieDynamic.battleSquaddieId, {
                q: 0,
                r: 1
            });
            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawNextButton(state)).toBeFalsy();
        });
        it('should show the button if there is 1 player controllable squaddie and the HUD is focused on an uncontrollable squaddie', () => {
            const onePlayerOneEnemy = ObjectRepositoryService.new();
            ObjectRepositoryService.addSquaddie(onePlayerOneEnemy, playerSquaddieStatic, playerBattleSquaddie);
            ObjectRepositoryService.addSquaddie(onePlayerOneEnemy, enemySquaddieStatic, enemySquaddieDynamic);
            missionMap.addSquaddie(playerSquaddieStatic.squaddieId.templateId, playerBattleSquaddie.battleSquaddieId, {
                q: 0,
                r: 0
            });
            missionMap.addSquaddie(enemySquaddieStatic.squaddieId.templateId, enemySquaddieDynamic.battleSquaddieId, {
                q: 0,
                r: 1
            });

            const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                    }),
                }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            });

            hud = new BattleSquaddieSelectedHUD();

            hud.selectSquaddieAndDrawWindow({
                battleId: enemySquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawNextButton(state)).toBeTruthy();
        });
        it('should show the button if there is 1 player controllable squaddie and the HUD is not focused', () => {
            const onePlayerOneEnemy = ObjectRepositoryService.new();
            ObjectRepositoryService.addSquaddie(onePlayerOneEnemy, playerSquaddieStatic, playerBattleSquaddie);
            ObjectRepositoryService.addSquaddie(onePlayerOneEnemy, enemySquaddieStatic, enemySquaddieDynamic);
            missionMap.addSquaddie(playerSquaddieStatic.squaddieId.templateId, playerBattleSquaddie.battleSquaddieId, {
                q: 0,
                r: 0
            });
            missionMap.addSquaddie(enemySquaddieStatic.squaddieId.templateId, enemySquaddieDynamic.battleSquaddieId, {
                q: 0,
                r: 1
            });

            const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                    }),
                }),
                repository: onePlayerOneEnemy,
            });

            hud = new BattleSquaddieSelectedHUD()

            expect(hud.shouldDrawNextButton(state)).toBeTruthy();
        });
        it('should not show the button if player controllable squaddies are off the map', () => {
            const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                    }),
                }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            });
            missionMap.addSquaddie(playerSquaddieStatic.squaddieId.templateId, playerBattleSquaddie.battleSquaddieId, {
                q: 0,
                r: 0
            });
            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawNextButton(state)).toBeFalsy();
        });
        it('should not show the button if there is fewer than 2 player controllable squaddies', () => {
            const onePlayerOneEnemy = ObjectRepositoryService.new();
            ObjectRepositoryService.addSquaddie(onePlayerOneEnemy, playerSquaddieStatic, playerBattleSquaddie);
            ObjectRepositoryService.addSquaddie(onePlayerOneEnemy, enemySquaddieStatic, enemySquaddieDynamic);
            missionMap.addSquaddie(playerSquaddieStatic.squaddieId.templateId, playerBattleSquaddie.battleSquaddieId, {
                q: 0,
                r: 0
            });
            missionMap.addSquaddie(enemySquaddieStatic.squaddieId.templateId, enemySquaddieDynamic.battleSquaddieId, {
                q: 0,
                r: 1
            });

            const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                    }),
                }),
                campaign: CampaignService.default({}),
                repository: onePlayerOneEnemy,
            });

            hud = new BattleSquaddieSelectedHUD();

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawNextButton(state)).toBeFalsy();
        });
        it('clicking on the next button will select a different squaddie', () => {
            const battleCamera = new BattleCamera(0, 0);
            hud = new BattleSquaddieSelectedHUD();
            missionMap.addSquaddie(playerSquaddieStatic.squaddieId.templateId, playerBattleSquaddie.battleSquaddieId, {
                q: 0,
                r: 0
            });
            missionMap.addSquaddie(player2SquaddieStatic.squaddieId.templateId, player2SquaddieDynamic.battleSquaddieId, {
                q: 0,
                r: 1
            });

            const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: battleCamera,
                    }),
                }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            });

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state: state,
            });

            expect(hud.selectedBattleSquaddieId).toBe(playerBattleSquaddie.battleSquaddieId);
            hud.mouseClicked(RectAreaService.centerX(hud.nextSquaddieButton.rectangle.area), RectAreaService.centerY(hud.nextSquaddieButton.rectangle.area), state,);
            expect(hud.selectedBattleSquaddieId).toBe(player2SquaddieDynamic.battleSquaddieId);
            const panningInfo = battleCamera.getPanningInformation();
            const player2MapCoordinates = missionMap.getSquaddieByBattleId(player2SquaddieDynamicId);
            expect(MissionMapSquaddieLocationHandler.isValid(player2MapCoordinates)).toBeTruthy();
            const player2WorldCoordinates = convertMapCoordinatesToWorldCoordinates(
                player2MapCoordinates.mapLocation.q,
                player2MapCoordinates.mapLocation.r
            );

            expect(panningInfo.xDestination).toBe(player2WorldCoordinates[0]);
            expect(panningInfo.yDestination).toBe(player2WorldCoordinates[1]);
        });
        it('should respond to keyboard presses for the next squaddie, even if the HUD is not open', () => {
            const battleCamera = new BattleCamera(0, 0);
            hud = new BattleSquaddieSelectedHUD();
            const selectSpy = jest.spyOn((hud as any), "selectSquaddieAndDrawWindow");
            jest.spyOn((hud as any), "generateAffiliateIcon").mockImplementation(() => {
            });
            jest.spyOn((hud as any), "generateUseActionButtons").mockImplementation(() => {
            });
            jest.spyOn((hud as any), "generateNextSquaddieButton").mockImplementation(() => {
            });
            jest.spyOn((hud as any), "generateSquaddieIdText").mockImplementation(() => {
            });

            missionMap.addSquaddie(playerSquaddieStatic.squaddieId.templateId, playerBattleSquaddie.battleSquaddieId, {
                q: 0,
                r: 0
            });
            missionMap.addSquaddie(player2SquaddieStatic.squaddieId.templateId, player2SquaddieDynamic.battleSquaddieId, {
                q: 0,
                r: 1
            });

            const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: battleCamera,
                    }),
                }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            });

            expect(hud.selectedBattleSquaddieId).toBe("");
            hud.keyPressed(config.KEYBOARD_SHORTCUTS[KeyButtonName.NEXT_SQUADDIE][0], state);
            expect(selectSpy).toHaveBeenCalled();
            expect(hud.selectedBattleSquaddieId).not.toBe("");
            expect(battleCamera.isPanning()).toBeTruthy();
        });
    });

    describe("End Turn button", () => {
        describe('show the end turn button?', () => {
            let setup: {
                [reason: string]: () => {
                    repository: ObjectRepository,
                    battleSquaddieId: string,
                    teams: BattleSquaddieTeam[],
                    battlePhase?: BattlePhase,
                };
            };

            const tests: { reason: string, expectToShowButton: boolean, battlePhase?: BattlePhase, }[] = [
                {
                    reason: 'no, squaddie is not player affiliated',
                    expectToShowButton: false,
                },
                {
                    reason: 'no, squaddie is out of actions',
                    expectToShowButton: false,
                },
                {
                    reason: 'no, it is not the player phase',
                    expectToShowButton: false,
                    battlePhase: BattlePhase.ENEMY,
                },
                {
                    reason: 'yes, player squaddie has action points to spend',
                    expectToShowButton: true,
                },
            ]

            beforeEach(() => {
                setup = {};
                setup['no, squaddie is not player affiliated'] = () => {
                    const repository: ObjectRepository = ObjectRepositoryService.new();
                    const battleSquaddieId = "not a player"
                    SquaddieAndObjectRepositoryService.createNewSquaddieAndAddToRepository({
                        battleId: battleSquaddieId,
                        name: battleSquaddieId,
                        templateId: battleSquaddieId,
                        affiliation: SquaddieAffiliation.ENEMY,
                        squaddieRepository: repository,
                    });

                    const team = BattleSquaddieTeamService.new({
                        id: "enemy team",
                        name: "enemy team",
                        affiliation: SquaddieAffiliation.ENEMY,
                        battleSquaddieIds: [battleSquaddieId],
                    });

                    return {
                        repository,
                        battleSquaddieId,
                        teams: [team],
                    }
                }

                setup['no, squaddie is out of actions'] = () => {
                    const repository: ObjectRepository = ObjectRepositoryService.new();
                    const battleSquaddieId = "out of actions"
                    const {battleSquaddie} = SquaddieAndObjectRepositoryService.createNewSquaddieAndAddToRepository({
                        battleId: battleSquaddieId,
                        name: battleSquaddieId,
                        templateId: battleSquaddieId,
                        affiliation: SquaddieAffiliation.PLAYER,
                        squaddieRepository: repository,
                    });
                    SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn);

                    const team = BattleSquaddieTeamService.new({
                        id: "player team",
                        name: "player team",
                        affiliation: SquaddieAffiliation.PLAYER,
                        battleSquaddieIds: [battleSquaddieId],
                    });

                    return {
                        repository,
                        battleSquaddieId,
                        teams: [team],
                    }
                }

                setup['no, it is not the player phase'] = () => {
                    const repository: ObjectRepository = ObjectRepositoryService.new();
                    const battleSquaddieId = "not the player phase"
                    SquaddieAndObjectRepositoryService.createNewSquaddieAndAddToRepository({
                        battleId: battleSquaddieId,
                        name: battleSquaddieId,
                        templateId: battleSquaddieId,
                        affiliation: SquaddieAffiliation.PLAYER,
                        squaddieRepository: repository,
                    });

                    const team = BattleSquaddieTeamService.new({
                        id: "player team",
                        name: "player team",
                        affiliation: SquaddieAffiliation.PLAYER,
                        battleSquaddieIds: [battleSquaddieId],
                    });

                    return {
                        repository,
                        battleSquaddieId,
                        teams: [team],
                    }
                }

                setup['yes, player squaddie has action points to spend'] = () => {
                    const repository: ObjectRepository = ObjectRepositoryService.new();
                    const battleSquaddieId = "player can act"
                    SquaddieAndObjectRepositoryService.createNewSquaddieAndAddToRepository({
                        battleId: battleSquaddieId,
                        name: battleSquaddieId,
                        templateId: battleSquaddieId,
                        affiliation: SquaddieAffiliation.PLAYER,
                        squaddieRepository: repository,
                    });

                    const team = BattleSquaddieTeamService.new({
                        id: "player team",
                        name: "player team",
                        affiliation: SquaddieAffiliation.PLAYER,
                        battleSquaddieIds: [battleSquaddieId],
                    });

                    return {
                        repository,
                        battleSquaddieId,
                        teams: [team],
                    }
                }
            });

            it.each(tests)(` ($reason)`, ({reason, expectToShowButton, battlePhase}) => {
                const setupFunction = setup[reason];
                if (!isValidValue(battlePhase)) {
                    battlePhase = BattlePhase.PLAYER;
                }
                const {repository, battleSquaddieId, teams} = setupFunction();

                const state: GameEngineState = GameEngineStateService.new({
                    resourceHandler: resourceHandler,
                    battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                        battleSquaddieSelectedHUD: undefined,
                        battleState: BattleStateService.newBattleState({
                            missionId: "test mission",
                            missionMap,
                            camera: new BattleCamera(0, 0),
                            battlePhaseState: {
                                currentAffiliation: battlePhase,
                                turnCount: 0,
                            },
                            teams,
                        }),
                    }),
                    campaign: CampaignService.default({}),
                    repository,
                });

                hud = new BattleSquaddieSelectedHUD();

                hud.selectSquaddieAndDrawWindow({
                    battleId: battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state,
                });

                expect(hud.shouldDrawEndTurnButton(state)).toEqual(expectToShowButton);
            });
        });
    });
});
