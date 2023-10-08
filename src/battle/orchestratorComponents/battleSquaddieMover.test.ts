import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddie} from "../battleSquaddie";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddieMover} from "./battleSquaddieMover";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {SearchMovement, SearchParams, SearchSetup, SearchStopCondition} from "../../hexMap/pathfinder/searchParams";
import {getResultOrThrowError, makeResult} from "../../utils/ResultOrError";
import {TIME_TO_MOVE} from "../animation/squaddieMoveAnimationUtils";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {SquaddieMovementAction} from "../history/squaddieMovementAction";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

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
            squaddietemplate: player1Static,
            dynamicSquaddie: player1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Player1",
            staticId: "player_1",
            dynamicId: "player_1",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
        }));

        ({
            squaddietemplate: enemy1Static,
            dynamicSquaddie: enemy1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Enemy1",
            staticId: "enemy_1",
            dynamicId: "enemy_1",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepo,
        }));
    });


    it('is complete once enough time passes and the squaddie finishes moving', () => {
        map.addSquaddie("player_1", "player_1", new HexCoordinate({q: 0, r: 0}));

        const pathfinder: Pathfinder = new Pathfinder();
        const movePath: SearchPath = getResultOrThrowError(
            getResultOrThrowError(pathfinder.findPathToStopLocation(new SearchParams({
                    setup: new SearchSetup({
                        startLocation: new HexCoordinate({q: 0, r: 0}),
                        affiliation: SquaddieAffiliation.PLAYER,
                        missionMap: map,
                        squaddieRepository: squaddieRepo,
                    }),
                    movement: new SearchMovement({
                        canStopOnSquaddies: true,
                        movementPerAction: 99,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                    }),
                    stopCondition: new SearchStopCondition({
                        stopLocation: new HexCoordinate({q: 1, r: 1}),
                    }),
                }))
            ).getRouteToStopLocation());

        const moveAction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddietemplateId: "player_1",
            dynamicSquaddieId: "player_1",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        moveAction.addAction(new SquaddieMovementAction({
            destination: new HexCoordinate({q: 1, r: 1}),
            numberOfActionPointsSpent: 3,
        }));

        const squaddieCurrentlyActing: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({
            actionsForThisRound: moveAction
        });
        squaddieCurrentlyActing.markSquaddieDynamicIdAsMoving("player_1");

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: squaddieRepo,
            pathfinder,
            missionMap: map,
            squaddieMovePath: movePath,
            hexMap: map.terrainTileMap,
            squaddieCurrentlyActing: new SquaddieInstructionInProgress({
                actionsForThisRound: moveAction,
            }),
        });
        const mover: BattleSquaddieMover = new BattleSquaddieMover();
        jest.spyOn(Date, 'now').mockImplementation(() => 1);
        mover.update(state, mockedP5GraphicsContext);
        expect(mover.hasCompleted(state)).toBeFalsy();
        expect(state.squaddieCurrentlyActing.isSquaddieDynamicIdMoving("player_1")).toBeTruthy();

        jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
        mover.update(state, mockedP5GraphicsContext);
        expect(mover.hasCompleted(state)).toBeTruthy();
        mover.reset(state);
        expect(mover.animationStartTime).toBeUndefined();
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeTruthy();
        expect(state.squaddieCurrentlyActing.isSquaddieDynamicIdMoving("player_1")).toBeFalsy();
    });

    describe('reset actions based on squaddie', () => {
        let pathfinder: Pathfinder;

        beforeEach(() => {
            pathfinder = new Pathfinder();
        });

        const setupSquaddie = ({
                                   dynamicSquaddieId,
                                   squaddieAffiliation,
                                   newInstruction
                               }: {
            dynamicSquaddieId: string,
            squaddieAffiliation: SquaddieAffiliation,
            newInstruction: SquaddieActionsForThisRound,
        }): BattleOrchestratorState => {
            const movePath: SearchPath = getResultOrThrowError(
                getResultOrThrowError(pathfinder.findPathToStopLocation(new SearchParams({
                        setup: new SearchSetup({
                            startLocation: new HexCoordinate({q: 0, r: 0}),
                            affiliation: squaddieAffiliation,
                            missionMap: map,
                            squaddieRepository: squaddieRepo,
                        }),
                        movement: new SearchMovement({
                            canStopOnSquaddies: true,
                            movementPerAction: 999,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                        }),
                        stopCondition: new SearchStopCondition({
                            stopLocation: new HexCoordinate({q: 1, r: 1}),
                        })
                    }))
                ).getRouteToStopLocation());

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            return new BattleOrchestratorState({
                squaddieRepository: squaddieRepo,
                pathfinder,
                missionMap: map,
                squaddieMovePath: movePath,
                hexMap: map.terrainTileMap,
                squaddieCurrentlyActing: new SquaddieInstructionInProgress({
                    actionsForThisRound: newInstruction,
                }),
                resourceHandler: mockResourceHandler,
            });
        }

        it('resets squaddie currently acting when it runs out of actions and finishes moving', () => {
            map.addSquaddie("player_1", "player_1", new HexCoordinate({q: 0, r: 0}));

            const moveAction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
                squaddietemplateId: "player_1",
                dynamicSquaddieId: "player_1",
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            });
            moveAction.addAction(new SquaddieMovementAction({
                destination: new HexCoordinate({q: 1, r: 1}),
                numberOfActionPointsSpent: 3,
            }));

            const state = setupSquaddie({
                dynamicSquaddieId: "player_1",
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                newInstruction: moveAction,
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5GraphicsContext);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5GraphicsContext);
            mover.reset(state);
            expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeTruthy();

            expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeFalsy();
        });

        it('should open the HUD if the squaddie turn is incomplete', () => {
            map.addSquaddie("player_1", "player_1", new HexCoordinate({q: 0, r: 0}));

            const moveAction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
                squaddietemplateId: "player_1",
                dynamicSquaddieId: "player_1",
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            });
            moveAction.addAction(new SquaddieMovementAction({
                destination: new HexCoordinate({q: 1, r: 1}),
                numberOfActionPointsSpent: 1,
            }));

            const state = setupSquaddie({
                dynamicSquaddieId: "player_1",
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                newInstruction: moveAction,
            });

            state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
                dynamicId: "player_1",
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5GraphicsContext);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5GraphicsContext);
            mover.reset(state);

            expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeFalsy();
            expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeTruthy();
        });

        it('should not open the HUD if the squaddie turn is incomplete and is not controllable by the player', () => {
            map.addSquaddie("enemy_1", "enemy_1", new HexCoordinate({q: 0, r: 0}));

            const moveAction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
                squaddietemplateId: "enemy_1",
                dynamicSquaddieId: "enemy_1",
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            });
            moveAction.addAction(new SquaddieMovementAction({
                destination: new HexCoordinate({q: 1, r: 1}),
                numberOfActionPointsSpent: 1,
            }));

            const state = setupSquaddie({
                dynamicSquaddieId: "enemy_1",
                squaddieAffiliation: SquaddieAffiliation.ENEMY,
                newInstruction: moveAction,
            });

            state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
                dynamicId: "enemy_1",
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5GraphicsContext);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5GraphicsContext);
            mover.reset(state);

            expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeFalsy();
            expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeFalsy();
        });
    });
});
