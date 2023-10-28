import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattlePhase} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieTurn} from "../../squaddie/turn";
import {
    BattleOrchestratorChanges,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {HighlightTileDescription, TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {
    SquaddieActionsForThisRound,
    SquaddieActionsForThisRoundData,
    SquaddieActionsForThisRoundHandler
} from "../history/squaddieActionsForThisRound";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera, PanningInformation} from "../battleCamera";
import {convertMapCoordinatesToWorldCoordinates} from "../../hexMap/convertCoordinates";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {BattleEvent} from "../history/battleEvent";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {SquaddieAction} from "../../squaddie/action";
import {
    SquaddieInstructionInProgress,
    SquaddieInstructionInProgressHandler
} from "../history/squaddieInstructionInProgress";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
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

describe('BattleComputerSquaddieSelector', () => {
    let selector: BattleComputerSquaddieSelector = new BattleComputerSquaddieSelector();
    let squaddieRepo: BattleSquaddieRepository = new BattleSquaddieRepository();
    let missionMap: MissionMap;
    let enemyDemonStatic: SquaddieTemplate;
    let enemyDemonDynamic: BattleSquaddie;
    let enemyDemonDynamic2: BattleSquaddie;
    let demonBiteAction: SquaddieAction;
    let entireTurnDemonBiteAction: SquaddieAction;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    let battlePhaseState: BattlePhaseState;
    let teamsByAffiliation: { [affiliation in SquaddieAffiliation]?: BattleSquaddieTeam };

    beforeEach(() => {
        selector = new BattleComputerSquaddieSelector();
        squaddieRepo = new BattleSquaddieRepository();
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        teamsByAffiliation = {};
    });

    const makeBattlePhaseTrackerWithEnemyTeam = (missionMap: MissionMap) => {
        const enemyTeam: BattleSquaddieTeam = new BattleSquaddieTeam(
            {
                name: "enemies cannot be controlled by the player",
                affiliation: SquaddieAffiliation.ENEMY,
                squaddieRepo: squaddieRepo,
            }
        );

        demonBiteAction = new SquaddieAction({
            name: "demon bite",
            id: "demon_bite",
            traits: new TraitStatusStorage({
                initialTraitValues: {
                    [Trait.ATTACK]: true,
                    [Trait.TARGET_ARMOR]: true,
                }
            }).filterCategory(TraitCategory.ACTION),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 2,
            damageDescriptions: {
                [DamageType.Body]: 2,
            },
        });

        demonBiteAction = new SquaddieAction({
            name: "demon bite",
            id: "demon_bite",
            traits: new TraitStatusStorage({
                initialTraitValues: {
                    [Trait.ATTACK]: true,
                    [Trait.TARGET_ARMOR]: true,
                }
            }).filterCategory(TraitCategory.ACTION),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 3,
            damageDescriptions: {
                [DamageType.Body]: 2,
            },
        });

        entireTurnDemonBiteAction = new SquaddieAction({
            name: "demon bite",
            id: "demon_bite",
            traits: new TraitStatusStorage({
                initialTraitValues: {
                    [Trait.ATTACK]: true,
                    [Trait.TARGET_ARMOR]: true,
                }
            }).filterCategory(TraitCategory.ACTION),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 3,
            damageDescriptions: {
                [DamageType.Body]: 20,
            },
        });

        ({
            battleSquaddie: enemyDemonDynamic,
            squaddieTemplate: enemyDemonStatic,
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

        enemyDemonDynamic2 = new BattleSquaddie({
            squaddieTemplateId: enemyDemonStatic.templateId,
            battleSquaddieId: "enemy_demon_2",
            squaddieTurn: new SquaddieTurn({})
        });

        squaddieRepo.addBattleSquaddie(enemyDemonDynamic2);

        enemyTeam.addBattleSquaddieIds([enemyDemonDynamic.battleSquaddieId, enemyDemonDynamic2.battleSquaddieId]);

        battlePhaseState = {
            currentAffiliation: BattlePhase.ENEMY,
            turnCount: 1,
        }

        teamsByAffiliation[SquaddieAffiliation.ENEMY] = enemyTeam;

        missionMap.addSquaddie(
            enemyDemonStatic.templateId,
            enemyDemonDynamic.battleSquaddieId,
            {q: 0, r: 0}
        );
        missionMap.addSquaddie(
            enemyDemonDynamic.squaddieTemplateId,
            enemyDemonDynamic2.battleSquaddieId,
            {q: 0, r: 1}
        );
    }

    const makeSquaddieMoveAction = (squaddieTemplateId: string, battleSquaddieId: string) => {
        const moveAction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId,
            battleSquaddieId,
            startingLocation: {q: 0, r: 0},
            actions: [],
        });
        moveAction.addAction({
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
                movementCost: ["1 1 "]
            })
        });

        makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        const squaddieLocation: number[] = convertMapCoordinatesToWorldCoordinates(0, 0);
        const camera: BattleCamera = new BattleCamera(
            squaddieLocation[0] + (ScreenDimensions.SCREEN_WIDTH * 2),
            squaddieLocation[1] + (ScreenDimensions.SCREEN_HEIGHT * 2),
        );
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            battlePhaseState,
            squaddieRepository: squaddieRepo,
            camera,
            missionMap,
            teamsByAffiliation,
            hexMap: new TerrainTileMap({movementCost: ["1 "]})
        });
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
            const enemyEndTurnStrategy = new EndTurnTeamStrategy();
            const strategySpy = jest.spyOn(enemyEndTurnStrategy, "DetermineNextInstruction");

            const state: BattleOrchestratorState = new BattleOrchestratorState({
                battlePhaseState,
                hexMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                }),
                missionMap,
                squaddieRepository: squaddieRepo,
                battleEventRecording: {history: []},
                teamStrategyByAffiliation: {
                    ENEMY: [enemyEndTurnStrategy],
                },
                teamsByAffiliation,
            });

            selector.update(state, mockedP5GraphicsContext);
            expect(selector.hasCompleted(state)).toBeTruthy();

            const endTurnInstruction: SquaddieInstructionInProgress =
                {
                    movingBattleSquaddieIds: [],
                    squaddieActionsForThisRound: {
                        squaddieTemplateId: enemyDemonStatic.templateId,
                        battleSquaddieId: enemyDemonDynamic.battleSquaddieId,
                        startingLocation: {q: 0, r: 0},
                        actions: [],
                    },
                    currentlySelectedAction: undefined,
                };
            SquaddieInstructionInProgressHandler.addConfirmedAction(endTurnInstruction, new SquaddieEndTurnAction({}));

            expect(SquaddieActionsForThisRoundHandler.getMostRecentAction(state.squaddieCurrentlyActing.squaddieActionsForThisRound).type).toBe(SquaddieActionType.END_TURN);

            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);

            const history = state.battleEventRecording.history;
            expect(history).toHaveLength(1);
            expect(history[0]).toStrictEqual({
                instruction: endTurnInstruction,
                results: undefined,
            });

            expect(strategySpy).toHaveBeenCalled();
            strategySpy.mockClear();
        });

        it('will default to ending its turn if none of the strategies provide instruction', () => {
            class TestTeamStrategy implements TeamStrategy {
                DetermineNextInstruction(state: TeamStrategyState): SquaddieActionsForThisRound | undefined {
                    return undefined;
                }
            }

            const state: BattleOrchestratorState = new BattleOrchestratorState({
                battlePhaseState,
                hexMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                }),
                missionMap,
                squaddieRepository: squaddieRepo,
                battleEventRecording: {history: []},
                teamStrategyByAffiliation: {
                    ENEMY: [new TestTeamStrategy()],
                },
                teamsByAffiliation,
            });

            selector.update(state, mockedP5GraphicsContext);
            expect(selector.hasCompleted(state)).toBeTruthy();

            const endTurnActionInstruction: SquaddieActionsForThisRoundData = state.squaddieCurrentlyActing.squaddieActionsForThisRound;
            const mostRecentAction = SquaddieActionsForThisRoundHandler.getMostRecentAction(endTurnActionInstruction);
            expect(mostRecentAction.type).toBe(SquaddieActionType.END_TURN);

            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);
        });
    });

    it('will change phase if no squaddies are able to act', () => {
        makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        enemyDemonDynamic.endTurn();

        const squaddieSquaddieAction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: enemyDemonStatic.templateId,
            battleSquaddieId: enemyDemonDynamic2.battleSquaddieId,
            startingLocation: {q: 0, r: 1},
            actions: [],
        });
        squaddieSquaddieAction.addAction({
            type: SquaddieActionType.SQUADDIE,
            data: {
                targetLocation: {q: 0, r: 0},
                squaddieAction: entireTurnDemonBiteAction,
            }
        });

        class TestTeamStrategy implements TeamStrategy {
            DetermineNextInstruction(state: TeamStrategyState): SquaddieActionsForThisRound | undefined {
                return squaddieSquaddieAction;
            }
        }

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            battlePhaseState,
            hexMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            }),
            squaddieRepository: squaddieRepo,
            missionMap,
            pathfinder: new Pathfinder(),
            teamStrategyByAffiliation: {
                ENEMY: [new TestTeamStrategy()],
            },
            teamsByAffiliation,
        });

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
                enemyDemonStatic.templateId,
                enemyDemonDynamic.battleSquaddieId,
                {q: 0, r: 0},
            );
            missionMap.addSquaddie(
                enemyDemonStatic.templateId,
                enemyDemonDynamic2.battleSquaddieId,
                {q: 0, r: 1},
            );

            camera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
        });

        it('will prepare to move if computer controlled squaddie wants to move', () => {
            const moveAction = makeSquaddieMoveAction(
                enemyDemonStatic.templateId,
                enemyDemonDynamic.battleSquaddieId,
            );

            class TestTeamStrategy implements TeamStrategy {
                DetermineNextInstruction(state: TeamStrategyState): SquaddieActionsForThisRound | undefined {
                    return moveAction;
                }
            }

            const state: BattleOrchestratorState = new BattleOrchestratorState({
                battlePhaseState,
                squaddieRepository: squaddieRepo,
                camera,
                missionMap,
                hexMap,
                pathfinder: new Pathfinder(),
                teamStrategyByAffiliation: {
                    ENEMY: [new TestTeamStrategy()]
                },
                teamsByAffiliation,
            });

            selector.update(state, mockedP5GraphicsContext);

            expect(selector.hasCompleted(state)).toBeTruthy();
            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);

            expect(state.squaddieMovePath.getDestination()).toStrictEqual(moveAction.destinationLocation());
            expect(SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing)).toBe("enemy_demon_0");
            expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.actions).toHaveLength(1);
            expect(SquaddieActionsForThisRoundHandler.getMostRecentAction(state.squaddieCurrentlyActing.squaddieActionsForThisRound).type).toBe(SquaddieActionType.MOVEMENT);
            expect(hexMapHighlightTilesSpy).toBeCalled();
        });

        describe('computer controlled squaddie acts', () => {
            let state: BattleOrchestratorState;

            beforeEach(() => {
                const squaddieSquaddieAction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
                    squaddieTemplateId: enemyDemonStatic.templateId,
                    battleSquaddieId: enemyDemonDynamic.battleSquaddieId,
                    startingLocation: {q: 0, r: 0},
                    actions: [],
                });
                squaddieSquaddieAction.addAction({
                    type: SquaddieActionType.SQUADDIE,
                    data: {
                        targetLocation: {q: 0, r: 1},
                        squaddieAction: demonBiteAction,
                    }
                });

                class TestTeamStrategy implements TeamStrategy {
                    DetermineNextInstruction(state: TeamStrategyState): SquaddieActionsForThisRound | undefined {
                        return squaddieSquaddieAction;
                    }
                }

                state = new BattleOrchestratorState({
                    battlePhaseState,
                    squaddieRepository: squaddieRepo,
                    camera,
                    missionMap,
                    hexMap,
                    pathfinder: new Pathfinder(),
                    teamStrategyByAffiliation: {
                        ENEMY: [new TestTeamStrategy()]
                    },
                    teamsByAffiliation,
                });

                jest.spyOn(Date, 'now').mockImplementation(() => 0);
                selector.update(state, mockedP5GraphicsContext);
            });

            it('will indicate the next action', () => {
                expect(SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing)).toBe(enemyDemonDynamic.battleSquaddieId);
                expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.actions).toHaveLength(1);
                expect(SquaddieActionsForThisRoundHandler.getMostRecentAction(state.squaddieCurrentlyActing.squaddieActionsForThisRound).type).toBe(SquaddieActionType.SQUADDIE);
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
                    squaddieTemplate: enemyDemonStatic,
                    battleSquaddie: enemyDemonDynamic,
                });
                expect(actionPointsRemaining).toBe(3 - demonBiteAction.actionPointCost);
            });

            it('should add the results to the history', () => {
                expect(state.battleEventRecording.history).toHaveLength(1);
                const mostRecentEvent: BattleEvent = state.battleEventRecording.history[0];
                expect(mostRecentEvent.instruction.squaddieActionsForThisRound.actions).toHaveLength(1);
                expect((
                    mostRecentEvent.instruction.squaddieActionsForThisRound.actions[0].data as SquaddieSquaddieActionData
                ).squaddieAction.id).toBe(demonBiteAction.id);
                const results = mostRecentEvent.results;
                expect(results.actingBattleSquaddieId).toBe(enemyDemonDynamic.battleSquaddieId);
                expect(results.targetedBattleSquaddieIds).toHaveLength(1);
                expect(results.targetedBattleSquaddieIds[0]).toBe(enemyDemonDynamic2.battleSquaddieId);
                expect(results.resultPerTarget[enemyDemonDynamic2.battleSquaddieId]).toBeTruthy();
            });

            it('should store the calculated results', () => {
                const mostRecentEvent: BattleEvent = state.battleEventRecording.history[0];
                const knightUsesLongswordOnThiefResults = mostRecentEvent.results.resultPerTarget[enemyDemonDynamic2.battleSquaddieId];
                expect(knightUsesLongswordOnThiefResults.damageTaken).toBe(demonBiteAction.damageDescriptions[DamageType.Body]);

                const {maxHitPoints, currentHitPoints} = GetHitPoints({
                    squaddieTemplate: enemyDemonStatic,
                    battleSquaddie: enemyDemonDynamic2
                });
                expect(currentHitPoints).toBe(maxHitPoints - demonBiteAction.damageDescriptions[DamageType.Body]);
            });
        });
    });
});
