import {
    BattleOrchestrator,
    BattleOrchestratorMode,
} from "./battleOrchestrator"
import { BattleOrchestratorStateService } from "./battleOrchestratorState"
import { BattleCutscenePlayer } from "../orchestratorComponents/battleCutscenePlayer"
import { BattlePlayerSquaddieSelector } from "../orchestratorComponents/battlePlayerSquaddieSelector"
import { BattleSquaddieMover } from "../orchestratorComponents/battleSquaddieMover"
import { BattleMapDisplay } from "../orchestratorComponents/battleMapDisplay"
import {
    BattlePhaseController,
    BattlePhaseStateService,
} from "../orchestratorComponents/battlePhaseController"
import { BattleSquaddieUsesActionOnMap } from "../orchestratorComponents/battleSquaddieUsesActionOnMap"
import { BattlePlayerSquaddieTarget } from "../orchestratorComponents/battlePlayerSquaddieTarget"
import { ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleOrchestratorComponent } from "./battleOrchestratorComponent"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { BattleSquaddieUsesActionOnSquaddie } from "../orchestratorComponents/battleSquaddieUsesActionOnSquaddie"
import {
    MockedP5GraphicsBuffer,
    mockResourceHandler,
} from "../../utils/test/mocks"
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
import { MissionMapService } from "../../missionMap/missionMap"
import { MissionStartOfPhaseCutsceneTrigger } from "../cutscene/missionStartOfPhaseCutsceneTrigger"
import { InitializeBattle } from "./initializeBattle"
import { BattleStateService } from "./battleState"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleHUDService } from "../hud/battleHUD/battleHUD"
import { PlayerHudController } from "../orchestratorComponents/playerHudController"
import { BattlePlayerActionConfirm } from "../orchestratorComponents/battlePlayerActionConfirm"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { CutsceneQueueService } from "../cutscene/cutsceneIdQueue"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { BattleActionService } from "../history/battleAction/battleAction"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { PlayerDataMessageListener } from "../../dataLoader/playerData/playerDataMessageListener"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import { SquaddieSelectorPanelService } from "../hud/playerActionPanel/squaddieSelectorPanel/squaddieSelectorPanel"
import { SquaddieTemplateService } from "../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../squaddie/id"
import { SquaddieResourceService } from "../../squaddie/resource"
import { BattleSquaddieService } from "../battleSquaddie"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"

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

    let nullState: GameEngineState
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    function setupMocks() {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()

        mockInitializeBattle = new InitializeBattle()
        mockInitializeBattle.reset = vi.fn()
        mockInitializeBattle.update = vi.fn()

        mockBattleCutscenePlayer = new BattleCutscenePlayer()
        mockBattleCutscenePlayer.update = vi.fn()
        mockBattleCutscenePlayer.uiControlSettings = vi
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        mockBattleCutscenePlayer.mouseEventHappened = vi.fn()
        mockBattleCutscenePlayer.hasCompleted = vi.fn().mockReturnValue(true)

        mockPlayerSquaddieSelector = new BattlePlayerSquaddieSelector()
        mockPlayerSquaddieSelector.update = vi.fn()
        mockPlayerSquaddieSelector.uiControlSettings = vi.fn().mockReturnValue(
            new UIControlSettings({
                displayMap: true,
                displayPlayerHUD: true,
                scrollCamera: true,
            })
        )
        mockPlayerSquaddieSelector.mouseEventHappened = vi.fn()
        mockPlayerSquaddieSelector.keyEventHappened = vi.fn()
        mockPlayerSquaddieSelector.hasCompleted = vi.fn().mockReturnValue(true)
        mockPlayerSquaddieSelector.recommendStateChanges = vi
            .fn()
            .mockReturnValue({ displayMap: true })

        mockPlayerSquaddieTarget = new BattlePlayerSquaddieTarget()
        mockPlayerSquaddieTarget.update = vi.fn()
        mockPlayerSquaddieTarget.uiControlSettings = vi.fn().mockReturnValue(
            new UIControlSettings({
                displayMap: true,
                displayPlayerHUD: true,
                scrollCamera: true,
            })
        )
        mockPlayerSquaddieTarget.mouseEventHappened = vi.fn()
        mockPlayerSquaddieTarget.hasCompleted = vi.fn().mockReturnValue(true)
        mockPlayerSquaddieTarget.recommendStateChanges = vi
            .fn()
            .mockReturnValue({ displayMap: true })

        mockPlayerConfirm = new BattlePlayerActionConfirm()
        mockPlayerConfirm.update = vi.fn()
        mockPlayerConfirm.uiControlSettings = vi.fn().mockReturnValue(
            new UIControlSettings({
                displayMap: true,
                displayPlayerHUD: true,
                scrollCamera: true,
            })
        )
        mockPlayerConfirm.mouseEventHappened = vi.fn()
        mockPlayerConfirm.hasCompleted = vi.fn().mockReturnValue(true)
        mockPlayerConfirm.recommendStateChanges = vi
            .fn()
            .mockReturnValue({ displayMap: true })

        mockComputerSquaddieSelector = new BattleComputerSquaddieSelector()
        mockComputerSquaddieSelector.update = vi.fn()
        mockComputerSquaddieSelector.uiControlSettings = vi
            .fn()
            .mockReturnValue(
                new UIControlSettings({
                    displayMap: true,
                    displayPlayerHUD: false,
                    scrollCamera: false,
                })
            )
        mockComputerSquaddieSelector.mouseEventHappened = vi.fn()
        mockComputerSquaddieSelector.keyEventHappened = vi.fn()
        mockComputerSquaddieSelector.hasCompleted = vi
            .fn()
            .mockReturnValue(true)
        mockComputerSquaddieSelector.recommendStateChanges = vi
            .fn()
            .mockReturnValue({ displayMap: true })

        mockSquaddieMover = new BattleSquaddieMover()
        mockSquaddieMover.update = vi.fn()
        mockSquaddieMover.reset = vi.fn()
        mockSquaddieMover.uiControlSettings = vi
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        mockSquaddieMover.mouseEventHappened = vi.fn()
        mockSquaddieMover.hasCompleted = vi.fn().mockReturnValue(true)

        mockSquaddieUsesActionOnMap = new BattleSquaddieUsesActionOnMap()
        mockSquaddieUsesActionOnMap.update = vi.fn()
        mockSquaddieUsesActionOnMap.uiControlSettings = vi
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        mockSquaddieUsesActionOnMap.mouseEventHappened = vi.fn()
        mockSquaddieUsesActionOnMap.hasCompleted = vi.fn().mockReturnValue(true)

        mockSquaddieUsesActionOnSquaddie =
            new BattleSquaddieUsesActionOnSquaddie()
        mockSquaddieUsesActionOnSquaddie.update = vi.fn()
        mockSquaddieUsesActionOnSquaddie.uiControlSettings = vi
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        mockSquaddieUsesActionOnSquaddie.mouseEventHappened = vi.fn()
        mockSquaddieUsesActionOnSquaddie.hasCompleted = vi
            .fn()
            .mockReturnValue(true)

        defaultBattleOrchestrator = new DefaultBattleOrchestrator()
        defaultBattleOrchestrator.update = vi.fn()

        mockMapDisplay = new BattleMapDisplay()
        mockMapDisplay.update = vi.fn()
        mockMapDisplay.uiControlSettings = vi
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        mockMapDisplay.mouseEventHappened = vi.fn()
        mockMapDisplay.keyEventHappened = vi.fn()
        mockMapDisplay.hasCompleted = vi.fn().mockReturnValue(true)
        mockMapDisplay.draw = vi.fn()

        mockPhaseController = new BattlePhaseController()
        mockPhaseController.update = vi.fn()
        mockPhaseController.uiControlSettings = vi
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        mockPhaseController.mouseEventHappened = vi.fn()
        mockPhaseController.hasCompleted = vi.fn().mockReturnValue(true)
        mockPhaseController.draw = vi.fn()

        mockPlayerHudController = new PlayerHudController()
        mockPlayerHudController.recommendStateChanges = vi.fn()
        mockPlayerHudController.reset = vi.fn()
        mockPlayerHudController.update = vi.fn()
        mockPlayerHudController.uiControlSettings = vi.fn().mockReturnValue(
            new UIControlSettings({
                displayMap: false,
                scrollCamera: false,
            })
        )
        mockPlayerHudController.mouseEventHappened = vi.fn()
        mockPlayerHudController.keyEventHappened = vi.fn()
        mockPlayerHudController.hasCompleted = vi.fn().mockReturnValue(true)
        mockPlayerHudController.recommendStateChanges = vi
            .fn()
            .mockReturnValue({ displayMap: true })
    }

    beforeEach(() => {
        nullState = GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: MissionMapService.new({
                        terrainTileMap: TerrainTileMapService.new({
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
                version: "TEST",
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
        const turn1StateCutsceneId = "starting"
        const mockCutscene = CutsceneService.new({})
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                [DEFAULT_VICTORY_CUTSCENE_ID]: mockCutscene,
                [DEFAULT_DEFEAT_CUTSCENE_ID]: mockCutscene,
                [turn1StateCutsceneId]: mockCutscene,
            },
        })

        const turn1CutsceneTrigger: MissionStartOfPhaseCutsceneTrigger = {
            cutsceneId: "starting",
            triggeringEvent: TriggeringEvent.START_OF_TURN,
            systemReactedToTrigger: false,
            turn: 1,
        }

        const turn1State: GameEngineState = GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: MissionMapService.new({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: ["1 1 "],
                        }),
                    }),
                    cutsceneCollection,
                    objectives: [],
                    cutsceneTriggers: [turn1CutsceneTrigger],
                    battlePhaseState: {
                        turnCount: 1,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            }),
            repository: ObjectRepositoryService.new(),
        })

        orchestrator.update(turn1State, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.CUTSCENE_PLAYER
        )
        expect(orchestrator.getCurrentComponent()).toBe(
            mockBattleCutscenePlayer
        )
        expect(mockBattleCutscenePlayer.currentCutsceneId).toBe(
            turn1StateCutsceneId
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

        const cutsceneSpy: MockInstance = vi.spyOn(
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
            CutsceneQueueService.peek(
                stateWithCutscene.battleOrchestratorState.cutsceneQueue
            )
        ).toEqual("cutscene1")

        orchestrator.update(stateWithCutscene, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.CUTSCENE_PLAYER
        )
        expect(cutsceneSpy).toBeCalledTimes(2)
        expect(cutsceneSpy).toBeCalledWith("cutscene1", stateWithCutscene)
        expect(
            CutsceneQueueService.isEmpty(
                stateWithCutscene.battleOrchestratorState.cutsceneQueue
            )
        ).toBeTruthy()

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
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "new static squaddie",
            templateId: "new static squaddie",
            battleId: "new dynamic squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: nullState.repository,
            actionTemplateIds: [],
        })

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            nullState.battleOrchestratorState.battleState.battleActionRecorder,
            BattleActionService.new({
                actor: { actorBattleSquaddieId: "new squaddie" },
                action: { isMovement: true },
                effect: {
                    movement: {
                        startCoordinate: { q: 0, r: 0 },
                        endCoordinate: { q: 0, r: 0 },
                    },
                },
            })
        )
        BattleActionRecorderService.battleActionFinishedAnimating(
            nullState.battleOrchestratorState.battleState.battleActionRecorder
        )

        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        )
        expect(orchestrator.getCurrentComponent()).toBe(mockPlayerHudController)
        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(mockPlayerHudController.recommendStateChanges).toBeCalledTimes(1)
        expect(mockPlayerHudController.reset).toBeCalledTimes(1)
    })

    it("will move from squaddie move mode to player hud mode", () => {
        vi.spyOn(MissionObjectiveHelper, "shouldBeComplete").mockReturnValue(
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
            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        )
        expect(orchestrator.getCurrentComponent()).toBe(mockPlayerHudController)
        orchestrator.update(nullState, mockedP5GraphicsContext)
        expect(mockPlayerHudController.recommendStateChanges).toBeCalledTimes(1)
        expect(mockPlayerHudController.reset).toBeCalledTimes(1)
    })

    it("Start in the initialized mode as startup", () => {
        orchestrator = createOrchestrator({})

        expect(orchestrator.getCurrentMode()).toBe(
            BattleOrchestratorMode.INITIALIZED
        )
        expect(orchestrator.getCurrentComponent()).toStrictEqual(
            mockInitializeBattle
        )

        const initializeBattleSpy = vi.spyOn(mockInitializeBattle, "update")
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
            return true
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

                    expect(
                        loadAndExpect({
                            mode,
                            orchestratorComponent: tests[mode],
                        })
                    ).toBeTruthy()
                })
            }
        })
    })

    it("will use the recommended next mode to switch", () => {
        const battleCutscenePlayerRecommendsAMode = new BattleCutscenePlayer()
        battleCutscenePlayerRecommendsAMode.update = vi.fn()
        battleCutscenePlayerRecommendsAMode.uiControlSettings = vi
            .fn()
            .mockReturnValue(new UIControlSettings({}))
        battleCutscenePlayerRecommendsAMode.mouseEventHappened = vi.fn()
        battleCutscenePlayerRecommendsAMode.hasCompleted = vi
            .fn()
            .mockReturnValue(true)
        battleCutscenePlayerRecommendsAMode.recommendStateChanges = vi
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
        let missionObjectiveCompleteCheck: MockInstance

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
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap: MissionMapService.new({
                            terrainTileMap: TerrainTileMapService.new({
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
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap: MissionMapService.new({
                            terrainTileMap: TerrainTileMapService.new({
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
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap: MissionMapService.new({
                            terrainTileMap: TerrainTileMapService.new({
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
                        battlePhaseState: BattlePhaseStateService.new({
                            turnCount: 0,
                            currentAffiliation: BattlePhase.PLAYER,
                        }),
                    }),
                }),
                repository: ObjectRepositoryService.new(),
            })

            orchestrator = createOrchestrator({
                initialMode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
                cutscenePlayer,
            })

            missionObjectiveCompleteCheck = vi
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

    describe("UI Control Settings", () => {
        it("will update its UI Control Settings after updating", () => {
            const cutscenePlayerRecommendsAMode = new BattleCutscenePlayer()
            cutscenePlayerRecommendsAMode.update = vi.fn()
            cutscenePlayerRecommendsAMode.uiControlSettings = vi
                .fn()
                .mockReturnValue(
                    new UIControlSettings({
                        displayMap: true,
                    })
                )
            cutscenePlayerRecommendsAMode.mouseEventHappened = vi.fn()
            cutscenePlayerRecommendsAMode.hasCompleted = vi.fn()

            const orchestrator1 = createOrchestrator({
                initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
                cutscenePlayer: cutscenePlayerRecommendsAMode,
            })

            expect(
                orchestrator1.uiControlSettings.displayBattleMap
            ).toBeUndefined()
            orchestrator1.update(nullState, mockedP5GraphicsContext)
            expect(orchestrator1.uiControlSettings.displayBattleMap).toBe(true)
        })

        it("will only draw the map if the settings turn it on", () => {
            const orchestrator1 = createOrchestrator({})

            orchestrator1.uiControlSettings.update(
                new UIControlSettings({
                    displayMap: false,
                })
            )
            orchestrator1.update(nullState, mockedP5GraphicsContext)
            expect(mockMapDisplay.update).not.toBeCalled()

            orchestrator1.uiControlSettings.update(
                new UIControlSettings({
                    displayMap: true,
                })
            )
            orchestrator1.update(nullState, mockedP5GraphicsContext)
            expect(mockMapDisplay.update).toBeCalled()
        })

        describe("HUD", () => {
            let orchestrator1: BattleOrchestrator
            let hudSpy: MockInstance
            let graphicsBuffer: GraphicsBuffer

            beforeEach(() => {
                orchestrator1 = createOrchestrator({})
                nullState.repository = ObjectRepositoryService.new()
                const squaddieTemplate = SquaddieTemplateService.new({
                    squaddieId: SquaddieIdService.new({
                        templateId: "squaddieTemplateId",
                        name: "squaddie",
                        affiliation: SquaddieAffiliation.PLAYER,
                        resources: SquaddieResourceService.new({
                            mapIconResourceKey: "mapIconResourceKey",
                        }),
                    }),
                })
                const battleSquaddie = BattleSquaddieService.new({
                    battleSquaddieId: "battleSquaddieId",
                    squaddieTemplate,
                })
                ObjectRepositoryService.addSquaddie({
                    repo: nullState.repository,
                    battleSquaddie,
                    squaddieTemplate,
                })
                graphicsBuffer = new MockedP5GraphicsBuffer()
                nullState.resourceHandler = mockResourceHandler(graphicsBuffer)
            })

            afterEach(() => {
                if (hudSpy) {
                    hudSpy.mockRestore()
                }
            })

            it("will only draw the Summary HUD if the settings turn it on", () => {
                nullState.battleOrchestratorState.battleHUDState.summaryHUDState =
                    SummaryHUDStateService.new()
                const hudSpy = vi.spyOn(SummaryHUDStateService, "draw")

                orchestrator1.uiControlSettings.update(
                    new UIControlSettings({
                        displayMap: true,
                        displayPlayerHUD: false,
                    })
                )
                orchestrator1.update(nullState, mockedP5GraphicsContext)
                expect(hudSpy).not.toBeCalled()

                orchestrator1.uiControlSettings.update(
                    new UIControlSettings({
                        displayPlayerHUD: true,
                    })
                )
                orchestrator1.update(nullState, mockedP5GraphicsContext)
                expect(hudSpy).toBeCalled()
            })

            it("will not draw the Squaddie Selector Panel HUD if the settings do not draw the HUD", () => {
                nullState.battleOrchestratorState.battleHUDState.squaddieSelectorPanel =
                    SquaddieSelectorPanelService.new({
                        battleSquaddieIds: ["battleSquaddieId"],
                        objectRepository: nullState.repository,
                    })
                const hudSpy = vi.spyOn(SquaddieSelectorPanelService, "draw")

                orchestrator1.uiControlSettings.update(
                    new UIControlSettings({
                        displayMap: true,
                        displayPlayerHUD: false,
                    })
                )
                orchestrator1.update(nullState, mockedP5GraphicsContext)
                expect(hudSpy).not.toBeCalled()
            })

            it("will draw the Squaddie Selector Panel HUD if the settings draw the HUD", () => {
                nullState.battleOrchestratorState.battleHUDState.squaddieSelectorPanel =
                    SquaddieSelectorPanelService.new({
                        battleSquaddieIds: ["battleSquaddieId"],
                        objectRepository: nullState.repository,
                    })
                const hudSpy = vi.spyOn(SquaddieSelectorPanelService, "draw")

                orchestrator1.uiControlSettings.update(
                    new UIControlSettings({
                        displayMap: true,
                        displayPlayerHUD: true,
                    })
                )
                orchestrator1.update(nullState, mockedP5GraphicsContext)
                expect(hudSpy).toBeCalled()
            })
        })
    })

    it("will move from squaddie map action mode to player hud mode", () => {
        vi.spyOn(MissionObjectiveHelper, "shouldBeComplete").mockReturnValue(
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
            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        )
        expect(orchestrator.getCurrentComponent()).toBe(mockPlayerHudController)
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

            const squaddieSelectorOrchestratorShouldDisplayMap = orchestrator
            const component = mockPlayerSquaddieSelector

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
        })
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

            const expectKeyEventsWillGoToMapDisplay = (
                squaddieSelectorOrchestratorShouldDisplayMap: BattleOrchestrator,
                component: BattleOrchestratorComponent
            ) => {
                const stateWantsToDisplayTheMap: GameEngineState =
                    GameEngineStateService.new({
                        resourceHandler: undefined,
                        battleOrchestratorState:
                            BattleOrchestratorStateService.new({
                                battleState: BattleStateService.newBattleState({
                                    missionId: "test mission",
                                    campaignId: "test campaign",
                                }),
                            }),
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

            expectKeyEventsWillGoToMapDisplay(
                orchestrator,
                mockPlayerSquaddieSelector
            )
        })

        it("will update the time elapsed if the mode recommends it", () => {
            const needsTwoUpdatesToFinishLoading = new BattleCutscenePlayer()
            needsTwoUpdatesToFinishLoading.uiControlSettings = vi
                .fn()
                .mockReturnValue(new UIControlSettings({ pauseTimer: true }))
            needsTwoUpdatesToFinishLoading.hasCompleted = vi
                .fn()
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true)
            needsTwoUpdatesToFinishLoading.update = vi.fn()
            needsTwoUpdatesToFinishLoading.recommendStateChanges = vi
                .fn()
                .mockReturnValueOnce({
                    nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR,
                })

            mockPlayerSquaddieSelector.uiControlSettings = vi
                .fn()
                .mockReturnValue(new UIControlSettings({ pauseTimer: false }))

            const gameEngineState: GameEngineState = GameEngineStateService.new(
                {
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                                battlePhaseState: BattlePhaseStateService.new({
                                    turnCount: 0,
                                    currentAffiliation: BattlePhase.PLAYER,
                                }),
                            }),
                            battleHUD: BattleHUDService.new({}),
                        }
                    ),
                    repository: undefined,
                }
            )
            const playerDataMessageListener: PlayerDataMessageListener =
                new PlayerDataMessageListener("listener")
            gameEngineState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST
            )
            gameEngineState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN
            )

            orchestrator = createOrchestrator({
                playerSquaddieSelector: mockPlayerSquaddieSelector,
                initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
            })
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .missionStatistics.timeElapsedInMilliseconds
            ).toBeUndefined()

            orchestrator.update(gameEngineState, mockedP5GraphicsContext)

            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .missionStatistics.timeElapsedInMilliseconds
            ).toBe(0)
            orchestrator.update(gameEngineState, mockedP5GraphicsContext)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .missionStatistics.timeElapsedInMilliseconds
            ).toBe(0)

            expect(orchestrator.getCurrentMode()).toBe(
                BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
            )
            expect(orchestrator.getCurrentComponent()).toBe(
                mockPlayerHudController
            )
            vi.spyOn(Date, "now").mockReturnValue(0)
            orchestrator.update(gameEngineState, mockedP5GraphicsContext)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .missionStatistics.timeElapsedInMilliseconds
            ).toBe(0)

            vi.spyOn(Date, "now").mockReturnValue(100)
            orchestrator.update(gameEngineState, mockedP5GraphicsContext)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .missionStatistics.timeElapsedInMilliseconds
            ).toBeGreaterThan(0)
        })
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
                        battlePhaseState: BattlePhaseStateService.new({
                            turnCount: 0,
                            currentAffiliation: BattlePhase.PLAYER,
                        }),
                    }),
                }),
                repository: ObjectRepositoryService.new(),
            })
            const playerDataMessageListener: PlayerDataMessageListener =
                new PlayerDataMessageListener("listener")
            gameEngineState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST
            )
            gameEngineState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN
            )
            gameEngineState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING
            )
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                loadSaveState: gameEngineState.fileState.loadSaveState,
            })
        })

        it("sets the completed flag if the user wants to load progress", () => {
            orchestrator.update(gameEngineState, mockedP5GraphicsContext)
            expect(orchestrator.hasCompleted(gameEngineState)).toBeTruthy()

            const changes = orchestrator.recommendStateChanges(gameEngineState)
            expect(changes.nextMode).toBe(GameModeEnum.LOADING_BATTLE)
        })

        it("does not set the completed flag if loading has started", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                loadSaveState: gameEngineState.fileState.loadSaveState,
            })
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN,
                loadSaveState: gameEngineState.fileState.loadSaveState,
            })

            orchestrator.update(gameEngineState, mockedP5GraphicsContext)
            expect(orchestrator.hasCompleted(gameEngineState)).toBeFalsy()
        })

        it("does not set the completed flag if there is an error while loading", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                loadSaveState: gameEngineState.fileState.loadSaveState,
            })
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING,
                loadSaveState: gameEngineState.fileState.loadSaveState,
            })

            orchestrator.update(gameEngineState, mockedP5GraphicsContext)
            expect(orchestrator.hasCompleted(gameEngineState)).toBeFalsy()
        })
    })
})
