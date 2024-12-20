import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieMovementService } from "../../squaddie/movement"
import { BattleSquaddieUsesActionOnMap } from "./battleSquaddieUsesActionOnMap"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { ArmyAttributesService } from "../../squaddie/armyAttributes"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"

describe("BattleSquaddieUsesActionOnMap", () => {
    let squaddieRepository: ObjectRepository
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let dateSpy: MockInstance
    let mapAction: BattleSquaddieUsesActionOnMap
    let gameEngineState: GameEngineState
    let messageSpy: MockInstance

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        squaddieRepository = ObjectRepositoryService.new()
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "Torrin",
            templateId: "static_squaddie",
            battleId: "dynamic_squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: squaddieRepository,
            attributes: ArmyAttributesService.new({
                movement: SquaddieMovementService.new({
                    movementPerAction: 2,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }),
                }),
                armorClass: 0,
                maxHitPoints: 0,
            }),
            actionTemplateIds: [],
        })

        dateSpy = vi.spyOn(Date, "now").mockImplementation(() => 0)

        mapAction = new BattleSquaddieUsesActionOnMap()

        gameEngineState = GameEngineStateService.new({
            repository: squaddieRepository,
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                }),
            }),
        })

        const battleAction: BattleAction = BattleActionService.new({
            actor: { actorBattleSquaddieId: "dynamic_squaddie" },
            action: { isEndTurn: true },
            effect: { endTurn: true },
        })
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            battleAction
        )
        messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
    })

    afterEach(() => {
        dateSpy.mockRestore()
        messageSpy.mockRestore()
    })

    it("can wait half a second before ending turn", () => {
        mapAction.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(mapAction.animationCompleteStartTime).not.toBeUndefined()
        expect(mapAction.hasCompleted(gameEngineState)).toBeFalsy()
        dateSpy.mockImplementation(() => 500)

        mapAction.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(mapAction.hasCompleted(gameEngineState)).toBeTruthy()
    })

    it("will go to player hud controller if there are no more actions queued", () => {
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder =
            BattleActionRecorderService.new()
        const stateChanges = mapAction.recommendStateChanges(gameEngineState)
        expect(stateChanges.nextMode).toEqual(
            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        )
        expect(stateChanges.displayMap).toBeTruthy()

        mapAction.reset(gameEngineState)
        expect(mapAction.animationCompleteStartTime).toBeUndefined()
        expect(
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            )
        ).toBeFalsy()
    })

    it("sets the animation as complete", () => {
        mapAction.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        dateSpy.mockImplementation(() => 500)
        mapAction.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(
            BattleActionService.isAnimationComplete(
                BattleActionRecorderService.peekAtAnimationQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            )
        ).toBeTruthy()
    })

    it("displays the map", () => {
        dateSpy.mockImplementation(() => 500)
        mapAction.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })

        const stateChanges = mapAction.recommendStateChanges(gameEngineState)
        expect(stateChanges.displayMap).toBeTruthy()
    })

    it("sends a message noting the animation is complete", () => {
        mapAction.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        dateSpy.mockImplementation(() => 500)
        mapAction.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(messageSpy).toBeCalledWith({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
    })

    describe("reset the component", () => {
        let messageSpy: MockInstance
        beforeEach(() => {
            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")

            mapAction.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
            dateSpy.mockImplementation(() => 500)
            mapAction.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
            mapAction.recommendStateChanges(gameEngineState)
            mapAction.reset(gameEngineState)
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("clears internal animation timer", () => {
            expect(mapAction.animationCompleteStartTime).toBeUndefined()
        })

        it("knows a message was generated to indicate animation finished", () => {
            expect(messageSpy).toBeCalledWith({
                type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
        })

        it("knows the animation is complete", () => {
            expect(
                BattleActionRecorderService.isAnimationQueueEmpty(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toBeFalsy()
        })

        it("clears the HUD", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()
        })
    })
})
