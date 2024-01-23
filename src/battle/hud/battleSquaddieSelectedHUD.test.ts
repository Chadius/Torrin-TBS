import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {MissionMap} from "../../missionMap/missionMap";
import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleSquaddieSelectedHUD, FILE_MESSAGE_DISPLAY_DURATION} from "./battleSquaddieSelectedHUD";
import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {MakeDecisionButton} from "../../squaddie/makeDecisionButton";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../decision/actionEffectSquaddieTemplate";
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
import {ActionEffectType} from "../../decision/actionEffect";
import {TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {SquaddieActionsForThisRoundService} from "../history/squaddieDecisionsDuringThisPhase";
import {DecisionService} from "../../decision/decision";
import {ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {CurrentlySelectedSquaddieDecisionService} from "../history/currentlySelectedSquaddieDecision";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {SquaddieTurnService} from "../../squaddie/turn";
import {isValidValue} from "../../utils/validityCheck";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {BattlePhaseStateService} from "../orchestratorComponents/battlePhaseController";

describe('BattleSquaddieSelectedHUD', () => {
    let hud: BattleSquaddieSelectedHUD;
    let squaddieRepository: ObjectRepository;
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
    let longswordAction: ActionEffectSquaddieTemplate;
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

        longswordAction = ActionEffectSquaddieTemplateService.new({
            name: "longsword",
            id: "longsword",
            traits: TraitStatusStorageHelper.newUsingTraitValues(),
            actionPointCost: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.SNAKE,
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
                state: GameEngineStateService.new({
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
                })
            },
        );

        const actionButtons: MakeDecisionButton[] = hud.getUseActionButtons();
        expect(actionButtons).toBeTruthy();

        expect(actionButtons.find((button) => {
            return button.actionEffectSquaddieTemplate && button.actionEffectSquaddieTemplate.name === longswordAction.name;
        })).toBeTruthy();
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
            repository: squaddieRepository,
        });
        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();

        const longswordButton = hud.getUseActionButtons().find((button) =>
            button.actionEffectSquaddieTemplate
            && button.actionEffectSquaddieTemplate.name === longswordAction.name
        );
        hud.mouseClicked(longswordButton.buttonArea.left, longswordButton.buttonArea.top, state);

        expect(hud.didPlayerSelectSquaddieAction()).toBeTruthy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedAction()).toBe(longswordAction);

        hud.reset();
        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();
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
            repository: squaddieRepository,
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();

        const longswordButton = hud.getUseActionButtons().find((button) =>
            button.actionEffectSquaddieTemplate
            && button.actionEffectSquaddieTemplate.name === longswordAction.name
        );
        hud.mouseMoved(longswordButton.buttonArea.left, longswordButton.buttonArea.top, state.battleOrchestratorState);

        expect(longswordButton.status).toBe(ButtonStatus.HOVER);
    });

    it('generates an end turn action button when a squaddie is selected', () => {
        const team = BattleSquaddieTeamService.new({
            id: "player team",
            name: "player team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [playerSquaddieDynamic.battleSquaddieId],
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
            battleSquaddieIds: [playerSquaddieDynamic.battleSquaddieId],
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
            repository: squaddieRepository,
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();

        hud.mouseClicked(
            RectAreaService.left(hud.endTurnButton.rectangle.area),
            RectAreaService.top(hud.endTurnButton.rectangle.area),
            state
        );

        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeTruthy();
        expect(hud.getSelectedAction()).toEqual({
            type: ActionEffectType.END_TURN,
        });

        hud.reset();
        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();
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
        let notEnoughActionPointsAction: ActionEffectSquaddieTemplate;
        notEnoughActionPointsAction = ActionEffectSquaddieTemplateService.new({
                name: "not enough actions",
                id: "not enough actions",
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                actionPointCost: 9001,
                minimumRange: 0,
                maximumRange: 1,
                targetingShape: TargetingShape.SNAKE,
            }
        );

        const {squaddieTemplate} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, playerSquaddieDynamicID));
        squaddieTemplate.actions.push(notEnoughActionPointsAction);

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
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();

        const notEnoughActionPointsButton = hud.getUseActionButtons().find((button) =>
            button.actionEffectSquaddieTemplate && button.actionEffectSquaddieTemplate.name === "not enough actions"
        );

        hud.mouseClicked(
            notEnoughActionPointsButton.buttonArea.left,
            notEnoughActionPointsButton.buttonArea.top,
            state,
        );

        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(warnUserNotEnoughActionPointsToPerformActionSpy).toBeCalled();
    });

    it('will warn the user if another squaddie is still completing their turn', () => {
        const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                        squaddieCurrentlyActing: CurrentlySelectedSquaddieDecisionService.new({

                            currentlySelectedDecision: DecisionService.new({
                                actionEffects: [
                                    ActionEffectSquaddieService.new({
                                        template: ActionEffectSquaddieTemplateService.new({
                                            name: "purifying stream",
                                            id: "purifying_stream",
                                            traits: TraitStatusStorageHelper.newUsingTraitValues(),
                                        }),
                                        targetLocation: {q: 0, r: 0},
                                        numberOfActionPointsSpent: 1,
                                    })
                                ]
                            }),
                            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                                battleSquaddieId: playerSquaddieDynamic.battleSquaddieId,
                                squaddieTemplateId: playerSquaddieStatic.squaddieId.templateId,
                                startingLocation: {q: 0, r: 0},
                            }),
                        }),
                    }),
                }),
                repository: squaddieRepository,
            })
        ;

        hud.selectSquaddieAndDrawWindow({
            battleId: player2SquaddieDynamic.battleSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state: state,
        });

        const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        hud.draw(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith(expect.stringMatching(`wait for ${playerSquaddieStatic.squaddieId.name}`),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        );
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
            repository: squaddieRepository,
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: enemySquaddieDynamic.battleSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state: state,
        });

        const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        hud.draw(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

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
        });

        hud.selectSquaddieAndDrawWindow({
            battleId: enemySquaddieDynamic.battleSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state: state,
        });

        hud.draw(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();

        hud.mouseClicked(
            RectAreaService.left(hud.endTurnButton.rectangle.area),
            RectAreaService.top(hud.endTurnButton.rectangle.area),
            state
        );

        expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy();
        expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy();
        expect(hud.getSelectedAction()).toBeUndefined();
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
                        squaddieCurrentlyActing: CurrentlySelectedSquaddieDecisionService.new({

                            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                                battleSquaddieId: playerSquaddieDynamic.battleSquaddieId,
                                squaddieTemplateId: playerSquaddieStatic.squaddieId.templateId,
                                startingLocation: {q: 0, r: 0},
                            }),
                        })
                    }),
                }),
                repository: squaddieRepository,
            });

            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawSaveAndLoadButton(state.battleOrchestratorState)).toBeTruthy();
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
                repository: squaddieRepository,
            });

            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawSaveAndLoadButton(state.battleOrchestratorState)).toBeFalsy();
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
                        squaddieCurrentlyActing: CurrentlySelectedSquaddieDecisionService.new({

                            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                                battleSquaddieId: playerSquaddieDynamic.battleSquaddieId,
                                squaddieTemplateId: playerSquaddieStatic.squaddieId.templateId,
                                startingLocation: {q: 0, r: 0},
                                decisions: [
                                    DecisionService.new({
                                        actionEffects: [
                                            ActionEffectMovementService.new({
                                                destination: {q: 1, r: 0},
                                                numberOfActionPointsSpent: 1,
                                            })
                                        ]
                                    })
                                ]
                            }),
                        })
                    }),
                }),
                repository: squaddieRepository,
            });

            hud = new BattleSquaddieSelectedHUD();
            hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawSaveAndLoadButton(state.battleOrchestratorState)).toBeFalsy();
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
                                    squaddieCurrentlyActing: CurrentlySelectedSquaddieDecisionService.new({
                                        squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                                            battleSquaddieId: playerSquaddieDynamic.battleSquaddieId,
                                            squaddieTemplateId: playerSquaddieStatic.squaddieId.templateId,
                                            startingLocation: {q: 0, r: 0},
                                        }),
                                    }),
                                }),
                            })
                    });

                hud = new BattleSquaddieSelectedHUD();
            });
            it('should call the game engine save function', () => {
                const saveGame = jest.spyOn(hud, "markGameToBeSaved");
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerSquaddieDynamic.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state: state,
                });

                hud.mouseClicked(RectAreaService.centerX(hud.saveGameButton.rectangle.area), RectAreaService.centerY(hud.saveGameButton.rectangle.area), state,);
                expect(saveGame).toBeCalled();

                expect(state.gameSaveFlags.savingInProgress).toBeTruthy();
            });
            it('should ignore other inputs while saving', () => {
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerSquaddieDynamic.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state: state,
                });
                hud.mouseClicked(RectAreaService.centerX(hud.saveGameButton.rectangle.area), RectAreaService.centerY(hud.saveGameButton.rectangle.area), state,);

                expect(hud.selectedBattleSquaddieId).toBe(playerSquaddieDynamic.battleSquaddieId);
                hud.mouseClicked(RectAreaService.centerX(hud.nextSquaddieButton.rectangle.area), RectAreaService.centerY(hud.nextSquaddieButton.rectangle.area), state,);
                expect(hud.selectedBattleSquaddieId).toBe(playerSquaddieDynamic.battleSquaddieId);
            });
            it('should show a Saving message while saving is active', () => {
                const saveGame = jest.spyOn(hud, "markGameToBeSaved");
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerSquaddieDynamic.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state: state,
                });

                hud.mouseClicked(RectAreaService.centerX(hud.saveGameButton.rectangle.area), RectAreaService.centerY(hud.saveGameButton.rectangle.area), state,);

                const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
                hud.draw(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

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
                    state: state,
                });

                hud.mouseClicked(RectAreaService.centerX(hud.saveGameButton.rectangle.area), RectAreaService.centerY(hud.saveGameButton.rectangle.area), state,);
                state.gameSaveFlags
                    .errorDuringSaving = true;

                const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
                hud.draw(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

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
                hud.draw(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, state, mockedP5GraphicsContext);
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
                        squaddieCurrentlyActing: CurrentlySelectedSquaddieDecisionService.new({

                            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                                battleSquaddieId: playerSquaddieDynamic.battleSquaddieId,
                                squaddieTemplateId: playerSquaddieStatic.squaddieId.templateId,
                                startingLocation: {q: 0, r: 0},
                            }),
                        }),
                    }),
                })
            });

            hud = new BattleSquaddieSelectedHUD();
            const loadGame = jest.spyOn(hud, "markGameToBeLoaded");
            hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state: state,
            });

            hud.mouseClicked(RectAreaService.centerX(hud.loadGameButton.rectangle.area), RectAreaService.centerY(hud.loadGameButton.rectangle.area), state);
            expect(loadGame).toBeCalled();

            expect(state.gameSaveFlags.loadRequested).toBeTruthy();
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
                                squaddieCurrentlyActing: CurrentlySelectedSquaddieDecisionService.new({

                                    squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                                        battleSquaddieId: playerSquaddieDynamic.battleSquaddieId,
                                        squaddieTemplateId: playerSquaddieStatic.squaddieId.templateId,
                                        startingLocation: {q: 0, r: 0},
                                    }),
                                }),
                            }),
                        })
                });

                hud = new BattleSquaddieSelectedHUD();
            });
            it('should ignore other inputs while loading', () => {
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerSquaddieDynamic.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state: state,
                });
                hud.mouseClicked(RectAreaService.centerX(hud.loadGameButton.rectangle.area), RectAreaService.centerY(hud.loadGameButton.rectangle.area), state,);

                expect(hud.selectedBattleSquaddieId).toBe(playerSquaddieDynamic.battleSquaddieId);
                hud.mouseClicked(RectAreaService.centerX(hud.nextSquaddieButton.rectangle.area), RectAreaService.centerY(hud.nextSquaddieButton.rectangle.area), state,);
                expect(hud.selectedBattleSquaddieId).toBe(playerSquaddieDynamic.battleSquaddieId);
            });
            it('should show a Loading message while loading is active', () => {
                const loadGame = jest.spyOn(hud, "markGameToBeLoaded");
                hud.selectSquaddieAndDrawWindow({
                    battleId: playerSquaddieDynamic.battleSquaddieId,
                    repositionWindow: {mouseX: 0, mouseY: 0},
                    state: state,
                });

                hud.mouseClicked(RectAreaService.centerX(hud.loadGameButton.rectangle.area), RectAreaService.centerY(hud.loadGameButton.rectangle.area), state,);

                const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
                hud.draw(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

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
                    state: state,
                });

                hud.mouseClicked(RectAreaService.centerX(hud.loadGameButton.rectangle.area), RectAreaService.centerY(hud.loadGameButton.rectangle.area), state,);
                state.gameSaveFlags.errorDuringLoading = true;

                const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
                hud.draw(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

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
                hud.draw(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, state, mockedP5GraphicsContext);
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
            const onePlayerOneEnemy = ObjectRepositoryService.new();
            ObjectRepositoryService.addSquaddie(onePlayerOneEnemy, playerSquaddieStatic, playerSquaddieDynamic);
            ObjectRepositoryService.addSquaddie(onePlayerOneEnemy, enemySquaddieStatic, enemySquaddieDynamic);

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
            ObjectRepositoryService.addSquaddie(onePlayerOneEnemy, playerSquaddieStatic, playerSquaddieDynamic);
            ObjectRepositoryService.addSquaddie(onePlayerOneEnemy, enemySquaddieStatic, enemySquaddieDynamic);

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

        it('should not show the button if there is fewer than 2 player controllable squaddies', () => {
            const onePlayerOneEnemy = ObjectRepositoryService.new();
            ObjectRepositoryService.addSquaddie(onePlayerOneEnemy, playerSquaddieStatic, playerSquaddieDynamic);
            ObjectRepositoryService.addSquaddie(onePlayerOneEnemy, enemySquaddieStatic, enemySquaddieDynamic);
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
                repository: squaddieRepository,
            });

            hud.selectSquaddieAndDrawWindow({
                battleId: playerSquaddieDynamic.battleSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state: state,
            });

            expect(hud.selectedBattleSquaddieId).toBe(playerSquaddieDynamic.battleSquaddieId);
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

            missionMap.addSquaddie(playerSquaddieStatic.squaddieId.templateId, playerSquaddieDynamic.battleSquaddieId, {
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
