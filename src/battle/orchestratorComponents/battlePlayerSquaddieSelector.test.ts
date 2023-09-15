import {BattlePlayerSquaddieSelector} from "./battlePlayerSquaddieSelector";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattlePhase, BattlePhaseTracker} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieTurn} from "../../squaddie/turn";
import {
    BattleOrchestratorChanges,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {SquaddieActivitiesForThisRound} from "../history/squaddieActivitiesForThisRound";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera} from "../battleCamera";
import {MidTurnInput, MidTurnSelectingSquaddieState} from "../playerInput/midTurnInput";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates
} from "../../hexMap/convertCoordinates";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieEndTurnActivity} from "../history/squaddieEndTurnActivity";
import {makeResult} from "../../utils/ResultOrError";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {Recording} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieActivity} from "../../squaddie/activity";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import SpyInstance = jest.SpyInstance;

describe('BattleSquaddieSelector', () => {
    let selector: BattlePlayerSquaddieSelector = new BattlePlayerSquaddieSelector();
    let squaddieRepo: BattleSquaddieRepository = new BattleSquaddieRepository();
    let missionMap: MissionMap;
    let enemyDemonStatic: BattleSquaddieStatic;
    let enemyDemonDynamic: BattleSquaddieDynamic;
    let demonBiteActivity: SquaddieActivity;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        selector = new BattlePlayerSquaddieSelector();
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
            enemyDemonStatic.staticId,
            enemyDemonDynamic.dynamicSquaddieId,
            new HexCoordinate({q: 0, r: 0})
        );
        missionMap.addSquaddie(
            enemyDemonStatic.staticId,
            enemyDemonDynamic.dynamicSquaddieId,
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

        CreateNewSquaddieAndAddToRepository({
            name: "Player Soldier",
            staticId: "player_soldier",
            dynamicId: "player_soldier_0",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
        });
        playerTeam.addDynamicSquaddieIds(["player_soldier_0"]);

        missionMap.addSquaddie(
            "player_soldier",
            "player_soldier_0",
            new HexCoordinate({q: 0, r: 0})
        );

        return battlePhaseTracker;
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

        const state: BattleOrchestratorState = new BattleOrchestratorState({
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

    it('recommends computer squaddie selector if the player cannot control the squaddies', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        const camera: BattleCamera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            battlePhaseTracker,
            squaddieRepo,
            camera,
            missionMap,
        });

        selector.update(state, mockedP5GraphicsContext);

        expect(selector.hasCompleted(state)).toBeTruthy();
        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR);
    });

    it('can make a movement activity by clicking on the field', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });

        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            hexMap: missionMap.terrainTileMap,
            battlePhaseTracker,
            pathfinder: new Pathfinder(),
            battleEventRecording: new Recording({}),
            resourceHandler: mocks.mockResourceHandler(),
        });

        let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());
        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY
        });

        [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 1, ...camera.getCoordinates());
        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY
        });

        expect(selector.hasCompleted(state)).toBeTruthy();
        expect(state.squaddieCurrentlyActing.squaddieActivitiesForThisRound.totalActionsSpent()).toBe(1);
        expect(state.squaddieCurrentlyActing.squaddieActivitiesForThisRound.destinationLocation()).toStrictEqual(new HexCoordinate({
            q: 0,
            r: 1
        }));

        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);

        const expectedSquaddieInstruction: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({});
        expectedSquaddieInstruction.addInitialState({
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
        let camera: BattleCamera;
        let battlePhaseTracker: BattlePhaseTracker;
        let state: BattleOrchestratorState;
        let squaddieCurrentlyActing: SquaddieInstructionInProgress;

        beforeEach(() => {
            const missionMap: MissionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "]
                })
            });

            battlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

            camera = new BattleCamera();

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            squaddieCurrentlyActing = new SquaddieInstructionInProgress({});
            squaddieCurrentlyActing.addInitialState({
                dynamicSquaddieId: "player_soldier_0",
                staticSquaddieId: "player_soldier",
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            });
            squaddieCurrentlyActing.addConfirmedActivity(new SquaddieMovementActivity({
                destination: new HexCoordinate({q: 0, r: 1}),
                numberOfActionsSpent: 1
            }));

            state = new BattleOrchestratorState({
                missionMap,
                squaddieRepo,
                camera,
                hexMap: missionMap.terrainTileMap,
                battlePhaseTracker,
                pathfinder: new Pathfinder(),
                squaddieCurrentlyActing,
                battleEventRecording: new Recording({}),
                resourceHandler: mockResourceHandler,
            });

            const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());
            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY
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
            expect(state.squaddieCurrentlyActing.squaddieActivitiesForThisRound.getActivities()).toHaveLength(2);
            expect(state.squaddieCurrentlyActing.squaddieActivitiesForThisRound.getActivities()[1]).toStrictEqual(new SquaddieMovementActivity({
                destination: new HexCoordinate({q: 0, r: 2}),
                numberOfActionsSpent: 1,
            }));
            expect(state.squaddieCurrentlyActing.squaddieActivitiesForThisRound.totalActionsSpent()).toBe(2);
        });
    });

    it('will add end turn to existing instruction', () => {
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();
        const squaddieCurrentlyActing: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({});
        squaddieCurrentlyActing.addInitialState({
            dynamicSquaddieId: "player_soldier_0",
            staticSquaddieId: "player_soldier",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        squaddieCurrentlyActing.addConfirmedActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 0, r: 1}),
            numberOfActionsSpent: 1
        }));

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedSquaddieDynamicId = jest.fn().mockReturnValue("player_soldier_0");

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
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
        selector.update(state, mockedP5GraphicsContext);
        expect(selector.hasCompleted(state)).toBeTruthy();
        expect(state.squaddieCurrentlyActing.squaddieActivitiesForThisRound.getActivities()).toHaveLength(2);
        expect(state.squaddieCurrentlyActing.squaddieActivitiesForThisRound.getActivities()[1]).toStrictEqual(new SquaddieEndTurnActivity());
        expect(state.squaddieCurrentlyActing.squaddieActivitiesForThisRound.totalActionsSpent()).toBe(3);
    });

    it('can instruct squaddie to end turn when player clicks on End Turn button', () => {
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        const battleSquaddieUIInput: MidTurnInput = new MidTurnInput({
            squaddieRepository: squaddieRepo,
            selectionState: MidTurnSelectingSquaddieState.SELECTED_SQUADDIE,
            missionMap,
            selectedSquaddieDynamicID: "player_soldier_0",
            tileClickedOn: new HexCoordinate({q: 0, r: 0}),
            squaddieInstructionInProgress: new SquaddieInstructionInProgress({}),
        });

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedSquaddieDynamicId = jest.fn().mockReturnValue("player_soldier_0");

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            battleSquaddieSelectedHUD: mockHud,
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
        const endTurnInstruction: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({});
        endTurnInstruction.addInitialState({
            dynamicSquaddieId: "player_soldier_0",
            staticSquaddieId: "player_soldier",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        endTurnInstruction.addConfirmedActivity(new SquaddieEndTurnActivity());

        expect(state.squaddieCurrentlyActing.squaddieActivitiesForThisRound.getMostRecentActivity()).toBeInstanceOf(SquaddieEndTurnActivity);

        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
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

        const battleSquaddieUIInput: MidTurnInput = new MidTurnInput({
            squaddieRepository: squaddieRepo,
            selectionState: MidTurnSelectingSquaddieState.SELECTED_SQUADDIE,
            missionMap,
            selectedSquaddieDynamicID: "player_soldier_0",
            tileClickedOn: new HexCoordinate({q: 0, r: 0}),
            squaddieInstructionInProgress: new SquaddieInstructionInProgress({}),
        });

        const longswordActivity: SquaddieActivity = new SquaddieActivity({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage(),
            actionsToSpend: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        });

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedActivity = jest.fn().mockReturnValue(longswordActivity);
        mockHud.mouseClicked = jest.fn();
        mockHud.getSelectedSquaddieDynamicId = jest.fn().mockReturnValue("player_soldier_0");

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            battleSquaddieSelectedHUD: mockHud,
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

        const expectedInstruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            dynamicSquaddieId: "player_soldier_0",
            staticSquaddieId: "player_soldier",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });

        expect(state.squaddieCurrentlyActing.squaddieActivitiesForThisRound).toStrictEqual(expectedInstruction);
        expect(state.squaddieCurrentlyActing.currentlySelectedActivity).toStrictEqual(longswordActivity);

        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET);

        const history = state.battleEventRecording.history;
        expect(history).toHaveLength(0);
    });

    describe('squaddie must complete their turn before moving other squaddies', () => {
        let missionMap: MissionMap;
        let interruptSquaddieStatic: BattleSquaddieStatic;
        let interruptSquaddieDynamic: BattleSquaddieDynamic;
        let soldierCurrentlyActing: SquaddieInstructionInProgress;
        let mockHud: BattleSquaddieSelectedHUD;
        let battlePhaseTracker: BattlePhaseTracker;
        let selectSquaddieAndDrawWindowSpy: SpyInstance;
        let camera: BattleCamera;
        let state: BattleOrchestratorState;
        let startingMouseX: number;
        let startingMouseY: number;

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 1 "]
                })
            });
            battlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam(missionMap);
            ({
                staticSquaddie: interruptSquaddieStatic,
                dynamicSquaddie: interruptSquaddieDynamic,
            } = CreateNewSquaddieAndAddToRepository({
                name: "interrupting squaddie",
                staticId: "interrupting squaddie",
                dynamicId: "interrupting squaddie",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository: squaddieRepo,
            }));

            missionMap.addSquaddie(
                interruptSquaddieStatic.staticId,
                interruptSquaddieDynamic.dynamicSquaddieId,
                new HexCoordinate({q: 0, r: 1})
            );

            const soldierSquaddieInfo = missionMap.getSquaddieByDynamicId("player_soldier_0");

            const movingInstruction = new SquaddieActivitiesForThisRound({
                staticSquaddieId: soldierSquaddieInfo.staticSquaddieId,
                dynamicSquaddieId: soldierSquaddieInfo.dynamicSquaddieId,
                startingLocation: soldierSquaddieInfo.mapLocation,
            });
            movingInstruction.addActivity(new SquaddieMovementActivity({
                destination: new HexCoordinate({q: 0, r: 2}),
                numberOfActionsSpent: 1,
            }));

            soldierCurrentlyActing = new SquaddieInstructionInProgress({
                activitiesForThisRound: movingInstruction
            });

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            const stateWithNull = new BattleOrchestratorState({
                missionMap,
                resourceHandler: mockResourceHandler,
                squaddieRepo,
                camera: new BattleCamera(0, 0),
            });
            mockHud = new BattleSquaddieSelectedHUD();

            camera = new BattleCamera();
            selectSquaddieAndDrawWindowSpy = jest.spyOn(mockHud, "selectSquaddieAndDrawWindow");

            state = new BattleOrchestratorState({
                missionMap,
                squaddieRepo,
                camera,
                battleSquaddieSelectedHUD: mockHud,
                hexMap: missionMap.terrainTileMap,
                battlePhaseTracker,
                pathfinder: new Pathfinder(),
                battleEventRecording: new Recording({}),
                squaddieCurrentlyActing: soldierCurrentlyActing,
                resourceHandler: mockResourceHandler,
            });

            const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());
            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY
            });

            const interruptSquaddieOnMap = missionMap.getSquaddieByDynamicId("interrupting squaddie");
            [startingMouseX, startingMouseY] = convertMapCoordinatesToScreenCoordinates(
                interruptSquaddieOnMap.mapLocation.q,
                interruptSquaddieOnMap.mapLocation.r,
                ...camera.getCoordinates()
            );

            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: startingMouseX,
                mouseY: startingMouseY
            });
            expect(selectSquaddieAndDrawWindowSpy).toBeCalledWith({
                dynamicId: interruptSquaddieDynamic.dynamicSquaddieId,
                repositionWindow: {
                    mouseX: startingMouseX, mouseY: startingMouseY
                },
                state,
            });
        });

        it('ignores movement commands issued to other squaddies', () => {

            expect(state.midTurnInput.selectionState).toBe(MidTurnSelectingSquaddieState.SELECTED_SQUADDIE);
            expect(state.midTurnInput.selectedSquaddieDynamicID).toBe(soldierCurrentlyActing.dynamicSquaddieId);
            expect(selectSquaddieAndDrawWindowSpy).toBeCalledWith({
                dynamicId: interruptSquaddieDynamic.dynamicSquaddieId,
                repositionWindow: {
                    mouseX: startingMouseX, mouseY: startingMouseY
                },
                state,
            });
            expect(selector.hasCompleted(state)).toBeFalsy();

            let [endingMouseX, endingMouseY] = convertMapCoordinatesToScreenCoordinates(
                0, 3,
                ...camera.getCoordinates()
            );

            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: endingMouseX,
                mouseY: endingMouseY
            });

            expect(state.midTurnInput.selectionState).toBe(MidTurnSelectingSquaddieState.SELECTED_SQUADDIE);
            expect(state.midTurnInput.selectedSquaddieDynamicID).toBe(soldierCurrentlyActing.dynamicSquaddieId);
            expect(selector.hasCompleted(state)).toBeFalsy();
        });

        it('ignores action commands issued to other squaddies', () => {
            const longswordActivity: SquaddieActivity = new SquaddieActivity({
                name: "longsword",
                id: "longsword",
                traits: new TraitStatusStorage(),
                actionsToSpend: 1,
                minimumRange: 0,
                maximumRange: 1,
                targetingShape: TargetingShape.Snake,
            });

            mockHud.wasActivitySelected = jest.fn().mockImplementationOnce(() => {
                return false;
            }).mockReturnValue(true);
            mockHud.getSelectedActivity = jest.fn().mockReturnValue(longswordActivity);
            mockHud.shouldDrawTheHUD = jest.fn().mockReturnValue(true);
            mockHud.didMouseClickOnHUD = jest.fn().mockImplementationOnce(() => {
                return false;
            }).mockReturnValue(true);
            mockHud.mouseClicked = jest.fn();

            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: 0,
                mouseY: 0
            });
            expect(state.squaddieCurrentlyActing.currentlySelectedActivity).toBeUndefined();

            expect(state.midTurnInput.selectionState).toBe(MidTurnSelectingSquaddieState.SELECTED_SQUADDIE);
            expect(state.midTurnInput.selectedSquaddieDynamicID).toBe(soldierCurrentlyActing.dynamicSquaddieId);
            expect(selector.hasCompleted(state)).toBeFalsy();
        });
    });

    it('will send key pressed events to the HUD', () => {
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.keyPressed = jest.fn();

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            battleSquaddieSelectedHUD: mockHud,
            hexMap: missionMap.terrainTileMap,
            battlePhaseTracker,
            pathfinder: new Pathfinder(),
        });

        selector.keyEventHappened(state, {
            eventType: OrchestratorComponentKeyEventType.PRESSED,
            keyCode: 0,
        });

        expect(mockHud.keyPressed).toHaveBeenCalled();
    });
});
