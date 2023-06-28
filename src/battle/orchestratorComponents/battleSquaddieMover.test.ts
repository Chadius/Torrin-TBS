import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieId} from "../../squaddie/id";
import {NullSquaddieResource} from "../../squaddie/resource";
import {NullTraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieTurn} from "../../squaddie/turn";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattleSquaddieMover} from "./battleSquaddieMover";
import {BattleSquaddieUIInput, BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {getResultOrThrowError, makeResult} from "../../utils/ResultOrError";
import {TIME_TO_MOVE} from "../animation/squaddieMoveAnimationUtils";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import p5 from "p5";
import {NullArmyAttributes} from "../../squaddie/armyAttributes";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {CurrentSquaddieInstruction} from "../history/currentSquaddieInstruction";
import {ResourceHandler} from "../../resource/resourceHandler";
import {stubImmediateLoader} from "../../resource/resourceHandlerTestUtils";

jest.mock('p5', () => () => {
    return {}
});

describe('BattleSquaddieMover', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let player1Static: BattleSquaddieStatic;
    let player1Dynamic: BattleSquaddieDynamic;
    let enemy1Static: BattleSquaddieStatic;
    let enemy1Dynamic: BattleSquaddieDynamic;
    let map: MissionMap;
    let mockedP5: p5;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();
        map = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 ",
                    " 1 1 "
                ]
            })
        });

        player1Static = new BattleSquaddieStatic({
            attributes: NullArmyAttributes(),
            squaddieId: new SquaddieId({
                staticId: "player_1",
                name: "Player1",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            activities: [],
        });

        player1Dynamic = new BattleSquaddieDynamic({
            dynamicSquaddieId: "player_1",
            staticSquaddieId: "player_1",
            squaddieTurn: new SquaddieTurn(),
        });

        squaddieRepo.addSquaddie(player1Static, player1Dynamic);

        enemy1Static = new BattleSquaddieStatic({
            attributes: NullArmyAttributes(),
            squaddieId: new SquaddieId({
                staticId: "enemy_1",
                name: "Enemy1",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.ENEMY,
            }),
            activities: [],
        });

        enemy1Dynamic = new BattleSquaddieDynamic({
            dynamicSquaddieId: "enemy_1",
            staticSquaddieId: "enemy_1",
            squaddieTurn: new SquaddieTurn(),
        });

        squaddieRepo.addStaticSquaddie(
            enemy1Static
        );

        squaddieRepo.addDynamicSquaddie(
            enemy1Dynamic
        );

        mockedP5 = new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;
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
                        traits: NullTraitStatusStorage()
                    }),
                    squaddieRepository: squaddieRepo,
                    shapeGeneratorType: TargetingShape.Snake,
                }))
            ).getRouteToStopLocation());

        const moveActivity: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "player_1",
            dynamicSquaddieId: "player_1",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        moveActivity.addActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 1, r: 1}),
            numberOfActionsSpent: 3,
        }));

        const squaddieCurrentlyActing: CurrentSquaddieInstruction = new CurrentSquaddieInstruction({
            instruction: moveActivity
        });
        squaddieCurrentlyActing.markSquaddieDynamicIdAsMoving("player_1");

        const state: OrchestratorState = new OrchestratorState({
            squaddieRepo,
            battleSquaddieUIInput: uiInput,
            pathfinder,
            missionMap: map,
            squaddieMovePath: movePath,
            hexMap: map.terrainTileMap,
            squaddieCurrentlyActing: new CurrentSquaddieInstruction({
                instruction: moveActivity,
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
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie()).toBeTruthy();
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
            newInstruction: SquaddieInstruction,
        }): OrchestratorState => {
            const uiInput: BattleSquaddieUIInput = new BattleSquaddieUIInput({
                selectionState: BattleSquaddieUISelectionState.MOVING_SQUADDIE,
                missionMap: map,
                squaddieRepository: squaddieRepo,
                selectedSquaddieDynamicID: dynamicSquaddieId,
                tileClickedOn: new HexCoordinate({q: 1, r: 1}),
                finishedAnimating: false,
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
                            traits: NullTraitStatusStorage()
                        }),
                        squaddieRepository: squaddieRepo,
                        shapeGeneratorType: TargetingShape.Snake,
                    }))
                ).getRouteToStopLocation());

            let mockResourceHandler = new (
                <new (options: any) => ResourceHandler>ResourceHandler
            )({
                imageLoader: new stubImmediateLoader(),
            }) as jest.Mocked<ResourceHandler>;
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            return new OrchestratorState({
                squaddieRepo,
                battleSquaddieUIInput: uiInput,
                pathfinder,
                missionMap: map,
                squaddieMovePath: movePath,
                hexMap: map.terrainTileMap,
                squaddieCurrentlyActing: new CurrentSquaddieInstruction({
                    instruction: newInstruction,
                }),
                resourceHandler: mockResourceHandler,
            });
        }

        it('resets squaddie currently acting when it runs out of actions and finishes moving', () => {
            map.addSquaddie("player_1", "player_1", new HexCoordinate({q: 0, r: 0}));

            const moveActivity: SquaddieInstruction = new SquaddieInstruction({
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
            expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie()).toBeTruthy();

            expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeFalsy();
        });

        it('should open the HUD if the squaddie turn is incomplete', () => {
            map.addSquaddie("player_1", "player_1", new HexCoordinate({q: 0, r: 0}));

            const moveActivity: SquaddieInstruction = new SquaddieInstruction({
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
                dynamicID: "player_1",
                repositionWindow: {mouseX: 0, mouseY: 0},
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5);
            mover.reset(state);

            expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie()).toBeFalsy();
            expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeTruthy();
        });

        it('should not open the HUD if the squaddie turn is incomplete and is not controllable by the player', () => {
            map.addSquaddie("enemy_1", "enemy_1", new HexCoordinate({q: 0, r: 0}));

            const moveActivity: SquaddieInstruction = new SquaddieInstruction({
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
                dynamicID: "enemy_1",
                repositionWindow: {mouseX: 0, mouseY: 0},
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5);
            mover.reset(state);

            expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie()).toBeFalsy();
            expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeFalsy();
        });
    });
});
