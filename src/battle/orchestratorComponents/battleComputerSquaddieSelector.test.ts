import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattlePhase, BattlePhaseTracker} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieTurn} from "../../squaddie/turn";
import {OrchestratorChanges} from "../orchestrator/orchestratorComponent";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleOrchestratorMode} from "../orchestrator/orchestrator";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera, PanningInformation} from "../battleCamera";
import {BattleSquaddieUIInput, BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {convertMapCoordinatesToWorldCoordinates} from "../../hexMap/convertCoordinates";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieEndTurnActivity} from "../history/squaddieEndTurnActivity";
import {getResultOrThrowError} from "../../utils/ResultOrError";
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
import {BattleComputerSquaddieSelector, SQUADDIE_SELECTOR_PANNING_TIME} from "./battleComputerSquaddieSelector";

describe('BattleComputerSquaddieSelector', () => {
    let selector: BattleComputerSquaddieSelector = new BattleComputerSquaddieSelector();
    let squaddieRepo: BattleSquaddieRepository = new BattleSquaddieRepository();
    let missionMap: MissionMap;
    let mockedP5 = mocks.mockedP5();
    let enemyDemonStatic: BattleSquaddieStatic;
    let enemyDemonDynamic: BattleSquaddieDynamic;
    let demonBiteActivity: SquaddieActivity;

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
        }));

        squaddieRepo.addDynamicSquaddie(
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "enemy_demon_1",
                staticSquaddieId: "enemy_demon",
                squaddieTurn: new SquaddieTurn()
            })
        );

        enemyTeam.addDynamicSquaddieIds(["enemy_demon_0", "enemy_demon_1"]);

        const battlePhaseTracker: BattlePhaseTracker = new BattlePhaseTracker(BattlePhase.ENEMY);
        battlePhaseTracker.addTeam(enemyTeam);

        missionMap.addSquaddie(
            "enemy_demon",
            "enemy_demon_0",
            new HexCoordinate({q: 0, r: 0})
        );
        missionMap.addSquaddie(
            "enemy_demon",
            "enemy_demon_0",
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
        const state: OrchestratorState = new OrchestratorState({
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

    describe('squaddie team strategy', () => {
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

            const state: OrchestratorState = new OrchestratorState({
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
                dynamicSquaddieId: "enemy_demon_0",
                staticSquaddieId: "enemy_demon",
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            });
            endTurnInstruction.addConfirmedActivity(new SquaddieEndTurnActivity());

            expect(state.squaddieCurrentlyActing.instruction.getMostRecentActivity()).toBeInstanceOf(SquaddieEndTurnActivity);

            const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
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

            const state: OrchestratorState = new OrchestratorState({
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

            const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY);
        });

        it('will prepare to move if computer controlled squaddie wants to move', () => {
            const moveActivity = makeSquaddieMoveActivity(
                "enemy_demon",
                "enemy_demon_0",
            );

            class TestTeamStrategy implements TeamStrategy {
                DetermineNextInstruction(state: TeamStrategyState): SquaddieInstruction | undefined {
                    return moveActivity;
                }
            }

            const hexMap: TerrainTileMap = new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 1 1 1 ",
                ]
            });

            const missionMap = new MissionMap({
                terrainTileMap: hexMap
            });

            missionMap.addSquaddie(
                "enemy_demon",
                "enemy_demon_0",
                new HexCoordinate({q: 0, r: 0})
            );
            missionMap.addSquaddie(
                "enemy_demon",
                "enemy_demon_0",
                new HexCoordinate({q: 0, r: 1})
            );

            const camera: BattleCamera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
            const mockBattleSquaddieUIInput: BattleSquaddieUIInput = new (<new (options: any) => BattleSquaddieUIInput>BattleSquaddieUIInput)({}) as jest.Mocked<BattleSquaddieUIInput>;
            const state: OrchestratorState = new OrchestratorState({
                battlePhaseTracker,
                squaddieRepo,
                camera,
                missionMap,
                hexMap,
                battleSquaddieUIInput: mockBattleSquaddieUIInput,
                pathfinder: new Pathfinder(),
                teamStrategyByAffiliation: {
                    ENEMY: [new TestTeamStrategy()]
                }
            });

            const hexMapHighlightTilesSpy = jest.spyOn(hexMap, "highlightTiles");
            const battleSquaddieUIInputChangeSelectionStateSpy = jest.spyOn(mockBattleSquaddieUIInput, "changeSelectionState");

            selector.update(state, mockedP5);

            expect(selector.hasCompleted(state)).toBeTruthy();
            const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);

            expect(state.squaddieMovePath.getDestination()).toStrictEqual(moveActivity.destinationLocation());
            expect(state.squaddieCurrentlyActing.dynamicSquaddieId).toBe("enemy_demon_0");
            expect(state.squaddieCurrentlyActing.instruction.getActivities()).toHaveLength(1);
            expect(state.squaddieCurrentlyActing.instruction.getMostRecentActivity()).toBeInstanceOf(SquaddieMovementActivity);
            expect(hexMapHighlightTilesSpy).toBeCalled();
            expect(battleSquaddieUIInputChangeSelectionStateSpy).toBeCalledWith(BattleSquaddieUISelectionState.MOVING_SQUADDIE);
        });

        it('will prepare to act if computer controlled squaddie wants to act', () => {
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

            const hexMap: TerrainTileMap = new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 1 1 1 ",
                ]
            });

            const missionMap = new MissionMap({
                terrainTileMap: hexMap
            });

            missionMap.addSquaddie(
                "enemy_demon",
                "enemy_demon_0",
                new HexCoordinate({q: 0, r: 0})
            );
            missionMap.addSquaddie(
                "enemy_demon",
                "enemy_demon_0",
                new HexCoordinate({q: 0, r: 1})
            );

            const camera: BattleCamera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
            const mockBattleSquaddieUIInput: BattleSquaddieUIInput = new (<new (options: any) => BattleSquaddieUIInput>BattleSquaddieUIInput)({}) as jest.Mocked<BattleSquaddieUIInput>;
            const state: OrchestratorState = new OrchestratorState({
                battlePhaseTracker,
                squaddieRepo,
                camera,
                missionMap,
                hexMap,
                battleSquaddieUIInput: mockBattleSquaddieUIInput,
                pathfinder: new Pathfinder(),
                teamStrategyByAffiliation: {
                    ENEMY: [new TestTeamStrategy()]
                }
            });

            const hexMapHighlightTilesSpy = jest.spyOn(hexMap, "highlightTiles");

            selector.update(state, mockedP5);

            expect(selector.hasCompleted(state)).toBeTruthy();
            const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY);

            expect(state.squaddieCurrentlyActing.dynamicSquaddieId).toBe("enemy_demon_0");
            expect(state.squaddieCurrentlyActing.instruction.getActivities()).toHaveLength(1);
            expect(state.squaddieCurrentlyActing.instruction.getMostRecentActivity()).toBeInstanceOf(SquaddieSquaddieActivity);
            expect(hexMapHighlightTilesSpy).toBeCalled();
        });
    });

    it('will change phase if no squaddies are able to act', () => {
        const battlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        while (battlePhaseTracker.getCurrentTeam().hasAnActingSquaddie()) {
            let dynamicId = battlePhaseTracker.getCurrentTeam().getDynamicSquaddieIdThatCanActButNotPlayerControlled();
            const {
                dynamicSquaddie
            } = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicId(dynamicId));

            dynamicSquaddie.endTurn();
        }

        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            hexMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            }),
            squaddieRepo,
            missionMap,
        });

        selector.update(state, mockedP5);
        expect(selector.hasCompleted(state)).toBeTruthy();

        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
    });
});
