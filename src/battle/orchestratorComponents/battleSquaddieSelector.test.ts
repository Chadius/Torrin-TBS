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
import {getResultOrThrowError, makeResult} from "../../utils/ResultOrError";
import p5 from "p5";
import {ScreenDimensions} from "../../utils/graphicsConfig";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {Recording} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieActivity} from "../../squaddie/activity";
import {NullTraitStatusStorage} from "../../trait/traitStatusStorage";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {CurrentSquaddieInstruction} from "../history/currentSquaddieInstruction";
import {ResourceHandler} from "../../resource/resourceHandler";
import {stubImmediateLoader} from "../../resource/resourceHandlerTestUtils";

jest.mock('p5', () => () => {
    return {}
});

describe('BattleSquaddieSelector', () => {
    let selector: BattleSquaddieSelector = new BattleSquaddieSelector();
    let squaddieRepo: BattleSquaddieRepository = new BattleSquaddieRepository();
    let mockedP5: p5;
    let missionMap: MissionMap;

    beforeEach(() => {
        selector = new BattleSquaddieSelector();
        squaddieRepo = new BattleSquaddieRepository();
        mockedP5 = new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;
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
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "enemy_demon_0",
                staticSquaddieId: "enemy_demon",
                squaddieTurn: new SquaddieTurn()
            })
        );

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

    const makeBattlePhaseTrackerWithPlayerTeam = (missionMap: MissionMap) => {
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
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "player_soldier_0",
                staticSquaddieId: "player_soldier",
                squaddieTurn: new SquaddieTurn()
            })
        );
        playerTeam.addDynamicSquaddieIds(["player_soldier_0"]);

        missionMap.addSquaddie(
            "player_soldier",
            "player_soldier_0",
            new HexCoordinate({q: 0, r: 0})
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

    it('ignores mouse input when the player cannot control the squaddies', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });

        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam(missionMap);
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
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        const camera: BattleCamera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            squaddieRepo,
            camera,
            missionMap,
        });

        selector.update(state, mockedP5);

        expect(selector.hasCompleted(state)).toBeTruthy();
        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY);
    });

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

    it('can make a movement activity by clicking on the field', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });

        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        const battleSquaddieUIInput: BattleSquaddieUIInput = new BattleSquaddieUIInput({
            squaddieRepository: squaddieRepo,
            selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
            missionMap,
            selectedSquaddieDynamicID: "player_soldier_0",
            tileClickedOn: new HexCoordinate({q: 0, r: 0}),
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
        expect(state.squaddieCurrentlyActing.instruction.destinationLocation()).toStrictEqual(new HexCoordinate({
            q: 0,
            r: 1
        }));

        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);

        const expectedSquaddieInstruction: CurrentSquaddieInstruction = new CurrentSquaddieInstruction({});
        expectedSquaddieInstruction.addSquaddie({
            staticSquaddieId: "player_soldier",
            dynamicSquaddieId: "player_soldier_0",
            startingLocation: new HexCoordinate({
                q: 0,
                r: 0,
            })
        });
        expectedSquaddieInstruction.addConfirmedActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 0, r: 1}),
            numberOfActionsSpent: 1,
        }))

        const history = state.battleEventRecording.history;
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual(new BattleEvent({
            currentSquaddieInstruction: expectedSquaddieInstruction,
        }));
    });

    describe('adding movement mid turn instruction', () => {
        let mockHud: BattleSquaddieSelectedHUD;
        let camera: BattleCamera;
        let battlePhaseTracker: BattlePhaseTracker;
        let battleSquaddieUIInput: BattleSquaddieUIInput;
        let state: OrchestratorState;
        let squaddieCurrentlyActing: CurrentSquaddieInstruction;

        beforeEach(() => {
            const missionMap: MissionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "]
                })
            });

            battlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

            camera = new BattleCamera();

            battleSquaddieUIInput = new BattleSquaddieUIInput({
                squaddieRepository: squaddieRepo,
                selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
                missionMap,
                selectedSquaddieDynamicID: "player_soldier_0",
                tileClickedOn: new HexCoordinate({q: 0, r: 0}),
            })

            const mockResourceHandler = new (
                <new (options: any) => ResourceHandler>ResourceHandler
            )({
                imageLoader: new stubImmediateLoader(),
            }) as jest.Mocked<ResourceHandler>;
            mockResourceHandler.loadResources = jest.fn();
            mockResourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValue(true);
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            mockHud = new BattleSquaddieSelectedHUD({
                missionMap,
                resourceHandler: mockResourceHandler,
                squaddieRepository: squaddieRepo,
            });
            const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());
            mockHud.selectSquaddieAndDrawWindow({
                dynamicID: "player_soldier_0",
                repositionWindow: {mouseX: mouseX, mouseY: mouseY}
            });

            squaddieCurrentlyActing = new CurrentSquaddieInstruction({});
            squaddieCurrentlyActing.addSquaddie({
                dynamicSquaddieId: "player_soldier_0",
                staticSquaddieId: "player_soldier",
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            });
            squaddieCurrentlyActing.addConfirmedActivity(new SquaddieMovementActivity({
                destination: new HexCoordinate({q: 0, r: 1}),
                numberOfActionsSpent: 1
            }));

            state = new OrchestratorState({
                missionMap,
                squaddieRepo,
                camera,
                battleSquaddieUIInput,
                battleSquaddieSelectedHUD: mockHud,
                hexMap: missionMap.terrainTileMap,
                battlePhaseTracker,
                pathfinder: new Pathfinder(),
                squaddieCurrentlyActing,
                battleEventRecording: new Recording({}),
            });
        });

        it('when user clicks on new location, will add movement to existing instruction', () => {
            const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 2, ...camera.getCoordinates());
            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY,
            });
            expect(selector.hasCompleted(state)).toBeTruthy();
            expect(state.squaddieCurrentlyActing.instruction.getActivities()).toHaveLength(2);
            expect(state.squaddieCurrentlyActing.instruction.getActivities()[1]).toStrictEqual(new SquaddieMovementActivity({
                destination: new HexCoordinate({q: 0, r: 2}),
                numberOfActionsSpent: 1,
            }));
            expect(state.squaddieCurrentlyActing.instruction.totalActionsSpent()).toBe(2);
        });
    });

    it('will add end turn to existing instruction', () => {
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        const battleSquaddieUIInput: BattleSquaddieUIInput = new BattleSquaddieUIInput({
            squaddieRepository: squaddieRepo,
            selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
            missionMap,
            selectedSquaddieDynamicID: "player_soldier_0",
            tileClickedOn: new HexCoordinate({q: 0, r: 0}),
        })

        const squaddieCurrentlyActing: CurrentSquaddieInstruction = new CurrentSquaddieInstruction({});
        squaddieCurrentlyActing.addSquaddie({
            dynamicSquaddieId: "player_soldier_0",
            staticSquaddieId: "player_soldier",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        squaddieCurrentlyActing.addConfirmedActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 0, r: 1}),
            numberOfActionsSpent: 1
        }));

        let mockHud: BattleSquaddieSelectedHUD;
        mockHud = new (<new (options: any) => BattleSquaddieSelectedHUD>BattleSquaddieSelectedHUD)({}) as jest.Mocked<BattleSquaddieSelectedHUD>;
        mockHud.wasActivitySelected = jest.fn().mockReturnValue(true);
        mockHud.getSelectedActivity = jest.fn().mockReturnValue(new SquaddieEndTurnActivity());
        mockHud.shouldDrawTheHUD = jest.fn().mockReturnValue(true);
        mockHud.didMouseClickOnHUD = jest.fn().mockReturnValue(true);
        mockHud.mouseClicked = jest.fn();
        mockHud.getSelectedSquaddieDynamicId = jest.fn().mockReturnValue("player_soldier_0");

        const state: OrchestratorState = new OrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            battleSquaddieUIInput,
            battleSquaddieSelectedHUD: mockHud,
            hexMap: missionMap.terrainTileMap,
            battlePhaseTracker,
            pathfinder: new Pathfinder(),
            squaddieCurrentlyActing,
            battleEventRecording: new Recording({}),
        });

        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0
        });
        selector.update(state, mockedP5);
        expect(selector.hasCompleted(state)).toBeTruthy();
        expect(state.squaddieCurrentlyActing.instruction.getActivities()).toHaveLength(2);
        expect(state.squaddieCurrentlyActing.instruction.getActivities()[1]).toStrictEqual(new SquaddieEndTurnActivity());
        expect(state.squaddieCurrentlyActing.instruction.totalActionsSpent()).toBe(3);
    });

    it('can instruct squaddie to end turn when player clicks on End Turn button', () => {
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        const battleSquaddieUIInput: BattleSquaddieUIInput = new BattleSquaddieUIInput({
            squaddieRepository: squaddieRepo,
            selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
            missionMap,
            selectedSquaddieDynamicID: "player_soldier_0",
            tileClickedOn: new HexCoordinate({q: 0, r: 0}),
        });

        let mockHud: BattleSquaddieSelectedHUD;
        mockHud = new (<new (options: any) => BattleSquaddieSelectedHUD>BattleSquaddieSelectedHUD)({}) as jest.Mocked<BattleSquaddieSelectedHUD>;
        mockHud.wasActivitySelected = jest.fn().mockReturnValue(true);
        mockHud.getSelectedActivity = jest.fn().mockReturnValue(new SquaddieEndTurnActivity());
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
        const endTurnInstruction: CurrentSquaddieInstruction = new CurrentSquaddieInstruction({});
        endTurnInstruction.addSquaddie({
            dynamicSquaddieId: "player_soldier_0",
            staticSquaddieId: "player_soldier",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        endTurnInstruction.addConfirmedActivity(new SquaddieEndTurnActivity());

        expect(state.squaddieCurrentlyActing.instruction.getMostRecentActivity()).toBeInstanceOf(SquaddieEndTurnActivity);

        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY);

        const history = state.battleEventRecording.history;
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual(new BattleEvent({
            currentSquaddieInstruction: endTurnInstruction
        }));
    });

    it('will recommend squaddie target if a SquaddieActivity is selected that requires a target', () => {
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        const battleSquaddieUIInput: BattleSquaddieUIInput = new BattleSquaddieUIInput({
            squaddieRepository: squaddieRepo,
            selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
            missionMap,
            selectedSquaddieDynamicID: "player_soldier_0",
            tileClickedOn: new HexCoordinate({q: 0, r: 0}),
        });

        const longswordActivity: SquaddieActivity = new SquaddieActivity({
            name: "longsword",
            id: "longsword",
            traits: NullTraitStatusStorage(),
            actionsToSpend: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        });

        let mockHud: BattleSquaddieSelectedHUD;
        mockHud = new (<new (options: any) => BattleSquaddieSelectedHUD>BattleSquaddieSelectedHUD)({}) as jest.Mocked<BattleSquaddieSelectedHUD>;
        mockHud.wasActivitySelected = jest.fn().mockReturnValue(true);
        mockHud.getSelectedActivity = jest.fn().mockReturnValue(longswordActivity);
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
        expect(state.squaddieCurrentlyActing.dynamicSquaddieId).toBe("player_soldier_0");

        const expectedInstruction: SquaddieInstruction = new SquaddieInstruction({
            dynamicSquaddieId: "player_soldier_0",
            staticSquaddieId: "player_soldier",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });

        expect(state.squaddieCurrentlyActing.instruction).toStrictEqual(expectedInstruction);
        expect(state.squaddieCurrentlyActing.currentSquaddieActivity).toStrictEqual(longswordActivity);

        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_TARGET);

        const history = state.battleEventRecording.history;
        expect(history).toHaveLength(0);
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

            const endTurnInstruction: CurrentSquaddieInstruction = new CurrentSquaddieInstruction({});
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
    });

    it('will change phase if no squaddies are able to act', () => {
        const battlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam(missionMap);

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
            missionMap,
        });

        selector.update(state, mockedP5);
        expect(selector.hasCompleted(state)).toBeTruthy();

        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
    });
});
