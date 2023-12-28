import {BattleOrchestrator, BattleOrchestratorMode} from "./battleOrchestrator";
import {BattleOrchestratorStateHelper} from "./battleOrchestratorState";
import {BattleCutscenePlayer} from "../orchestratorComponents/battleCutscenePlayer";
import {BattlePlayerSquaddieSelector} from "../orchestratorComponents/battlePlayerSquaddieSelector";
import {BattleSquaddieMover} from "../orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "../orchestratorComponents/battleMapDisplay";
import {BattlePhaseController} from "../orchestratorComponents/battlePhaseController";
import {BattleSquaddieUsesActionOnMap} from "../orchestratorComponents/battleSquaddieUsesActionOnMap";
import {BattlePlayerSquaddieTarget} from "../orchestratorComponents/battlePlayerSquaddieTarget";
import {ObjectRepositoryHelper} from "../objectRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleOrchestratorComponent} from "./battleOrchestratorComponent";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {BattleSquaddieUsesActionOnSquaddie} from "../orchestratorComponents/battleSquaddieUsesActionOnSquaddie";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {UIControlSettings} from "./uiControlSettings";
import {BattleComputerSquaddieSelector} from "../orchestratorComponents/battleComputerSquaddieSelector";
import {MouseButton} from "../../utils/mouseConfig";
import {MissionObjectiveHelper} from "../missionResult/missionObjective";
import {Cutscene} from "../../cutscene/cutscene";
import {BattleCompletionStatus} from "./missionObjectivesAndCutscenes";
import {
    DEFAULT_DEFEAT_CUTSCENE_ID,
    DEFAULT_VICTORY_CUTSCENE_ID,
    MissionCutsceneCollection,
    MissionCutsceneCollectionHelper
} from "./missionCutsceneCollection";
import {GameModeEnum} from "../../utils/startupConfig";
import {DefaultBattleOrchestrator} from "./defaultBattleOrchestrator";
import {MissionRewardType} from "../missionResult/missionReward";
import {TriggeringEvent,} from "../../cutscene/cutsceneTrigger";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {MissionConditionType} from "../missionResult/missionCondition";
import {MissionMap} from "../../missionMap/missionMap";
import {MissionStartOfPhaseCutsceneTrigger} from "../cutscene/missionStartOfPhaseCutsceneTrigger";
import {InitializeBattle} from "./initializeBattle";
import {BattleStateHelper} from "./battleState";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {GameEngineState, GameEngineStateHelper} from "../../gameEngine/gameEngine";


describe('Battle Orchestrator', () => {
    type OrchestratorTestOptions = {
        cutscenePlayer: BattleCutscenePlayer;
        playerSquaddieSelector: BattlePlayerSquaddieSelector;
        computerSquaddieSelector: BattleComputerSquaddieSelector;
        squaddieUsesActionOnMap: BattleSquaddieUsesActionOnMap;
        squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie;
        squaddieMover: BattleSquaddieMover;
        phaseController: BattlePhaseController;
        playerSquaddieTarget: BattlePlayerSquaddieTarget;
        initializeBattle: InitializeBattle;

        initialMode: BattleOrchestratorMode;
    }

    let orchestrator: BattleOrchestrator;

    let mockInitializeBattle: InitializeBattle;
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

    let nullState: GameEngineState;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    function setupMocks() {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();

        mockInitializeBattle = new (<new () => InitializeBattle>InitializeBattle)() as jest.Mocked<InitializeBattle>;
        mockInitializeBattle.reset = jest.fn();
        mockInitializeBattle.update = jest.fn();

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
        nullState = GameEngineStateHelper.new({
            battleOrchestratorState:
                BattleOrchestratorStateHelper.newOrchestratorState({
                    battleSquaddieSelectedHUD: mockHud,
                    resourceHandler: undefined,
                    squaddieRepository: undefined,
                    battleState: BattleStateHelper.newBattleState({
                        missionId: "test mission",
                        missionMap: new MissionMap({
                            terrainTileMap: new TerrainTileMap({
                                movementCost: ["1 1 "]
                            }),
                        }),
                        missionCompletionStatus: {
                            "default": {
                                isComplete: undefined,
                                conditions: {}
                            }
                        },
                        battlePhaseState: {
                            turnCount: 0,
                            currentAffiliation: BattlePhase.UNKNOWN,
                        }
                    })
                })
        });
        setupMocks();
    });

    const createOrchestrator: (overrides: Partial<OrchestratorTestOptions>) => BattleOrchestrator = (overrides: Partial<OrchestratorTestOptions> = {}) => {
        const orchestrator: BattleOrchestrator = new BattleOrchestrator({
            ...{
                initializeBattle: mockInitializeBattle,
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

    it('change to cutscene player mode', () => {
        orchestrator = createOrchestrator({});
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
        expect(orchestrator.getCurrentComponent()).toBe(mockBattleCutscenePlayer);
    });

    it('plays a cutscene at the start of the turn', () => {
        orchestrator = createOrchestrator({});
        const turn0StateCutsceneId = "starting";
        const mockCutscene = new Cutscene({});
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                [DEFAULT_VICTORY_CUTSCENE_ID]: mockCutscene,
                [DEFAULT_DEFEAT_CUTSCENE_ID]: mockCutscene,
                [turn0StateCutsceneId]: mockCutscene,
            }
        });

        const turn0CutsceneTrigger: MissionStartOfPhaseCutsceneTrigger = {
            cutsceneId: "starting",
            triggeringEvent: TriggeringEvent.START_OF_TURN,
            systemReactedToTrigger: false,
            turn: 0,
        }

        const turn0State: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                squaddieRepository: undefined,
                resourceHandler: undefined,
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateHelper.newBattleState({
                    missionId: "test mission",
                    missionMap: new MissionMap({
                        terrainTileMap: new TerrainTileMap({
                            movementCost: ["1 1 "]
                        }),
                    }),
                    cutsceneCollection,
                    objectives: [],
                    cutsceneTriggers: [
                        turn0CutsceneTrigger
                    ],
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    }
                })
            })
        });

        orchestrator.update(turn0State, mockedP5GraphicsContext);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
        expect(orchestrator.getCurrentComponent()).toBe(mockBattleCutscenePlayer);
        expect(mockBattleCutscenePlayer.currentCutsceneId).toBe(turn0StateCutsceneId);
    });

    it('recommends cutscene player if there is a cutscene to play at the start', () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                "starting": new Cutscene({})
            },
        });

        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.PHASE_CONTROLLER,
        });

        const stateWithCutscene: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                resourceHandler: nullState.battleOrchestratorState.resourceHandler,
                squaddieRepository: ObjectRepositoryHelper.new(),
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateHelper.newBattleState({
                    missionId: "test mission",
                    cutsceneCollection,
                    cutsceneTriggers: [
                        {
                            cutsceneId: "starting",
                            turn: 0,
                            triggeringEvent: TriggeringEvent.START_OF_TURN,
                            systemReactedToTrigger: false,
                        },
                    ],
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    }
                })
            })
        });

        orchestrator.update(stateWithCutscene, mockedP5GraphicsContext);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
        expect(orchestrator.cutscenePlayer.currentCutsceneId).toBe("starting");
    });

    it('skips the introductory cutscene if the game is loaded', () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                "starting": new Cutscene({})
            },
        });

        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.UNKNOWN,
        });

        const stateWithCutscene: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState:
                BattleOrchestratorStateHelper.newOrchestratorState({
                    resourceHandler: nullState.battleOrchestratorState.resourceHandler,
                    squaddieRepository: ObjectRepositoryHelper.new(),
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateHelper.newBattleState({
                        missionId: "test mission",
                        cutsceneCollection,
                        cutsceneTriggers: [
                            {
                                cutsceneId: "starting",
                                turn: 0,
                                triggeringEvent: TriggeringEvent.START_OF_TURN,
                                systemReactedToTrigger: false,
                            },
                            {
                                cutsceneId: "next scene",
                                turn: 1,
                                triggeringEvent: TriggeringEvent.START_OF_TURN,
                                systemReactedToTrigger: false,
                            },
                            {
                                cutsceneId: "victory",
                                triggeringEvent: TriggeringEvent.MISSION_VICTORY,
                                systemReactedToTrigger: false,
                            },
                        ],
                        battlePhaseState: {
                            turnCount: 0,
                            currentAffiliation: BattlePhase.UNKNOWN,
                        }
                    })
                })
        });
        stateWithCutscene.gameSaveFlags.loadingInProgress = true;

        orchestrator.update(stateWithCutscene, mockedP5GraphicsContext);
        expect(orchestrator.cutscenePlayer.currentCutsceneId).toBeUndefined();
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

        nullState.battleOrchestratorState.battleState.squaddieCurrentlyActing =
            {
                movingBattleSquaddieIds: [],
                squaddieActionsForThisRound: {
                    squaddieTemplateId: "new static squaddie",
                    battleSquaddieId: "new dynamic squaddie",
                    startingLocation: {q: 0, r: 0},
                    actions: [],
                },
                currentlySelectedAction: undefined,
            };
        SquaddieActionsForThisRoundHandler.addAction(nullState.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound, {
            type: SquaddieActionType.MOVEMENT,
            destination: {q: 1, r: 2},
            numberOfActionPointsSpent: 2,
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
        nullState.battleOrchestratorState.squaddieRepository = ObjectRepositoryHelper.new();
        CreateNewSquaddieAndAddToRepository({
            name: "new static squaddie",
            templateId: "new static squaddie",
            battleId: "new dynamic squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: nullState.battleOrchestratorState.squaddieRepository,
        });

        nullState.battleOrchestratorState.battleState.squaddieCurrentlyActing =
            {
                movingBattleSquaddieIds: [],
                squaddieActionsForThisRound: {
                    squaddieTemplateId: "new static squaddie",
                    battleSquaddieId: "new dynamic squaddie",
                    startingLocation: {q: 0, r: 0},
                    actions: [],
                },
                currentlySelectedAction: undefined,
            };

        SquaddieActionsForThisRoundHandler.addAction(nullState.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound,
            {
                type: SquaddieActionType.MOVEMENT,
                destination: {q: 1, r: 2},
                numberOfActionPointsSpent: 2,
            });

        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieMover);
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(mockSquaddieMover.update).toBeCalledTimes(1);
        expect(mockSquaddieMover.hasCompleted).toBeCalledTimes(1);
    });

    it('will move from squaddie move mode to phase controller mode', () => {
        jest.spyOn(MissionObjectiveHelper, "shouldBeComplete").mockReturnValue(false);

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

    it('Start in the initialized mode as startup', () => {
        orchestrator = createOrchestrator({});

        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.INITIALIZED);
        expect(orchestrator.getCurrentComponent()).toStrictEqual(mockInitializeBattle);

        const initializeBattleSpy = jest.spyOn(mockInitializeBattle, "update");
        orchestrator.update(nullState, mockedP5GraphicsContext);
        expect(initializeBattleSpy).toBeCalled();
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
                if (
                    modeStr === BattleOrchestratorMode.UNKNOWN
                    || modeStr === BattleOrchestratorMode.INITIALIZED
                ) {
                    continue;
                }

                const mode: BattleOrchestratorMode = modeStr as Exclude<BattleOrchestratorMode, BattleOrchestratorMode.UNKNOWN | BattleOrchestratorMode.INITIALIZED>;
                it(`using the ${mode} mode will use the expected component`, () => {
                    const tests: { [mode in Exclude<BattleOrchestratorMode, BattleOrchestratorMode.UNKNOWN | BattleOrchestratorMode.INITIALIZED>]: BattleOrchestratorComponent } = {
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
        const battleCutscenePlayerRecommendsAMode = new (<new () => BattleCutscenePlayer>BattleCutscenePlayer)() as jest.Mocked<BattleCutscenePlayer>;
        battleCutscenePlayerRecommendsAMode.update = jest.fn();
        battleCutscenePlayerRecommendsAMode.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({}));
        battleCutscenePlayerRecommendsAMode.mouseEventHappened = jest.fn();
        battleCutscenePlayerRecommendsAMode.hasCompleted = jest.fn().mockReturnValue(true);
        battleCutscenePlayerRecommendsAMode.recommendStateChanges = jest.fn().mockReturnValue({
            nextMode: BattleOrchestratorMode.SQUADDIE_MOVER
        });

        const orchestratorJumpsToSquaddieMover = createOrchestrator({
            initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
            cutscenePlayer: battleCutscenePlayerRecommendsAMode,
        });

        expect(orchestratorJumpsToSquaddieMover.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
        orchestratorJumpsToSquaddieMover.update(nullState, mockedP5GraphicsContext);
        expect(orchestratorJumpsToSquaddieMover.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
    });

    describe('End of Battle triggers cutscenes and resets', () => {
        let mockCutscene: Cutscene;
        let cutsceneCollection: MissionCutsceneCollection;
        let cutscenePlayer: BattleCutscenePlayer;
        let missionObjectiveCompleteCheck: jest.SpyInstance;

        let victoryState: GameEngineState;
        let defeatState: GameEngineState;
        let victoryAndDefeatState: GameEngineState;

        beforeEach(() => {
            mockCutscene = new Cutscene({});
            cutsceneCollection = MissionCutsceneCollectionHelper.new({
                cutsceneById: {
                    [DEFAULT_VICTORY_CUTSCENE_ID]: mockCutscene,
                    [DEFAULT_DEFEAT_CUTSCENE_ID]: mockCutscene,
                }
            });
            cutscenePlayer = new BattleCutscenePlayer();

            victoryState = GameEngineStateHelper.new({
                battleOrchestratorState:
                    BattleOrchestratorStateHelper.newOrchestratorState({
                        battleSquaddieSelectedHUD: mockHud,
                        squaddieRepository: undefined,
                        resourceHandler: undefined,
                        battleState: BattleStateHelper.newBattleState({
                            missionId: "test mission",
                            missionMap: new MissionMap({
                                terrainTileMap: new TerrainTileMap({
                                    movementCost: ["1 1 "]
                                }),
                            }),
                            objectives: [
                                MissionObjectiveHelper.validateMissionObjective({
                                    id: "test",
                                    reward: {rewardType: MissionRewardType.VICTORY},
                                    numberOfRequiredConditionsToComplete: 1,
                                    hasGivenReward: false,
                                    conditions: [
                                        {
                                            id: "test",
                                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                                        }
                                    ],
                                })
                            ],
                            cutsceneCollection,
                            cutsceneTriggers: [
                                {
                                    cutsceneId: DEFAULT_VICTORY_CUTSCENE_ID,
                                    triggeringEvent: TriggeringEvent.MISSION_VICTORY,
                                    systemReactedToTrigger: false,
                                },
                            ],
                            battleCompletionStatus: BattleCompletionStatus.IN_PROGRESS,
                            battlePhaseState: {
                                turnCount: 0,
                                currentAffiliation: BattlePhase.UNKNOWN,
                            },
                        }),
                    })
            });

            defeatState = GameEngineStateHelper.new({
                battleOrchestratorState:
                    BattleOrchestratorStateHelper.newOrchestratorState({
                        battleSquaddieSelectedHUD: mockHud,
                        squaddieRepository: undefined,
                        resourceHandler: undefined,
                        battleState: BattleStateHelper.newBattleState({
                            missionId: "test mission",
                            missionMap: new MissionMap({
                                terrainTileMap: new TerrainTileMap({
                                    movementCost: ["1 1 "]
                                }),
                            }),
                            objectives: [
                                MissionObjectiveHelper.validateMissionObjective({
                                    id: "test",
                                    reward: {rewardType: MissionRewardType.DEFEAT},
                                    numberOfRequiredConditionsToComplete: 1,
                                    hasGivenReward: false,
                                    conditions: [{
                                        id: "test",
                                        type: MissionConditionType.DEFEAT_ALL_PLAYERS,
                                    }],
                                })
                            ],
                            cutsceneCollection,
                            cutsceneTriggers: [
                                {
                                    cutsceneId: DEFAULT_DEFEAT_CUTSCENE_ID,
                                    triggeringEvent: TriggeringEvent.MISSION_DEFEAT,
                                    systemReactedToTrigger: false,
                                },
                            ],
                            battleCompletionStatus: BattleCompletionStatus.IN_PROGRESS,
                            battlePhaseState: {
                                turnCount: 0,
                                currentAffiliation: BattlePhase.UNKNOWN,
                            },
                        })
                    })
            });

            victoryAndDefeatState =
                GameEngineStateHelper.new({
                    battleOrchestratorState:
                        BattleOrchestratorStateHelper.newOrchestratorState({
                            battleSquaddieSelectedHUD: mockHud,
                            squaddieRepository: undefined,
                            resourceHandler: undefined,
                            battleState: BattleStateHelper.newBattleState({
                                missionId: "test mission",
                                missionMap: new MissionMap({
                                    terrainTileMap: new TerrainTileMap({
                                        movementCost: ["1 1 "]
                                    }),
                                }),
                                objectives: [
                                    MissionObjectiveHelper.validateMissionObjective({
                                        id: "test",
                                        reward: {rewardType: MissionRewardType.VICTORY},
                                        numberOfRequiredConditionsToComplete: 1,
                                        hasGivenReward: false,
                                        conditions: [{
                                            id: "test",
                                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                                        }],
                                    }),
                                    MissionObjectiveHelper.validateMissionObjective({
                                        id: "test1",
                                        reward: {rewardType: MissionRewardType.DEFEAT},
                                        numberOfRequiredConditionsToComplete: 1,
                                        hasGivenReward: false,
                                        conditions: [{
                                            id: "test",
                                            type: MissionConditionType.DEFEAT_ALL_PLAYERS,
                                        }],
                                    })
                                ],
                                cutsceneCollection,
                                cutsceneTriggers: [
                                    {
                                        cutsceneId: DEFAULT_VICTORY_CUTSCENE_ID,
                                        triggeringEvent: TriggeringEvent.MISSION_VICTORY,
                                        systemReactedToTrigger: false,
                                    },
                                    {
                                        cutsceneId: DEFAULT_DEFEAT_CUTSCENE_ID,
                                        triggeringEvent: TriggeringEvent.MISSION_DEFEAT,
                                        systemReactedToTrigger: false,
                                    },
                                ],
                                battleCompletionStatus: BattleCompletionStatus.IN_PROGRESS,
                            })
                        })
                });

            orchestrator = createOrchestrator({
                initialMode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
                cutscenePlayer,
            });

            missionObjectiveCompleteCheck = jest.spyOn(MissionObjectiveHelper, "shouldBeComplete").mockReturnValue(true);
        });

        it('will check for victory conditions once the squaddie finishes moving', () => {
            expect(victoryState.battleOrchestratorState.battleState.battleCompletionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);

            orchestrator.update(victoryState, mockedP5GraphicsContext);
            expect(cutscenePlayer.hasCompleted(victoryState)).toBeTruthy();

            expect(missionObjectiveCompleteCheck).toBeCalled();

            expect(cutscenePlayer.currentCutscene).toBe(mockCutscene);
            expect(victoryState.battleOrchestratorState.battleState.cutsceneTriggers[0].systemReactedToTrigger).toBeTruthy();
            expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
            expect(orchestrator.getCurrentComponent()).toBe(cutscenePlayer);

            orchestrator.update(victoryState, mockedP5GraphicsContext);
            expect(cutscenePlayer.hasCompleted(victoryState)).toBeTruthy();
            expect(victoryState.battleOrchestratorState.battleState.battleCompletionStatus).toBe(BattleCompletionStatus.VICTORY);
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
            expect(defeatState.battleOrchestratorState.battleState.battleCompletionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);

            orchestrator.update(defeatState, mockedP5GraphicsContext);
            expect(cutscenePlayer.hasCompleted(defeatState)).toBeTruthy();

            expect(missionObjectiveCompleteCheck).toBeCalled();

            expect(cutscenePlayer.currentCutscene).toBe(mockCutscene);
            expect(defeatState.battleOrchestratorState.battleState.cutsceneTriggers[0].systemReactedToTrigger).toBeTruthy();
            expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
            expect(orchestrator.getCurrentComponent()).toBe(cutscenePlayer);

            orchestrator.update(defeatState, mockedP5GraphicsContext);
            expect(cutscenePlayer.hasCompleted(defeatState)).toBeTruthy();
            expect(defeatState.battleOrchestratorState.battleState.battleCompletionStatus).toBe(BattleCompletionStatus.DEFEAT);
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
            expect(victoryAndDefeatState.battleOrchestratorState.battleState.battleCompletionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);

            orchestrator.update(victoryAndDefeatState, mockedP5GraphicsContext);
            expect(cutscenePlayer.hasCompleted(victoryAndDefeatState)).toBeTruthy();

            expect(missionObjectiveCompleteCheck).toBeCalled();

            expect(cutscenePlayer.currentCutscene).toBe(mockCutscene);
            expect(victoryAndDefeatState.battleOrchestratorState.battleState.cutsceneTriggers[1].systemReactedToTrigger).toBeTruthy();
            expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
            expect(orchestrator.getCurrentComponent()).toBe(cutscenePlayer);

            orchestrator.update(victoryAndDefeatState, mockedP5GraphicsContext);
            expect(cutscenePlayer.hasCompleted(victoryAndDefeatState)).toBeTruthy();
            expect(victoryAndDefeatState.battleOrchestratorState.battleState.battleCompletionStatus).toBe(BattleCompletionStatus.DEFEAT);
        });
    });

    it('will update its UI Control Settings after updating', () => {
        const cutscenePlayerRecommendsAMode = new (<new () => BattleCutscenePlayer>BattleCutscenePlayer)() as jest.Mocked<BattleCutscenePlayer>;
        cutscenePlayerRecommendsAMode.update = jest.fn();
        cutscenePlayerRecommendsAMode.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({
            displayMap: true,
        }));
        cutscenePlayerRecommendsAMode.mouseEventHappened = jest.fn();
        cutscenePlayerRecommendsAMode.hasCompleted = jest.fn();

        const orchestrator1 = createOrchestrator({
            initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
            cutscenePlayer: cutscenePlayerRecommendsAMode,
        });

        expect(orchestrator1.uiControlSettings.displayBattleMap).toBeUndefined();
        orchestrator1.update(nullState, mockedP5GraphicsContext);
        expect(orchestrator1.uiControlSettings.displayBattleMap).toBe(true);
    });

    it('will move from squaddie map action mode to phase controller mode', () => {
        jest.spyOn(MissionObjectiveHelper, "shouldBeComplete").mockReturnValue(false);

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

    describe('mouse events', () => {
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
            const stateWantsToDisplayTheMap: GameEngineState = GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                    squaddieRepository: undefined,
                    battleState: BattleStateHelper.newBattleState({
                        missionId: "test mission",
                    }),
                    resourceHandler: undefined,
                    battleSquaddieSelectedHUD: undefined,
                })
            });

            squaddieSelectorOrchestratorShouldDisplayMap.mouseMoved(stateWantsToDisplayTheMap, 0, 0);
            expect(component.mouseEventHappened).toBeCalledTimes(1);
            expect(mockMapDisplay.mouseEventHappened).toBeCalledTimes(1);

            squaddieSelectorOrchestratorShouldDisplayMap.mouseClicked(stateWantsToDisplayTheMap, MouseButton.LEFT, 0, 0);
            expect(component.mouseEventHappened).toBeCalledTimes(2);
            expect(mockMapDisplay.mouseEventHappened).toBeCalledTimes(2);
        }
    });

    describe('keyboard events', () => {
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
            const needsTwoUpdatesToFinishLoading = new (<new () => BattleCutscenePlayer>BattleCutscenePlayer)() as jest.Mocked<BattleCutscenePlayer>;
            needsTwoUpdatesToFinishLoading.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({pauseTimer: true}));
            needsTwoUpdatesToFinishLoading.hasCompleted = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
            needsTwoUpdatesToFinishLoading.update = jest.fn();
            needsTwoUpdatesToFinishLoading.recommendStateChanges = jest.fn().mockReturnValueOnce({
                nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR
            });

            mockPlayerSquaddieSelector.uiControlSettings = jest.fn().mockReturnValue(new UIControlSettings({pauseTimer: false}));

            const state: GameEngineState = GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                    squaddieRepository: undefined,
                    battleState: BattleStateHelper.newBattleState({
                        missionId: "test mission",
                    }),
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                    resourceHandler: undefined,
                })
            });

            orchestrator = createOrchestrator({
                playerSquaddieSelector: mockPlayerSquaddieSelector,
                initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
            });
            expect(state.battleOrchestratorState.battleState.missionStatistics.timeElapsedInMilliseconds).toBeUndefined();

            orchestrator.update(state, mockedP5GraphicsContext);

            expect(state.battleOrchestratorState.battleState.missionStatistics.timeElapsedInMilliseconds).toBe(0);
            orchestrator.update(state, mockedP5GraphicsContext);
            expect(state.battleOrchestratorState.battleState.missionStatistics.timeElapsedInMilliseconds).toBe(0);

            expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR);
            expect(orchestrator.getCurrentComponent()).toBe(mockPlayerSquaddieSelector);
            jest.spyOn(Date, "now").mockReturnValue(0);
            orchestrator.update(state, mockedP5GraphicsContext);
            expect(state.battleOrchestratorState.battleState.missionStatistics.timeElapsedInMilliseconds).toBe(0);

            jest.spyOn(Date, "now").mockReturnValue(100);
            orchestrator.update(state, mockedP5GraphicsContext);
            expect(state.battleOrchestratorState.battleState.missionStatistics.timeElapsedInMilliseconds).toBeGreaterThan(0);
        });
        const expectKeyEventsWillGoToMapDisplay = (
            squaddieSelectorOrchestratorShouldDisplayMap: BattleOrchestrator,
            component: BattleOrchestratorComponent
        ) => {
            const stateWantsToDisplayTheMap
                : GameEngineState = GameEngineStateHelper.new({
                battleOrchestratorState:
                    BattleOrchestratorStateHelper.newOrchestratorState({
                        battleState: BattleStateHelper.newBattleState({
                            missionId: "test mission",
                        }),
                        resourceHandler: undefined,
                        battleSquaddieSelectedHUD: undefined,
                        squaddieRepository: undefined,
                    })
            });

            squaddieSelectorOrchestratorShouldDisplayMap.keyPressed(stateWantsToDisplayTheMap, 0);
            expect(component.keyEventHappened).toBeCalledTimes(1);
            expect(mockMapDisplay.keyEventHappened).toBeCalledTimes(1);

            squaddieSelectorOrchestratorShouldDisplayMap.keyPressed(stateWantsToDisplayTheMap, 0);
            expect(component.keyEventHappened).toBeCalledTimes(2);
            expect(mockMapDisplay.keyEventHappened).toBeCalledTimes(2);
        }
    });

    it('sets the completed flag if the user wants to load progress', () => {
        const orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
        });

        const state: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                battleState: BattleStateHelper.newBattleState({
                    missionId: "test mission",
                }),
                resourceHandler: undefined,
                battleSquaddieSelectedHUD: undefined,
                squaddieRepository: undefined,
            })
        });
        state.gameSaveFlags.loadRequested = true;

        orchestrator.update(state, mockedP5GraphicsContext);
        expect(orchestrator.hasCompleted(state)).toBeTruthy();

        const changes = orchestrator.recommendStateChanges(state);
        expect(changes.nextMode).toBe(GameModeEnum.LOADING_BATTLE);
    });
});
