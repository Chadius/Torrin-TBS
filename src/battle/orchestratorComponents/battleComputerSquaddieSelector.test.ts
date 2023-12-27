import {BattleOrchestratorStateHelper} from "../orchestrator/battleOrchestratorState";
import {BattlePhase} from "./battlePhaseTracker";
import {BattleSquaddieTeam, BattleSquaddieTeamHelper} from "../battleSquaddieTeam";
import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddie, BattleSquaddieHelper} from "../battleSquaddie";
import {SquaddieTurnHandler} from "../../squaddie/turn";
import {
    BattleOrchestratorChanges,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {HighlightTileDescription, TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera, PanningInformation} from "../battleCamera";
import {convertMapCoordinatesToWorldCoordinates} from "../../hexMap/convertCoordinates";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {BattleEvent} from "../history/battleEvent";
import * as determineNextInstruction from "../teamStrategy/determineNextInstruction";
import {SquaddieAction, SquaddieActionHandler} from "../../squaddie/action";
import {
    SquaddieInstructionInProgress,
    SquaddieInstructionInProgressHandler
} from "../history/squaddieInstructionInProgress";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieSquaddieActionData} from "../history/squaddieSquaddieAction";
import {
    BattleComputerSquaddieSelector,
    SHOW_SELECTED_ACTION_TIME,
    SQUADDIE_SELECTOR_PANNING_TIME
} from "./battleComputerSquaddieSelector";
import {DamageType, GetHitPoints, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {BattlePhaseState} from "./battlePhaseController";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {SquaddieEndTurnAction} from "../history/squaddieEndTurnAction";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {TeamStrategyType} from "../teamStrategy/teamStrategy";
import {BattleStateHelper} from "../orchestrator/battleState";
import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {GameEngineState, GameEngineStateHelper} from "../../gameEngine/gameEngine";

describe('BattleComputerSquaddieSelector', () => {
    let selector: BattleComputerSquaddieSelector = new BattleComputerSquaddieSelector();
    let squaddieRepo: ObjectRepository = ObjectRepositoryHelper.new();
    let missionMap: MissionMap;
    let enemyDemonTemplate: SquaddieTemplate;
    let enemyDemonBattleSquaddie: BattleSquaddie;
    let enemyDemonDynamic2: BattleSquaddie;
    let demonBiteAction: SquaddieAction;
    let entireTurnDemonBiteAction: SquaddieAction;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    let battlePhaseState: BattlePhaseState;
    let teams: BattleSquaddieTeam[];

    beforeEach(() => {
        selector = new BattleComputerSquaddieSelector();
        squaddieRepo = ObjectRepositoryHelper.new();
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
            };

        demonBiteAction = SquaddieActionHandler.new({
            name: "demon bite",
            id: "demon_bite",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
                [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
            }),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 2,
            damageDescriptions: {
                [DamageType.BODY]: 2,
            },
        });

        entireTurnDemonBiteAction = SquaddieActionHandler.new({
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

        enemyDemonDynamic2 = BattleSquaddieHelper.newBattleSquaddie({
            squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
            battleSquaddieId: "enemy_demon_2",
            squaddieTurn: SquaddieTurnHandler.new(),
        });

        ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo, enemyDemonDynamic2);

        BattleSquaddieTeamHelper.addBattleSquaddieIds(enemyTeam, [enemyDemonBattleSquaddie.battleSquaddieId, enemyDemonDynamic2.battleSquaddieId]);

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
            enemyDemonDynamic2.battleSquaddieId,
            {q: 0, r: 1}
        );
    }

    const makeSquaddieMoveAction = (squaddieTemplateId: string, battleSquaddieId: string) => {
        const moveAction: SquaddieActionsForThisRound = {
            squaddieTemplateId,
            battleSquaddieId,
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.addAction(moveAction, {
            type: SquaddieActionType.MOVEMENT,
            data: {
                destination: {q: 1, r: 1},
                numberOfActionPointsSpent: 1,
            }
        });
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
                battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                    squaddieRepository: squaddieRepo,
                    resourceHandler: undefined,
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateHelper.newBattleState({
                        missionId: "test mission",
                        battlePhaseState,
                        camera,
                        missionMap,
                        teams,
                        recording: {history: []},
                    })
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
            const strategySpy = jest.spyOn(determineNextInstruction, "DetermineNextInstruction");

            const state: GameEngineState = GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                    squaddieRepository: squaddieRepo,
                    resourceHandler: undefined,
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateHelper.newBattleState({
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

            const endTurnInstruction: SquaddieInstructionInProgress =
                {
                    movingBattleSquaddieIds: [],
                    squaddieActionsForThisRound: {
                        squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
                        battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
                        startingLocation: {q: 0, r: 0},
                        actions: [],
                    },
                    currentlySelectedAction: undefined,
                };
            SquaddieInstructionInProgressHandler.addConfirmedAction(endTurnInstruction, new SquaddieEndTurnAction({}));

            expect(SquaddieActionsForThisRoundHandler.getMostRecentAction(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound).type).toBe(SquaddieActionType.END_TURN);

            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);

            const history = state.battleOrchestratorState.battleState.recording.history;
            expect(history).toHaveLength(1);
            expect(history[0]).toStrictEqual({
                instruction: endTurnInstruction,
                results: undefined,
            });

            expect(strategySpy).toHaveBeenCalled();
            strategySpy.mockClear();
        });

        it('will default to ending its turn if none of the strategies provide instruction', () => {
            const state: GameEngineState = GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                    resourceHandler: undefined,
                    battleSquaddieSelectedHUD: undefined,
                    squaddieRepository: squaddieRepo,
                    battleState: BattleStateHelper.newBattleState({
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
            jest.spyOn(determineNextInstruction, "DetermineNextInstruction").mockReturnValue(undefined);
            selector.update(state, mockedP5GraphicsContext);
            expect(selector.hasCompleted(state)).toBeTruthy();

            const endTurnActionInstruction: SquaddieActionsForThisRound = state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound;
            const mostRecentAction = SquaddieActionsForThisRoundHandler.getMostRecentAction(endTurnActionInstruction);
            expect(mostRecentAction.type).toBe(SquaddieActionType.END_TURN);

            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);
        });
    });

    it('will change phase if no squaddies are able to act', () => {
        makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        BattleSquaddieHelper.endTurn(enemyDemonBattleSquaddie);

        const squaddieSquaddieAction: SquaddieActionsForThisRound = {
            squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
            battleSquaddieId: enemyDemonDynamic2.battleSquaddieId,
            startingLocation: {q: 0, r: 1},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.addAction(squaddieSquaddieAction, {
            type: SquaddieActionType.SQUADDIE,
            data: {
                targetLocation: {q: 0, r: 0},
                squaddieAction: entireTurnDemonBiteAction,
            }
        });

        const state: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                resourceHandler: undefined,
                battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                squaddieRepository: squaddieRepo,
                battleState: BattleStateHelper.newBattleState({
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

        jest.spyOn(determineNextInstruction, "DetermineNextInstruction").mockReturnValue(squaddieSquaddieAction);
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        selector.update(state, mockedP5GraphicsContext);


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
                enemyDemonDynamic2.battleSquaddieId,
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
                battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                    resourceHandler: undefined,
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                    squaddieRepository: squaddieRepo,
                    battleState: BattleStateHelper.newBattleState({
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

            jest.spyOn(determineNextInstruction, "DetermineNextInstruction").mockReturnValue(moveAction);
            selector.update(state, mockedP5GraphicsContext);

            expect(selector.hasCompleted(state)).toBeTruthy();
            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);

            expect(state.battleOrchestratorState.battleState.squaddieMovePath.destination).toStrictEqual(SquaddieActionsForThisRoundHandler.destinationLocation(moveAction));
            expect(SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBe("enemy_demon_0");
            expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound.actions).toHaveLength(1);
            expect(SquaddieActionsForThisRoundHandler.getMostRecentAction(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound).type).toBe(SquaddieActionType.MOVEMENT);
            expect(hexMapHighlightTilesSpy).toBeCalled();
        });

        describe('computer controlled squaddie acts', () => {
            let state: GameEngineState;

            beforeEach(() => {
                const squaddieSquaddieAction: SquaddieActionsForThisRound = {
                    squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
                    battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
                    startingLocation: {q: 0, r: 0},
                    actions: [],
                };
                SquaddieActionsForThisRoundHandler.addAction(squaddieSquaddieAction, {
                    type: SquaddieActionType.SQUADDIE,
                    data: {
                        targetLocation: {q: 0, r: 1},
                        squaddieAction: demonBiteAction,
                    }
                });

                state = GameEngineStateHelper.new({
                    battleOrchestratorState:
                        BattleOrchestratorStateHelper.newOrchestratorState({
                            resourceHandler: undefined,
                            battleSquaddieSelectedHUD: undefined,
                            squaddieRepository: squaddieRepo,
                            battleState: BattleStateHelper.newBattleState({
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
                jest.spyOn(determineNextInstruction, "DetermineNextInstruction").mockReturnValue(squaddieSquaddieAction);

                jest.spyOn(Date, 'now').mockImplementation(() => 0);
                selector.update(state, mockedP5GraphicsContext);
            });

            it('will indicate the next action', () => {
                expect(SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBe(enemyDemonBattleSquaddie.battleSquaddieId);
                expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound.actions).toHaveLength(1);
                expect(SquaddieActionsForThisRoundHandler.getMostRecentAction(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound).type).toBe(SquaddieActionType.SQUADDIE);
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
                expect(mostRecentEvent.instruction.squaddieActionsForThisRound.actions).toHaveLength(1);
                expect((
                    mostRecentEvent.instruction.squaddieActionsForThisRound.actions[0].data as SquaddieSquaddieActionData
                ).squaddieAction.id).toBe(demonBiteAction.id);
                const results = mostRecentEvent.results;
                expect(results.actingBattleSquaddieId).toBe(enemyDemonBattleSquaddie.battleSquaddieId);
                expect(results.targetedBattleSquaddieIds).toHaveLength(1);
                expect(results.targetedBattleSquaddieIds[0]).toBe(enemyDemonDynamic2.battleSquaddieId);
                expect(results.resultPerTarget[enemyDemonDynamic2.battleSquaddieId]).toBeTruthy();
            });

            it('should store the calculated results', () => {
                const mostRecentEvent: BattleEvent = state.battleOrchestratorState.battleState.recording.history[0];
                const demonOneBitesDemonTwoResults = mostRecentEvent.results.resultPerTarget[enemyDemonDynamic2.battleSquaddieId];
                expect(demonOneBitesDemonTwoResults.damageTaken).toBe(demonBiteAction.damageDescriptions[DamageType.BODY]);

                const {maxHitPoints, currentHitPoints} = GetHitPoints({
                    squaddieTemplate: enemyDemonTemplate,
                    battleSquaddie: enemyDemonDynamic2
                });
                expect(currentHitPoints).toBe(maxHitPoints - demonBiteAction.damageDescriptions[DamageType.BODY]);
            });
        });
    });
});
