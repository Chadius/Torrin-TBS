import {BattleOrchestratorMode, Orchestrator} from "./orchestrator";
import {BattleMissionLoader} from "../orchestratorComponents/battleMissionLoader";
import {OrchestratorState} from "./orchestratorState";
import {BattleCutscenePlayer} from "../orchestratorComponents/battleCutscenePlayer";
import {BattleSquaddieSelector} from "../orchestratorComponents/battleSquaddieSelector";
import {BattleSquaddieMover} from "../orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "../orchestratorComponents/battleMapDisplay";
import {BattlePhaseController} from "../orchestratorComponents/battlePhaseController";
import {BattleSquaddieMapActivity} from "../orchestratorComponents/battleSquaddieMapActivity";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {BattleSquaddieTarget} from "../orchestratorComponents/battleSquaddieTarget";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {NewDummySquaddieID} from "../../squaddie/id";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieTurn} from "../../squaddie/turn";
import {OrchestratorComponent} from "./orchestratorComponent";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import * as orchestratorUtils from "../orchestratorComponents/orchestratorUtils";
import {BattleSquaddieSquaddieActivity} from "../orchestratorComponents/battleSquaddieSquaddieActivity";
import * as mocks from "../../utils/test/mocks";


describe('Battle Orchestrator', () => {
    type OrchestratorTestOptions = {
        missionLoader: BattleMissionLoader;
        cutscenePlayer: BattleCutscenePlayer;
        squaddieSelector: BattleSquaddieSelector;
        squaddieMapActivity: BattleSquaddieMapActivity;
        squaddieSquaddieActivity: BattleSquaddieSquaddieActivity;
        squaddieMover: BattleSquaddieMover;
        phaseController: BattlePhaseController;
        squaddieTarget: BattleSquaddieTarget;

        initialMode: BattleOrchestratorMode;
    }

    let orchestrator: Orchestrator;

    let mockBattleMissionLoader: BattleMissionLoader;
    let mockBattleCutscenePlayer: BattleCutscenePlayer;
    let mockSquaddieSelector: BattleSquaddieSelector;
    let mockSquaddieTarget: BattleSquaddieTarget;
    let mockSquaddieMapActivity: BattleSquaddieMapActivity;
    let mockSquaddieSquaddieActivity: BattleSquaddieSquaddieActivity;
    let mockSquaddieMover: BattleSquaddieMover;
    let mockMapDisplay: BattleMapDisplay;
    let mockPhaseController: BattlePhaseController;
    let mockHud: BattleSquaddieSelectedHUD;

    let nullState: OrchestratorState;

    function setupMocks() {
        mockBattleMissionLoader = new (<new () => BattleMissionLoader>BattleMissionLoader)() as jest.Mocked<BattleMissionLoader>;
        mockBattleMissionLoader.update = jest.fn();
        mockBattleMissionLoader.mouseEventHappened = jest.fn();
        mockBattleMissionLoader.hasCompleted = jest.fn().mockReturnValue(true);

        mockBattleCutscenePlayer = new (<new () => BattleCutscenePlayer>BattleCutscenePlayer)() as jest.Mocked<BattleCutscenePlayer>;
        mockBattleCutscenePlayer.update = jest.fn();
        mockBattleCutscenePlayer.mouseEventHappened = jest.fn();
        mockBattleCutscenePlayer.hasCompleted = jest.fn().mockReturnValue(true);

        mockSquaddieSelector = new (<new () => BattleSquaddieSelector>BattleSquaddieSelector)() as jest.Mocked<BattleSquaddieSelector>;
        mockSquaddieSelector.update = jest.fn();
        mockSquaddieSelector.mouseEventHappened = jest.fn();
        mockSquaddieSelector.hasCompleted = jest.fn().mockReturnValue(true);
        mockSquaddieSelector.recommendStateChanges = jest.fn().mockReturnValue({displayMap: true});

        mockSquaddieTarget = new (<new () => BattleSquaddieTarget>BattleSquaddieTarget)() as jest.Mocked<BattleSquaddieTarget>;
        mockSquaddieTarget.update = jest.fn();
        mockSquaddieTarget.mouseEventHappened = jest.fn();
        mockSquaddieTarget.hasCompleted = jest.fn().mockReturnValue(true);
        mockSquaddieTarget.recommendStateChanges = jest.fn().mockReturnValue({displayMap: true});

        mockSquaddieMover = new (<new () => BattleSquaddieMover>BattleSquaddieMover)() as jest.Mocked<BattleSquaddieMover>;
        mockSquaddieMover.update = jest.fn();
        mockSquaddieMover.mouseEventHappened = jest.fn();
        mockSquaddieMover.hasCompleted = jest.fn().mockReturnValue(true);

        mockSquaddieMapActivity = new (<new () => BattleSquaddieMapActivity>BattleSquaddieMapActivity)() as jest.Mocked<BattleSquaddieMapActivity>;
        mockSquaddieMapActivity.update = jest.fn();
        mockSquaddieMapActivity.mouseEventHappened = jest.fn();
        mockSquaddieMapActivity.hasCompleted = jest.fn().mockReturnValue(true);

        mockSquaddieSquaddieActivity = new (<new () => BattleSquaddieSquaddieActivity>BattleSquaddieSquaddieActivity)() as jest.Mocked<BattleSquaddieSquaddieActivity>;
        mockSquaddieSquaddieActivity.update = jest.fn();
        mockSquaddieSquaddieActivity.mouseEventHappened = jest.fn();
        mockSquaddieSquaddieActivity.hasCompleted = jest.fn().mockReturnValue(true);
        (mockSquaddieSquaddieActivity as any).maybeEndSquaddieTurn = jest.fn();
        (mockSquaddieSquaddieActivity as any).consumeSquaddieActionsAndMaybeEndTheirTurn = jest.fn();
        jest.spyOn(mockSquaddieSquaddieActivity as any, "consumeSquaddieActionsAndMaybeEndTheirTurn").mockImplementation(() => {
        });

        mockMapDisplay = new (<new () => BattleMapDisplay>BattleMapDisplay)() as jest.Mocked<BattleMapDisplay>;
        mockMapDisplay.update = jest.fn();
        mockMapDisplay.mouseEventHappened = jest.fn();
        mockMapDisplay.hasCompleted = jest.fn().mockReturnValue(true);
        mockMapDisplay.draw = jest.fn();

        mockPhaseController = new (<new () => BattlePhaseController>BattlePhaseController)() as jest.Mocked<BattlePhaseController>;
        mockPhaseController.update = jest.fn();
        mockPhaseController.mouseEventHappened = jest.fn();
        mockPhaseController.hasCompleted = jest.fn().mockReturnValue(true);
        mockPhaseController.draw = jest.fn();

        mockHud = new (<new (options: any) => BattleSquaddieSelectedHUD>BattleSquaddieSelectedHUD)({}) as jest.Mocked<BattleSquaddieSelectedHUD>;
        mockHud.selectSquaddieAndDrawWindow = jest.fn();
    }

    beforeEach(() => {
        nullState = new OrchestratorState({
            hexMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            }),
            battleSquaddieSelectedHUD: mockHud,
        });
        setupMocks();
    });

    const createOrchestrator: (overrides: Partial<OrchestratorTestOptions>) => Orchestrator = (overrides: Partial<OrchestratorTestOptions> = {}) => {
        const orchestrator: Orchestrator = new Orchestrator({
            ...{
                missionLoader: mockBattleMissionLoader,
                cutscenePlayer: mockBattleCutscenePlayer,
                squaddieSelector: mockSquaddieSelector,
                squaddieMapActivity: mockSquaddieMapActivity,
                squaddieSquaddieActivity: mockSquaddieSquaddieActivity,
                squaddieMover: mockSquaddieMover,
                squaddieTarget: mockSquaddieTarget,
                mapDisplay: mockMapDisplay,
                phaseController: mockPhaseController,
            },
            ...overrides
        });

        if (overrides.initialMode) {
            orchestrator.mode = overrides.initialMode;
        }

        return orchestrator;
    }

    it('starts in mission loading mode', () => {
        orchestrator = createOrchestrator({missionLoader: mockBattleMissionLoader});
        orchestrator.update(nullState, mocks.mockedP5);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.LOADING_MISSION);
        expect(orchestrator.getCurrentComponent()).toBe(mockBattleMissionLoader);
    });

    it('waits for mission to complete loading before moving on to cutscene player', () => {
        const needsTwoUpdatesToFinishLoading = new (<new () => BattleMissionLoader>BattleMissionLoader)() as jest.Mocked<BattleMissionLoader>;
        needsTwoUpdatesToFinishLoading.update = jest.fn();
        needsTwoUpdatesToFinishLoading.mouseEventHappened = jest.fn();
        needsTwoUpdatesToFinishLoading.hasCompleted = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);

        orchestrator = createOrchestrator({
            missionLoader: needsTwoUpdatesToFinishLoading,
            initialMode: BattleOrchestratorMode.LOADING_MISSION,
        });
        orchestrator.update(nullState, mocks.mockedP5);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.LOADING_MISSION);
        expect(orchestrator.getCurrentComponent()).toBe(needsTwoUpdatesToFinishLoading);
        orchestrator.update(nullState, mocks.mockedP5);
        expect(needsTwoUpdatesToFinishLoading.update).toBeCalledTimes(2);
        expect(needsTwoUpdatesToFinishLoading.hasCompleted).toBeCalledTimes(2);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
        expect(orchestrator.getCurrentComponent()).toBe(mockBattleCutscenePlayer);
    });

    it('will call the battle map display system if not loading', () => {
        jest.spyOn(orchestratorUtils, "DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation").mockImplementation(() => {
        });

        const instruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        instruction.addActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 1, r: 2}),
            numberOfActionsSpent: 2,
        }));
        const stateWantsToDisplayTheMap: OrchestratorState = new OrchestratorState({
            displayMap: true,
            squaddieCurrentlyActing: new SquaddieInstructionInProgress({
                instruction,
            }),
            battleSquaddieSelectedHUD: mockHud,
        });
        stateWantsToDisplayTheMap.squaddieRepository = new BattleSquaddieRepository();
        stateWantsToDisplayTheMap.squaddieRepository.addSquaddie(
            new BattleSquaddieStatic({
                squaddieId: NewDummySquaddieID("new static squaddie", SquaddieAffiliation.PLAYER),
            }),
            new BattleSquaddieDynamic({
                staticSquaddieId: "new static squaddie",
                dynamicSquaddieId: "new dynamic squaddie",
                squaddieTurn: new SquaddieTurn(),
            }),
        );

        const loadingOrchestratorShouldNotDraw: Orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.LOADING_MISSION
        });
        loadingOrchestratorShouldNotDraw.update(stateWantsToDisplayTheMap, mocks.mockedP5);
        expect(mockMapDisplay.update).not.toBeCalled();

        const squaddieSelectorOrchestratorShouldDisplayMap: Orchestrator = createOrchestrator({
            squaddieSelector: mockSquaddieSelector,
            initialMode: BattleOrchestratorMode.SQUADDIE_SELECTOR,
        });
        squaddieSelectorOrchestratorShouldDisplayMap.update(stateWantsToDisplayTheMap, mocks.mockedP5);
        const updateCallsAfterStateChange: number = (mockMapDisplay.update as jest.Mock).mock.calls.length;

        expect(updateCallsAfterStateChange).toBeGreaterThan(0);
        squaddieSelectorOrchestratorShouldDisplayMap.update(stateWantsToDisplayTheMap, mocks.mockedP5);
        expect(mockMapDisplay.update).toBeCalledTimes(updateCallsAfterStateChange + 1);
    });

    it('will transition from cutscene playing to phase controller mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
        });
        orchestrator.update(nullState, mocks.mockedP5);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
        expect(orchestrator.getCurrentComponent()).toBe(mockPhaseController);
        orchestrator.update(nullState, mocks.mockedP5);
        expect(mockPhaseController.update).toBeCalledTimes(1);
        expect(mockPhaseController.hasCompleted).toBeCalledTimes(1);
    });

    it('will transition from phase controller to squaddie selector mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.PHASE_CONTROLLER,
        });
        const instruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        instruction.addActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 1, r: 2}),
            numberOfActionsSpent: 2,
        }));
        nullState.squaddieCurrentlyActing = new SquaddieInstructionInProgress({
            instruction,
        });

        orchestrator.update(nullState, mocks.mockedP5);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_SELECTOR);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieSelector);
        orchestrator.update(nullState, mocks.mockedP5);
        expect(mockSquaddieSelector.update).toBeCalledTimes(1);
        expect(mockSquaddieSelector.hasCompleted).toBeCalledTimes(1);
    });

    it('will move from squaddie selector mode to squaddie move mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.SQUADDIE_SELECTOR,
        });
        const instruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        instruction.addActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 1, r: 2}),
            numberOfActionsSpent: 2,
        }));
        nullState.squaddieRepository = new BattleSquaddieRepository();
        nullState.squaddieRepository.addSquaddie(
            new BattleSquaddieStatic({
                squaddieId: NewDummySquaddieID("new static squaddie", SquaddieAffiliation.PLAYER),
            }),
            new BattleSquaddieDynamic({
                staticSquaddieId: "new static squaddie",
                dynamicSquaddieId: "new dynamic squaddie",
                squaddieTurn: new SquaddieTurn(),
            }),
        );
        nullState.squaddieCurrentlyActing = new SquaddieInstructionInProgress({
            instruction,
        });

        orchestrator.update(nullState, mocks.mockedP5);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieMover);
        orchestrator.update(nullState, mocks.mockedP5);
        expect(mockSquaddieMover.update).toBeCalledTimes(1);
        expect(mockSquaddieMover.hasCompleted).toBeCalledTimes(1);
    });

    it('will move from squaddie move mode to phase controller mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.SQUADDIE_MOVER,
        });
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieMover);
        orchestrator.update(nullState, mocks.mockedP5);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
        expect(orchestrator.getCurrentComponent()).toBe(mockPhaseController);
        orchestrator.update(nullState, mocks.mockedP5);
        expect(mockPhaseController.update).toBeCalledTimes(1);
        expect(mockPhaseController.hasCompleted).toBeCalledTimes(1);
    });

    describe('mode switching', () => {
        const loadAndExpect = (options: {
            mode: BattleOrchestratorMode,
            orchestratorComponent: OrchestratorComponent,
        }) => {
            orchestrator = createOrchestrator({
                initialMode: options.mode,
            });
            expect(orchestrator.getCurrentMode()).toBe(options.mode);
            expect(orchestrator.getCurrentComponent()).toBe(options.orchestratorComponent);

            if (options.orchestratorComponent === undefined) {
                return;
            }
            orchestrator.update(nullState, mocks.mockedP5);
            expect(options.orchestratorComponent.update).toBeCalled();
        }

        describe('knows which component to load based on the state', () => {
            for (const modeStr in BattleOrchestratorMode) {
                const mode: BattleOrchestratorMode = modeStr as BattleOrchestratorMode;
                it(`using the ${mode} mode will use the expected component`, () => {
                    const tests: { [mode in BattleOrchestratorMode]: OrchestratorComponent } = {
                        [BattleOrchestratorMode.UNKNOWN]: undefined,
                        [BattleOrchestratorMode.LOADING_MISSION]: mockBattleMissionLoader,
                        [BattleOrchestratorMode.CUTSCENE_PLAYER]: mockBattleCutscenePlayer,
                        [BattleOrchestratorMode.PHASE_CONTROLLER]: mockPhaseController,
                        [BattleOrchestratorMode.SQUADDIE_SELECTOR]: mockSquaddieSelector,
                        [BattleOrchestratorMode.SQUADDIE_TARGET]: mockSquaddieTarget,
                        [BattleOrchestratorMode.SQUADDIE_MOVER]: mockSquaddieMover,
                        [BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY]: mockSquaddieMapActivity,
                        [BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY]: mockSquaddieSquaddieActivity,
                    };

                    loadAndExpect({
                        mode,
                        orchestratorComponent: tests[mode]
                    })
                });
            }
        });
    });


    it('will use the recommended next mode to switch', () => {
        const battleLoaderRecommendsAMode = new (<new () => BattleMissionLoader>BattleMissionLoader)() as jest.Mocked<BattleMissionLoader>;
        battleLoaderRecommendsAMode.update = jest.fn();
        battleLoaderRecommendsAMode.mouseEventHappened = jest.fn();
        battleLoaderRecommendsAMode.hasCompleted = jest.fn().mockReturnValue(true);
        battleLoaderRecommendsAMode.recommendStateChanges = jest.fn().mockReturnValue({
            nextMode: BattleOrchestratorMode.SQUADDIE_MOVER
        });

        const orchestratorJumpsToSquaddieMover = createOrchestrator({
            missionLoader: battleLoaderRecommendsAMode,
            initialMode: BattleOrchestratorMode.LOADING_MISSION
        });

        expect(orchestratorJumpsToSquaddieMover.getCurrentMode()).toBe(BattleOrchestratorMode.LOADING_MISSION);
        orchestratorJumpsToSquaddieMover.update(nullState, mocks.mockedP5);
        expect(orchestratorJumpsToSquaddieMover.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
    });

    it('will move from squaddie map activity mode to phase controller mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY,
        });
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieMapActivity);
        orchestrator.update(nullState, mocks.mockedP5);
        expect(mockSquaddieMapActivity.update).toBeCalledTimes(1);
        expect(mockSquaddieMapActivity.hasCompleted).toBeCalledTimes(1);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
        expect(orchestrator.getCurrentComponent()).toBe(mockPhaseController);
    });

    it('will call mouse events in battle map display during squaddie selection mode', () => {
        expectMouseEventsWillGoToMapDisplay(
            createOrchestrator({
                squaddieSelector: mockSquaddieSelector,
                initialMode: BattleOrchestratorMode.SQUADDIE_SELECTOR,
            }),
            mockSquaddieSelector,
        );
    });

    it('will call mouse events in battle map display during squaddie target mode', () => {
        expectMouseEventsWillGoToMapDisplay(
            createOrchestrator({
                squaddieTarget: mockSquaddieTarget,
                initialMode: BattleOrchestratorMode.SQUADDIE_TARGET,
            }),
            mockSquaddieTarget,
        );
    });

    const expectMouseEventsWillGoToMapDisplay = (
        squaddieSelectorOrchestratorShouldDisplayMap: Orchestrator,
        component: OrchestratorComponent
    ) => {
        const stateWantsToDisplayTheMap: OrchestratorState = new OrchestratorState({
            displayMap: true,
        });

        squaddieSelectorOrchestratorShouldDisplayMap.mouseMoved(stateWantsToDisplayTheMap, 0, 0);
        expect(component.mouseEventHappened).toBeCalledTimes(1);
        expect(mockMapDisplay.mouseEventHappened).toBeCalledTimes(1);

        squaddieSelectorOrchestratorShouldDisplayMap.mouseClicked(stateWantsToDisplayTheMap, 0, 0);
        expect(component.mouseEventHappened).toBeCalledTimes(2);
        expect(mockMapDisplay.mouseEventHappened).toBeCalledTimes(2);
    }
});
