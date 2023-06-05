import {BattleSquaddieSelector, SQUADDIE_SELECTOR_PANNING_TIME} from "./battleSquaddieSelector";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattlePhase, BattlePhaseTracker} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {SquaddieTurn} from "../../squaddie/turn";
import {OrchestratorChanges, OrchestratorComponentMouseEventType} from "../orchestrator/orchestratorComponent";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleOrchestratorMode} from "../orchestrator/orchestrator";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera, PanningInformation} from "../battleCamera";
import {BattleSquaddieUIInput, BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates
} from "../../hexMap/convertCoordinates";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieEndTurnActivity} from "../history/squaddieEndTurnActivity";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import p5 from "p5";
import {ScreenDimensions} from "../../utils/graphicsConfig";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {endTurnActivity} from "../../squaddie/endTurnActivity";
import {Recording} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";

jest.mock('p5', () => () => {
    return {}
});

describe('BattleSquaddieSelector', () => {
    let selector: BattleSquaddieSelector = new BattleSquaddieSelector();
    let squaddieRepo: BattleSquaddieRepository = new BattleSquaddieRepository();
    let mockedP5: p5;

    beforeEach(() => {
        selector = new BattleSquaddieSelector();
        squaddieRepo = new BattleSquaddieRepository();
        mockedP5 = new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;
    });

    const makeBattlePhaseTrackerWithEnemyTeam = () => {
        const enemyTeam: BattleSquaddieTeam = new BattleSquaddieTeam(
            {
                name: "enemies cannot be controlled by the player",
                affiliation: SquaddieAffiliation.ENEMY,
                squaddieRepo: squaddieRepo,
            }
        );

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    staticId: "enemy_demon",
                    name: "Slither Demon",
                    affiliation: SquaddieAffiliation.ENEMY,
                }),
            })
        );

        squaddieRepo.addDynamicSquaddie(
            "enemy_demon_0",
            new BattleSquaddieDynamic({
                staticSquaddieId: "enemy_demon",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );

        squaddieRepo.addDynamicSquaddie(
            "enemy_demon_1",
            new BattleSquaddieDynamic({
                staticSquaddieId: "enemy_demon",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );

        enemyTeam.addDynamicSquaddieIds(["enemy_demon_0", "enemy_demon_1"]);

        const battlePhaseTracker: BattlePhaseTracker = new BattlePhaseTracker(BattlePhase.ENEMY);
        battlePhaseTracker.addTeam(enemyTeam);
        return battlePhaseTracker;
    }

    const makeBattlePhaseTrackerWithPlayerTeam = () => {
        const battlePhaseTracker: BattlePhaseTracker = new BattlePhaseTracker(BattlePhase.PLAYER);

        const playerTeam: BattleSquaddieTeam = new BattleSquaddieTeam(
            {
                name: "player controlled team",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepo: squaddieRepo,
            }
        );
        battlePhaseTracker.addTeam(playerTeam);

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    staticId: "player_soldier",
                    name: "Player Soldier",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
            })
        );

        squaddieRepo.addDynamicSquaddie(
            "player_soldier_0",
            new BattleSquaddieDynamic({
                staticSquaddieId: "player_soldier",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );
        playerTeam.addDynamicSquaddieIds(["player_soldier_0"]);
        return battlePhaseTracker;
    }

    const makeSquaddieMoveActivity = (staticSquaddieId: string, dynamicSquaddieId: string) => {
        const moveActivity: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId,
            dynamicSquaddieId,
            startingLocation: {q: 0, r: 0},
        });
        moveActivity.addMovement(new SquaddieMovementActivity({
            destination: {q: 1, r: 1},
            numberOfActionsSpent: 1,
        }));
        return moveActivity;
    }

    it('ignores mouse input when the player cannot control the squaddies', () => {
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam();
        const mockHexMap = new (
            <new (options: any) => TerrainTileMap>TerrainTileMap
        )({
            movementCost: ["1 1 "]
        }) as jest.Mocked<TerrainTileMap>;
        mockHexMap.mouseClicked = jest.fn();

        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            hexMap: mockHexMap,
        })

        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
        });

        expect(mockHexMap.mouseClicked).not.toBeCalled();
    });

    it('recommends squaddie map activity if the player cannot control the squaddies', () => {
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam();
        const camera: BattleCamera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            squaddieRepo,
            camera,
        });

        selector.update(state, mockedP5);

        expect(selector.hasCompleted(state)).toBeTruthy();
        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY);
    });

    it('moves camera to squaddie player cannot control before before moving', () => {
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam();
        const squaddieLocation: number[] = convertMapCoordinatesToWorldCoordinates(0, 0);
        const camera: BattleCamera = new BattleCamera(
            squaddieLocation[0] + (ScreenDimensions.SCREEN_WIDTH * 2),
            squaddieLocation[1] + (ScreenDimensions.SCREEN_HEIGHT * 2),
        );
        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            squaddieRepo,
            camera,
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

    it('can make a movement activity by clicking on the field', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });

        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam();

        const camera: BattleCamera = new BattleCamera();

        const battleSquaddieUIInput: BattleSquaddieUIInput = new BattleSquaddieUIInput({
            squaddieRepository: squaddieRepo,
            selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
            missionMap,
            selectedSquaddieDynamicID: "player_soldier_0",
            tileClickedOn: {q: 0, r: 0},
        })

        const state: OrchestratorState = new OrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            battleSquaddieUIInput,
            hexMap: missionMap.terrainTileMap,
            battlePhaseTracker,
            pathfinder: new Pathfinder(),
            battleEventRecording: new Recording({}),
        });

        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 1, ...camera.getCoordinates());

        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY
        });

        expect(selector.hasCompleted(state)).toBeTruthy();
        expect(state.squaddieCurrentlyActing.instruction.totalActionsSpent()).toBe(1);
        expect(state.squaddieCurrentlyActing.instruction.destinationLocation()).toStrictEqual({q: 0, r: 1});

        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);

        const expectedMovementInstruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "player_soldier",
            dynamicSquaddieId: "player_soldier_0",
            startingLocation: {
                q: 0,
                r: 0,
            }
        });

        expectedMovementInstruction.addMovement(new SquaddieMovementActivity({
            destination: {q: 0, r: 1},
            numberOfActionsSpent: 1,
        }));

        const history = state.battleEventRecording.getHistory();
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual(new BattleEvent({
            instruction: expectedMovementInstruction
        }));
    });

    it('can instruct squaddie to end turn when player clicks on End Turn button', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });

        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam();

        const camera: BattleCamera = new BattleCamera();

        const battleSquaddieUIInput: BattleSquaddieUIInput = new BattleSquaddieUIInput({
            squaddieRepository: squaddieRepo,
            selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
            missionMap,
            selectedSquaddieDynamicID: "player_soldier_0",
            tileClickedOn: {q: 0, r: 0},
        });

        let mockHud: BattleSquaddieSelectedHUD;
        mockHud = new (<new (options: any) => BattleSquaddieSelectedHUD>BattleSquaddieSelectedHUD)({}) as jest.Mocked<BattleSquaddieSelectedHUD>;
        mockHud.wasActivitySelected = jest.fn().mockReturnValue(true);
        mockHud.getSelectedActivity = jest.fn().mockReturnValue(endTurnActivity);
        mockHud.shouldDrawTheHUD = jest.fn().mockReturnValue(true);
        mockHud.didMouseClickOnHUD = jest.fn().mockReturnValue(true);
        mockHud.mouseClicked = jest.fn();
        mockHud.getSelectedSquaddieDynamicId = jest.fn().mockReturnValue("player_soldier_0");

        const state: OrchestratorState = new OrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            battleSquaddieSelectedHUD: mockHud,
            battleSquaddieUIInput,
            hexMap: missionMap.terrainTileMap,
            battlePhaseTracker,
            pathfinder: new Pathfinder(),
        });

        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0
        });

        expect(selector.hasCompleted(state)).toBeTruthy();
        const endTurnActivityInstruction: SquaddieInstruction = state.squaddieCurrentlyActing.instruction;
        const mostRecentActivity = endTurnActivityInstruction.getActivities().reverse()[0];
        expect(mostRecentActivity).toBeInstanceOf(SquaddieEndTurnActivity);

        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY);

        const history = state.battleEventRecording.getHistory();
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual(new BattleEvent({
            instruction: endTurnActivityInstruction
        }));
    });

    describe('squaddie team strategy', () => {
        let battlePhaseTracker: BattlePhaseTracker;

        beforeEach(() => {
            battlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam();
        });

        it('instructs the squaddie to end turn when the player cannot control the team squaddies', () => {
            const enemyEndTurnStrategy = new EndTurnTeamStrategy();
            const strategySpy = jest.spyOn(enemyEndTurnStrategy, "DetermineNextInstruction");

            const state: OrchestratorState = new OrchestratorState({
                battlePhaseTracker,
                hexMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                }),
                squaddieRepo,
                battleEventRecording: new Recording({}),
                teamStrategyByAffiliation: {
                    ENEMY: [enemyEndTurnStrategy],
                },
            });

            selector.update(state, mockedP5);
            expect(selector.hasCompleted(state)).toBeTruthy();

            const endTurnActivityInstruction: SquaddieInstruction = state.squaddieCurrentlyActing.instruction;
            const mostRecentActivity = endTurnActivityInstruction.getActivities().reverse()[0];
            expect(mostRecentActivity).toBeInstanceOf(SquaddieEndTurnActivity);

            const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
            expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY);

            const history = state.battleEventRecording.getHistory();
            expect(history).toHaveLength(1);
            expect(history[0]).toStrictEqual(new BattleEvent({
                instruction: endTurnActivityInstruction
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
    });

    it('will change phase if no squaddies are able to act', () => {
        const battlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam();

        while (battlePhaseTracker.getCurrentTeam().hasAnActingSquaddie()) {
            let dynamicId = battlePhaseTracker.getCurrentTeam().getDynamicSquaddieIdThatCanActButNotPlayerControlled();
            const {
                dynamicSquaddie
            } = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicID(dynamicId));

            dynamicSquaddie.endTurn();
        }

        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            hexMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            }),
            squaddieRepo,
        });

        selector.update(state, mockedP5);
        expect(selector.hasCompleted(state)).toBeTruthy();

        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
    });
});
