import {
    BattleOrchestrator,
    BattleOrchestratorMode,
} from "./battleOrchestrator"
import { BattleOrchestratorStateService } from "./battleOrchestratorState"
import { BattleCutscenePlayer } from "../orchestratorComponents/battleCutscenePlayer"
import { BattlePlayerSquaddieSelector } from "../orchestratorComponents/battlePlayerSquaddieSelector"
import { BattleSquaddieMover } from "../orchestratorComponents/battleSquaddieMover"
import { BattleMapDisplay } from "../orchestratorComponents/battleMapDisplay"
import { BattlePhaseController } from "../orchestratorComponents/battlePhaseController"
import { BattleSquaddieUsesActionOnMap } from "../orchestratorComponents/battleSquaddieUsesActionOnMap"
import { BattlePlayerSquaddieTarget } from "../orchestratorComponents/battlePlayerSquaddieTarget"
import { ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleOrchestratorComponent } from "./battleOrchestratorComponent"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import { BattleSquaddieSelectedHUD } from "../hud/BattleSquaddieSelectedHUD"
import { BattleSquaddieUsesActionOnSquaddie } from "../orchestratorComponents/battleSquaddieUsesActionOnSquaddie"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { CreateNewSquaddieAndAddToRepository } from "../../utils/test/squaddie"
import { UIControlSettings } from "./uiControlSettings"
import { BattleComputerSquaddieSelector } from "../orchestratorComponents/battleComputerSquaddieSelector"
import { MouseButton } from "../../utils/mouseConfig"
import { MissionObjectiveHelper } from "../missionResult/missionObjective"
import { Cutscene, CutsceneService } from "../../cutscene/cutscene"
import { BattleCompletionStatus } from "./missionObjectivesAndCutscenes"
import {
    DEFAULT_DEFEAT_CUTSCENE_ID,
    DEFAULT_VICTORY_CUTSCENE_ID,
    MissionCutsceneCollection,
    MissionCutsceneCollectionHelper,
} from "./missionCutsceneCollection"
import { GameModeEnum } from "../../utils/startupConfig"
import { DefaultBattleOrchestrator } from "./defaultBattleOrchestrator"
import { MissionRewardType } from "../missionResult/missionReward"
import { TriggeringEvent } from "../../cutscene/cutsceneTrigger"
import { MissionConditionType } from "../missionResult/missionCondition"
import { MissionMap } from "../../missionMap/missionMap"
import { MissionStartOfPhaseCutsceneTrigger } from "../cutscene/missionStartOfPhaseCutsceneTrigger"
import { InitializeBattle } from "./initializeBattle"
import { BattleStateService } from "./battleState"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { LoadSaveStateService } from "../../dataLoader/loadSaveState"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { DecidedActionService } from "../../action/decided/decidedAction"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"
import { BattleHUDService } from "../hud/battleHUD"
import { PlayerHudController } from "../orchestratorComponents/playerHudController"
import { BattlePlayerActionConfirm } from "../orchestratorComponents/battlePlayerActionConfirm"

describe("Battle Orchestrator", () => {
    type OrchestratorTestOptions = {
        cutscenePlayer: BattleCutscenePlayer
        playerSquaddieSelector: BattlePlayerSquaddieSelector
        computerSquaddieSelector: BattleComputerSquaddieSelector
        squaddieUsesActionOnMap: BattleSquaddieUsesActionOnMap
        squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie
        squaddieMover: BattleSquaddieMover
        phaseController: BattlePhaseController
        playerHudController: PlayerHudController
        playerSquaddieTarget: BattlePlayerSquaddieTarget
        playerConfirm: BattlePlayerActionConfirm
        initializeBattle: InitializeBattle

        initialMode: BattleOrchestratorMode
    }

    let orchestrator: BattleOrchestrator

    let mockInitializeBattle: InitializeBattle
    let mockBattleCutscenePlayer: BattleCutscenePlayer
    let mockPlayerSquaddieSelector: BattlePlayerSquaddieSelector
    let mockPlayerSquaddieTarget: BattlePlayerSquaddieTarget
    let mockPlayerConfirm: BattlePlayerActionConfirm
    let mockComputerSquaddieSelector: BattleComputerSquaddieSelector
    let mockSquaddieUsesActionOnMap: BattleSquaddieUsesActionOnMap
    let mockSquaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie
    let mockSquaddieMover: BattleSquaddieMover
    let mockMapDisplay: BattleMapDisplay
    let mockPhaseController: BattlePhaseController
    let mockPlayerHudController: PlayerHudController
    let defaultBattleOrchestrator: DefaultBattleOrchestrator
    let mockHud: BattleSquaddieSelectedHUD

    let nullState: GameEngineState
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    function setupMocks() {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()

        mockInitializeBattle = new (<new () => InitializeBattle>(
            InitializeBattle
        ))() as jest.Mocked<InitializeBattle>
        mockInitializeBattle.reset = jest.fn()
        mockInitializeBattle.update = jest.fn()

        mockBattleCutscenePlayer = new (<
            new (options: any) => BattleCutscenePlayer
        >BattleCutscenePlayer)({
            cutsceneById: {},
        }) as jest.Mocked<BattleCutscenePlayer>

        mockBattleCutscenePlayer.update = jest.fn()
        mockBattleCutscenePlayer.uiControlSettings = jest
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        mockBattleCutscenePlayer.mouseEventHappened = jest.fn()
        mockBattleCutscenePlayer.hasCompleted = jest.fn().mockReturnValue(true)

        mockPlayerSquaddieSelector = new (<
            new () => BattlePlayerSquaddieSelector
        >BattlePlayerSquaddieSelector)() as jest.Mocked<BattlePlayerSquaddieSelector>
        mockPlayerSquaddieSelector.update = jest.fn()
        mockPlayerSquaddieSelector.uiControlSettings = jest
            .fn()
            .mockReturnValue(
                new UIControlSettings({
                    displayMap: true,
                    scrollCamera: true,
                })
            )
        mockPlayerSquaddieSelector.mouseEventHappened = jest.fn()
        mockPlayerSquaddieSelector.keyEventHappened = jest.fn()
        mockPlayerSquaddieSelector.hasCompleted = jest
            .fn()
            .mockReturnValue(true)
        mockPlayerSquaddieSelector.recommendStateChanges = jest
            .fn()
            .mockReturnValue({ displayMap: true })

        mockPlayerSquaddieTarget = new (<new () => BattlePlayerSquaddieTarget>(
            BattlePlayerSquaddieTarget
        ))() as jest.Mocked<BattlePlayerSquaddieTarget>
        mockPlayerSquaddieTarget.update = jest.fn()
        mockPlayerSquaddieTarget.uiControlSettings = jest.fn().mockReturnValue(
            new UIControlSettings({
                displayMap: true,
                scrollCamera: true,
            })
        )
        mockPlayerSquaddieTarget.mouseEventHappened = jest.fn()
        mockPlayerSquaddieTarget.hasCompleted = jest.fn().mockReturnValue(true)
        mockPlayerSquaddieTarget.recommendStateChanges = jest
            .fn()
            .mockReturnValue({ displayMap: true })

        mockPlayerConfirm = new (<new () => BattlePlayerActionConfirm>(
            BattlePlayerActionConfirm
        ))() as jest.Mocked<BattlePlayerActionConfirm>
        mockPlayerConfirm.update = jest.fn()
        mockPlayerConfirm.uiControlSettings = jest.fn().mockReturnValue(
            new UIControlSettings({
                displayMap: true,
                scrollCamera: true,
            })
        )
        mockPlayerConfirm.mouseEventHappened = jest.fn()
        mockPlayerConfirm.hasCompleted = jest.fn().mockReturnValue(true)
        mockPlayerConfirm.recommendStateChanges = jest
            .fn()
            .mockReturnValue({ displayMap: true })

        mockComputerSquaddieSelector = new (<
            new () => BattleComputerSquaddieSelector
        >BattleComputerSquaddieSelector)() as jest.Mocked<BattleComputerSquaddieSelector>
        mockComputerSquaddieSelector.update = jest.fn()
        mockComputerSquaddieSelector.uiControlSettings = jest
            .fn()
            .mockReturnValue(
                new UIControlSettings({
                    displayMap: true,
                    scrollCamera: false,
                })
            )
        mockComputerSquaddieSelector.mouseEventHappened = jest.fn()
        mockComputerSquaddieSelector.keyEventHappened = jest.fn()
        mockComputerSquaddieSelector.hasCompleted = jest
            .fn()
            .mockReturnValue(true)
        mockComputerSquaddieSelector.recommendStateChanges = jest
            .fn()
            .mockReturnValue({ displayMap: true })

        mockSquaddieMover = new (<new () => BattleSquaddieMover>(
            BattleSquaddieMover
        ))() as jest.Mocked<BattleSquaddieMover>
        mockSquaddieMover.update = jest.fn()
        mockSquaddieMover.reset = jest.fn()
        mockSquaddieMover.uiControlSettings = jest
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        mockSquaddieMover.mouseEventHappened = jest.fn()
        mockSquaddieMover.hasCompleted = jest.fn().mockReturnValue(true)

        mockSquaddieUsesActionOnMap = new (<
            new () => BattleSquaddieUsesActionOnMap
        >BattleSquaddieUsesActionOnMap)() as jest.Mocked<BattleSquaddieUsesActionOnMap>
        mockSquaddieUsesActionOnMap.update = jest.fn()
        mockSquaddieUsesActionOnMap.uiControlSettings = jest
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        mockSquaddieUsesActionOnMap.mouseEventHappened = jest.fn()
        mockSquaddieUsesActionOnMap.hasCompleted = jest
            .fn()
            .mockReturnValue(true)

        mockSquaddieUsesActionOnSquaddie = new (<
            new () => BattleSquaddieUsesActionOnSquaddie
        >BattleSquaddieUsesActionOnSquaddie)() as jest.Mocked<BattleSquaddieUsesActionOnSquaddie>
        mockSquaddieUsesActionOnSquaddie.update = jest.fn()
        mockSquaddieUsesActionOnSquaddie.uiControlSettings = jest
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        mockSquaddieUsesActionOnSquaddie.mouseEventHappened = jest.fn()
        mockSquaddieUsesActionOnSquaddie.hasCompleted = jest
            .fn()
            .mockReturnValue(true)

        defaultBattleOrchestrator = new DefaultBattleOrchestrator()
        defaultBattleOrchestrator.update = jest.fn()

        mockMapDisplay = new (<new () => BattleMapDisplay>(
            BattleMapDisplay
        ))() as jest.Mocked<BattleMapDisplay>
        mockMapDisplay.update = jest.fn()
        mockMapDisplay.uiControlSettings = jest
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        mockMapDisplay.mouseEventHappened = jest.fn()
        mockMapDisplay.keyEventHappened = jest.fn()
        mockMapDisplay.hasCompleted = jest.fn().mockReturnValue(true)
        mockMapDisplay.draw = jest.fn()

        mockPhaseController = new (<new () => BattlePhaseController>(
            BattlePhaseController
        ))() as jest.Mocked<BattlePhaseController>
        mockPhaseController.update = jest.fn()
        mockPhaseController.uiControlSettings = jest
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        mockPhaseController.mouseEventHappened = jest.fn()
        mockPhaseController.hasCompleted = jest.fn().mockReturnValue(true)
        mockPhaseController.draw = jest.fn()

        mockPlayerHudController = new (<new () => PlayerHudController>(
            PlayerHudController
        ))() as jest.Mocked<PlayerHudController>
        mockPlayerHudController.recommendStateChanges = jest.fn()
        mockPlayerHudController.reset = jest.fn()
        mockPlayerHudController.uiControlSettings = jest.fn().mockReturnValue(
            new UIControlSettings({
                displayMap: false,
                scrollCamera: false,
            })
        )
        mockPlayerHudController.mouseEventHappened = jest.fn()
        mockPlayerHudController.keyEventHappened = jest.fn()
        mockPlayerHudController.hasCompleted = jest.fn().mockReturnValue(true)
        mockPlayerHudController.recommendStateChanges = jest
            .fn()
            .mockReturnValue({ displayMap: true })

        mockHud = mocks.battleSquaddieSelectedHUD()
        mockHud.selectSquaddieAndDrawWindow = jest.fn()
    }

    beforeEach(() => {
        nullState = GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({
                    battleSquaddieSelectedHUD: mockHud,
                }),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: new MissionMap({
                        terrainTileMap: new TerrainTileMap({
                            movementCost: ["1 1 "],
                        }),
                    }),
                    missionCompletionStatus: {
                        default: {
                            isComplete: undefined,
                            conditions: {},
                        },
                    },
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            }),
            repository: undefined,
        })
        setupMocks()
    })

    const createOrchestrator: (
        overrides: Partial<OrchestratorTestOptions>
    ) => BattleOrchestrator = (
        overrides: Partial<OrchestratorTestOptions> = {}
    ) => {
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
                playerConfirm: mockPlayerConfirm,
                mapDisplay: mockMapDisplay,
                phaseController: mockPhaseController,
                playerHudController: mockPlayerHudController,
                playerActionConfirm: mockPlayerConfirm,
            },
            ...overrides,
        })

        if (overrides.initialMode) {
            orchestrator.mode = overrides.initialMode
        }

        return orchestrator
    }

    it("change to cutscene player mode", () => {
        orchestrator = createOrchestrator({})
        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.CUTSCENE_PLAYER
        )
        expect(orchestrator.getCurrentComponent()).toBe(
            mockBattleCutscenePlayer
        )
    })

    it("plays a cutscene at the start of the turn", () => {
        orchestrator = createOrchestrator({})
        const turn0StateCutsceneId = "starting"
        const mockCutscene = CutsceneService.new({})
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                [DEFAULT_VICTORY_CUTSCENE_ID]: mockCutscene,
                [DEFAULT_DEFEAT_CUTSCENE_ID]: mockCutscene,
                [turn0StateCutsceneId]: mockCutscene,
            },
        })

        const turn0CutsceneTrigger: MissionStartOfPhaseCutsceneTrigger = {
            cutsceneId: "starting",
            triggeringEvent: TriggeringEvent.START_OF_TURN,
            systemReactedToTrigger: false,
            turn: 0,
        }

        const turn0State: GameEngineState = GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: new MissionMap({
                        terrainTileMap: new TerrainTileMap({
                            movementCost: ["1 1 "],
                        }),
                    }),
                    cutsceneCollection,
                    objectives: [],
                    cutsceneTriggers: [turn0CutsceneTrigger],
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            }),
            repository: undefined,
        })

        orchestrator.update(turn0State, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.CUTSCENE_PLAYER
        )
        expect(orchestrator.getCurrentComponent()).toBe(
            mockBattleCutscenePlayer
        )
        expect(mockBattleCutscenePlayer.currentCutsceneId).toBe(
            turn0StateCutsceneId
        )
    })

    it("recommends cutscene player if there is a cutscene to play at the start", () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                starting: CutsceneService.new({}),
            },
        })

        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.PHASE_CONTROLLER,
        })

        const stateWithCutscene: GameEngineState = GameEngineStateService.new({
            resourceHandler: nullState.resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
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
                    },
                }),
            }),
            repository: ObjectRepositoryService.new(),
        })

        orchestrator.update(stateWithCutscene, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.CUTSCENE_PLAYER
        )
        expect(orchestrator.cutscenePlayer.currentCutsceneId).toBe("starting")
    })

    it("recommends cutscene player until the cutscene player queue is empty", () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                cutscene0: CutsceneService.new({}),
                cutscene1: CutsceneService.new({}),
                cutscene2: CutsceneService.new({}),
            },
        })

        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.PHASE_CONTROLLER,
        })

        const stateWithCutscene: GameEngineState = GameEngineStateService.new({
            resourceHandler: nullState.resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    cutsceneCollection,
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
                cutsceneIdsToPlay: ["cutscene0", "cutscene1"],
            }),
            repository: ObjectRepositoryService.new(),
        })

        const cutsceneSpy: jest.SpyInstance = jest.spyOn(
            orchestrator.cutscenePlayer,
            "startCutscene"
        )

        orchestrator.update(stateWithCutscene, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.CUTSCENE_PLAYER
        )
        expect(cutsceneSpy).toBeCalledTimes(1)
        expect(cutsceneSpy).toBeCalledWith("cutscene0", stateWithCutscene)
        expect(
            stateWithCutscene.battleOrchestratorState.cutsceneIdsToPlay
        ).toEqual(["cutscene1"])

        orchestrator.update(stateWithCutscene, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.CUTSCENE_PLAYER
        )
        expect(cutsceneSpy).toBeCalledTimes(2)
        expect(cutsceneSpy).toBeCalledWith("cutscene1", stateWithCutscene)
        expect(
            stateWithCutscene.battleOrchestratorState.cutsceneIdsToPlay
        ).toHaveLength(0)

        orchestrator.update(stateWithCutscene, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).not.toBe(
            BattleOrchestratorMode.CUTSCENE_PLAYER
        )
        expect(cutsceneSpy).toBeCalledTimes(2)
    })

    it("skips the introductory cutscene if the game is loaded", () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                starting: CutsceneService.new({}),
            },
        })

        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.UNKNOWN,
        })

        const stateWithCutscene: GameEngineState = GameEngineStateService.new({
            resourceHandler: nullState.resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
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
                    },
                }),
            }),
            repository: ObjectRepositoryService.new(),
        })
        LoadSaveStateService.applicationStartsLoad(
            stateWithCutscene.fileState.loadSaveState
        )

        orchestrator.update(stateWithCutscene, mockedP5GraphicsContext)
        expect(orchestrator.cutscenePlayer.currentCutsceneId).toBeUndefined()
    })

    it("will transition from cutscene playing to phase controller mode", () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
        })
        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.PHASE_CONTROLLER
        )
        expect(orchestrator.getCurrentComponent()).toBe(mockPhaseController)
        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(mockPhaseController.update).toBeCalledTimes(1)
        expect(mockPhaseController.hasCompleted).toBeCalledTimes(1)
    })

    it("will transition from phase controller to player HUD", () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.PHASE_CONTROLLER,
        })

        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        )
        expect(orchestrator.getCurrentComponent()).toBe(mockPlayerHudController)
        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(mockPlayerHudController.recommendStateChanges).toBeCalledTimes(1)
        expect(mockPlayerHudController.reset).toBeCalledTimes(1)
    })

    it("will move from squaddie selector mode to player HUD controller", () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR,
        })
        nullState.repository = ObjectRepositoryService.new()
        CreateNewSquaddieAndAddToRepository({
            name: "new static squaddie",
            templateId: "new static squaddie",
            battleId: "new dynamic squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: nullState.repository,
        })

        nullState.battleOrchestratorState.battleState.actionsThisRound =
            ActionsThisRoundService.new({
                battleSquaddieId: "new dynamic squaddie",
                startingLocation: { q: 0, r: 0 },
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            battleSquaddieId: "new dynamic squaddie",
                            actionPointCost: 2,
                            actionEffects: [
                                DecidedActionMovementEffectService.new({
                                    destination: { q: 1, r: 2 },
                                    template:
                                        ActionEffectMovementTemplateService.new(
                                            {}
                                        ),
                                }),
                            ],
                        }),
                    }),
                ],
            })

        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        )
        expect(orchestrator.getCurrentComponent()).toBe(mockPlayerHudController)
        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(mockPlayerHudController.recommendStateChanges).toBeCalledTimes(1)
        expect(mockPlayerHudController.reset).toBeCalledTimes(1)
    })

    it("will move from squaddie move mode to phase controller mode", () => {
        jest.spyOn(MissionObjectiveHelper, "shouldBeComplete").mockReturnValue(
            false
        )

        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.SQUADDIE_MOVER,
        })
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.SQUADDIE_MOVER
        )
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieMover)
        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.PHASE_CONTROLLER
        )
        expect(orchestrator.getCurrentComponent()).toBe(mockPhaseController)
        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(mockPhaseController.update).toBeCalledTimes(1)
        expect(mockPhaseController.hasCompleted).toBeCalledTimes(1)
    })

    it("Start in the initialized mode as startup", () => {
        orchestrator = createOrchestrator({})

        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.INITIALIZED
        )
        expect(orchestrator.getCurrentComponent()).toStrictEqual(
            mockInitializeBattle
        )

        const initializeBattleSpy = jest.spyOn(mockInitializeBattle, "update")
        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(initializeBattleSpy).toBeCalled()
    })

    describe("mode switching", () => {
        const loadAndExpect = (options: {
            mode: BattleOrchestratorMode
            orchestratorComponent: BattleOrchestratorComponent
        }) => {
            orchestrator = createOrchestrator({
                initialMode: options.mode,
            })
            expect(orchestrator.getCurrentMode()).toBe(options.mode)
            expect(orchestrator.getCurrentComponent()).toBe(
                options.orchestratorComponent
            )
            orchestrator.update(nullState, mockedP5GraphicsContext)
            expect(options.orchestratorComponent.update).toBeCalled()
        }

        describe("knows which component to load based on the state", () => {
            for (const modeStr in BattleOrchestratorMode) {
                if (
                    modeStr === BattleOrchestratorMode.UNKNOWN ||
                    modeStr === BattleOrchestratorMode.INITIALIZED ||
                    modeStr === BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                ) {
                    continue
                }

                const mode: BattleOrchestratorMode = modeStr as Exclude<
                    BattleOrchestratorMode,
                    | BattleOrchestratorMode.UNKNOWN
                    | BattleOrchestratorMode.INITIALIZED
                    | BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                >
                it(`using the ${mode} mode will use the expected component`, () => {
                    const tests: {
                        [mode in Exclude<
                            BattleOrchestratorMode,
                            | BattleOrchestratorMode.UNKNOWN
                            | BattleOrchestratorMode.INITIALIZED
                            | BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                        >]: BattleOrchestratorComponent
                    } = {
                        [BattleOrchestratorMode.CUTSCENE_PLAYER]:
                            mockBattleCutscenePlayer,
                        [BattleOrchestratorMode.PHASE_CONTROLLER]:
                            mockPhaseController,
                        [BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR]:
                            mockPlayerSquaddieSelector,
                        [BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET]:
                            mockPlayerSquaddieTarget,
                        [BattleOrchestratorMode.PLAYER_ACTION_CONFIRM]:
                            mockPlayerConfirm,
                        [BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR]:
                            mockComputerSquaddieSelector,
                        [BattleOrchestratorMode.SQUADDIE_MOVER]:
                            mockSquaddieMover,
                        [BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP]:
                            mockSquaddieUsesActionOnMap,
                        [BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE]:
                            mockSquaddieUsesActionOnSquaddie,
                    }

                    loadAndExpect({
                        mode,
                        orchestratorComponent: tests[mode],
                    })
                })
            }
        })
    })

    it("will use the recommended next mode to switch", () => {
        const battleCutscenePlayerRecommendsAMode = new (<
            new () => BattleCutscenePlayer
        >BattleCutscenePlayer)() as jest.Mocked<BattleCutscenePlayer>
        battleCutscenePlayerRecommendsAMode.update = jest.fn()
        battleCutscenePlayerRecommendsAMode.uiControlSettings = jest
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        battleCutscenePlayerRecommendsAMode.mouseEventHappened = jest.fn()
        battleCutscenePlayerRecommendsAMode.hasCompleted = jest
            .fn()
            .mockReturnValue(true)
        battleCutscenePlayerRecommendsAMode.recommendStateChanges = jest
            .fn()
            .mockReturnValue({
                nextMode: BattleOrchestratorMode.SQUADDIE_MOVER,
            })

        const orchestratorJumpsToSquaddieMover = createOrchestrator({
            initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
            cutscenePlayer: battleCutscenePlayerRecommendsAMode,
        })

        expect(orchestratorJumpsToSquaddieMover.getCurrentMode()).toBe(
            BattleOrchestratorMode.CUTSCENE_PLAYER
        )
        orchestratorJumpsToSquaddieMover.update(
            nullState,
            mockedP5GraphicsContext
        )
        expect(orchestratorJumpsToSquaddieMover.getCurrentMode()).toBe(
            BattleOrchestratorMode.SQUADDIE_MOVER
        )
    })

    describe("End of Battle triggers cutscenes and resets", () => {
        let mockCutscene: Cutscene
        let cutsceneCollection: MissionCutsceneCollection
        let cutscenePlayer: BattleCutscenePlayer
        let missionObjectiveCompleteCheck: jest.SpyInstance

        let victoryState: GameEngineState
        let defeatState: GameEngineState
        let victoryAndDefeatState: GameEngineState

        beforeEach(() => {
            mockCutscene = CutsceneService.new({})
            cutsceneCollection = MissionCutsceneCollectionHelper.new({
                cutsceneById: {
                    [DEFAULT_VICTORY_CUTSCENE_ID]: mockCutscene,
                    [DEFAULT_DEFEAT_CUTSCENE_ID]: mockCutscene,
                },
            })
            cutscenePlayer = new BattleCutscenePlayer()

            victoryState = GameEngineStateService.new({
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({
                        battleSquaddieSelectedHUD: mockHud,
                    }),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap: new MissionMap({
                            terrainTileMap: new TerrainTileMap({
                                movementCost: ["1 1 "],
                            }),
                        }),
                        objectives: [
                            MissionObjectiveHelper.validateMissionObjective({
                                id: "test",
                                reward: {
                                    rewardType: MissionRewardType.VICTORY,
                                },
                                numberOfRequiredConditionsToComplete: 1,
                                hasGivenReward: false,
                                conditions: [
                                    {
                                        id: "test",
                                        type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                                    },
                                ],
                            }),
                        ],
                        cutsceneCollection,
                        cutsceneTriggers: [
                            {
                                cutsceneId: DEFAULT_VICTORY_CUTSCENE_ID,
                                triggeringEvent:
                                    TriggeringEvent.MISSION_VICTORY,
                                systemReactedToTrigger: false,
                            },
                        ],
                        battleCompletionStatus:
                            BattleCompletionStatus.IN_PROGRESS,
                        battlePhaseState: {
                            turnCount: 0,
                            currentAffiliation: BattlePhase.UNKNOWN,
                        },
                    }),
                }),
                repository: undefined,
            })

            defeatState = GameEngineStateService.new({
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({
                        battleSquaddieSelectedHUD: mockHud,
                    }),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap: new MissionMap({
                            terrainTileMap: new TerrainTileMap({
                                movementCost: ["1 1 "],
                            }),
                        }),
                        objectives: [
                            MissionObjectiveHelper.validateMissionObjective({
                                id: "test",
                                reward: {
                                    rewardType: MissionRewardType.DEFEAT,
                                },
                                numberOfRequiredConditionsToComplete: 1,
                                hasGivenReward: false,
                                conditions: [
                                    {
                                        id: "test",
                                        type: MissionConditionType.DEFEAT_ALL_PLAYERS,
                                    },
                                ],
                            }),
                        ],
                        cutsceneCollection,
                        cutsceneTriggers: [
                            {
                                cutsceneId: DEFAULT_DEFEAT_CUTSCENE_ID,
                                triggeringEvent: TriggeringEvent.MISSION_DEFEAT,
                                systemReactedToTrigger: false,
                            },
                        ],
                        battleCompletionStatus:
                            BattleCompletionStatus.IN_PROGRESS,
                        battlePhaseState: {
                            turnCount: 0,
                            currentAffiliation: BattlePhase.UNKNOWN,
                        },
                    }),
                }),
                repository: undefined,
            })

            victoryAndDefeatState = GameEngineStateService.new({
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({
                        battleSquaddieSelectedHUD: mockHud,
                    }),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap: new MissionMap({
                            terrainTileMap: new TerrainTileMap({
                                movementCost: ["1 1 "],
                            }),
                        }),
                        objectives: [
                            MissionObjectiveHelper.validateMissionObjective({
                                id: "test",
                                reward: {
                                    rewardType: MissionRewardType.VICTORY,
                                },
                                numberOfRequiredConditionsToComplete: 1,
                                hasGivenReward: false,
                                conditions: [
                                    {
                                        id: "test",
                                        type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                                    },
                                ],
                            }),
                            MissionObjectiveHelper.validateMissionObjective({
                                id: "test1",
                                reward: {
                                    rewardType: MissionRewardType.DEFEAT,
                                },
                                numberOfRequiredConditionsToComplete: 1,
                                hasGivenReward: false,
                                conditions: [
                                    {
                                        id: "test",
                                        type: MissionConditionType.DEFEAT_ALL_PLAYERS,
                                    },
                                ],
                            }),
                        ],
                        cutsceneCollection,
                        cutsceneTriggers: [
                            {
                                cutsceneId: DEFAULT_VICTORY_CUTSCENE_ID,
                                triggeringEvent:
                                    TriggeringEvent.MISSION_VICTORY,
                                systemReactedToTrigger: false,
                            },
                            {
                                cutsceneId: DEFAULT_DEFEAT_CUTSCENE_ID,
                                triggeringEvent: TriggeringEvent.MISSION_DEFEAT,
                                systemReactedToTrigger: false,
                            },
                        ],
                        battleCompletionStatus:
                            BattleCompletionStatus.IN_PROGRESS,
                    }),
                }),
                repository: undefined,
            })

            orchestrator = createOrchestrator({
                initialMode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
                cutscenePlayer,
            })

            missionObjectiveCompleteCheck = jest
                .spyOn(MissionObjectiveHelper, "shouldBeComplete")
                .mockReturnValue(true)
        })

        it("will check for victory conditions once the squaddie finishes moving", () => {
            expect(
                victoryState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.IN_PROGRESS)

            orchestrator.update(victoryState, mockedP5GraphicsContext)
            expect(cutscenePlayer.hasCompleted(victoryState)).toBeTruthy()

            expect(missionObjectiveCompleteCheck).toBeCalled()

            expect(cutscenePlayer.currentCutscene).toBe(mockCutscene)
            expect(
                victoryState.battleOrchestratorState.battleState
                    .cutsceneTriggers[0].systemReactedToTrigger
            ).toBeTruthy()
            expect(orchestrator.getCurrentMode()).toBe(
                BattleOrchestratorMode.CUTSCENE_PLAYER
            )
            expect(orchestrator.getCurrentComponent()).toBe(cutscenePlayer)

            orchestrator.update(victoryState, mockedP5GraphicsContext)
            expect(cutscenePlayer.hasCompleted(victoryState)).toBeTruthy()
            expect(
                victoryState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.VICTORY)
        })

        it("will mark the battle as complete once the victory cutscene ends", () => {
            orchestrator.update(victoryState, mockedP5GraphicsContext)
            orchestrator.update(victoryState, mockedP5GraphicsContext)
            orchestrator.update(victoryState, mockedP5GraphicsContext)
            expect(orchestrator.hasCompleted(victoryState)).toBeTruthy()
            expect(
                orchestrator.recommendStateChanges(victoryState)
            ).toStrictEqual({
                nextMode: GameModeEnum.TITLE_SCREEN,
            })
        })

        it("after resetting it will not immediately trigger victory and complete", () => {
            orchestrator.update(victoryState, mockedP5GraphicsContext)
            orchestrator.update(victoryState, mockedP5GraphicsContext)
            orchestrator.update(victoryState, mockedP5GraphicsContext)
            expect(orchestrator.hasCompleted(victoryState)).toBeTruthy()
            orchestrator.reset(victoryState)
            expect(orchestrator.hasCompleted(victoryState)).toBeFalsy()
        })

        it("will check for defeat conditions once the squaddie finishes moving", () => {
            expect(
                defeatState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.IN_PROGRESS)

            orchestrator.update(defeatState, mockedP5GraphicsContext)
            expect(cutscenePlayer.hasCompleted(defeatState)).toBeTruthy()

            expect(missionObjectiveCompleteCheck).toBeCalled()

            expect(cutscenePlayer.currentCutscene).toBe(mockCutscene)
            expect(
                defeatState.battleOrchestratorState.battleState
                    .cutsceneTriggers[0].systemReactedToTrigger
            ).toBeTruthy()
            expect(orchestrator.getCurrentMode()).toBe(
                BattleOrchestratorMode.CUTSCENE_PLAYER
            )
            expect(orchestrator.getCurrentComponent()).toBe(cutscenePlayer)

            orchestrator.update(defeatState, mockedP5GraphicsContext)
            expect(cutscenePlayer.hasCompleted(defeatState)).toBeTruthy()
            expect(
                defeatState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.DEFEAT)
        })

        it("will mark the battle as complete once the defeat cutscene ends", () => {
            orchestrator.update(defeatState, mockedP5GraphicsContext)
            orchestrator.update(defeatState, mockedP5GraphicsContext)
            orchestrator.update(defeatState, mockedP5GraphicsContext)
            expect(orchestrator.hasCompleted(defeatState)).toBeTruthy()
            expect(
                orchestrator.recommendStateChanges(defeatState)
            ).toStrictEqual({
                nextMode: GameModeEnum.TITLE_SCREEN,
            })
        })

        it("after resetting it will not immediately trigger defeat and complete", () => {
            orchestrator.update(defeatState, mockedP5GraphicsContext)
            orchestrator.update(defeatState, mockedP5GraphicsContext)
            orchestrator.update(defeatState, mockedP5GraphicsContext)
            expect(orchestrator.hasCompleted(defeatState)).toBeTruthy()
            orchestrator.reset(defeatState)
            expect(orchestrator.hasCompleted(defeatState)).toBeFalsy()
        })

        it("if you trigger victory and defeat, defeat takes precedence", () => {
            expect(
                victoryAndDefeatState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.IN_PROGRESS)

            orchestrator.update(victoryAndDefeatState, mockedP5GraphicsContext)
            expect(
                cutscenePlayer.hasCompleted(victoryAndDefeatState)
            ).toBeTruthy()

            expect(missionObjectiveCompleteCheck).toBeCalled()

            expect(cutscenePlayer.currentCutscene).toBe(mockCutscene)
            expect(
                victoryAndDefeatState.battleOrchestratorState.battleState
                    .cutsceneTriggers[1].systemReactedToTrigger
            ).toBeTruthy()
            expect(orchestrator.getCurrentMode()).toBe(
                BattleOrchestratorMode.CUTSCENE_PLAYER
            )
            expect(orchestrator.getCurrentComponent()).toBe(cutscenePlayer)

            orchestrator.update(victoryAndDefeatState, mockedP5GraphicsContext)
            expect(
                cutscenePlayer.hasCompleted(victoryAndDefeatState)
            ).toBeTruthy()
            expect(
                victoryAndDefeatState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.DEFEAT)
        })
    })

    it("will update its UI Control Settings after updating", () => {
        const cutscenePlayerRecommendsAMode = new (<
            new () => BattleCutscenePlayer
        >BattleCutscenePlayer)() as jest.Mocked<BattleCutscenePlayer>
        cutscenePlayerRecommendsAMode.update = jest.fn()
        cutscenePlayerRecommendsAMode.uiControlSettings = jest
            .fn()
            .mockReturnValue(
                new UIControlSettings({
                    displayMap: true,
                })
            )
        cutscenePlayerRecommendsAMode.mouseEventHappened = jest.fn()
        cutscenePlayerRecommendsAMode.hasCompleted = jest.fn()

        const orchestrator1 = createOrchestrator({
            initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
            cutscenePlayer: cutscenePlayerRecommendsAMode,
        })

        expect(orchestrator1.uiControlSettings.displayBattleMap).toBeUndefined()
        orchestrator1.update(nullState, mockedP5GraphicsContext)
        expect(orchestrator1.uiControlSettings.displayBattleMap).toBe(true)
    })

    it("will move from squaddie map action mode to phase controller mode", () => {
        jest.spyOn(MissionObjectiveHelper, "shouldBeComplete").mockReturnValue(
            false
        )

        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
        })
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP
        )
        expect(orchestrator.getCurrentComponent()).toBe(
            mockSquaddieUsesActionOnMap
        )
        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(mockSquaddieUsesActionOnMap.update).toBeCalledTimes(1)
        expect(mockSquaddieUsesActionOnMap.hasCompleted).toBeCalledTimes(1)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.PHASE_CONTROLLER
        )
        expect(orchestrator.getCurrentComponent()).toBe(mockPhaseController)
    })

    describe("mouse events", () => {
        it("will call mouse events in battle map display during squaddie selection mode", () => {
            const orchestrator = createOrchestrator({
                playerSquaddieSelector: mockPlayerSquaddieSelector,
                initialMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR,
            })
            orchestrator.uiControlSettings.update(
                new UIControlSettings({
                    scrollCamera: true,
                })
            )

            expectMouseEventsWillGoToMapDisplay(
                orchestrator,
                mockPlayerSquaddieSelector
            )
        })

        const expectMouseEventsWillGoToMapDisplay = (
            squaddieSelectorOrchestratorShouldDisplayMap: BattleOrchestrator,
            component: BattleOrchestratorComponent
        ) => {
            const stateWantsToDisplayTheMap: GameEngineState =
                GameEngineStateService.new({
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                            }),
                        }
                    ),
                    repository: undefined,
                })

            squaddieSelectorOrchestratorShouldDisplayMap.mouseMoved(
                stateWantsToDisplayTheMap,
                0,
                0
            )
            expect(component.mouseEventHappened).toBeCalledTimes(1)
            expect(mockMapDisplay.mouseEventHappened).toBeCalledTimes(1)

            squaddieSelectorOrchestratorShouldDisplayMap.mouseClicked(
                stateWantsToDisplayTheMap,
                MouseButton.ACCEPT,
                0,
                0
            )
            expect(component.mouseEventHappened).toBeCalledTimes(2)
            expect(mockMapDisplay.mouseEventHappened).toBeCalledTimes(2)
        }
    })

    describe("keyboard events", () => {
        it("will call key pressed events in battle map display during squaddie selection mode", () => {
            const orchestrator = createOrchestrator({
                playerSquaddieSelector: mockPlayerSquaddieSelector,
                initialMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR,
            })
            orchestrator.uiControlSettings.update(
                new UIControlSettings({
                    scrollCamera: true,
                    displayMap: true,
                })
            )

            expectKeyEventsWillGoToMapDisplay(
                orchestrator,
                mockPlayerSquaddieSelector
            )
        })

        it("will update the time elapsed if the mode recommends it", () => {
            const needsTwoUpdatesToFinishLoading = new (<
                new () => BattleCutscenePlayer
            >BattleCutscenePlayer)() as jest.Mocked<BattleCutscenePlayer>
            needsTwoUpdatesToFinishLoading.uiControlSettings = jest
                .fn()
                .mockReturnValue(new UIControlSettings({ pauseTimer: true }))
            needsTwoUpdatesToFinishLoading.hasCompleted = jest
                .fn()
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true)
            needsTwoUpdatesToFinishLoading.update = jest.fn()
            needsTwoUpdatesToFinishLoading.recommendStateChanges = jest
                .fn()
                .mockReturnValueOnce({
                    nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR,
                })

            mockPlayerSquaddieSelector.uiControlSettings = jest
                .fn()
                .mockReturnValue(new UIControlSettings({ pauseTimer: false }))

            const state: GameEngineState = GameEngineStateService.new({
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                    }),
                    battleHUD: BattleHUDService.new({
                        battleSquaddieSelectedHUD:
                            new BattleSquaddieSelectedHUD(),
                    }),
                }),
                repository: undefined,
            })

            orchestrator = createOrchestrator({
                playerSquaddieSelector: mockPlayerSquaddieSelector,
                initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
            })
            expect(
                state.battleOrchestratorState.battleState.missionStatistics
                    .timeElapsedInMilliseconds
            ).toBeUndefined()

            orchestrator.update(state, mockedP5GraphicsContext)

            expect(
                state.battleOrchestratorState.battleState.missionStatistics
                    .timeElapsedInMilliseconds
            ).toBe(0)
            orchestrator.update(state, mockedP5GraphicsContext)
            expect(
                state.battleOrchestratorState.battleState.missionStatistics
                    .timeElapsedInMilliseconds
            ).toBe(0)

            expect(orchestrator.getCurrentMode()).toBe(
                BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
            )
            expect(orchestrator.getCurrentComponent()).toBe(
                mockPlayerHudController
            )
            jest.spyOn(Date, "now").mockReturnValue(0)
            orchestrator.update(state, mockedP5GraphicsContext)
            expect(
                state.battleOrchestratorState.battleState.missionStatistics
                    .timeElapsedInMilliseconds
            ).toBe(0)

            jest.spyOn(Date, "now").mockReturnValue(100)
            orchestrator.update(state, mockedP5GraphicsContext)
            expect(
                state.battleOrchestratorState.battleState.missionStatistics
                    .timeElapsedInMilliseconds
            ).toBeGreaterThan(0)
        })
        const expectKeyEventsWillGoToMapDisplay = (
            squaddieSelectorOrchestratorShouldDisplayMap: BattleOrchestrator,
            component: BattleOrchestratorComponent
        ) => {
            const stateWantsToDisplayTheMap: GameEngineState =
                GameEngineStateService.new({
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                            }),
                        }
                    ),
                    repository: undefined,
                })

            squaddieSelectorOrchestratorShouldDisplayMap.keyPressed(
                stateWantsToDisplayTheMap,
                0
            )
            expect(component.keyEventHappened).toBeCalledTimes(1)
            expect(mockMapDisplay.keyEventHappened).toBeCalledTimes(1)

            squaddieSelectorOrchestratorShouldDisplayMap.keyPressed(
                stateWantsToDisplayTheMap,
                0
            )
            expect(component.keyEventHappened).toBeCalledTimes(2)
            expect(mockMapDisplay.keyEventHappened).toBeCalledTimes(2)
        }
    })

    describe("Loading saved game", () => {
        let gameEngineState: GameEngineState
        let orchestrator: BattleOrchestrator
        beforeEach(() => {
            orchestrator = createOrchestrator({
                initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
            })

            gameEngineState = GameEngineStateService.new({
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                    }),
                }),
                repository: undefined,
            })
            LoadSaveStateService.userRequestsLoad(
                gameEngineState.fileState.loadSaveState
            )
        })

        it("sets the completed flag if the user wants to load progress", () => {
            orchestrator.update(gameEngineState, mockedP5GraphicsContext)
            expect(orchestrator.hasCompleted(gameEngineState)).toBeTruthy()

            const changes = orchestrator.recommendStateChanges(gameEngineState)
            expect(changes.nextMode).toBe(GameModeEnum.LOADING_BATTLE)
        })

        it("does not set the completed flag if loading has started", () => {
            LoadSaveStateService.userRequestsLoad(
                gameEngineState.fileState.loadSaveState
            )
            LoadSaveStateService.applicationStartsLoad(
                gameEngineState.fileState.loadSaveState
            )

            orchestrator.update(gameEngineState, mockedP5GraphicsContext)
            expect(orchestrator.hasCompleted(gameEngineState)).toBeFalsy()
        })

        it("does not set the completed flag if there is an error while loading", () => {
            LoadSaveStateService.userRequestsLoad(
                gameEngineState.fileState.loadSaveState
            )
            LoadSaveStateService.applicationErrorsWhileLoading(
                gameEngineState.fileState.loadSaveState
            )

            orchestrator.update(gameEngineState, mockedP5GraphicsContext)
            expect(orchestrator.hasCompleted(gameEngineState)).toBeFalsy()
        })
    })
})
