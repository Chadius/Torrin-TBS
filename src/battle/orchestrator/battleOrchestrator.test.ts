import {BattleOrchestrator, BattleOrchestratorMode} from "./battleOrchestrator";
import {BattleMissionLoader} from "../orchestratorComponents/battleMissionLoader";
import {BattleOrchestratorState} from "./battleOrchestratorState";
import {BattleCutscenePlayer} from "../orchestratorComponents/battleCutscenePlayer";
import {BattlePlayerSquaddieSelector} from "../orchestratorComponents/battlePlayerSquaddieSelector";
import {BattleSquaddieMover} from "../orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "../orchestratorComponents/battleMapDisplay";
import {BattlePhaseController} from "../orchestratorComponents/battlePhaseController";
import {BattleSquaddieUsesActionOnMap} from "../orchestratorComponents/battleSquaddieUsesActionOnMap";
import {BattlePlayerSquaddieTarget} from "../orchestratorComponents/battlePlayerSquaddieTarget";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleOrchestratorComponent} from "./battleOrchestratorComponent";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {BattleSquaddieUsesActionOnSquaddie} from "../orchestratorComponents/battleSquaddieUsesActionOnSquaddie";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {UIControlSettings} from "./uiControlSettings";
import {BattleComputerSquaddieSelector} from "../orchestratorComponents/battleComputerSquaddieSelector";
import {MouseButton} from "../../utils/mouseConfig";
import {MissionObjective} from "../missionResult/missionObjective";
import {Cutscene} from "../../cutscene/cutscene";
import {BattleCompletionStatus} from "./battleGameBoard";
import {
    DEFAULT_DEFEAT_CUTSCENE_ID,
    DEFAULT_VICTORY_CUTSCENE_ID,
    MissionCutsceneCollection
} from "./missionCutsceneCollection";
import {GameModeEnum} from "../../utils/startupConfig";
import {DefaultBattleOrchestrator} from "./defaultBattleOrchestrator";
import {MissionReward, MissionRewardType} from "../missionResult/missionReward";
import {MissionConditionDefeatAffiliation} from "../missionResult/missionConditionDefeatAffiliation";
import {MissionDefeatCutsceneTrigger,} from "../../cutscene/cutsceneTrigger";
import {MissionVictoryCutsceneTrigger} from "../cutscene/missionVictoryCutsceneTrigger";
import {MissionStartOfPhaseCutsceneTrigger} from "../cutscene/missionStartOfPhaseCutsceneTrigger";
import {SquaddieActionType} from "../history/anySquaddieAction";


describe('Battle Orchestrator', () => {
    type OrchestratorTestOptions = {
        missionLoader: BattleMissionLoader;
        cutscenePlayer: BattleCutscenePlayer;
        playerSquaddieSelector: BattlePlayerSquaddieSelector;
        computerSquaddieSelector: BattleComputerSquaddieSelector;
        squaddieUsesActionOnMap: BattleSquaddieUsesActionOnMap;
        squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie;
        squaddieMover: BattleSquaddieMover;
        phaseController: BattlePhaseController;
        playerSquaddieTarget: BattlePlayerSquaddieTarget;

        initialMode: BattleOrchestratorMode;
    }

    let orchestrator: BattleOrchestrator;

    let mockBattleMissionLoader: BattleMissionLoader;
    let mockBattleCutscenePlayer: BattleCutscenePlayer;
    let mockPlayerSquaddieSelector: BattlePlayerSquaddieSelector;
    let mockPlayerSquaddieTarget: BattlePlayerSquaddieTarget;
    let mockComputerSquaddieSelector: BattleComputerSquaddieSelector;
    let mockSquaddieUsesActionOnMap: BattleSquaddieUsesActionOnMap;
    let mockSquaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie;
    let mockSquaddieMover: BattleSquaddieMover;
    let mockMapDisplay: BattleMapDisplay;
    let mockPhaseController: BattlePhaseController;
    let defaultBattleOrchestrator: DefaultBattleOrchestrator;
    let mockHud: BattleSquaddieSelectedHUD;

    let nullState: BattleOrchestratorState;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    function setupMocks() {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();

        mockBattleMissionLoader = new (<new () => BattleMissionLoader>BattleMissionLoader)() as jest.Mocked<BattleMissionLoader>;
        mockBattleMissionLoader.update = jest.fn();
        mockBattleMissionLoader.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
        mockBattleMissionLoader.mouseEventHappened = jest.fn();
        mockBattleMissionLoader.hasCompleted = jest.fn().mockReturnValue(true);

        mockBattleCutscenePlayer = new (
            <new (options: any) => BattleCutscenePlayer>BattleCutscenePlayer
        )({
            cutsceneById: {}
        }) as jest.Mocked<BattleCutscenePlayer>;

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

        mockSquaddieUsesActionOnMap = new (<new () => BattleSquaddieUsesActionOnMap>BattleSquaddieUsesActionOnMap)() as jest.Mocked<BattleSquaddieUsesActionOnMap>;
        mockSquaddieUsesActionOnMap.update = jest.fn();
        mockSquaddieUsesActionOnMap.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
        mockSquaddieUsesActionOnMap.mouseEventHappened = jest.fn();
        mockSquaddieUsesActionOnMap.hasCompleted = jest.fn().mockReturnValue(true);

        mockSquaddieUsesActionOnSquaddie = new (<new () => BattleSquaddieUsesActionOnSquaddie>BattleSquaddieUsesActionOnSquaddie)() as jest.Mocked<BattleSquaddieUsesActionOnSquaddie>;
        mockSquaddieUsesActionOnSquaddie.update = jest.fn();
        mockSquaddieUsesActionOnSquaddie.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
        mockSquaddieUsesActionOnSquaddie.mouseEventHappened = jest.fn();
        mockSquaddieUsesActionOnSquaddie.hasCompleted = jest.fn().mockReturnValue(true);
        (mockSquaddieUsesActionOnSquaddie as any).maybeEndSquaddieTurn = jest.fn();
        (mockSquaddieUsesActionOnSquaddie as any).consumeSquaddieActionPointsAndMaybeEndTheirTurn = jest.fn();

        defaultBattleOrchestrator = new DefaultBattleOrchestrator();
        defaultBattleOrchestrator.update = jest.fn();

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
        nullState = new BattleOrchestratorState({
            hexMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            }),
            battleSquaddieSelectedHUD: mockHud,
        });
        setupMocks();
    });

    const createOrchestrator: (overrides: Partial<OrchestratorTestOptions>) => BattleOrchestrator = (overrides: Partial<OrchestratorTestOptions> = {}) => {
        const orchestrator: BattleOrchestrator = new BattleOrchestrator({
            ...{
                missionLoader: mockBattleMissionLoader,
                cutscenePlayer: mockBattleCutscenePlayer,
                playerSquaddieSelector: mockPlayerSquaddieSelector,
                computerSquaddieSelector: mockComputerSquaddieSelector,
                squaddieUsesActionOnMap: mockSquaddieUsesActionOnMap,
                squaddieUsesActionOnSquaddie: mockSquaddieUsesActionOnSquaddie,
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
        orchestrator.update(nullState, mockedP5GraphicsContext);
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
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.LOADING_MISSION);
        expect(orchestrator.getCurrentComponent()).toBe(needsTwoUpdatesToFinishLoading);
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(needsTwoUpdatesToFinishLoading.update).toBeCalledTimes(2);
        expect(needsTwoUpdatesToFinishLoading.hasCompleted).toBeCalledTimes(2);
        expect(needsTwoUpdatesToFinishLoading.uiControlSettings).toBeCalledTimes(2);
        expect(needsTwoUpdatesToFinishLoading.reset).toBeCalledTimes(1);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
        expect(orchestrator.getCurrentComponent()).toBe(mockBattleCutscenePlayer);
    });

    it('recommends cutscene player if there is a cutscene to play at the start', () => {
        const cutsceneCollection = new MissionCutsceneCollection({
            cutsceneById: {
                "starting": new Cutscene({})
            },
        });

        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.LOADING_MISSION,
        });

        const stateWithCutscene = new BattleOrchestratorState({
            resourceHandler: nullState.resourceHandler,
            squaddieRepository: new BattleSquaddieRepository(),
            cutsceneCollection,
            cutsceneTriggers: [
                new MissionStartOfPhaseCutsceneTrigger({cutsceneId: "starting", turn: 0}),
            ],
        });

        orchestrator.update(stateWithCutscene, mockedP5GraphicsContext);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
        expect(orchestrator.cutscenePlayer.currentCutsceneId).toBe("starting");
    });

    it('will transition from cutscene playing to phase controller mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
        });
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
        expect(orchestrator.getCurrentComponent()).toBe(mockPhaseController);
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(mockPhaseController.update).toBeCalledTimes(1);
        expect(mockPhaseController.hasCompleted).toBeCalledTimes(1);
    });

    it('will transition from phase controller to squaddie selector mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.PHASE_CONTROLLER,
        });

        nullState.squaddieCurrentlyActing.reset();
        nullState.squaddieCurrentlyActing.addInitialState({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
        });
        nullState.squaddieCurrentlyActing.squaddieActionsForThisRound.addAction({
            type: SquaddieActionType.MOVEMENT,
            data: {
                destination: {q: 1, r: 2},
                numberOfActionPointsSpent: 2,
            }
        });

        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR);
        expect(orchestrator.getCurrentComponent()).toBe(mockPlayerSquaddieSelector);
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(mockPlayerSquaddieSelector.update).toBeCalledTimes(1);
        expect(mockPlayerSquaddieSelector.hasCompleted).toBeCalledTimes(1);
    });

    it('will move from squaddie selector mode to squaddie move mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR,
        });
        nullState.squaddieRepository = new BattleSquaddieRepository();
        CreateNewSquaddieAndAddToRepository({
            name: "new static squaddie",
            templateId: "new static squaddie",
            battleId: "new dynamic squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: nullState.squaddieRepository,
        });

        nullState.squaddieCurrentlyActing.reset();
        nullState.squaddieCurrentlyActing.addInitialState({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
        });
        nullState.squaddieCurrentlyActing.squaddieActionsForThisRound.addAction({
            type: SquaddieActionType.MOVEMENT,
            data: {
                destination: {q: 1, r: 2},
                numberOfActionPointsSpent: 2,
            }
        });

        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieMover);
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(mockSquaddieMover.update).toBeCalledTimes(1);
        expect(mockSquaddieMover.hasCompleted).toBeCalledTimes(1);
    });

    it('will move from squaddie move mode to phase controller mode', () => {
        jest.spyOn(MissionObjective.prototype, "shouldBeComplete").mockReturnValue(false);

        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.SQUADDIE_MOVER,
        });
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieMover);
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
        expect(orchestrator.getCurrentComponent()).toBe(mockPhaseController);
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(mockPhaseController.update).toBeCalledTimes(1);
        expect(mockPhaseController.hasCompleted).toBeCalledTimes(1);
    });

    it('switches from default mode to mission loader', () => {
        const mode = BattleOrchestratorMode.UNKNOWN

        orchestrator = createOrchestrator({
            initialMode: mode,
        });

        expect(orchestrator.getCurrentMode()).toBe(mode);
        expect(orchestrator.getCurrentComponent()).toStrictEqual(new DefaultBattleOrchestrator());

        const defaultBattleOrchestratorSpy = jest.spyOn(DefaultBattleOrchestrator.prototype, "update");
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(defaultBattleOrchestratorSpy).toBeCalled();
    });

    describe('mode switching', () => {
        const loadAndExpect = (options: {
            mode: BattleOrchestratorMode,
            orchestratorComponent: BattleOrchestratorComponent,
        }) => {
            orchestrator = createOrchestrator({
                initialMode: options.mode,
            });
            expect(orchestrator.getCurrentMode()).toBe(options.mode);
            expect(orchestrator.getCurrentComponent()).toBe(options.orchestratorComponent);

            orchestrator.update(nullState, mockedP5GraphicsContext);
            expect(options.orchestratorComponent.update).toBeCalled();
        }

        describe('knows which component to load based on the state', () => {
            for (const modeStr in BattleOrchestratorMode) {
                if (modeStr === BattleOrchestratorMode.UNKNOWN) {
                    continue;
                }

                const mode: BattleOrchestratorMode = modeStr as Exclude<BattleOrchestratorMode, BattleOrchestratorMode.UNKNOWN>;
                it(`using the ${mode} mode will use the expected component`, () => {
                    const tests: { [mode in Exclude<BattleOrchestratorMode, BattleOrchestratorMode.UNKNOWN>]: BattleOrchestratorComponent } = {
                        [BattleOrchestratorMode.LOADING_MISSION]: mockBattleMissionLoader,
                        [BattleOrchestratorMode.CUTSCENE_PLAYER]: mockBattleCutscenePlayer,
                        [BattleOrchestratorMode.PHASE_CONTROLLER]: mockPhaseController,
                        [BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR]: mockPlayerSquaddieSelector,
                        [BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET]: mockPlayerSquaddieTarget,
                        [BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR]: mockComputerSquaddieSelector,
                        [BattleOrchestratorMode.SQUADDIE_MOVER]: mockSquaddieMover,
                        [BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP]: mockSquaddieUsesActionOnMap,
                        [BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE]: mockSquaddieUsesActionOnSquaddie,
                    };

                    loadAndExpect({
                        mode,
                        orchestratorComponent: tests[mode],
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
        orchestratorJumpsToSquaddieMover.update(nullState, mockedP5GraphicsContext);
        expect(orchestratorJumpsToSquaddieMover.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
    });

    describe('End of Battle triggers cutscenes and resets', () => {
        let mockCutscene: Cutscene;
        let cutsceneCollection: MissionCutsceneCollection;
        let cutscenePlayer: BattleCutscenePlayer;
        let missionObjectiveCompleteCheck: jest.SpyInstance;

        let victoryState: BattleOrchestratorState;
        let defeatState: BattleOrchestratorState;
        let victoryAndDefeatState: BattleOrchestratorState;

        beforeEach(() => {
            mockCutscene = new Cutscene({});
            cutsceneCollection = new MissionCutsceneCollection({
                cutsceneById: {
                    [DEFAULT_VICTORY_CUTSCENE_ID]: mockCutscene,
                    [DEFAULT_DEFEAT_CUTSCENE_ID]: mockCutscene,
                }
            });
            cutscenePlayer = new BattleCutscenePlayer();

            victoryState = new BattleOrchestratorState({
                hexMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                }),
                battleSquaddieSelectedHUD: mockHud,
                objectives: [
                    new MissionObjective({
                        reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
                        conditions: [new MissionConditionDefeatAffiliation({
                            affiliation: SquaddieAffiliation.ENEMY,
                        })],
                    })
                ],
                cutsceneCollection,
                cutsceneTriggers: [
                    new MissionVictoryCutsceneTrigger({cutsceneId: DEFAULT_VICTORY_CUTSCENE_ID}),
                ],
            });
            victoryState.gameBoard.completionStatus = BattleCompletionStatus.IN_PROGRESS;

            defeatState = new BattleOrchestratorState({
                hexMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                }),
                battleSquaddieSelectedHUD: mockHud,
                objectives: [
                    new MissionObjective({
                        reward: new MissionReward({rewardType: MissionRewardType.DEFEAT}),
                        conditions: [new MissionConditionDefeatAffiliation({
                            affiliation: SquaddieAffiliation.PLAYER,
                        })],
                    })
                ],
                cutsceneCollection,
                cutsceneTriggers: [
                    new MissionDefeatCutsceneTrigger({cutsceneId: DEFAULT_DEFEAT_CUTSCENE_ID}),
                ],
            });
            defeatState.gameBoard.completionStatus = BattleCompletionStatus.IN_PROGRESS;

            victoryAndDefeatState = new BattleOrchestratorState({
                hexMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                }),
                battleSquaddieSelectedHUD: mockHud,
                objectives: [
                    new MissionObjective({
                        reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
                        conditions: [new MissionConditionDefeatAffiliation({
                            affiliation: SquaddieAffiliation.ENEMY,
                        })],
                    }),
                    new MissionObjective({
                        reward: new MissionReward({rewardType: MissionRewardType.DEFEAT}),
                        conditions: [new MissionConditionDefeatAffiliation({
                            affiliation: SquaddieAffiliation.PLAYER,
                        })],
                    })
                ],
                cutsceneCollection,
                cutsceneTriggers: [
                    new MissionVictoryCutsceneTrigger({cutsceneId: DEFAULT_VICTORY_CUTSCENE_ID}),
                    new MissionDefeatCutsceneTrigger({cutsceneId: DEFAULT_DEFEAT_CUTSCENE_ID}),
                ],
            });
            victoryAndDefeatState.gameBoard.completionStatus = BattleCompletionStatus.IN_PROGRESS;

            orchestrator = createOrchestrator({
                initialMode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
                cutscenePlayer,
            });

            missionObjectiveCompleteCheck = jest.spyOn(MissionObjective.prototype, "shouldBeComplete").mockReturnValue(true);
        });

        it('will check for victory conditions once the squaddie finishes moving', () => {
            expect(victoryState.gameBoard.completionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);

            orchestrator.update(victoryState, mockedP5GraphicsContext);
            expect(cutscenePlayer.hasCompleted(victoryState)).toBeTruthy();

            expect(missionObjectiveCompleteCheck).toBeCalled();

            expect(cutscenePlayer.currentCutscene).toBe(mockCutscene);
            expect(victoryState.gameBoard.cutsceneTriggers[0].systemReactedToTrigger).toBeTruthy();
            expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
            expect(orchestrator.getCurrentComponent()).toBe(cutscenePlayer);

            orchestrator.update(victoryState, mockedP5GraphicsContext);
            expect(cutscenePlayer.hasCompleted(victoryState)).toBeTruthy();
            expect(victoryState.gameBoard.completionStatus).toBe(BattleCompletionStatus.VICTORY);
        });

        it('will mark the battle as complete once the victory cutscene ends', () => {
            orchestrator.update(victoryState, mockedP5GraphicsContext);
            orchestrator.update(victoryState, mockedP5GraphicsContext);
            orchestrator.update(victoryState, mockedP5GraphicsContext);
            expect(orchestrator.hasCompleted(victoryState)).toBeTruthy();
            expect(orchestrator.recommendStateChanges(victoryState)).toStrictEqual({
                nextMode: GameModeEnum.TITLE_SCREEN
            });
        });

        it('after resetting it will not immediately trigger victory and complete', () => {
            orchestrator.update(victoryState, mockedP5GraphicsContext);
            orchestrator.update(victoryState, mockedP5GraphicsContext);
            orchestrator.update(victoryState, mockedP5GraphicsContext);
            expect(orchestrator.hasCompleted(victoryState)).toBeTruthy();
            orchestrator.reset(victoryState);
            expect(orchestrator.hasCompleted(victoryState)).toBeFalsy();
        });

        it('will check for defeat conditions once the squaddie finishes moving', () => {
            expect(defeatState.gameBoard.completionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);

            orchestrator.update(defeatState, mockedP5GraphicsContext);
            expect(cutscenePlayer.hasCompleted(defeatState)).toBeTruthy();

            expect(missionObjectiveCompleteCheck).toBeCalled();

            expect(cutscenePlayer.currentCutscene).toBe(mockCutscene);
            expect(defeatState.gameBoard.cutsceneTriggers[0].systemReactedToTrigger).toBeTruthy();
            expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
            expect(orchestrator.getCurrentComponent()).toBe(cutscenePlayer);

            orchestrator.update(defeatState, mockedP5GraphicsContext);
            expect(cutscenePlayer.hasCompleted(defeatState)).toBeTruthy();
            expect(defeatState.gameBoard.completionStatus).toBe(BattleCompletionStatus.DEFEAT);
        });

        it('will mark the battle as complete once the defeat cutscene ends', () => {
            orchestrator.update(defeatState, mockedP5GraphicsContext);
            orchestrator.update(defeatState, mockedP5GraphicsContext);
            orchestrator.update(defeatState, mockedP5GraphicsContext);
            expect(orchestrator.hasCompleted(defeatState)).toBeTruthy();
            expect(orchestrator.recommendStateChanges(defeatState)).toStrictEqual({
                nextMode: GameModeEnum.TITLE_SCREEN
            });
        });

        it('after resetting it will not immediately trigger defeat and complete', () => {
            orchestrator.update(defeatState, mockedP5GraphicsContext);
            orchestrator.update(defeatState, mockedP5GraphicsContext);
            orchestrator.update(defeatState, mockedP5GraphicsContext);
            expect(orchestrator.hasCompleted(defeatState)).toBeTruthy();
            orchestrator.reset(defeatState);
            expect(orchestrator.hasCompleted(defeatState)).toBeFalsy();
        });

        it('if you trigger victory and defeat, defeat takes precedence', () => {
            expect(victoryAndDefeatState.gameBoard.completionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);

            orchestrator.update(victoryAndDefeatState, mockedP5GraphicsContext);
            expect(cutscenePlayer.hasCompleted(victoryAndDefeatState)).toBeTruthy();

            expect(missionObjectiveCompleteCheck).toBeCalled();

            expect(cutscenePlayer.currentCutscene).toBe(mockCutscene);
            expect(victoryAndDefeatState.gameBoard.cutsceneTriggers[1].systemReactedToTrigger).toBeTruthy();
            expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
            expect(orchestrator.getCurrentComponent()).toBe(cutscenePlayer);

            orchestrator.update(victoryAndDefeatState, mockedP5GraphicsContext);
            expect(cutscenePlayer.hasCompleted(victoryAndDefeatState)).toBeTruthy();
            expect(victoryAndDefeatState.gameBoard.completionStatus).toBe(BattleCompletionStatus.DEFEAT);
        });
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
        orchestrator1.update(nullState, mockedP5GraphicsContext);
        expect(orchestrator1.uiControlSettings.displayBattleMap).toBe(true);
    });

    it('will move from squaddie map action mode to phase controller mode', () => {
        jest.spyOn(MissionObjective.prototype, "shouldBeComplete").mockReturnValue(false);

        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
        });
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieUsesActionOnMap);
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(mockSquaddieUsesActionOnMap.update).toBeCalledTimes(1);
        expect(mockSquaddieUsesActionOnMap.hasCompleted).toBeCalledTimes(1);
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
        squaddieSelectorOrchestratorShouldDisplayMap: BattleOrchestrator,
        component: BattleOrchestratorComponent
    ) => {
        const stateWantsToDisplayTheMap: BattleOrchestratorState = new BattleOrchestratorState({});

        squaddieSelectorOrchestratorShouldDisplayMap.mouseMoved(stateWantsToDisplayTheMap, 0, 0);
        expect(component.mouseEventHappened).toBeCalledTimes(1);
        expect(mockMapDisplay.mouseEventHappened).toBeCalledTimes(1);

        squaddieSelectorOrchestratorShouldDisplayMap.mouseClicked(stateWantsToDisplayTheMap, MouseButton.LEFT, 0, 0);
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

    it('will update the time elapsed if the mode recommends it', () => {
        const needsTwoUpdatesToFinishLoading = new (<new () => BattleMissionLoader>BattleMissionLoader)() as jest.Mocked<BattleMissionLoader>;
        needsTwoUpdatesToFinishLoading.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({pauseTimer: true}));
        needsTwoUpdatesToFinishLoading.hasCompleted = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
        needsTwoUpdatesToFinishLoading.update = jest.fn();
        needsTwoUpdatesToFinishLoading.recommendStateChanges = jest.fn().mockReturnValueOnce({
            nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR
        });

        mockPlayerSquaddieSelector.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({pauseTimer: false}));

        const state = new BattleOrchestratorState({});

        orchestrator = createOrchestrator({
            missionLoader: needsTwoUpdatesToFinishLoading,
            playerSquaddieSelector: mockPlayerSquaddieSelector,
            initialMode: BattleOrchestratorMode.LOADING_MISSION,
        });
        expect(state.missionStatistics.timeElapsedInMilliseconds).toBeUndefined();

        orchestrator.update(state, mockedP5GraphicsContext);

        expect(state.missionStatistics.timeElapsedInMilliseconds).toBe(0);
        orchestrator.update(state, mockedP5GraphicsContext);
        expect(state.missionStatistics.timeElapsedInMilliseconds).toBe(0);

        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR);
        expect(orchestrator.getCurrentComponent()).toBe(mockPlayerSquaddieSelector);
        jest.spyOn(Date, "now").mockReturnValue(0);
        orchestrator.update(state, mockedP5GraphicsContext);
        expect(state.missionStatistics.timeElapsedInMilliseconds).toBe(0);

        jest.spyOn(Date, "now").mockReturnValue(100);
        orchestrator.update(state, mockedP5GraphicsContext);
        expect(state.missionStatistics.timeElapsedInMilliseconds).toBeGreaterThan(0);
    });

    const expectKeyEventsWillGoToMapDisplay = (
        squaddieSelectorOrchestratorShouldDisplayMap: BattleOrchestrator,
        component: BattleOrchestratorComponent
    ) => {
        const stateWantsToDisplayTheMap: BattleOrchestratorState = new BattleOrchestratorState({});

        squaddieSelectorOrchestratorShouldDisplayMap.keyPressed(stateWantsToDisplayTheMap, 0);
        expect(component.keyEventHappened).toBeCalledTimes(1);
        expect(mockMapDisplay.keyEventHappened).toBeCalledTimes(1);

        squaddieSelectorOrchestratorShouldDisplayMap.keyPressed(stateWantsToDisplayTheMap, 0);
        expect(component.keyEventHappened).toBeCalledTimes(2);
        expect(mockMapDisplay.keyEventHappened).toBeCalledTimes(2);
    }
});
