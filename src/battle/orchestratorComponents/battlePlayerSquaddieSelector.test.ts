import {BattlePlayerSquaddieSelector} from "./battlePlayerSquaddieSelector";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattlePhase} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieTurn} from "../../squaddie/turn";
import {
    BattleOrchestratorChanges,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {SquaddieMovementAction} from "../history/squaddieMovementAction";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera} from "../battleCamera";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates
} from "../../hexMap/convertCoordinates";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieEndTurnAction} from "../history/squaddieEndTurnAction";
import {makeResult} from "../../utils/ResultOrError";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {Recording} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieAction} from "../../squaddie/action";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import SpyInstance = jest.SpyInstance;

describe('BattleSquaddieSelector', () => {
    let selector: BattlePlayerSquaddieSelector = new BattlePlayerSquaddieSelector();
    let squaddieRepo: BattleSquaddieRepository = new BattleSquaddieRepository();
    let missionMap: MissionMap;
    let enemyDemonStatic: SquaddieTemplate;
    let enemyDemonDynamic: BattleSquaddie;
    let demonBiteAction: SquaddieAction;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    let teamsByAffiliation: { [affiliation in SquaddieAffiliation]?: BattleSquaddieTeam };

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        selector = new BattlePlayerSquaddieSelector();
        squaddieRepo = new BattleSquaddieRepository();
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
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
        });

        ({
            dynamicSquaddie: enemyDemonDynamic,
            squaddietemplate: enemyDemonStatic,
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "enemy_demon",
            name: "Slither Demon",
            affiliation: SquaddieAffiliation.ENEMY,
            dynamicId: "enemy_demon_0",
            squaddieRepository: squaddieRepo,
            actions: [demonBiteAction],
        }));

        squaddieRepo.addDynamicSquaddie(
            new BattleSquaddie({
                dynamicSquaddieId: "enemy_demon_1",
                squaddieTemplateId: "enemy_demon",
                squaddieTurn: new SquaddieTurn()
            })
        );

        enemyTeam.addDynamicSquaddieIds(["enemy_demon_0", "enemy_demon_1"]);

        teamsByAffiliation[SquaddieAffiliation.ENEMY] = enemyTeam;

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
        return {
            currentAffiliation: BattlePhase.ENEMY,
            turnCount: 1,
        };
    }

    const makeBattlePhaseTrackerWithPlayerTeam = (missionMap: MissionMap) => {
        const playerTeam: BattleSquaddieTeam = new BattleSquaddieTeam(
            {
                name: "player controlled team",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepo: squaddieRepo,
            }
        );
        teamsByAffiliation[SquaddieAffiliation.PLAYER] = playerTeam;

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

        return {
            currentAffiliation: BattlePhase.PLAYER,
            turnCount: 1,
        };
    }

    it('ignores mouse input when the player tries to move an uncontrollable squaddie during the player phase', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 "]
            })
        });

        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

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
        });

        ({
            dynamicSquaddie: enemyDemonDynamic,
            squaddietemplate: enemyDemonStatic,
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "enemy_demon",
            name: "Slither Demon",
            affiliation: SquaddieAffiliation.ENEMY,
            dynamicId: "enemy_demon_0",
            squaddieRepository: squaddieRepo,
            actions: [demonBiteAction],
        }));
        enemyTeam.addDynamicSquaddieIds(["enemy_demon_0"]);
        teamsByAffiliation[SquaddieAffiliation.ENEMY] = enemyTeam;
        missionMap.addSquaddie(
            enemyDemonStatic.staticId,
            enemyDemonDynamic.dynamicSquaddieId,
            new HexCoordinate({q: 0, r: 1})
        );

        const camera: BattleCamera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedSquaddieDynamicId = jest.fn().mockReturnValue("enemy_demon_0");
        mockHud.didMouseClickOnHUD = jest.fn().mockReturnValue(false);
        mockHud.wasAnyActionSelected = jest.fn().mockReturnValue(false);
        mockHud.selectSquaddieAndDrawWindow = jest.fn();

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            battlePhaseState,
            teamsByAffiliation,
            missionMap,
            camera,
            battleSquaddieSelectedHUD: mockHud,
            squaddieRepo: squaddieRepo,
            pathfinder: new Pathfinder(),
        });

        const enemyLocation = convertMapCoordinatesToScreenCoordinates(0, 1, ...camera.getCoordinates())
        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: enemyLocation[0],
            mouseY: enemyLocation[1],
        });

        const enemyDestination = convertMapCoordinatesToScreenCoordinates(0, 2, ...camera.getCoordinates())
        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: enemyDestination[0],
            mouseY: enemyDestination[1],
        });

        expect(selector.hasCompleted(state)).toBeFalsy();
        expect(state.squaddieCurrentlyActing.dynamicSquaddieId).toBe("");
    });

    it('recommends computer squaddie selector if the player cannot control the squaddies', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
        const battlePhaseState = makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        const camera: BattleCamera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            battlePhaseState,
            teamsByAffiliation,
            squaddieRepo,
            camera,
            missionMap,
        });

        selector.update(state, mockedP5GraphicsContext);

        expect(selector.hasCompleted(state)).toBeTruthy();
        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR);
    });

    it('can make a movement action by clicking on the field', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });

        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            hexMap: missionMap.terrainTileMap,
            battlePhaseState,
            teamsByAffiliation,
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
        expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.totalActionPointsSpent()).toBe(1);
        expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.destinationLocation()).toStrictEqual(new HexCoordinate({
            q: 0,
            r: 1
        }));

        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);

        const expectedSquaddieInstruction: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({});
        expectedSquaddieInstruction.addInitialState({
            squaddietemplateId: "player_soldier",
            dynamicSquaddieId: "player_soldier_0",
            startingLocation: new HexCoordinate({
                q: 0,
                r: 0,
            })
        });
        expectedSquaddieInstruction.addConfirmedAction(new SquaddieMovementAction({
            destination: new HexCoordinate({q: 0, r: 1}),
            numberOfActionPointsSpent: 1,
        }))

        const history = state.battleEventRecording.history;
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual(new BattleEvent({
            currentSquaddieInstruction: expectedSquaddieInstruction,
        }));
    });

    describe('adding movement mid turn instruction', () => {
        let camera: BattleCamera;
        let state: BattleOrchestratorState;
        let squaddieCurrentlyActing: SquaddieInstructionInProgress;

        beforeEach(() => {
            const missionMap: MissionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "]
                })
            });

            const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

            camera = new BattleCamera();

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            squaddieCurrentlyActing = new SquaddieInstructionInProgress({});
            squaddieCurrentlyActing.addInitialState({
                dynamicSquaddieId: "player_soldier_0",
                squaddietemplateId: "player_soldier",
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            });
            squaddieCurrentlyActing.addConfirmedAction(new SquaddieMovementAction({
                destination: new HexCoordinate({q: 0, r: 1}),
                numberOfActionPointsSpent: 1
            }));

            state = new BattleOrchestratorState({
                missionMap,
                squaddieRepo,
                camera,
                hexMap: missionMap.terrainTileMap,
                battlePhaseState,
                teamsByAffiliation,
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
            expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.getActionsUsedThisRound()).toHaveLength(2);
            expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.getActionsUsedThisRound()[1]).toStrictEqual(new SquaddieMovementAction({
                destination: new HexCoordinate({q: 0, r: 2}),
                numberOfActionPointsSpent: 1,
            }));
            expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.totalActionPointsSpent()).toBe(2);
        });
    });

    it('will add end turn to existing instruction', () => {
        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();
        const squaddieCurrentlyActing: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({});
        squaddieCurrentlyActing.addInitialState({
            dynamicSquaddieId: "player_soldier_0",
            squaddietemplateId: "player_soldier",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        squaddieCurrentlyActing.addConfirmedAction(new SquaddieMovementAction({
            destination: new HexCoordinate({q: 0, r: 1}),
            numberOfActionPointsSpent: 1
        }));

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedSquaddieDynamicId = jest.fn().mockReturnValue("player_soldier_0");

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            battleSquaddieSelectedHUD: mockHud,
            hexMap: missionMap.terrainTileMap,
            battlePhaseState,
            teamsByAffiliation,
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
        expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.getActionsUsedThisRound()).toHaveLength(2);
        expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.getActionsUsedThisRound()[1]).toStrictEqual(new SquaddieEndTurnAction());
        expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.totalActionPointsSpent()).toBe(3);
    });

    it('can instruct squaddie to end turn when player clicks on End Turn button', () => {
        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedSquaddieDynamicId = jest.fn().mockReturnValue("player_soldier_0");

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            battleSquaddieSelectedHUD: mockHud,
            hexMap: missionMap.terrainTileMap,
            battlePhaseState,
            teamsByAffiliation,
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
            squaddietemplateId: "player_soldier",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        endTurnInstruction.addConfirmedAction(new SquaddieEndTurnAction());

        expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound.getMostRecentAction()).toBeInstanceOf(SquaddieEndTurnAction);

        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);

        const history = state.battleEventRecording.history;
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual(new BattleEvent({
            currentSquaddieInstruction: endTurnInstruction
        }));
    });

    it('will recommend squaddie target if a SquaddieAction is selected that requires a target', () => {
        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        const longswordAction: SquaddieAction = new SquaddieAction({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage(),
            actionPointCost: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        });

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedAction = jest.fn().mockReturnValue(longswordAction);
        mockHud.mouseClicked = jest.fn();
        mockHud.getSelectedSquaddieDynamicId = jest.fn().mockReturnValue("player_soldier_0");

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            battleSquaddieSelectedHUD: mockHud,
            hexMap: missionMap.terrainTileMap,
            battlePhaseState,
            teamsByAffiliation,
            pathfinder: new Pathfinder(),
        });

        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0
        });

        expect(selector.hasCompleted(state)).toBeTruthy();
        expect(state.squaddieCurrentlyActing.dynamicSquaddieId).toBe("player_soldier_0");

        const expectedInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            dynamicSquaddieId: "player_soldier_0",
            squaddietemplateId: "player_soldier",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });

        expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound).toStrictEqual(expectedInstruction);
        expect(state.squaddieCurrentlyActing.currentlySelectedAction).toStrictEqual(longswordAction);

        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET);

        const history = state.battleEventRecording.history;
        expect(history).toHaveLength(0);
    });

    describe('squaddie must complete their turn before moving other squaddies', () => {
        let missionMap: MissionMap;
        let interruptSquaddieStatic: SquaddieTemplate;
        let interruptSquaddieDynamic: BattleSquaddie;
        let soldierCurrentlyActing: SquaddieInstructionInProgress;
        let mockHud: BattleSquaddieSelectedHUD;
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
            const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);
            ({
                squaddietemplate: interruptSquaddieStatic,
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

            const movingInstruction = new SquaddieActionsForThisRound({
                squaddietemplateId: soldierSquaddieInfo.squaddietemplateId,
                dynamicSquaddieId: soldierSquaddieInfo.dynamicSquaddieId,
                startingLocation: soldierSquaddieInfo.mapLocation,
            });
            movingInstruction.addAction(new SquaddieMovementAction({
                destination: new HexCoordinate({q: 0, r: 2}),
                numberOfActionPointsSpent: 1,
            }));

            soldierCurrentlyActing = new SquaddieInstructionInProgress({
                actionsForThisRound: movingInstruction
            });

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            mockHud = new BattleSquaddieSelectedHUD();

            camera = new BattleCamera();
            selectSquaddieAndDrawWindowSpy = jest.spyOn(mockHud, "selectSquaddieAndDrawWindow");

            state = new BattleOrchestratorState({
                missionMap,
                squaddieRepo,
                camera,
                battleSquaddieSelectedHUD: mockHud,
                hexMap: missionMap.terrainTileMap,
                battlePhaseState,
                teamsByAffiliation,
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
            expect(state.squaddieCurrentlyActing.dynamicSquaddieId).toBe(soldierCurrentlyActing.dynamicSquaddieId);
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

            expect(state.squaddieCurrentlyActing.dynamicSquaddieId).toBe(soldierCurrentlyActing.dynamicSquaddieId);
            expect(selector.hasCompleted(state)).toBeFalsy();
        });

        it('ignores action commands issued to other squaddies', () => {
            const longswordAction: SquaddieAction = new SquaddieAction({
                name: "longsword",
                id: "longsword",
                traits: new TraitStatusStorage(),
                actionPointCost: 1,
                minimumRange: 0,
                maximumRange: 1,
                targetingShape: TargetingShape.Snake,
            });

            mockHud.wasAnyActionSelected = jest.fn().mockImplementationOnce(() => {
                return false;
            }).mockReturnValue(true);
            mockHud.getSelectedAction = jest.fn().mockReturnValue(longswordAction);
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
            expect(state.squaddieCurrentlyActing.currentlySelectedAction).toBeUndefined();
            expect(state.squaddieCurrentlyActing.dynamicSquaddieId).toBe(soldierCurrentlyActing.dynamicSquaddieId);
            expect(selector.hasCompleted(state)).toBeFalsy();
        });
    });

    it('will send key pressed events to the HUD', () => {
        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.keyPressed = jest.fn();

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            battleSquaddieSelectedHUD: mockHud,
            hexMap: missionMap.terrainTileMap,
            battlePhaseState,
            teamsByAffiliation,
            pathfinder: new Pathfinder(),
        });

        selector.keyEventHappened(state, {
            eventType: OrchestratorComponentKeyEventType.PRESSED,
            keyCode: 0,
        });

        expect(mockHud.keyPressed).toHaveBeenCalled();
    });
});
