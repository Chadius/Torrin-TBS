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
import {
    SquaddieActionsForThisRoundService,
    SquaddieDecisionsDuringThisPhase
} from "../history/squaddieDecisionsDuringThisPhase";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera, PanningInformation} from "../battleCamera";
import {convertMapCoordinatesToWorldCoordinates} from "../../hexMap/convertCoordinates";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {BattleEvent} from "../history/battleEvent";
import * as determineNextInstruction from "../teamStrategy/determineNextDecision";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../decision/actionEffectSquaddieTemplate";
import {
    CurrentlySelectedSquaddieDecision,
    CurrentlySelectedSquaddieDecisionService
} from "../history/currentlySelectedSquaddieDecision";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {ActionEffectSquaddie, ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {
    BattleComputerSquaddieSelector,
    SHOW_SELECTED_ACTION_TIME,
    SQUADDIE_SELECTOR_PANNING_TIME
} from "./battleComputerSquaddieSelector";
import {DamageType, GetHitPoints, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {BattlePhaseState} from "./battlePhaseController";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {ActionEffectType} from "../../decision/actionEffect";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {TeamStrategyType} from "../teamStrategy/teamStrategy";
import {BattleStateService} from "../orchestrator/battleState";
import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {GameEngineState, GameEngineStateHelper} from "../../gameEngine/gameEngine";
import {DecisionService} from "../../decision/decision";
import {ActionEffectMovement, ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {ActionCalculator} from "../actionCalculator/calculator";

describe('BattleComputerSquaddieSelector', () => {
    let selector: BattleComputerSquaddieSelector = new BattleComputerSquaddieSelector();
    let squaddieRepo: ObjectRepository = ObjectRepositoryService.new();
    let missionMap: MissionMap;
    let enemyDemonTemplate: SquaddieTemplate;
    let enemyDemonBattleSquaddie: BattleSquaddie;
    let enemyDemonBattleSquaddie2: BattleSquaddie;
    let demonBiteAction: ActionEffectSquaddieTemplate;
    let entireTurnDemonBiteAction: ActionEffectSquaddieTemplate;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    let battlePhaseState: BattlePhaseState;
    let teams: BattleSquaddieTeam[];
    let actionEffectMovement: ActionEffectMovement;

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

        demonBiteAction = ActionEffectSquaddieTemplateService.new({
            name: "demon bite",
            id: "demon_bite",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
                [Trait.ALWAYS_SUCCEEDS]: true,
                [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
            }),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 2,
            damageDescriptions: {
                [DamageType.BODY]: 2,
            },
        });

        entireTurnDemonBiteAction = ActionEffectSquaddieTemplateService.new({
            name: "demon bite",
            id: "demon_bite",
            traits: TraitStatusStorageHelper.newUsingTraitValues(
                {
                    [Trait.ATTACK]: true,
                    [Trait.TARGET_ARMOR]: true,
                    [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
                }),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 3,
            damageDescriptions: {
                [DamageType.BODY]: 20,
            },
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
            actions: [demonBiteAction],
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

    const makeSquaddieMoveAction = (squaddieTemplateId: string, battleSquaddieId: string) => {
        const moveAction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId,
            battleSquaddieId,
            startingLocation: {q: 0, r: 0},
        });
        actionEffectMovement = ActionEffectMovementService.new({
            destination: {q: 1, r: 1},
            numberOfActionPointsSpent: 1,
        });
        SquaddieActionsForThisRoundService.addDecision(moveAction, DecisionService.new({
            actionEffects: [
                actionEffectMovement
            ]
        }));
        return moveAction;
    }

    it('moves camera to an uncontrollable squaddie before before moving', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 "]
            })
        });

        makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        const squaddieLocation: number[] = convertMapCoordinatesToWorldCoordinates(0, 0);
        const camera: BattleCamera = new BattleCamera(
            squaddieLocation[0] + (ScreenDimensions.SCREEN_WIDTH * 2),
            squaddieLocation[1] + (ScreenDimensions.SCREEN_HEIGHT * 2),
        );
        const state: GameEngineState = GameEngineStateHelper.new(
            {
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    squaddieRepository: squaddieRepo,
                    resourceHandler: undefined,
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        battlePhaseState,
                        camera,
                        missionMap,
                        teams,
                        recording: {history: []},
                    }),
                })
            }
        );

        jest.spyOn(Date, 'now').mockImplementation(() => 0);

        camera.moveCamera();
        selector.update(state, mockedP5GraphicsContext);

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
            const strategySpy = jest.spyOn(determineNextInstruction, "DetermineNextDecision");

            const state: GameEngineState = GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    squaddieRepository: squaddieRepo,
                    resourceHandler: undefined,
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

            const endTurnDecision = DecisionService.new({
                actionEffects: [
                    ActionEffectEndTurnService.new()
                ]
            });
            const endTurnInstruction: CurrentlySelectedSquaddieDecision =
                CurrentlySelectedSquaddieDecisionService.new({
                    squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                        squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
                        battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
                        startingLocation: {q: 0, r: 0},
                        decisions: [
                            endTurnDecision
                        ]
                    }),
                    currentlySelectedDecision: undefined,
                });

            expect(SquaddieActionsForThisRoundService.getMostRecentDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase).actionEffects[0].type).toBe(ActionEffectType.END_TURN);

            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);

            const history = state.battleOrchestratorState.battleState.recording.history;
            expect(history).toHaveLength(1);
            expect(history[0]).toStrictEqual({
                instruction: {
                    ...endTurnInstruction,
                    currentlySelectedDecision: endTurnDecision,
                },
                results: undefined,
            });

            expect(strategySpy).toHaveBeenCalled();
            strategySpy.mockClear();

            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toEqual(endTurnInstruction.squaddieDecisionsDuringThisPhase.decisions[0].actionEffects[0]);
        });

        it('will default to ending its turn if none of the strategies provide instruction', () => {
            const state: GameEngineState = GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    resourceHandler: undefined,
                    battleSquaddieSelectedHUD: undefined,
                    squaddieRepository: squaddieRepo,
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
            jest.spyOn(determineNextInstruction, "DetermineNextDecision").mockReturnValue(undefined);
            selector.update(state, mockedP5GraphicsContext);
            expect(selector.hasCompleted(state)).toBeTruthy();

            const endTurnActionInstruction: SquaddieDecisionsDuringThisPhase = state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase;
            const mostRecentDecision = SquaddieActionsForThisRoundService.getMostRecentDecision(endTurnActionInstruction);
            expect(mostRecentDecision.actionEffects[0].type).toBe(ActionEffectType.END_TURN);

            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);
        });
    });

    it('will change phase if no squaddies are able to act', () => {
        makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        BattleSquaddieService.endTurn(enemyDemonBattleSquaddie);

        const squaddieSquaddieAction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
            battleSquaddieId: enemyDemonBattleSquaddie2.battleSquaddieId,
            startingLocation: {q: 0, r: 1},
            decisions: [
                DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            targetLocation: {q: 0, r: 0},
                            template: entireTurnDemonBiteAction,
                        })
                    ]
                })
            ],
        });

        const state: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                squaddieRepository: squaddieRepo,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    recording: {history: []},
                    battlePhaseState,
                    missionMap,
                    teams,
                    teamStrategiesById: {
                        "teamId":
                            [{
                                type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                options: {},
                            }],
                    },
                })
            })
        });

        const determineNextActionSpy = jest.spyOn(determineNextInstruction, "DetermineNextDecision").mockReturnValue(squaddieSquaddieAction);
        const resultCalculationSpy = jest.spyOn(ActionCalculator, 'calculateResults').mockReturnValueOnce(undefined);

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        selector.update(state, mockedP5GraphicsContext);
        expect(determineNextActionSpy).toBeCalled();
        expect(resultCalculationSpy).toBeCalled();

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        selector.update(state, mockedP5GraphicsContext);
        jest.spyOn(Date, 'now').mockImplementation(() => SHOW_SELECTED_ACTION_TIME);
        expect(selector.hasCompleted(state)).toBeTruthy();

        let recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);

        selector.reset(state);
        selector.update(state, mockedP5GraphicsContext);
        expect(selector.hasCompleted(state)).toBeTruthy();
        recommendation = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
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
            const moveAction = makeSquaddieMoveAction(
                enemyDemonTemplate.squaddieId.templateId,
                enemyDemonBattleSquaddie.battleSquaddieId,
            );

            const state: GameEngineState = GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    resourceHandler: undefined,
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                    squaddieRepository: squaddieRepo,
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
                })
            });

            jest.spyOn(determineNextInstruction, "DetermineNextDecision").mockReturnValue(moveAction);
            selector.update(state, mockedP5GraphicsContext);

            expect(selector.hasCompleted(state)).toBeTruthy();
            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);

            expect(CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBe("enemy_demon_0");
            expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.decisions).toHaveLength(1);
            expect(SquaddieActionsForThisRoundService.getMostRecentDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase).actionEffects[0].type).toBe(ActionEffectType.MOVEMENT);

            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state.battleOrchestratorState)).toBeTruthy();
            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toEqual(actionEffectMovement);

            expect(hexMapHighlightTilesSpy).toBeCalled();
        });

        describe('computer controlled squaddie acts', () => {
            let state: GameEngineState;
            let squaddieActionEffect: ActionEffectSquaddie;

            beforeEach(() => {
                squaddieActionEffect = ActionEffectSquaddieService.new({
                    targetLocation: {q: 0, r: 1},
                    template: demonBiteAction,
                });

                const squaddieSquaddieAction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                    squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
                    battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
                    startingLocation: {q: 0, r: 0},
                });
                SquaddieActionsForThisRoundService.addDecision(squaddieSquaddieAction, DecisionService.new({
                    actionEffects: [squaddieActionEffect]
                }));

                state = GameEngineStateHelper.new({
                    battleOrchestratorState:
                        BattleOrchestratorStateService.newOrchestratorState({
                            resourceHandler: undefined,
                            battleSquaddieSelectedHUD: undefined,
                            squaddieRepository: squaddieRepo,
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
                jest.spyOn(determineNextInstruction, "DetermineNextDecision").mockReturnValue(squaddieSquaddieAction);

                jest.spyOn(Date, 'now').mockImplementation(() => 0);
                selector.update(state, mockedP5GraphicsContext);
            });

            it('will indicate the next action', () => {
                expect(CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBe(enemyDemonBattleSquaddie.battleSquaddieId);
                expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.decisions).toHaveLength(1);
                expect(SquaddieActionsForThisRoundService.getMostRecentDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase).actionEffects[0].type).toBe(ActionEffectType.SQUADDIE);
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

                expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state.battleOrchestratorState)).toBeTruthy();
                expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toEqual(squaddieActionEffect);
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
                expect(actionPointsRemaining).toBe(3 - demonBiteAction.actionPointCost);
            });

            it('should add the results to the history', () => {
                expect(state.battleOrchestratorState.battleState.recording.history).toHaveLength(1);
                const mostRecentEvent: BattleEvent = state.battleOrchestratorState.battleState.recording.history[0];
                expect(mostRecentEvent.instruction.squaddieDecisionsDuringThisPhase.decisions).toHaveLength(1);
                expect((
                    mostRecentEvent.instruction.squaddieDecisionsDuringThisPhase.decisions[0].actionEffects[0] as ActionEffectSquaddie
                ).template.id).toBe(demonBiteAction.id);
                const results = mostRecentEvent.results;
                expect(results.actingBattleSquaddieId).toBe(enemyDemonBattleSquaddie.battleSquaddieId);
                expect(results.targetedBattleSquaddieIds).toHaveLength(1);
                expect(results.targetedBattleSquaddieIds[0]).toBe(enemyDemonBattleSquaddie2.battleSquaddieId);
                expect(results.resultPerTarget[enemyDemonBattleSquaddie2.battleSquaddieId]).toBeTruthy();
            });

            it('should store the calculated results', () => {
                const mostRecentEvent: BattleEvent = state.battleOrchestratorState.battleState.recording.history[0];
                const demonOneBitesDemonTwoResults = mostRecentEvent.results.resultPerTarget[enemyDemonBattleSquaddie2.battleSquaddieId];
                expect(demonOneBitesDemonTwoResults.damageTaken).toBe(demonBiteAction.damageDescriptions[DamageType.BODY]);

                const {maxHitPoints, currentHitPoints} = GetHitPoints({
                    squaddieTemplate: enemyDemonTemplate,
                    battleSquaddie: enemyDemonBattleSquaddie2
                });
                expect(currentHitPoints).toBe(maxHitPoints - demonBiteAction.damageDescriptions[DamageType.BODY]);
            });
        });
    });
});
