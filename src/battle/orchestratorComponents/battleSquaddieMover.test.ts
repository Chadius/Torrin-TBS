import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddie} from "../battleSquaddie";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddieMover} from "./battleSquaddieMover";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {getResultOrThrowError, makeResult} from "../../utils/ResultOrError";
import {TIME_TO_MOVE} from "../animation/squaddieMoveAnimationUtils";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {
    SquaddieInstructionInProgress,
    SquaddieInstructionInProgressHandler
} from "../history/squaddieInstructionInProgress";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieActionType} from "../history/anySquaddieAction";

describe('BattleSquaddieMover', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let player1Static: SquaddieTemplate;
    let player1Dynamic: BattleSquaddie;
    let enemy1Static: SquaddieTemplate;
    let enemy1Dynamic: BattleSquaddie;
    let map: MissionMap;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepo = new BattleSquaddieRepository();
        map = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 ",
                    " 1 1 "
                ]
            })
        });

        ({
            squaddieTemplate: player1Static,
            battleSquaddie: player1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Player1",
            templateId: "player_1",
            battleId: "player_1",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
        }));

        ({
            squaddieTemplate: enemy1Static,
            battleSquaddie: enemy1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Enemy1",
            templateId: "enemy_1",
            battleId: "enemy_1",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepo,
        }));
    });


    it('is complete once enough time passes and the squaddie finishes moving', () => {
        map.addSquaddie("player_1", "player_1", {q: 0, r: 0});

        const movePath: SearchPath = getResultOrThrowError(
            getResultOrThrowError(Pathfinder.findPathToStopLocation(
                    SearchParametersHelper.newUsingSearchSetupMovementStop(
                        {
                            setup: {
                                startLocation: {q: 0, r: 0},
                                affiliation: SquaddieAffiliation.PLAYER,
                            },
                            movement: {
                                canStopOnSquaddies: true,
                                movementPerAction: 99,
                                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                                maximumDistanceMoved: undefined,
                                minimumDistanceMoved: undefined,
                                ignoreTerrainPenalty: false,
                                crossOverPits: false,
                                passThroughWalls: false,
                            },
                            stopCondition: {
                                stopLocation: {q: 1, r: 1},
                                numberOfActions: 1,
                            }
                        }
                    ),
                    map,
                    squaddieRepo
                )
            ).getRouteToStopLocation());

        const moveAction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "player_1",
            battleSquaddieId: "player_1",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.addAction(moveAction, {
            type: SquaddieActionType.MOVEMENT,
            data: {
                destination: {q: 1, r: 1},
                numberOfActionPointsSpent: 3,
            }
        });

        const squaddieCurrentlyActing: SquaddieInstructionInProgress = {
            squaddieActionsForThisRound: moveAction,
            movingBattleSquaddieIds: [],
            currentlySelectedAction: undefined,
        };
        SquaddieInstructionInProgressHandler.markBattleSquaddieIdAsMoving(squaddieCurrentlyActing, "player_1");

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: squaddieRepo,
            missionMap: map,
            squaddieMovePath: movePath,
            hexMap: map.terrainTileMap,
            squaddieCurrentlyActing: {
                squaddieActionsForThisRound: moveAction,
                movingBattleSquaddieIds: [],
                currentlySelectedAction: undefined,
            },
        });
        const mover: BattleSquaddieMover = new BattleSquaddieMover();
        jest.spyOn(Date, 'now').mockImplementation(() => 1);
        mover.update(state, mockedP5GraphicsContext);
        expect(mover.hasCompleted(state)).toBeFalsy();
        expect(SquaddieInstructionInProgressHandler.isBattleSquaddieIdMoving(state.squaddieCurrentlyActing, "player_1")).toBeTruthy();

        jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
        mover.update(state, mockedP5GraphicsContext);
        expect(mover.hasCompleted(state)).toBeTruthy();
        mover.reset(state);
        expect(mover.animationStartTime).toBeUndefined();
        expect(SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.squaddieCurrentlyActing)).toBeTruthy();
        expect(SquaddieInstructionInProgressHandler.isBattleSquaddieIdMoving(state.squaddieCurrentlyActing, "player_1")).toBeFalsy();
    });

    describe('reset actions based on squaddie', () => {
        const setupSquaddie = ({
                                   battleSquaddieId,
                                   squaddieAffiliation,
                                   newInstruction
                               }: {
            battleSquaddieId: string,
            squaddieAffiliation: SquaddieAffiliation,
            newInstruction: SquaddieActionsForThisRound,
        }): BattleOrchestratorState => {
            const movePath: SearchPath = getResultOrThrowError(
                getResultOrThrowError(Pathfinder.findPathToStopLocation(
                        SearchParametersHelper.newUsingSearchSetupMovementStop(
                            {
                                setup: {
                                    startLocation: {q: 0, r: 0},
                                    affiliation: squaddieAffiliation,
                                },
                                movement: {
                                    canStopOnSquaddies: true,
                                    movementPerAction: 999,
                                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                                    maximumDistanceMoved: undefined,
                                    minimumDistanceMoved: 0,
                                    ignoreTerrainPenalty: false,
                                    crossOverPits: false,
                                    passThroughWalls: false,
                                },
                                stopCondition: {
                                    stopLocation: {q: 1, r: 1},
                                    numberOfActions: undefined,
                                }
                            }
                        ),
                        map,
                        squaddieRepo,
                    )
                ).getRouteToStopLocation());

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            return new BattleOrchestratorState({
                squaddieRepository: squaddieRepo,
                missionMap: map,
                squaddieMovePath: movePath,
                hexMap: map.terrainTileMap,
                squaddieCurrentlyActing: {
                    squaddieActionsForThisRound: newInstruction,
                    currentlySelectedAction: undefined,
                    movingBattleSquaddieIds: [],
                },
                resourceHandler: mockResourceHandler,
            });
        }

        it('resets squaddie currently acting when it runs out of actions and finishes moving', () => {
            map.addSquaddie("player_1", "player_1", {q: 0, r: 0});

            const moveAction: SquaddieActionsForThisRound = {
                squaddieTemplateId: "player_1",
                battleSquaddieId: "player_1",
                startingLocation: {q: 0, r: 0},
                actions: [],
            };
            SquaddieActionsForThisRoundHandler.addAction(moveAction, {
                type: SquaddieActionType.MOVEMENT,
                data: {
                    destination: {q: 1, r: 1},
                    numberOfActionPointsSpent: 3,
                }
            });

            const state = setupSquaddie({
                battleSquaddieId: "player_1",
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                newInstruction: moveAction,
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5GraphicsContext);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5GraphicsContext);
            mover.reset(state);
            expect(SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.squaddieCurrentlyActing)).toBeTruthy();

            expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeFalsy();
        });

        it('should open the HUD if the squaddie turn is incomplete', () => {
            map.addSquaddie("player_1", "player_1", {q: 0, r: 0});

            const moveAction: SquaddieActionsForThisRound = {
                squaddieTemplateId: "player_1",
                battleSquaddieId: "player_1",
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

            const state = setupSquaddie({
                battleSquaddieId: "player_1",
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                newInstruction: moveAction,
            });

            state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
                battleId: "player_1",
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5GraphicsContext);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5GraphicsContext);
            mover.reset(state);

            expect(SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.squaddieCurrentlyActing)).toBeFalsy();
            expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeTruthy();
        });

        it('should not open the HUD if the squaddie turn is incomplete and is not controllable by the player', () => {
            map.addSquaddie("enemy_1", "enemy_1", {q: 0, r: 0});

            const moveAction: SquaddieActionsForThisRound = {
                squaddieTemplateId: "enemy_1",
                battleSquaddieId: "enemy_1",
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

            const state = setupSquaddie({
                battleSquaddieId: "enemy_1",
                squaddieAffiliation: SquaddieAffiliation.ENEMY,
                newInstruction: moveAction,
            });

            state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
                battleId: "enemy_1",
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5GraphicsContext);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5GraphicsContext);
            mover.reset(state);

            expect(SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.squaddieCurrentlyActing)).toBeFalsy();
            expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeFalsy();
        });
    });
});
