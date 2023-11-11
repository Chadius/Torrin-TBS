import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {MissionMap} from "../missionMap/missionMap";
import {ResourceHandler} from "../resource/resourceHandler";
import {BattleSquaddieSelectedHUD, FILE_MESSAGE_DISPLAY_DURATION} from "./battleSquaddieSelectedHUD";
import {BattleSquaddie} from "./battleSquaddie";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {UseActionButton} from "../squaddie/useActionButton";
import {SquaddieAction, SquaddieActionHandler} from "../squaddie/action";
import {TargetingShape} from "./targeting/targetingShapeGenerator";
import {SquaddieEndTurnAction} from "./history/squaddieEndTurnAction";
import {RectArea} from "../ui/rectArea";
import {getResultOrThrowError, makeResult} from "../utils/ResultOrError";
import {CreateNewSquaddieAndAddToRepository} from "../utils/test/squaddie";
import {BattleCamera} from "./battleCamera";
import {convertMapCoordinatesToWorldCoordinates} from "../hexMap/convertCoordinates";
import {BattleOrchestratorState} from "./orchestrator/battleOrchestratorState";
import {KeyButtonName} from "../utils/keyboardConfig";
import {config} from "../configuration/config";
import * as mocks from "../utils/test/mocks";
import {MockedP5GraphicsContext} from "../utils/test/mocks";
import {ButtonStatus} from "../ui/button";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";
import {MissionMapSquaddieLocationHandler} from "../missionMap/squaddieLocation";
import {BattlePhase} from "./orchestratorComponents/battlePhaseTracker";
import {SquaddieActionType} from "./history/anySquaddieAction";
import {TraitStatusStorageHelper} from "../trait/traitStatusStorage";

describe('BattleSquaddieSelectedHUD', () => {
    let hud: BattleSquaddieSelectedHUD;
    let squaddieRepository: BattleSquaddieRepository;
    let missionMap: MissionMap;
    let resourceHandler: ResourceHandler;
    let playerSquaddieDynamicID: string = "player_squaddie_0";
    let playerSquaddieStatic: SquaddieTemplate;
    let playerSquaddieDynamic: BattleSquaddie;
    let enemySquaddieDynamicID: string = "enemy_squaddie_0";
    let enemySquaddieStatic: SquaddieTemplate;
    let enemySquaddieDynamic: BattleSquaddie;
    let player2SquaddieDynamicId: string = "player_squaddie_2";
    let player2SquaddieStatic: SquaddieTemplate;
    let player2SquaddieDynamic: BattleSquaddie;
    let longswordAction: SquaddieAction;
    let warnUserNotEnoughActionPointsToPerformActionSpy: jest.SpyInstance;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        })

        squaddieRepository = new BattleSquaddieRepository();

        resourceHandler = mocks.mockResourceHandler();
        resourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
        resourceHandler.getResource = jest.fn().mockReturnValue(makeResult({width: 1, height: 1}));
        resourceHandler.loadResources([
            "affiliate_icon_crusaders",
            "affiliate_icon_infiltrators",
            "affiliate_icon_western",
            "affiliate_icon_none",
        ]);

        longswordAction = SquaddieActionHandler.new({
            name: "longsword",
            id: "longsword",
            traits: TraitStatusStorageHelper.newUsingTraitValues(),
            actionPointCost: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        });

        ({
                squaddieTemplate: playerSquaddieStatic,
                battleSquaddie: playerSquaddieDynamic,
            } =
                CreateNewSquaddieAndAddToRepository({
                    templateId: "player_soldier",
                    name: "Player Soldier",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleId: playerSquaddieDynamicID,
                    squaddieRepository,
                    actions: [
                        longswordAction
                    ],
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
                    actions: [
                        longswordAction
                    ],
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
                    actions: [
                        longswordAction
                    ],
                })
        );

        hud = new BattleSquaddieSelectedHUD();
        warnUserNotEnoughActionPointsToPerformActionSpy = jest.spyOn((hud as any), "warnUserNotEnoughActionPointsToPerformAction").mockReturnValue(null);

        mockedP5GraphicsContext = new MockedP5GraphicsContext();
    });

    it('generates a button for each squaddie action', () => {
        hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamicID,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state: new BattleOrchestratorState({
                    squaddieRepository: squaddieRepository,
                    missionMap,
                    resourceHandler: resourceHandler,
                    camera: new BattleCamera(0, 0),
                })
            },
        );

        const actionButtons: UseActionButton[] = hud.getUseActionButtons();
        expect(actionButtons).toBeTruthy();

        expect(actionButtons.find((button) => {
            return button.action && button.action.name === longswordAction.name;
        })).toBeTruthy();
    });

    it('reports when an action button is clicked', () => {
        const state = new BattleOrchestratorState({
            squaddieRepository: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });
        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.wasAnyActionSelected()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();

        const longswordButton = hud.getUseActionButtons().find((button) =>
            button.action
            && button.action.name === longswordAction.name
        );
        hud.mouseClicked(longswordButton.buttonArea.left, longswordButton.buttonArea.top, state);

        expect(hud.wasAnyActionSelected()).toBeTruthy();
        expect(hud.getSelectedAction()).toBe(longswordAction);

        hud.reset();
        expect(hud.wasAnyActionSelected()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();
    });

    it('reports when an action button is hovered', () => {
        const state = new BattleOrchestratorState({
            squaddieRepository: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });
        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.wasAnyActionSelected()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();

        const longswordButton = hud.getUseActionButtons().find((button) =>
            button.action
            && button.action.name === longswordAction.name
        );
        hud.mouseMoved(longswordButton.buttonArea.left, longswordButton.buttonArea.top, state);

        expect(longswordButton.status).toBe(ButtonStatus.HOVER);
    });

    it('generates a Wait Turn action button when a squaddie is selected', () => {
        const state = new BattleOrchestratorState({
            squaddieRepository: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });

        const actionButtons: UseActionButton[] = hud.getUseActionButtons();
        expect(actionButtons).toBeTruthy();

        const waitTurnButton = actionButtons.find((button) =>
            button.endTurnAction !== undefined
        );
        expect(waitTurnButton).toBeTruthy();
    });

    it('reports when a Wait Turn action button was clicked on', () => {
        const state = new BattleOrchestratorState({
            squaddieRepository: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.wasAnyActionSelected()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();

        const waitTurnButton = hud.getUseActionButtons().find((button) =>
            button.endTurnAction !== undefined
        );

        hud.mouseClicked(waitTurnButton.buttonArea.left, waitTurnButton.buttonArea.top, state);

        expect(hud.wasAnyActionSelected()).toBeTruthy();
        expect(hud.getSelectedAction()).toBeInstanceOf(SquaddieEndTurnAction);

        hud.reset();
        expect(hud.wasAnyActionSelected()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();
    });

    it('can reopen the window in the previous position if no mouse location is given', () => {
        const state = new BattleOrchestratorState({
            squaddieRepository: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        const initialWindowPosition: RectArea = new RectArea({baseRectangle: hud.background.area, left: 0, top: 0});
        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            state,
        });
        expect(hud.background.area).toStrictEqual(initialWindowPosition);
    });

    it('will warn the user if the squaddie does not have enough actions to perform the action', () => {
        let notEnoughActionPointsAction: SquaddieAction;
        notEnoughActionPointsAction = SquaddieActionHandler.new({
                name: "not enough actions",
                id: "not enough actions",
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                actionPointCost: 9001,
                minimumRange: 0,
                maximumRange: 1,
                targetingShape: TargetingShape.Snake,
            }
        );

        const {squaddieTemplate} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(playerSquaddieDynamicID));
        squaddieTemplate.actions.push(notEnoughActionPointsAction);

        const state = new BattleOrchestratorState({
            squaddieRepository: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.wasAnyActionSelected()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();

        const notEnoughActionPointsButton = hud.getUseActionButtons().find((button) =>
            button.action && button.action.name === "not enough actions"
        );

        hud.mouseClicked(
            notEnoughActionPointsButton.buttonArea.left,
            notEnoughActionPointsButton.buttonArea.top,
            state,
        );

        expect(hud.wasAnyActionSelected()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();
        expect(warnUserNotEnoughActionPointsToPerformActionSpy).toBeCalled();
    });

    it('will warn the user if another squaddie is still completing their turn', () => {
        const state = new BattleOrchestratorState({
                squaddieRepository: squaddieRepository,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
                squaddieCurrentlyActing: {
                    movingBattleSquaddieIds: [],
                    currentlySelectedAction: SquaddieActionHandler.new({
                        name: "purifying stream",
                        id: "purifying_stream",
                        traits: TraitStatusStorageHelper.newUsingTraitValues(),
                    }),
                    squaddieActionsForThisRound: {
                        battleSquaddieId: playerSquaddieDynamic.battleSquaddieId,
                        squaddieTemplateId: playerSquaddieStatic.squaddieId.templateId,
                        startingLocation: {q: 0, r: 0},
                        actions: [],
                    },
                },
            })
        ;

        hud.selectSquaddieAndDrawWindow({
            battleId: player2SquaddieDynamic.battleSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });

        const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        hud.draw(state.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith(expect.stringMatching(`wait for ${playerSquaddieStatic.squaddieId.name}`),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        );
    });

    it('will warn the user they cannot control enemy squaddies', () => {
        const state = new BattleOrchestratorState({
            squaddieRepository: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: enemySquaddieDynamic.battleSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });

        const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        hud.draw(state.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith(expect.stringMatching(`cannot control ${enemySquaddieStatic.squaddieId.name}`),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        );
    });

    it('will not let the player command uncontrollable enemy squaddies', () => {
        const state = new BattleOrchestratorState({
            squaddieRepository: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: enemySquaddieDynamic.battleSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });

        hud.draw(state.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

        expect(hud.wasAnyActionSelected()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();

        const waitTurnButton = hud.getUseActionButtons().find((button) =>
            button.endTurnAction !== undefined
        );

        hud.mouseClicked(waitTurnButton.buttonArea.left, waitTurnButton.buttonArea.top, state);

        expect(hud.wasAnyActionSelected()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();
    });

    describe("Save game button", () => {
        it('should show the button during the player phase', () => {
            const state = new BattleOrchestratorState({
                squaddieRepository: squaddieRepository,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
                battlePhaseState: {
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                },
                squaddieCurrentlyActing: {
                    movingBattleSquaddieIds: [],
                    squaddieActionsForThisRound: {
                        battleSquaddieId: playerSquaddieDynamic.battleSquaddieId,
                        squaddieTemplateId: playerSquaddieStatic.squaddieId.templateId,
                        startingLocation: {q: 0, r: 0},
                        actions: []
                    },
                    currentlySelectedAction: undefined,
                }
            });

            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawSaveAndLoadButton(state)).toBeTruthy();
        });
        it('should not show the button during other phases', () => {
            const state = new BattleOrchestratorState({
                squaddieRepository: squaddieRepository,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
                battlePhaseState: {
                    currentAffiliation: BattlePhase.ENEMY,
                    turnCount: 0,
                },
            });

            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawSaveAndLoadButton(state)).toBeFalsy();
        });
        it('should not show the button if the player controlled squaddie is mid way through their turn', () => {
            const state = new BattleOrchestratorState({
                squaddieRepository: squaddieRepository,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
                battlePhaseState: {
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                },
                squaddieCurrentlyActing: {
                    movingBattleSquaddieIds: [],
                    squaddieActionsForThisRound: {
                        battleSquaddieId: playerSquaddieDynamic.battleSquaddieId,
                        squaddieTemplateId: playerSquaddieStatic.squaddieId.templateId,
                        startingLocation: {q: 0, r: 0},
                        actions: [
                            {
                                type: SquaddieActionType.MOVEMENT,
                                data: {
                                    destination: {q: 1, r: 0},
                                    numberOfActionPointsSpent: 1,
                                }
                            }
                        ]
                    },
                    currentlySelectedAction: undefined,
                }
            });

            hud = new BattleSquaddieSelectedHUD();
            hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawSaveAndLoadButton(state)).toBeFalsy();
        });
        describe('user clicks the save button', () => {
            let state: BattleOrchestratorState;

            beforeEach(() => {
                state = new BattleOrchestratorState({
                    squaddieRepository: squaddieRepository,
                    missionMap,
                    resourceHandler: resourceHandler,
                    camera: new BattleCamera(0, 0),
                    battlePhaseState: {
                        currentAffiliation: BattlePhase.PLAYER,
                        turnCount: 0,
                    },
                    squaddieCurrentlyActing: {
                        movingBattleSquaddieIds: [],
                        squaddieActionsForThisRound: {
                            battleSquaddieId: playerSquaddieDynamic.battleSquaddieId,
                            squaddieTemplateId: playerSquaddieStatic.squaddieId.templateId,
                            startingLocation: {q: 0, r: 0},
                            actions: []
                        },
                        currentlySelectedAction: undefined,
                    },
                });

                hud = new BattleSquaddieSelectedHUD();
            });
            it('should call the game engine save function', () => {
                const saveGame = jest.spyOn(hud, "markGameToBeSaved");
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerSquaddieDynamic.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state,
                });

                hud.mouseClicked(hud.saveGameButton.rectangle.area.centerX, hud.saveGameButton.rectangle.area.centerY, state,);
                expect(saveGame).toBeCalled();

                expect(state.gameSaveFlags.savingInProgress).toBeTruthy();
            });
            it('should ignore other inputs while saving', () => {
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerSquaddieDynamic.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state,
                });
                hud.mouseClicked(hud.saveGameButton.rectangle.area.centerX, hud.saveGameButton.rectangle.area.centerY, state,);

                expect(hud.selectedBattleSquaddieId).toBe(playerSquaddieDynamic.battleSquaddieId);
                hud.mouseClicked(hud.nextSquaddieButton.rectangle.area.centerX, hud.nextSquaddieButton.rectangle.area.centerY, state,);
                expect(hud.selectedBattleSquaddieId).toBe(playerSquaddieDynamic.battleSquaddieId);
            });
            it('should show a Saving message while saving is active', () => {
                const saveGame = jest.spyOn(hud, "markGameToBeSaved");
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerSquaddieDynamic.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state,
                });

                hud.mouseClicked(hud.saveGameButton.rectangle.area.centerX, hud.saveGameButton.rectangle.area.centerY, state,);

                const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
                hud.draw(state.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

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
                    battleId: playerSquaddieDynamic.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state,
                });

                hud.mouseClicked(hud.saveGameButton.rectangle.area.centerX, hud.saveGameButton.rectangle.area.centerY, state,);
                state.gameSaveFlags.errorDuringSaving = true;

                const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
                hud.draw(state.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

                expect(textSpy).toBeCalled();
                expect(textSpy).toBeCalledWith(expect.stringMatching(`Saving failed. Check logs.`),
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    expect.anything()
                );
                expect(saveGame).toBeCalled();
                expect(state.gameSaveFlags.errorDuringSaving).toBeFalsy();

                jest.spyOn(Date, "now").mockReturnValue(FILE_MESSAGE_DISPLAY_DURATION);
                textSpy.mockClear();
                hud.draw(state.squaddieCurrentlyActing, state, mockedP5GraphicsContext);
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
            const state = new BattleOrchestratorState({
                squaddieRepository: squaddieRepository,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
                battlePhaseState: {
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                },
                squaddieCurrentlyActing: {
                    movingBattleSquaddieIds: [],
                    squaddieActionsForThisRound: {
                        battleSquaddieId: playerSquaddieDynamic.battleSquaddieId,
                        squaddieTemplateId: playerSquaddieStatic.squaddieId.templateId,
                        startingLocation: {q: 0, r: 0},
                        actions: []
                    },
                    currentlySelectedAction: undefined,
                },
            });

            hud = new BattleSquaddieSelectedHUD();
            const loadGame = jest.spyOn(hud, "markGameToBeLoaded");
            hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            hud.mouseClicked(hud.loadGameButton.rectangle.area.centerX, hud.loadGameButton.rectangle.area.centerY, state);
            expect(loadGame).toBeCalled();

            expect(state.gameSaveFlags.loadRequested).toBeTruthy();
        });
        describe('user clicks the load button', () => {
            let state: BattleOrchestratorState;

            beforeEach(() => {
                state = new BattleOrchestratorState({
                    squaddieRepository: squaddieRepository,
                    missionMap,
                    resourceHandler: resourceHandler,
                    camera: new BattleCamera(0, 0),
                    battlePhaseState: {
                        currentAffiliation: BattlePhase.PLAYER,
                        turnCount: 0,
                    },
                    squaddieCurrentlyActing: {
                        movingBattleSquaddieIds: [],
                        squaddieActionsForThisRound: {
                            battleSquaddieId: playerSquaddieDynamic.battleSquaddieId,
                            squaddieTemplateId: playerSquaddieStatic.squaddieId.templateId,
                            startingLocation: {q: 0, r: 0},
                            actions: []
                        },
                        currentlySelectedAction: undefined,
                    },
                });

                hud = new BattleSquaddieSelectedHUD();
            });
            it('should ignore other inputs while loading', () => {
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerSquaddieDynamic.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state,
                });
                hud.mouseClicked(hud.loadGameButton.rectangle.area.centerX, hud.loadGameButton.rectangle.area.centerY, state,);

                expect(hud.selectedBattleSquaddieId).toBe(playerSquaddieDynamic.battleSquaddieId);
                hud.mouseClicked(hud.nextSquaddieButton.rectangle.area.centerX, hud.nextSquaddieButton.rectangle.area.centerY, state,);
                expect(hud.selectedBattleSquaddieId).toBe(playerSquaddieDynamic.battleSquaddieId);
            });
            it('should show a Loading message while loading is active', () => {
                const loadGame = jest.spyOn(hud, "markGameToBeLoaded");
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerSquaddieDynamic.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state,
                });

                hud.mouseClicked(hud.loadGameButton.rectangle.area.centerX, hud.loadGameButton.rectangle.area.centerY, state,);

                const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
                hud.draw(state.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

                expect(textSpy).toBeCalled();
                expect(textSpy).toBeCalledWith(expect.stringMatching(`Loading...`),
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    expect.anything()
                );
                expect(loadGame).toBeCalled();
            });
            it('should show a failure message if the load failed', () => {
                jest.spyOn(Date, "now").mockReturnValue(0);
                const loadGame = jest.spyOn(hud, "markGameToBeLoaded");
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerSquaddieDynamic.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state,
                });

                hud.mouseClicked(hud.loadGameButton.rectangle.area.centerX, hud.loadGameButton.rectangle.area.centerY, state,);
                state.gameSaveFlags.errorDuringLoading = true;

                const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
                hud.draw(state.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

                expect(textSpy).toBeCalled();
                expect(textSpy).toBeCalledWith(expect.stringMatching(`Loading failed. Check logs.`),
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    expect.anything()
                );
                expect(loadGame).toBeCalled();
                expect(state.gameSaveFlags.errorDuringLoading).toBeFalsy();

                jest.spyOn(Date, "now").mockReturnValue(FILE_MESSAGE_DISPLAY_DURATION);
                textSpy.mockClear();
                hud.draw(state.squaddieCurrentlyActing, state, mockedP5GraphicsContext);
                expect(textSpy).not.toBeCalledWith(expect.stringMatching(`Loading failed. Check logs.`),
                    expect.anything(),
                    expect.anything(),
                    expect.anything(),
                    expect.anything()
                );
            });
        });
    });

    describe("Next Squaddie button", () => {
        it('should show the button if there are at least 2 player controllable squaddies', () => {
            const state = new BattleOrchestratorState({
                squaddieRepository: squaddieRepository,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
            });

            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawNextButton(state)).toBeTruthy();
        });

        it('should show the button if there is 1 player controllable squaddie and the HUD is focused on an uncontrollable squaddie', () => {
            const onePlayerOneEnemy = new BattleSquaddieRepository();
            onePlayerOneEnemy.addSquaddie(playerSquaddieStatic, playerSquaddieDynamic);
            onePlayerOneEnemy.addSquaddie(enemySquaddieStatic, enemySquaddieDynamic);

            const state = new BattleOrchestratorState({
                squaddieRepository: onePlayerOneEnemy,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
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
            const onePlayerOneEnemy = new BattleSquaddieRepository();
            onePlayerOneEnemy.addSquaddie(playerSquaddieStatic, playerSquaddieDynamic);
            onePlayerOneEnemy.addSquaddie(enemySquaddieStatic, enemySquaddieDynamic);

            const state = new BattleOrchestratorState({
                squaddieRepository: onePlayerOneEnemy,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
            });

            hud = new BattleSquaddieSelectedHUD()

            expect(hud.shouldDrawNextButton(state)).toBeTruthy();
        });

        it('should not show the button if there is fewer than 2 player controllable squaddies', () => {
            const onePlayerOneEnemy = new BattleSquaddieRepository();
            onePlayerOneEnemy.addSquaddie(playerSquaddieStatic, playerSquaddieDynamic);
            onePlayerOneEnemy.addSquaddie(enemySquaddieStatic, enemySquaddieDynamic);
            const state = new BattleOrchestratorState({
                squaddieRepository: onePlayerOneEnemy,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
            });

            hud = new BattleSquaddieSelectedHUD();

            hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawNextButton(state)).toBeFalsy();
        });

        it('clicking on the next button will select a different squaddie', () => {
            const battleCamera = new BattleCamera(0, 0);
            hud = new BattleSquaddieSelectedHUD();
            missionMap.addSquaddie(playerSquaddieStatic.squaddieId.templateId, playerSquaddieDynamic.battleSquaddieId, {
                q: 0,
                r: 0
            });
            missionMap.addSquaddie(player2SquaddieStatic.squaddieId.templateId, player2SquaddieDynamic.battleSquaddieId, {
                q: 0,
                r: 1
            });

            const state = new BattleOrchestratorState({
                squaddieRepository: squaddieRepository,
                missionMap,
                resourceHandler: resourceHandler,
                camera: battleCamera,
            });

            hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.selectedBattleSquaddieId).toBe(playerSquaddieDynamic.battleSquaddieId);
            hud.mouseClicked(hud.nextSquaddieButton.rectangle.area.centerX, hud.nextSquaddieButton.rectangle.area.centerY, state,);
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

            missionMap.addSquaddie(playerSquaddieStatic.squaddieId.templateId, playerSquaddieDynamic.battleSquaddieId, {
                q: 0,
                r: 0
            });
            missionMap.addSquaddie(player2SquaddieStatic.squaddieId.templateId, player2SquaddieDynamic.battleSquaddieId, {
                q: 0,
                r: 1
            });

            const state = new BattleOrchestratorState({
                squaddieRepository: squaddieRepository,
                missionMap,
                resourceHandler: resourceHandler,
                camera: battleCamera,
            });

            expect(hud.selectedBattleSquaddieId).toBe("");
            hud.keyPressed(config.KEYBOARD_SHORTCUTS[KeyButtonName.NEXT_SQUADDIE][0], state);
            expect(selectSpy).toHaveBeenCalled();
            expect(hud.selectedBattleSquaddieId).not.toBe("");
            expect(battleCamera.isPanning()).toBeTruthy();
        });
    });
});
