import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattlePhase} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieTurn} from "../../squaddie/turn";
import {
    BattleOrchestratorChanges,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {HighlightTileDescription, TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {SquaddieMovementAction} from "../history/squaddieMovementAction";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera, PanningInformation} from "../battleCamera";
import {convertMapCoordinatesToWorldCoordinates} from "../../hexMap/convertCoordinates";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieEndTurnAction} from "../history/squaddieEndTurnAction";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {Recording} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieAction} from "../../squaddie/action";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieSquaddieAction} from "../history/squaddieSquaddieAction";
import {
    BattleComputerSquaddieSelector,
    SHOW_SELECTED_ACTION_TIME,
    SQUADDIE_SELECTOR_PANNING_TIME
} from "./battleComputerSquaddieSelector";
import {DamageType, GetHitPoints, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {BattlePhaseState} from "./battlePhaseController";

describe('BattleComputerSquaddieSelector', () => {
    let selector: BattleComputerSquaddieSelector = new BattleComputerSquaddieSelector();
    let squaddieRepo: BattleSquaddieRepository = new BattleSquaddieRepository();
    let missionMap: MissionMap;
    let enemyDemonStatic: BattleSquaddieStatic;
    let enemyDemonDynamic: BattleSquaddieDynamic;
    let enemyDemonDynamic2: BattleSquaddieDynamic;
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
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
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
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
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
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTION),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 3,
            damageDescriptions: {
                [DamageType.Body]: 20,
            },
        });

        ({
            dynamicSquaddie: enemyDemonDynamic,
            staticSquaddie: enemyDemonStatic,
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "enemy_demon",
            name: "Slither Demon",
            affiliation: SquaddieAffiliation.ENEMY,
            dynamicId: "enemy_demon_0",
            squaddieRepository: squaddieRepo,
            actions: [demonBiteAction],
            attributes: new ArmyAttributes({
                maxHitPoints: 5,
            })
        }));

        enemyDemonDynamic2 = new BattleSquaddieDynamic({
            staticSquaddieId: enemyDemonStatic.staticId,
            dynamicSquaddieId: "enemy_demon_2",
            squaddieTurn: new SquaddieTurn()
        });

        squaddieRepo.addDynamicSquaddie(enemyDemonDynamic2);

        enemyTeam.addDynamicSquaddieIds([enemyDemonDynamic.dynamicSquaddieId, enemyDemonDynamic2.dynamicSquaddieId]);

        battlePhaseState = {
            currentAffiliation: BattlePhase.ENEMY,
            turnCount: 1,
        }

        teamsByAffiliation[SquaddieAffiliation.ENEMY] = enemyTeam;

        missionMap.addSquaddie(
            enemyDemonStatic.staticId,
            enemyDemonDynamic.dynamicSquaddieId,
            new HexCoordinate({q: 0, r: 0})
        );
        missionMap.addSquaddie(
            enemyDemonDynamic.staticSquaddieId,
            enemyDemonDynamic2.dynamicSquaddieId,
            new HexCoordinate({q: 0, r: 1})
        );
    }

    const makeSquaddieMoveAction = (staticSquaddieId: string, dynamicSquaddieId: string) => {
        const moveAction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            staticSquaddieId,
            dynamicSquaddieId,
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        moveAction.addAction(new SquaddieMovementAction({
            destination: new HexCoordinate({q: 1, r: 1}),
            numberOfActionPointsSpent: 1,
        }));
        return moveAction;
    }

    it('moves camera to squaddie player cannot control before before moving', () => {
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
            squaddieRepo,
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
                squaddieRepo,
                battleEventRecording: new Recording({}),
                teamStrategyByAffiliation: {
                    ENEMY: [enemyEndTurnStrategy],
                },
                teamsByAffiliation,
            });

            selector.update(state, mockedP5GraphicsContext);
            expect(selector.hasCompleted(state)).toBeTruthy();

            const endTurnInstruction: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({});
            endTurnInstruction.addInitialState({
                staticSquaddieId: enemyDemonStatic.staticId,
                dynamicSquaddieId: enemyDemonDynamic.dynamicSquaddieId,
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            });
            endTurnInstruction.addConfirmedAction(new SquaddieEndTurnAction());

            expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.getMostRecentAction()).toBeInstanceOf(SquaddieEndTurnAction);

            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);

            const history = state.battleEventRecording.history;
            expect(history).toHaveLength(1);
            expect(history[0]).toStrictEqual(new BattleEvent({
                currentSquaddieInstruction: endTurnInstruction,
            }));

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
                squaddieRepo,
                battleEventRecording: new Recording({}),
                teamStrategyByAffiliation: {
                    ENEMY: [new TestTeamStrategy()],
                },
                teamsByAffiliation,
            });

            selector.update(state, mockedP5GraphicsContext);
            expect(selector.hasCompleted(state)).toBeTruthy();

            const endTurnActionInstruction: SquaddieActionsForThisRound = state.squaddieCurrentlyActing.squaddieActionsForThisRound;
            const mostRecentAction = endTurnActionInstruction.getActionsUsedThisRound().reverse()[0];
            expect(mostRecentAction).toBeInstanceOf(SquaddieEndTurnAction);

            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);
        });
    });

    it('will change phase if no squaddies are able to act', () => {
        makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        enemyDemonDynamic.endTurn();

        const squaddieSquaddieAction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            staticSquaddieId: enemyDemonStatic.staticId,
            dynamicSquaddieId: enemyDemonDynamic2.dynamicSquaddieId,
            startingLocation: new HexCoordinate({q: 0, r: 1}),
        });
        squaddieSquaddieAction.addAction(new SquaddieSquaddieAction({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieAction: entireTurnDemonBiteAction,
        }));

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
            squaddieRepo,
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
                enemyDemonStatic.staticId,
                enemyDemonDynamic.dynamicSquaddieId,
                new HexCoordinate({q: 0, r: 0})
            );
            missionMap.addSquaddie(
                enemyDemonStatic.staticId,
                enemyDemonDynamic2.dynamicSquaddieId,
                new HexCoordinate({q: 0, r: 1})
            );

            camera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
        });

        it('will prepare to move if computer controlled squaddie wants to move', () => {
            const moveAction = makeSquaddieMoveAction(
                enemyDemonStatic.staticId,
                enemyDemonDynamic.dynamicSquaddieId,
            );

            class TestTeamStrategy implements TeamStrategy {
                DetermineNextInstruction(state: TeamStrategyState): SquaddieActionsForThisRound | undefined {
                    return moveAction;
                }
            }

            const state: BattleOrchestratorState = new BattleOrchestratorState({
                battlePhaseState,
                squaddieRepo,
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
            expect(state.squaddieCurrentlyActing.dynamicSquaddieId).toBe("enemy_demon_0");
            expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.getActionsUsedThisRound()).toHaveLength(1);
            expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.getMostRecentAction()).toBeInstanceOf(SquaddieMovementAction);
            expect(hexMapHighlightTilesSpy).toBeCalled();
        });

        describe('computer controlled squaddie acts', () => {
            let state: BattleOrchestratorState;

            beforeEach(() => {
                const squaddieSquaddieAction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
                    staticSquaddieId: enemyDemonStatic.staticId,
                    dynamicSquaddieId: enemyDemonDynamic.dynamicSquaddieId,
                    startingLocation: new HexCoordinate({q: 0, r: 0}),
                });
                squaddieSquaddieAction.addAction(new SquaddieSquaddieAction({
                    targetLocation: new HexCoordinate({q: 0, r: 1}),
                    squaddieAction: demonBiteAction,
                }));

                class TestTeamStrategy implements TeamStrategy {
                    DetermineNextInstruction(state: TeamStrategyState): SquaddieActionsForThisRound | undefined {
                        return squaddieSquaddieAction;
                    }
                }

                state = new BattleOrchestratorState({
                    battlePhaseState,
                    squaddieRepo,
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
                expect(state.squaddieCurrentlyActing.dynamicSquaddieId).toBe(enemyDemonDynamic.dynamicSquaddieId);
                expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.getActionsUsedThisRound()).toHaveLength(1);
                expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.getMostRecentAction()).toBeInstanceOf(SquaddieSquaddieAction);
            });

            it('highlight the map target and its spread', () => {
                expect(hexMapHighlightTilesSpy).toBeCalled();
                const actualTiles = hexMapHighlightTilesSpy.mock.calls[0][0] as HighlightTileDescription[];
                expect(actualTiles).toHaveLength(1);
                expect(actualTiles[0].tiles).toHaveLength(1);
                expect(actualTiles[0].tiles[0]).toStrictEqual(new HexCoordinate({q: 0, r: 1}));
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
                    staticSquaddie: enemyDemonStatic,
                    dynamicSquaddie: enemyDemonDynamic,
                });
                expect(actionPointsRemaining).toBe(3 - demonBiteAction.actionPointCost);
            });

            it('should add the results to the history', () => {
                expect(state.battleEventRecording.history).toHaveLength(1);
                const mostRecentEvent: BattleEvent = state.battleEventRecording.history[0];
                expect(mostRecentEvent.actions).toHaveLength(1);
                expect((
                    mostRecentEvent.actions[0] as SquaddieSquaddieAction
                ).squaddieAction.id).toBe(demonBiteAction.id);
                const results = mostRecentEvent.results;
                expect(results.actingSquaddieDynamicId).toBe(enemyDemonDynamic.dynamicSquaddieId);
                expect(results.targetedSquaddieDynamicIds).toHaveLength(1);
                expect(results.targetedSquaddieDynamicIds[0]).toBe(enemyDemonDynamic2.dynamicSquaddieId);
                expect(results.resultPerTarget[enemyDemonDynamic2.dynamicSquaddieId]).toBeTruthy();
            });

            it('should store the calculated results', () => {
                const mostRecentEvent: BattleEvent = state.battleEventRecording.history[0];
                const knightUsesLongswordOnThiefResults = mostRecentEvent.results.resultPerTarget[enemyDemonDynamic2.dynamicSquaddieId];
                expect(knightUsesLongswordOnThiefResults.damageTaken).toBe(demonBiteAction.damageDescriptions[DamageType.Body]);

                const {maxHitPoints, currentHitPoints} = GetHitPoints({
                    staticSquaddie: enemyDemonStatic,
                    dynamicSquaddie: enemyDemonDynamic2
                });
                expect(currentHitPoints).toBe(maxHitPoints - demonBiteAction.damageDescriptions[DamageType.Body]);
            });
        });
    });
});
