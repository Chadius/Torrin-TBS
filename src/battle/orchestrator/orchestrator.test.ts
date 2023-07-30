import {BattleOrchestratorMode, Orchestrator} from "./orchestrator";
import {BattleMissionLoader} from "../orchestratorComponents/battleMissionLoader";
import {OrchestratorState} from "./orchestratorState";
import {BattleCutscenePlayer} from "../orchestratorComponents/battleCutscenePlayer";
import {BattlePlayerSquaddieSelector} from "../orchestratorComponents/battlePlayerSquaddieSelector";
import {BattleSquaddieMover} from "../orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "../orchestratorComponents/battleMapDisplay";
import {BattlePhaseController} from "../orchestratorComponents/battlePhaseController";
import {BattleSquaddieMapActivity} from "../orchestratorComponents/battleSquaddieMapActivity";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {BattlePlayerSquaddieTarget} from "../orchestratorComponents/battlePlayerSquaddieTarget";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {OrchestratorComponent} from "./orchestratorComponent";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {BattleSquaddieSquaddieActivity} from "../orchestratorComponents/battleSquaddieSquaddieActivity";
import * as mocks from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {UIControlSettings} from "./uiControlSettings";
import {BattleComputerSquaddieSelector} from "../orchestratorComponents/battleComputerSquaddieSelector";


describe('Battle Orchestrator', () => {
    type OrchestratorTestOptions = {
        missionLoader: BattleMissionLoader;
        cutscenePlayer: BattleCutscenePlayer;
        playerSquaddieSelector: BattlePlayerSquaddieSelector;
        computerSquaddieSelector: BattleComputerSquaddieSelector;
        squaddieMapActivity: BattleSquaddieMapActivity;
        squaddieSquaddieActivity: BattleSquaddieSquaddieActivity;
        squaddieMover: BattleSquaddieMover;
        phaseController: BattlePhaseController;
        playerSquaddieTarget: BattlePlayerSquaddieTarget;

        initialMode: BattleOrchestratorMode;
    }

    let orchestrator: Orchestrator;

    let mockBattleMissionLoader: BattleMissionLoader;
    let mockBattleCutscenePlayer: BattleCutscenePlayer;
    let mockPlayerSquaddieSelector: BattlePlayerSquaddieSelector;
    let mockPlayerSquaddieTarget: BattlePlayerSquaddieTarget;
    let mockComputerSquaddieSelector: BattleComputerSquaddieSelector;
    let mockSquaddieMapActivity: BattleSquaddieMapActivity;
    let mockSquaddieSquaddieActivity: BattleSquaddieSquaddieActivity;
    let mockSquaddieMover: BattleSquaddieMover;
    let mockMapDisplay: BattleMapDisplay;
    let mockPhaseController: BattlePhaseController;
    let mockHud: BattleSquaddieSelectedHUD;

    let nullState: OrchestratorState;
    let mockedP5 = mocks.mockedP5();

    function setupMocks() {
        mockedP5 = mocks.mockedP5();

        mockBattleMissionLoader = new (<new () => BattleMissionLoader>BattleMissionLoader)() as jest.Mocked<BattleMissionLoader>;
        mockBattleMissionLoader.update = jest.fn();
        mockBattleMissionLoader.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
        mockBattleMissionLoader.mouseEventHappened = jest.fn();
        mockBattleMissionLoader.hasCompleted = jest.fn().mockReturnValue(true);

        mockBattleCutscenePlayer = new (<new () => BattleCutscenePlayer>BattleCutscenePlayer)() as jest.Mocked<BattleCutscenePlayer>;
        mockBattleCutscenePlayer.update = jest.fn();
        mockBattleCutscenePlayer.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
        mockBattleCutscenePlayer.mouseEventHappened = jest.fn();
        mockBattleCutscenePlayer.hasCompleted = jest.fn().mockReturnValue(true);

        mockPlayerSquaddieSelector = new (<new () => BattlePlayerSquaddieSelector>BattlePlayerSquaddieSelector)() as jest.Mocked<BattlePlayerSquaddieSelector>;
        mockPlayerSquaddieSelector.update = jest.fn();
        mockPlayerSquaddieSelector.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({
            displayMap: true,
            scrollCamera: true,
        }));
        mockPlayerSquaddieSelector.mouseEventHappened = jest.fn();
        mockPlayerSquaddieSelector.keyEventHappened = jest.fn();
        mockPlayerSquaddieSelector.hasCompleted = jest.fn().mockReturnValue(true);
        mockPlayerSquaddieSelector.recommendStateChanges = jest.fn().mockReturnValue({displayMap: true});

        mockPlayerSquaddieTarget = new (<new () => BattlePlayerSquaddieTarget>BattlePlayerSquaddieTarget)() as jest.Mocked<BattlePlayerSquaddieTarget>;
        mockPlayerSquaddieTarget.update = jest.fn();
        mockPlayerSquaddieTarget.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({
            displayMap: true,
            scrollCamera: true,
        }));
        mockPlayerSquaddieTarget.mouseEventHappened = jest.fn();
        mockPlayerSquaddieTarget.hasCompleted = jest.fn().mockReturnValue(true);
        mockPlayerSquaddieTarget.recommendStateChanges = jest.fn().mockReturnValue({displayMap: true});

        mockComputerSquaddieSelector = new (<new () => BattleComputerSquaddieSelector>BattleComputerSquaddieSelector)() as jest.Mocked<BattleComputerSquaddieSelector>;
        mockComputerSquaddieSelector.update = jest.fn();
        mockComputerSquaddieSelector.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({
            displayMap: true,
            scrollCamera: false,
        }));
        mockComputerSquaddieSelector.mouseEventHappened = jest.fn();
        mockComputerSquaddieSelector.keyEventHappened = jest.fn();
        mockComputerSquaddieSelector.hasCompleted = jest.fn().mockReturnValue(true);
        mockComputerSquaddieSelector.recommendStateChanges = jest.fn().mockReturnValue({displayMap: true});

        mockSquaddieMover = new (<new () => BattleSquaddieMover>BattleSquaddieMover)() as jest.Mocked<BattleSquaddieMover>;
        mockSquaddieMover.update = jest.fn();
        mockSquaddieMover.reset = jest.fn();
        mockSquaddieMover.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
        mockSquaddieMover.mouseEventHappened = jest.fn();
        mockSquaddieMover.hasCompleted = jest.fn().mockReturnValue(true);

        mockSquaddieMapActivity = new (<new () => BattleSquaddieMapActivity>BattleSquaddieMapActivity)() as jest.Mocked<BattleSquaddieMapActivity>;
        mockSquaddieMapActivity.update = jest.fn();
        mockSquaddieMapActivity.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
        mockSquaddieMapActivity.mouseEventHappened = jest.fn();
        mockSquaddieMapActivity.hasCompleted = jest.fn().mockReturnValue(true);

        mockSquaddieSquaddieActivity = new (<new () => BattleSquaddieSquaddieActivity>BattleSquaddieSquaddieActivity)() as jest.Mocked<BattleSquaddieSquaddieActivity>;
        mockSquaddieSquaddieActivity.update = jest.fn();
        mockSquaddieSquaddieActivity.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
        mockSquaddieSquaddieActivity.mouseEventHappened = jest.fn();
        mockSquaddieSquaddieActivity.hasCompleted = jest.fn().mockReturnValue(true);
        (mockSquaddieSquaddieActivity as any).maybeEndSquaddieTurn = jest.fn();
        (mockSquaddieSquaddieActivity as any).consumeSquaddieActionsAndMaybeEndTheirTurn = jest.fn();
        jest.spyOn(mockSquaddieSquaddieActivity as any, "consumeSquaddieActionsAndMaybeEndTheirTurn").mockImplementation(() => {
        });

        mockMapDisplay = new (<new () => BattleMapDisplay>BattleMapDisplay)() as jest.Mocked<BattleMapDisplay>;
        mockMapDisplay.update = jest.fn();
        mockMapDisplay.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
        mockMapDisplay.mouseEventHappened = jest.fn();
        mockMapDisplay.keyEventHappened = jest.fn();
        mockMapDisplay.hasCompleted = jest.fn().mockReturnValue(true);
        mockMapDisplay.draw = jest.fn();

        mockPhaseController = new (<new () => BattlePhaseController>BattlePhaseController)() as jest.Mocked<BattlePhaseController>;
        mockPhaseController.update = jest.fn();
        mockPhaseController.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
        mockPhaseController.mouseEventHappened = jest.fn();
        mockPhaseController.hasCompleted = jest.fn().mockReturnValue(true);
        mockPhaseController.draw = jest.fn();

        mockHud = mocks.battleSquaddieSelectedHUD();
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
                playerSquaddieSelector: mockPlayerSquaddieSelector,
                computerSquaddieSelector: mockComputerSquaddieSelector,
                squaddieMapActivity: mockSquaddieMapActivity,
                squaddieSquaddieActivity: mockSquaddieSquaddieActivity,
                squaddieMover: mockSquaddieMover,
                playerSquaddieTarget: mockPlayerSquaddieTarget,
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
        orchestrator.update(nullState, mockedP5);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.LOADING_MISSION);
        expect(orchestrator.getCurrentComponent()).toBe(mockBattleMissionLoader);
    });

    it('waits for mission to complete loading before moving on to cutscene player', () => {
        const needsTwoUpdatesToFinishLoading = new (<new () => BattleMissionLoader>BattleMissionLoader)() as jest.Mocked<BattleMissionLoader>;
        needsTwoUpdatesToFinishLoading.update = jest.fn();
        needsTwoUpdatesToFinishLoading.reset = jest.fn();
        needsTwoUpdatesToFinishLoading.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
        needsTwoUpdatesToFinishLoading.mouseEventHappened = jest.fn();
        needsTwoUpdatesToFinishLoading.hasCompleted = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);

        orchestrator = createOrchestrator({
            missionLoader: needsTwoUpdatesToFinishLoading,
            initialMode: BattleOrchestratorMode.LOADING_MISSION,
        });
        orchestrator.update(nullState, mockedP5);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.LOADING_MISSION);
        expect(orchestrator.getCurrentComponent()).toBe(needsTwoUpdatesToFinishLoading);
        orchestrator.update(nullState, mockedP5);
        expect(needsTwoUpdatesToFinishLoading.update).toBeCalledTimes(2);
        expect(needsTwoUpdatesToFinishLoading.hasCompleted).toBeCalledTimes(2);
        expect(needsTwoUpdatesToFinishLoading.uiControlSettings).toBeCalledTimes(2);
        expect(needsTwoUpdatesToFinishLoading.reset).toBeCalledTimes(1);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
        expect(orchestrator.getCurrentComponent()).toBe(mockBattleCutscenePlayer);
    });

    it('will transition from cutscene playing to phase controller mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
        });
        orchestrator.update(nullState, mockedP5);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
        expect(orchestrator.getCurrentComponent()).toBe(mockPhaseController);
        orchestrator.update(nullState, mockedP5);
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

        orchestrator.update(nullState, mockedP5);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR);
        expect(orchestrator.getCurrentComponent()).toBe(mockPlayerSquaddieSelector);
        orchestrator.update(nullState, mockedP5);
        expect(mockPlayerSquaddieSelector.update).toBeCalledTimes(1);
        expect(mockPlayerSquaddieSelector.hasCompleted).toBeCalledTimes(1);
    });

    it('will move from squaddie selector mode to squaddie move mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR,
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
        CreateNewSquaddieAndAddToRepository({
            name: "new static squaddie",
            staticId: "new static squaddie",
            dynamicId: "new dynamic squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: nullState.squaddieRepository,
        });

        nullState.squaddieCurrentlyActing = new SquaddieInstructionInProgress({
            instruction,
        });

        orchestrator.update(nullState, mockedP5);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieMover);
        orchestrator.update(nullState, mockedP5);
        expect(mockSquaddieMover.update).toBeCalledTimes(1);
        expect(mockSquaddieMover.hasCompleted).toBeCalledTimes(1);
    });

    it('will move from squaddie move mode to phase controller mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.SQUADDIE_MOVER,
        });
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieMover);
        orchestrator.update(nullState, mockedP5);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
        expect(orchestrator.getCurrentComponent()).toBe(mockPhaseController);
        orchestrator.update(nullState, mockedP5);
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
            orchestrator.update(nullState, mockedP5);
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
                        [BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR]: mockPlayerSquaddieSelector,
                        [BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET]: mockPlayerSquaddieTarget,
                        [BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR]: mockComputerSquaddieSelector,
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
        battleLoaderRecommendsAMode.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
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
        orchestratorJumpsToSquaddieMover.update(nullState, mockedP5);
        expect(orchestratorJumpsToSquaddieMover.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
    });

    it('will update its UI Control Settings after updating', () => {
        const battleLoaderRecommendsAMode = new (<new () => BattleMissionLoader>BattleMissionLoader)() as jest.Mocked<BattleMissionLoader>;
        battleLoaderRecommendsAMode.update = jest.fn();
        battleLoaderRecommendsAMode.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({
            displayMap: true,
        }));
        battleLoaderRecommendsAMode.mouseEventHappened = jest.fn();
        battleLoaderRecommendsAMode.hasCompleted = jest.fn();

        const orchestrator1 = createOrchestrator({
            missionLoader: battleLoaderRecommendsAMode,
            initialMode: BattleOrchestratorMode.LOADING_MISSION
        });

        expect(orchestrator1.uiControlSettings.displayBattleMap).toBeUndefined();
        orchestrator1.update(nullState, mockedP5);
        expect(orchestrator1.uiControlSettings.displayBattleMap).toBe(true);
    });

    it('will move from squaddie map activity mode to phase controller mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY,
        });
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieMapActivity);
        orchestrator.update(nullState, mockedP5);
        expect(mockSquaddieMapActivity.update).toBeCalledTimes(1);
        expect(mockSquaddieMapActivity.hasCompleted).toBeCalledTimes(1);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
        expect(orchestrator.getCurrentComponent()).toBe(mockPhaseController);
    });

    it('will call mouse events in battle map display during squaddie selection mode', () => {
        const orchestrator = createOrchestrator({
            playerSquaddieSelector: mockPlayerSquaddieSelector,
            initialMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR,
        });
        orchestrator.uiControlSettings.update(new UIControlSettings({
            scrollCamera: true,
        }));

        expectMouseEventsWillGoToMapDisplay(
            orchestrator,
            mockPlayerSquaddieSelector,
        );
    });

    const expectMouseEventsWillGoToMapDisplay = (
        squaddieSelectorOrchestratorShouldDisplayMap: Orchestrator,
        component: OrchestratorComponent
    ) => {
        const stateWantsToDisplayTheMap: OrchestratorState = new OrchestratorState({});

        squaddieSelectorOrchestratorShouldDisplayMap.mouseMoved(stateWantsToDisplayTheMap, 0, 0);
        expect(component.mouseEventHappened).toBeCalledTimes(1);
        expect(mockMapDisplay.mouseEventHappened).toBeCalledTimes(1);

        squaddieSelectorOrchestratorShouldDisplayMap.mouseClicked(stateWantsToDisplayTheMap, 0, 0);
        expect(component.mouseEventHappened).toBeCalledTimes(2);
        expect(mockMapDisplay.mouseEventHappened).toBeCalledTimes(2);
    }

    it('will call key pressed events in battle map display during squaddie selection mode', () => {
        const orchestrator = createOrchestrator({
            playerSquaddieSelector: mockPlayerSquaddieSelector,
            initialMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR,
        });
        orchestrator.uiControlSettings.update(new UIControlSettings({
            scrollCamera: true,
            displayMap: true,
        }));

        expectKeyEventsWillGoToMapDisplay(
            orchestrator,
            mockPlayerSquaddieSelector,
        );
    });

    const expectKeyEventsWillGoToMapDisplay = (
        squaddieSelectorOrchestratorShouldDisplayMap: Orchestrator,
        component: OrchestratorComponent
    ) => {
        const stateWantsToDisplayTheMap: OrchestratorState = new OrchestratorState({});

        squaddieSelectorOrchestratorShouldDisplayMap.keyPressed(stateWantsToDisplayTheMap, 0);
        expect(component.keyEventHappened).toBeCalledTimes(1);
        expect(mockMapDisplay.keyEventHappened).toBeCalledTimes(1);

        squaddieSelectorOrchestratorShouldDisplayMap.keyPressed(stateWantsToDisplayTheMap, 0);
        expect(component.keyEventHappened).toBeCalledTimes(2);
        expect(mockMapDisplay.keyEventHappened).toBeCalledTimes(2);
    }
});
