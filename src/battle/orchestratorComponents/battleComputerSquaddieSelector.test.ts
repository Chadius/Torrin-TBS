import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattlePhase, BattlePhaseTracker} from "./battlePhaseTracker";
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
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera, PanningInformation} from "../battleCamera";
import {convertMapCoordinatesToWorldCoordinates} from "../../hexMap/convertCoordinates";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieEndTurnActivity} from "../history/squaddieEndTurnActivity";
import {ScreenDimensions} from "../../utils/graphicsConfig";
import {Recording} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieActivity} from "../../squaddie/activity";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import * as mocks from "../../utils/test/mocks";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {
    BattleComputerSquaddieSelector,
    SHOW_SELECTED_ACTIVITY_TIME,
    SQUADDIE_SELECTOR_PANNING_TIME
} from "./battleComputerSquaddieSelector";
import {DamageType, GetHitPoints, GetNumberOfActions} from "../../squaddie/squaddieService";
import {ArmyAttributes} from "../../squaddie/armyAttributes";

describe('BattleComputerSquaddieSelector', () => {
    let selector: BattleComputerSquaddieSelector = new BattleComputerSquaddieSelector();
    let squaddieRepo: BattleSquaddieRepository = new BattleSquaddieRepository();
    let missionMap: MissionMap;
    let mockedP5 = mocks.mockedP5();
    let enemyDemonStatic: BattleSquaddieStatic;
    let enemyDemonDynamic: BattleSquaddieDynamic;
    let enemyDemonDynamic2: BattleSquaddieDynamic;
    let demonBiteActivity: SquaddieActivity;
    let entireTurnDemonBiteActivity: SquaddieActivity;

    beforeEach(() => {
        mockedP5 = mocks.mockedP5();
        selector = new BattleComputerSquaddieSelector();
        squaddieRepo = new BattleSquaddieRepository();
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
    });

    const makeBattlePhaseTrackerWithEnemyTeam = (missionMap: MissionMap) => {
        const enemyTeam: BattleSquaddieTeam = new BattleSquaddieTeam(
            {
                name: "enemies cannot be controlled by the player",
                affiliation: SquaddieAffiliation.ENEMY,
                squaddieRepo: squaddieRepo,
            }
        );

        demonBiteActivity = new SquaddieActivity({
            name: "demon bite",
            id: "demon_bite",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
            actionsToSpend: 2,
            damageDescriptions: {
                [DamageType.Body]: 2,
            },
        });

        demonBiteActivity = new SquaddieActivity({
            name: "demon bite",
            id: "demon_bite",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
            actionsToSpend: 3,
            damageDescriptions: {
                [DamageType.Body]: 2,
            },
        });

        entireTurnDemonBiteActivity = new SquaddieActivity({
            name: "demon bite",
            id: "demon_bite",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
            actionsToSpend: 3,
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
            activities: [demonBiteActivity],
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

        const battlePhaseTracker: BattlePhaseTracker = new BattlePhaseTracker(BattlePhase.ENEMY);
        battlePhaseTracker.addTeam(enemyTeam);

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
        return battlePhaseTracker;
    }

    const makeSquaddieMoveActivity = (staticSquaddieId: string, dynamicSquaddieId: string) => {
        const moveActivity: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId,
            dynamicSquaddieId,
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        moveActivity.addActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 1, r: 1}),
            numberOfActionsSpent: 1,
        }));
        return moveActivity;
    }

    it('moves camera to squaddie player cannot control before before moving', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        const squaddieLocation: number[] = convertMapCoordinatesToWorldCoordinates(0, 0);
        const camera: BattleCamera = new BattleCamera(
            squaddieLocation[0] + (ScreenDimensions.SCREEN_WIDTH * 2),
            squaddieLocation[1] + (ScreenDimensions.SCREEN_HEIGHT * 2),
        );
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            battlePhaseTracker,
            squaddieRepo,
            camera,
            missionMap,
        });
        jest.spyOn(Date, 'now').mockImplementation(() => 0);

        camera.moveCamera();
        selector.update(state, mockedP5);

        expect(selector.hasCompleted(state)).toBeFalsy();
        expect(camera.isPanning()).toBeTruthy();
        const panningInfo: PanningInformation = camera.getPanningInformation();
        expect(panningInfo.xDestination).toBe(squaddieLocation[0]);
        expect(panningInfo.yDestination).toBe(squaddieLocation[1]);

        jest.spyOn(Date, 'now').mockImplementation(() => SQUADDIE_SELECTOR_PANNING_TIME);
        camera.moveCamera();
        selector.update(state, mockedP5);

        expect(selector.hasCompleted(state)).toBeTruthy();
        expect(camera.isPanning()).toBeFalsy();
    });

    describe('squaddie team strategy ends the turn', () => {
        let battlePhaseTracker: BattlePhaseTracker;
        let missionMap: MissionMap;

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                })
            });
            battlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam(missionMap);
        });

        it('instructs the squaddie to end turn when the player cannot control the team squaddies', () => {
            const enemyEndTurnStrategy = new EndTurnTeamStrategy();
            const strategySpy = jest.spyOn(enemyEndTurnStrategy, "DetermineNextInstruction");

            const state: BattleOrchestratorState = new BattleOrchestratorState({
                battlePhaseTracker,
                hexMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                }),
                missionMap,
                squaddieRepo,
                battleEventRecording: new Recording({}),
                teamStrategyByAffiliation: {
                    ENEMY: [enemyEndTurnStrategy],
                },
            });

            selector.update(state, mockedP5);
            expect(selector.hasCompleted(state)).toBeTruthy();

            const endTurnInstruction: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({});
            endTurnInstruction.addSquaddie({
                staticSquaddieId: enemyDemonStatic.staticId,
                dynamicSquaddieId: enemyDemonDynamic.dynamicSquaddieId,
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            });
            endTurnInstruction.addConfirmedActivity(new SquaddieEndTurnActivity());

            expect(state.squaddieCurrentlyActing.instruction.getMostRecentActivity()).toBeInstanceOf(SquaddieEndTurnActivity);

            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY);

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
                DetermineNextInstruction(state: TeamStrategyState): SquaddieInstruction | undefined {
                    return undefined;
                }
            }

            const state: BattleOrchestratorState = new BattleOrchestratorState({
                battlePhaseTracker,
                hexMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                }),
                missionMap,
                squaddieRepo,
                battleEventRecording: new Recording({}),
                teamStrategyByAffiliation: {
                    ENEMY: [new TestTeamStrategy()],
                },
            });

            selector.update(state, mockedP5);
            expect(selector.hasCompleted(state)).toBeTruthy();

            const endTurnActivityInstruction: SquaddieInstruction = state.squaddieCurrentlyActing.instruction;
            const mostRecentActivity = endTurnActivityInstruction.getActivities().reverse()[0];
            expect(mostRecentActivity).toBeInstanceOf(SquaddieEndTurnActivity);

            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY);
        });
    });

    it('will change phase if no squaddies are able to act', () => {
        const battlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        enemyDemonDynamic.endTurn();

        const squaddieSquaddieActivity: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: enemyDemonStatic.staticId,
            dynamicSquaddieId: enemyDemonDynamic2.dynamicSquaddieId,
            startingLocation: new HexCoordinate({q: 0, r: 1}),
        });
        squaddieSquaddieActivity.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieActivity: entireTurnDemonBiteActivity,
        }));

        class TestTeamStrategy implements TeamStrategy {
            DetermineNextInstruction(state: TeamStrategyState): SquaddieInstruction | undefined {
                return squaddieSquaddieActivity;
            }
        }

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            battlePhaseTracker,
            hexMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            }),
            squaddieRepo,
            missionMap,
            pathfinder: new Pathfinder(),
            teamStrategyByAffiliation: {
                ENEMY: [new TestTeamStrategy()],
            },
        });

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        selector.update(state, mockedP5);


        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        selector.update(state, mockedP5);
        jest.spyOn(Date, 'now').mockImplementation(() => SHOW_SELECTED_ACTIVITY_TIME);
        expect(selector.hasCompleted(state)).toBeTruthy();

        let recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY);

        selector.reset(state);
        selector.update(state, mockedP5);
        expect(selector.hasCompleted(state)).toBeTruthy();
        recommendation = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
    });

    describe('computer decides to act', () => {
        let battlePhaseTracker: BattlePhaseTracker;
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
            battlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam(missionMap);

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
            const moveActivity = makeSquaddieMoveActivity(
                enemyDemonStatic.staticId,
                enemyDemonDynamic.dynamicSquaddieId,
            );

            class TestTeamStrategy implements TeamStrategy {
                DetermineNextInstruction(state: TeamStrategyState): SquaddieInstruction | undefined {
                    return moveActivity;
                }
            }

            const state: BattleOrchestratorState = new BattleOrchestratorState({
                battlePhaseTracker,
                squaddieRepo,
                camera,
                missionMap,
                hexMap,
                pathfinder: new Pathfinder(),
                teamStrategyByAffiliation: {
                    ENEMY: [new TestTeamStrategy()]
                }
            });

            selector.update(state, mockedP5);

            expect(selector.hasCompleted(state)).toBeTruthy();
            const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);

            expect(state.squaddieMovePath.getDestination()).toStrictEqual(moveActivity.destinationLocation());
            expect(state.squaddieCurrentlyActing.dynamicSquaddieId).toBe("enemy_demon_0");
            expect(state.squaddieCurrentlyActing.instruction.getActivities()).toHaveLength(1);
            expect(state.squaddieCurrentlyActing.instruction.getMostRecentActivity()).toBeInstanceOf(SquaddieMovementActivity);
            expect(hexMapHighlightTilesSpy).toBeCalled();
        });

        describe('computer controlled squaddie acts', () => {
            let state: BattleOrchestratorState;

            beforeEach(() => {
                const squaddieSquaddieActivity: SquaddieInstruction = new SquaddieInstruction({
                    staticSquaddieId: enemyDemonStatic.staticId,
                    dynamicSquaddieId: enemyDemonDynamic.dynamicSquaddieId,
                    startingLocation: new HexCoordinate({q: 0, r: 0}),
                });
                squaddieSquaddieActivity.addActivity(new SquaddieSquaddieActivity({
                    targetLocation: new HexCoordinate({q: 0, r: 1}),
                    squaddieActivity: demonBiteActivity,
                }));

                class TestTeamStrategy implements TeamStrategy {
                    DetermineNextInstruction(state: TeamStrategyState): SquaddieInstruction | undefined {
                        return squaddieSquaddieActivity;
                    }
                }

                state = new BattleOrchestratorState({
                    battlePhaseTracker,
                    squaddieRepo,
                    camera,
                    missionMap,
                    hexMap,
                    pathfinder: new Pathfinder(),
                    teamStrategyByAffiliation: {
                        ENEMY: [new TestTeamStrategy()]
                    }
                });

                jest.spyOn(Date, 'now').mockImplementation(() => 0);
                selector.update(state, mockedP5);
            });

            it('will indicate the next activity', () => {
                expect(state.squaddieCurrentlyActing.dynamicSquaddieId).toBe(enemyDemonDynamic.dynamicSquaddieId);
                expect(state.squaddieCurrentlyActing.instruction.getActivities()).toHaveLength(1);
                expect(state.squaddieCurrentlyActing.instruction.getMostRecentActivity()).toBeInstanceOf(SquaddieSquaddieActivity);
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
                selector.update(state, mockedP5);

                jest.spyOn(Date, 'now').mockImplementation(() => SHOW_SELECTED_ACTIVITY_TIME);
                selector.update(state, mockedP5);
                expect(selector.hasCompleted(state)).toBeTruthy();
            })

            it('waits and then will recommend squaddie squaddie activity as the next field', () => {
                jest.spyOn(Date, 'now').mockImplementation(() => SHOW_SELECTED_ACTIVITY_TIME);
                selector.update(state, mockedP5);
                const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
                expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY);
            });

            it('player can click to complete the component if an activity is selected', () => {
                expect(selector.hasCompleted(state)).toBeFalsy();
                selector.update(state, mockedP5);

                const mouseEvent: OrchestratorComponentMouseEvent = {
                    eventType: OrchestratorComponentMouseEventType.CLICKED,
                    mouseX: 0,
                    mouseY: 0,
                };

                selector.mouseEventHappened(state, mouseEvent);
                selector.update(state, mockedP5);
                expect(selector.hasCompleted(state)).toBeTruthy();
            });

            it('should consume the squaddie actions', () => {
                const {normalActionsRemaining} = GetNumberOfActions({
                    staticSquaddie: enemyDemonStatic,
                    dynamicSquaddie: enemyDemonDynamic,
                });
                expect(normalActionsRemaining).toBe(3 - demonBiteActivity.actionsToSpend);
            });

            it('should add the results to the history', () => {
                expect(state.battleEventRecording.history).toHaveLength(1);
                const mostRecentEvent: BattleEvent = state.battleEventRecording.history[0];
                expect(mostRecentEvent.activities).toHaveLength(1);
                expect((
                    mostRecentEvent.activities[0] as SquaddieSquaddieActivity
                ).squaddieActivity.id).toBe(demonBiteActivity.id);
                const results = mostRecentEvent.results;
                expect(results.actingSquaddieDynamicId).toBe(enemyDemonDynamic.dynamicSquaddieId);
                expect(results.targetedSquaddieDynamicIds).toHaveLength(1);
                expect(results.targetedSquaddieDynamicIds[0]).toBe(enemyDemonDynamic2.dynamicSquaddieId);
                expect(results.resultPerTarget[enemyDemonDynamic2.dynamicSquaddieId]).toBeTruthy();
            });

            it('should store the calculated results', () => {
                const mostRecentEvent: BattleEvent = state.battleEventRecording.history[0];
                const knightUsesLongswordOnThiefResults = mostRecentEvent.results.resultPerTarget[enemyDemonDynamic2.dynamicSquaddieId];
                expect(knightUsesLongswordOnThiefResults.damageTaken).toBe(demonBiteActivity.damageDescriptions[DamageType.Body]);

                const {maxHitPoints, currentHitPoints} = GetHitPoints({
                    staticSquaddie: enemyDemonStatic,
                    dynamicSquaddie: enemyDemonDynamic2
                });
                expect(currentHitPoints).toBe(maxHitPoints - demonBiteActivity.damageDescriptions[DamageType.Body]);
            });
        });
    });
});
