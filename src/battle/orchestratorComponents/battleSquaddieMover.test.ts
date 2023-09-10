import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddieMover} from "./battleSquaddieMover";
import {BattleSquaddieUIInput, BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {getResultOrThrowError, makeResult} from "../../utils/ResultOrError";
import {TIME_TO_MOVE} from "../animation/squaddieMoveAnimationUtils";
import {SquaddieActivitiesForThisRound} from "../history/squaddieActivitiesForThisRound";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import * as mocks from "../../utils/test/mocks";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";

describe('BattleSquaddieMover', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let player1Static: BattleSquaddieStatic;
    let player1Dynamic: BattleSquaddieDynamic;
    let enemy1Static: BattleSquaddieStatic;
    let enemy1Dynamic: BattleSquaddieDynamic;
    let map: MissionMap;
    let mockedP5 = mocks.mockedP5();

    beforeEach(() => {
        mockedP5 = mocks.mockedP5();
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
            staticSquaddie: player1Static,
            dynamicSquaddie: player1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Player1",
            staticId: "player_1",
            dynamicId: "player_1",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
        }));

        ({
            staticSquaddie: enemy1Static,
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

        const uiInput: BattleSquaddieUIInput = new BattleSquaddieUIInput({
            selectionState: BattleSquaddieUISelectionState.MOVING_SQUADDIE,
            missionMap: map,
            squaddieRepository: squaddieRepo,
            selectedSquaddieDynamicID: "player_1",
            tileClickedOn: new HexCoordinate({q: 1, r: 1}),
            finishedAnimating: false,
            squaddieInstructionInProgress: new SquaddieInstructionInProgress({}),
        });
        const pathfinder: Pathfinder = new Pathfinder();
        const movePath: SearchPath = getResultOrThrowError(
            getResultOrThrowError(pathfinder.findPathToStopLocation(new SearchParams({
                    startLocation: new HexCoordinate({q: 0, r: 0}),
                    stopLocation: new HexCoordinate({q: 1, r: 1}),
                    squaddieAffiliation: SquaddieAffiliation.PLAYER,
                    canStopOnSquaddies: true,
                    missionMap: map,
                    squaddieMovement: new SquaddieMovement({
                        movementPerAction: 999,
                        traits: new TraitStatusStorage()
                    }),
                    squaddieRepository: squaddieRepo,
                    shapeGeneratorType: TargetingShape.Snake,
                }))
            ).getRouteToStopLocation());

        const moveActivity: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "player_1",
            dynamicSquaddieId: "player_1",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        moveActivity.addActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 1, r: 1}),
            numberOfActionsSpent: 3,
        }));

        const squaddieCurrentlyActing: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({
            activitiesForThisRound: moveActivity
        });
        squaddieCurrentlyActing.markSquaddieDynamicIdAsMoving("player_1");

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepo,
            battleSquaddieUIInput: uiInput,
            pathfinder,
            missionMap: map,
            squaddieMovePath: movePath,
            hexMap: map.terrainTileMap,
            squaddieCurrentlyActing: new SquaddieInstructionInProgress({
                activitiesForThisRound: moveActivity,
            }),
        });
        const mover: BattleSquaddieMover = new BattleSquaddieMover();
        jest.spyOn(Date, 'now').mockImplementation(() => 1);
        mover.update(state, mockedP5);
        expect(mover.hasCompleted(state)).toBeFalsy();
        expect(state.squaddieCurrentlyActing.isSquaddieDynamicIdMoving("player_1")).toBeTruthy();

        jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
        mover.update(state, mockedP5);
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
            newInstruction: SquaddieActivitiesForThisRound,
        }): BattleOrchestratorState => {
            const uiInput: BattleSquaddieUIInput = new BattleSquaddieUIInput({
                selectionState: BattleSquaddieUISelectionState.MOVING_SQUADDIE,
                missionMap: map,
                squaddieRepository: squaddieRepo,
                selectedSquaddieDynamicID: dynamicSquaddieId,
                tileClickedOn: new HexCoordinate({q: 1, r: 1}),
                finishedAnimating: false,
                squaddieInstructionInProgress: new SquaddieInstructionInProgress({}),
            });
            const movePath: SearchPath = getResultOrThrowError(
                getResultOrThrowError(pathfinder.findPathToStopLocation(new SearchParams({
                        startLocation: new HexCoordinate({q: 0, r: 0}),
                        stopLocation: new HexCoordinate({q: 1, r: 1}),
                        squaddieAffiliation,
                        canStopOnSquaddies: true,
                        missionMap: map,
                        squaddieMovement: new SquaddieMovement({
                            movementPerAction: 999,
                            traits: new TraitStatusStorage()
                        }),
                        squaddieRepository: squaddieRepo,
                        shapeGeneratorType: TargetingShape.Snake,
                    }))
                ).getRouteToStopLocation());

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            return new BattleOrchestratorState({
                squaddieRepo,
                battleSquaddieUIInput: uiInput,
                pathfinder,
                missionMap: map,
                squaddieMovePath: movePath,
                hexMap: map.terrainTileMap,
                squaddieCurrentlyActing: new SquaddieInstructionInProgress({
                    activitiesForThisRound: newInstruction,
                }),
                resourceHandler: mockResourceHandler,
            });
        }

        it('resets squaddie currently acting when it runs out of actions and finishes moving', () => {
            map.addSquaddie("player_1", "player_1", new HexCoordinate({q: 0, r: 0}));

            const moveActivity: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
                staticSquaddieId: "player_1",
                dynamicSquaddieId: "player_1",
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            });
            moveActivity.addActivity(new SquaddieMovementActivity({
                destination: new HexCoordinate({q: 1, r: 1}),
                numberOfActionsSpent: 3,
            }));

            const state = setupSquaddie({
                dynamicSquaddieId: "player_1",
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                newInstruction: moveActivity,
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5);
            mover.reset(state);
            expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeTruthy();

            expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeFalsy();
        });

        it('should open the HUD if the squaddie turn is incomplete', () => {
            map.addSquaddie("player_1", "player_1", new HexCoordinate({q: 0, r: 0}));

            const moveActivity: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
                staticSquaddieId: "player_1",
                dynamicSquaddieId: "player_1",
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            });
            moveActivity.addActivity(new SquaddieMovementActivity({
                destination: new HexCoordinate({q: 1, r: 1}),
                numberOfActionsSpent: 1,
            }));

            const state = setupSquaddie({
                dynamicSquaddieId: "player_1",
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                newInstruction: moveActivity,
            });

            state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
                dynamicId: "player_1",
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5);
            mover.reset(state);

            expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeFalsy();
            expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeTruthy();
        });

        it('should not open the HUD if the squaddie turn is incomplete and is not controllable by the player', () => {
            map.addSquaddie("enemy_1", "enemy_1", new HexCoordinate({q: 0, r: 0}));

            const moveActivity: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
                staticSquaddieId: "enemy_1",
                dynamicSquaddieId: "enemy_1",
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            });
            moveActivity.addActivity(new SquaddieMovementActivity({
                destination: new HexCoordinate({q: 1, r: 1}),
                numberOfActionsSpent: 1,
            }));

            const state = setupSquaddie({
                dynamicSquaddieId: "enemy_1",
                squaddieAffiliation: SquaddieAffiliation.ENEMY,
                newInstruction: moveActivity,
            });

            state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
                dynamicId: "enemy_1",
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5);
            mover.reset(state);

            expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeFalsy();
            expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeFalsy();
        });
    });
});
