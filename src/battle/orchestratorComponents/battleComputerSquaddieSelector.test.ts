import {BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {BattlePhase} from "./battlePhaseTracker";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddie, BattleSquaddieService} from "../battleSquaddie";
import {SquaddieTurnService} from "../../squaddie/turn";
import {
    BattleOrchestratorChanges,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {HighlightTileDescription, TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera, PanningInformation} from "../battleCamera";
import {convertMapCoordinatesToWorldCoordinates} from "../../hexMap/convertCoordinates";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {BattleEvent, BattleEventService} from "../history/battleEvent";
import {DetermineNextDecisionService} from "../teamStrategy/determineNextDecision";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {
    BattleComputerSquaddieSelector,
    SHOW_SELECTED_ACTION_TIME,
    SQUADDIE_SELECTOR_PANNING_TIME
} from "./battleComputerSquaddieSelector";
import {DamageType, GetHitPoints, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {BattlePhaseState} from "./battlePhaseController";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {TeamStrategyType} from "../teamStrategy/teamStrategy";
import {BattleStateService} from "../orchestrator/battleState";
import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {DrawSquaddieUtilities} from "../animation/drawSquaddie";
import {CampaignService} from "../../campaign/campaign";
import {ActionTemplate, ActionTemplateService} from "../../action/template/actionTemplate";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../action/template/actionEffectSquaddieTemplate";
import {DecidedAction, DecidedActionService} from "../../action/decided/decidedAction";
import {DecidedActionSquaddieEffectService} from "../../action/decided/decidedActionSquaddieEffect";
import {DecidedActionMovementEffectService} from "../../action/decided/decidedActionMovementEffect";
import {DecidedActionEndTurnEffectService} from "../../action/decided/decidedActionEndTurnEffect";
import {ActionEffectType} from "../../action/template/actionEffectTemplate";
import {ActionsThisRoundService} from "../history/actionsThisRound";
import {ProcessedActionSquaddieEffect} from "../../action/processed/processedActionSquaddieEffect";
import {ProcessedActionEndTurnEffectService} from "../../action/processed/processedActionEndTurnEffect";
import {ActionEffectEndTurnTemplateService} from "../../action/template/actionEffectEndTurnTemplate";
import {ProcessedActionService} from "../../action/processed/processedAction";

describe('BattleComputerSquaddieSelector', () => {
    let selector: BattleComputerSquaddieSelector = new BattleComputerSquaddieSelector();
    let squaddieRepo: ObjectRepository = ObjectRepositoryService.new();
    let missionMap: MissionMap;
    let enemyDemonTemplate: SquaddieTemplate;
    let enemyDemonBattleSquaddie: BattleSquaddie;
    let enemyDemonBattleSquaddie2: BattleSquaddie;
    let demonBiteAction: ActionTemplate;
    let entireTurnDemonBiteAction: ActionTemplate;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    let battlePhaseState: BattlePhaseState;
    let teams: BattleSquaddieTeam[];
    let demonBiteActionDamage: number;

    beforeEach(() => {
        selector = new BattleComputerSquaddieSelector();
        squaddieRepo = ObjectRepositoryService.new();
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        teams = [];
    });

    const makeBattlePhaseTrackerWithEnemyTeam = (missionMap: MissionMap) => {
        const enemyTeam: BattleSquaddieTeam =
            {
                id: "teamId",
                name: "enemies cannot be controlled by the player",
                affiliation: SquaddieAffiliation.ENEMY,
                battleSquaddieIds: [],
                iconResourceKey: "icon_enemy_team",
            };

        demonBiteActionDamage = 2;
        demonBiteAction = ActionTemplateService.new({
            name: "demon bite",
            id: "demon_bite",
            actionPoints: 2,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {
                        [DamageType.BODY]: demonBiteActionDamage,
                    },
                }),
            ],
        });

        entireTurnDemonBiteAction = ActionTemplateService.new({
            name: "demon bite",
            id: "demon_bite",
            actionPoints: 3,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues(
                        {
                            [Trait.ATTACK]: true,
                            [Trait.TARGET_ARMOR]: true,
                            [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
                        }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {
                        [DamageType.BODY]: 20,
                    },
                })
            ],
        });

        ({
            battleSquaddie: enemyDemonBattleSquaddie,
            squaddieTemplate: enemyDemonTemplate,
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "enemy_demon",
            name: "Slither Demon",
            affiliation: SquaddieAffiliation.ENEMY,
            battleId: "enemy_demon_0",
            squaddieRepository: squaddieRepo,
            actionTemplates: [demonBiteAction],
            attributes: {
                maxHitPoints: 5,
                movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                armorClass: 0,
            }
        }));

        enemyDemonBattleSquaddie2 = BattleSquaddieService.newBattleSquaddie({
            squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
            battleSquaddieId: "enemy_demon_2",
            squaddieTurn: SquaddieTurnService.new(),
        });

        ObjectRepositoryService.addBattleSquaddie(squaddieRepo, enemyDemonBattleSquaddie2);

        BattleSquaddieTeamService.addBattleSquaddieIds(enemyTeam, [enemyDemonBattleSquaddie.battleSquaddieId, enemyDemonBattleSquaddie2.battleSquaddieId]);

        battlePhaseState = {
            currentAffiliation: BattlePhase.ENEMY,
            turnCount: 1,
        }

        teams.push(enemyTeam);

        missionMap.addSquaddie(
            enemyDemonTemplate.squaddieId.templateId,
            enemyDemonBattleSquaddie.battleSquaddieId,
            {q: 0, r: 0}
        );
        missionMap.addSquaddie(
            enemyDemonBattleSquaddie.squaddieTemplateId,
            enemyDemonBattleSquaddie2.battleSquaddieId,
            {q: 0, r: 1}
        );
    }

    const makeSquaddieMoveAction = (battleSquaddieId: string): DecidedAction => {
        return DecidedActionService.new({
            battleSquaddieId,
            actionTemplateName: "Move",
            actionEffects: [
                DecidedActionMovementEffectService.new({
                    template: undefined,
                    destination: {q: 1, r: 1},
                })
            ],
        });
    }

    it('moves camera to an uncontrollable squaddie before before moving', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 "]
            })
        });

        makeBattlePhaseTrackerWithEnemyTeam(missionMap);
        const strategySpy = jest.spyOn(DetermineNextDecisionService, "determineNextDecision").mockReturnValue(
            DecidedActionService.new({
                battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
                actionTemplateName: "End Turn",
                actionEffects: [
                    DecidedActionEndTurnEffectService.new({
                        template: undefined,
                    })
                ],
            })
        );

        const squaddieLocation: number[] = convertMapCoordinatesToWorldCoordinates(0, 0);
        const camera: BattleCamera = new BattleCamera(
            squaddieLocation[0] + (ScreenDimensions.SCREEN_WIDTH * 2),
            squaddieLocation[1] + (ScreenDimensions.SCREEN_HEIGHT * 2),
        );
        const state: GameEngineState = GameEngineStateService.new(
            {
                repository: squaddieRepo,
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        battlePhaseState,
                        camera,
                        missionMap,
                        teams,
                        teamStrategiesById: {
                            "teamId": [
                                {
                                    type: TeamStrategyType.END_TURN,
                                    options: {}
                                }
                            ]
                        },
                        recording: {history: []},
                    }),
                })
            }
        );

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        jest.spyOn(DrawSquaddieUtilities, 'drawSquaddieMapIconAtMapLocation').mockImplementation(() => {
        });

        camera.moveCamera();
        selector.update(state, mockedP5GraphicsContext);
        expect(strategySpy).toHaveBeenCalled();

        expect(selector.hasCompleted(state)).toBeFalsy();
        expect(camera.isPanning()).toBeTruthy();
        const panningInfo: PanningInformation = camera.getPanningInformation();
        expect(panningInfo.xDestination).toBe(squaddieLocation[0]);
        expect(panningInfo.yDestination).toBe(squaddieLocation[1]);

        jest.spyOn(Date, 'now').mockImplementation(() => SQUADDIE_SELECTOR_PANNING_TIME);
        camera.moveCamera();
        selector.update(state, mockedP5GraphicsContext);

        expect(selector.hasCompleted(state)).toBeTruthy();
        expect(camera.isPanning()).toBeFalsy();
    });

    describe('squaddie team strategy ends the turn', () => {
        let missionMap: MissionMap;

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                })
            });
            makeBattlePhaseTrackerWithEnemyTeam(missionMap);
        });

        it('instructs the squaddie to end turn when the player cannot control the team squaddies', () => {
            const strategySpy = jest.spyOn(DetermineNextDecisionService, "determineNextDecision");

            const state: GameEngineState = GameEngineStateService.new({
                repository: squaddieRepo,
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        battlePhaseState,
                        missionMap,
                        recording: {history: []},
                        teams,
                        teamStrategiesById: {
                            "teamId":
                                [{
                                    type: TeamStrategyType.END_TURN,
                                    options: {},
                                }],
                        },
                    })
                })
            });

            selector.update(state, mockedP5GraphicsContext);
            expect(selector.hasCompleted(state)).toBeTruthy();

            const processedAction = ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    actionTemplateName: "End Turn",
                    battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
                    actionEffects: [
                        DecidedActionEndTurnEffectService.new({
                            template: ActionEffectEndTurnTemplateService.new({})
                        })
                    ]
                }),
                processedActionEffects: [
                    ProcessedActionEndTurnEffectService.new({
                        decidedActionEffect: DecidedActionEndTurnEffectService.new({
                            template: ActionEffectEndTurnTemplateService.new({})
                        })
                    })
                ]
            });
            expect(state.battleOrchestratorState.battleState.actionsThisRound).toEqual(
                ActionsThisRoundService.new({
                    battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
                    startingLocation: {q: 0, r: 0},
                    processedActions: [
                        processedAction
                    ],
                })
            );

            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);

            const history = state.battleOrchestratorState.battleState.recording.history;
            expect(history).toHaveLength(1);
            expect(history[0]).toStrictEqual(BattleEventService.new({
                    processedAction,
                    results: undefined,
                })
            );

            expect(strategySpy).toHaveBeenCalled();
            strategySpy.mockClear();
            expect(ActionsThisRoundService.getProcessedActionEffectToShow(state.battleOrchestratorState.battleState.actionsThisRound)).toEqual(processedAction.processedActionEffects[0]);
        });

        describe('default to ending its turn if none of the strategies provide instruction', () => {
            let state: GameEngineState;
            let determineNextDecisionSpy: jest.SpyInstance;
            beforeEach(() => {
                state = GameEngineStateService.new({
                    repository: squaddieRepo,
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                        battleSquaddieSelectedHUD: undefined,
                        battleState: BattleStateService.newBattleState({
                            missionId: "test mission",
                            battlePhaseState,
                            missionMap,
                            recording: {history: []},
                            teams,
                            teamStrategiesById: {
                                "teamId":
                                    [{
                                        type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                                        options: {},
                                    }],
                            },
                        })
                    })
                });
                determineNextDecisionSpy = jest.spyOn(DetermineNextDecisionService, "determineNextDecision").mockReturnValue(undefined);
            });

            it('will default to ending its turn if none of the strategies provide instruction', () => {
                selector.update(state, mockedP5GraphicsContext);
                expect(selector.hasCompleted(state)).toBeTruthy();
                expect(determineNextDecisionSpy).toBeCalled();
                expect(state.battleOrchestratorState.battleState.actionsThisRound.processedActions[0].decidedAction.actionEffects[0].type).toEqual(ActionEffectType.END_TURN);

                const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
                expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);
            });

            it('will not pan the camera to the squaddie', () => {
                state.battleOrchestratorState.battleState.camera = new BattleCamera(ScreenDimensions.SCREEN_WIDTH * 10, ScreenDimensions.SCREEN_HEIGHT * 10);
                selector.update(state, mockedP5GraphicsContext);
                expect(selector.hasCompleted(state)).toBeTruthy();
                expect(determineNextDecisionSpy).toBeCalled();

                expect(state.battleOrchestratorState.battleState.camera.isPanning()).toBeFalsy();
            });
        });
    });

    describe('computer decides to act', () => {
        let missionMap: MissionMap;
        let hexMap: TerrainTileMap;
        let hexMapHighlightTilesSpy: jest.SpyInstance;
        let camera: BattleCamera;

        beforeEach(() => {
            hexMap = new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 1 1 1 ",
                ]
            });
            hexMapHighlightTilesSpy = jest.spyOn(hexMap, "highlightTiles");

            missionMap = new MissionMap({
                terrainTileMap: hexMap
            });
            makeBattlePhaseTrackerWithEnemyTeam(missionMap);

            missionMap.addSquaddie(
                enemyDemonTemplate.squaddieId.templateId,
                enemyDemonBattleSquaddie.battleSquaddieId,
                {q: 0, r: 0},
            );
            missionMap.addSquaddie(
                enemyDemonTemplate.squaddieId.templateId,
                enemyDemonBattleSquaddie2.battleSquaddieId,
                {q: 0, r: 1},
            );

            camera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
        });

        it('will prepare to move if computer controlled squaddie wants to move', () => {
            const moveAction = makeSquaddieMoveAction(enemyDemonBattleSquaddie.battleSquaddieId);

            const state: GameEngineState = GameEngineStateService.new({
                repository: squaddieRepo,
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        recording: {history: []},
                        battlePhaseState,
                        camera,
                        missionMap,
                        teams,
                        teamStrategiesById: {
                            "teamId":
                                [{
                                    type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                                    options: {},
                                }],
                        },
                    })
                }),
                campaign: CampaignService.default({}),
            });

            jest.spyOn(DetermineNextDecisionService, "determineNextDecision").mockReturnValue(moveAction);
            selector.update(state, mockedP5GraphicsContext);

            expect(selector.hasCompleted(state)).toBeTruthy();
            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);

            expect(state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId).toEqual("enemy_demon_0");
            expect(state.battleOrchestratorState.battleState.actionsThisRound.processedActions).toHaveLength(1);
            expect(state.battleOrchestratorState.battleState.actionsThisRound.processedActions[0].processedActionEffects[0].type).toEqual(ActionEffectType.MOVEMENT);

            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeTruthy();
            expect(ActionsThisRoundService.getProcessedActionEffectToShow(state.battleOrchestratorState.battleState.actionsThisRound).type).toEqual(ActionEffectType.MOVEMENT);

            expect(hexMapHighlightTilesSpy).toBeCalled();
        });

        describe('computer controlled squaddie acts', () => {
            let state: GameEngineState;
            let demonBiteDecision: DecidedAction;

            beforeEach(() => {
                demonBiteDecision = DecidedActionService.new({
                    battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
                    actionTemplateName: demonBiteAction.name,
                    actionTemplateId: demonBiteAction.id,
                    actionEffects: [
                        DecidedActionSquaddieEffectService.new({
                            template: demonBiteAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                            target: {q: 0, r: 1},
                        })
                    ],
                });

                state = GameEngineStateService.new({
                    repository: squaddieRepo,
                    resourceHandler: undefined,
                    battleOrchestratorState:
                        BattleOrchestratorStateService.newOrchestratorState({
                            battleSquaddieSelectedHUD: undefined,
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                battlePhaseState,
                                camera,
                                missionMap,
                                teams,
                                teamStrategiesById: {
                                    "teamId":
                                        [{
                                            type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                            options: {},
                                        }],
                                },
                                recording: {history: []},
                            })
                        })
                });
                jest.spyOn(DetermineNextDecisionService, "determineNextDecision").mockReturnValue(demonBiteDecision);

                jest.spyOn(Date, 'now').mockImplementation(() => 0);
                selector.update(state, mockedP5GraphicsContext);
            });

            it('will indicate the next action', () => {
                expect(state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId).toEqual(enemyDemonBattleSquaddie.battleSquaddieId);
                expect(state.battleOrchestratorState.battleState.actionsThisRound.processedActions).toHaveLength(1);
                expect(state.battleOrchestratorState.battleState.actionsThisRound.processedActions[0].processedActionEffects[0].type).toEqual(ActionEffectType.SQUADDIE);
            });

            it('highlight the map target and its spread', () => {
                expect(hexMapHighlightTilesSpy).toBeCalled();
                const actualTiles = hexMapHighlightTilesSpy.mock.calls[0][0] as HighlightTileDescription[];
                expect(actualTiles).toHaveLength(1);
                expect(actualTiles[0].tiles).toHaveLength(1);
                expect(actualTiles[0].tiles[0]).toStrictEqual({q: 0, r: 1});
            });

            it('waits and then completes the component', () => {
                expect(selector.hasCompleted(state)).toBeFalsy();
                selector.update(state, mockedP5GraphicsContext);

                jest.spyOn(Date, 'now').mockImplementation(() => SHOW_SELECTED_ACTION_TIME);
                selector.update(state, mockedP5GraphicsContext);
                expect(selector.hasCompleted(state)).toBeTruthy();
            })

            it('waits and then will recommend squaddie squaddie action as the next field', () => {
                jest.spyOn(Date, 'now').mockImplementation(() => SHOW_SELECTED_ACTION_TIME);
                selector.update(state, mockedP5GraphicsContext);
                const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
                expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);

                expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeTruthy();
                expect(ActionsThisRoundService.getProcessedActionEffectToShow(state.battleOrchestratorState.battleState.actionsThisRound).decidedActionEffect.type).toEqual(ActionEffectType.SQUADDIE);
            });

            it('player can click to complete the component if an action is selected', () => {
                expect(selector.hasCompleted(state)).toBeFalsy();
                selector.update(state, mockedP5GraphicsContext);

                const mouseEvent: OrchestratorComponentMouseEvent = {
                    eventType: OrchestratorComponentMouseEventType.CLICKED,
                    mouseX: 0,
                    mouseY: 0,
                };

                selector.mouseEventHappened(state, mouseEvent);
                selector.update(state, mockedP5GraphicsContext);
                expect(selector.hasCompleted(state)).toBeTruthy();
            });

            it('should consume the squaddie action points', () => {
                const {actionPointsRemaining} = GetNumberOfActionPoints({
                    squaddieTemplate: enemyDemonTemplate,
                    battleSquaddie: enemyDemonBattleSquaddie,
                });
                expect(actionPointsRemaining).toBe(3 - demonBiteAction.actionPoints);
            });

            it('should add the results to the history', () => {
                expect(state.battleOrchestratorState.battleState.recording.history).toHaveLength(1);

                const mostRecentEvent: BattleEvent = state.battleOrchestratorState.battleState.recording.history[0];
                expect(mostRecentEvent.processedAction.processedActionEffects[0].type).toEqual(ActionEffectType.SQUADDIE);

                const processedActionSquaddieEffect = mostRecentEvent.processedAction.processedActionEffects[0] as ProcessedActionSquaddieEffect;
                const results = processedActionSquaddieEffect.results;
                expect(results.actingBattleSquaddieId).toBe(enemyDemonBattleSquaddie.battleSquaddieId);
                expect(results.targetedBattleSquaddieIds).toHaveLength(1);
                expect(results.targetedBattleSquaddieIds[0]).toBe(enemyDemonBattleSquaddie2.battleSquaddieId);
                expect(results.resultPerTarget[enemyDemonBattleSquaddie2.battleSquaddieId]).toBeTruthy();
            });

            it('should store the calculated results', () => {
                const mostRecentEvent: BattleEvent = state.battleOrchestratorState.battleState.recording.history[0];
                const demonOneBitesDemonTwoResults = mostRecentEvent.results.resultPerTarget[enemyDemonBattleSquaddie2.battleSquaddieId];
                expect(demonOneBitesDemonTwoResults.damageTaken).toBe(demonBiteActionDamage);

                const {maxHitPoints, currentHitPoints} = GetHitPoints({
                    squaddieTemplate: enemyDemonTemplate,
                    battleSquaddie: enemyDemonBattleSquaddie2
                });
                expect(currentHitPoints).toBe(maxHitPoints - demonBiteActionDamage);
            });
        });
    });
});
