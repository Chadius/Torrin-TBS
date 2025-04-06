import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { PlayerActionTargetSelect } from "./playerActionTargetSelect"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngine"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../../resource/resourceHandler"
import * as mocks from "../../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import { BattleOrchestratorMode } from "../battleOrchestrator"
import {
    PlayerActionTargetStateEnum,
    PlayerActionTargetTransitionEnum,
} from "./stateMachine"
import { CampaignService } from "../../../campaign/campaign"
import { BattleOrchestratorStateService } from "../battleOrchestratorState"
import { BattleStateService } from "../../battleState/battleState"
import { MapSearchTestUtils } from "../../../hexMap/pathfinder/pathGeneration/mapSearchTests/mapSearchTestUtils"

describe("Player Action Target Select", () => {
    let playerActionTargetSelect: PlayerActionTargetSelect
    let gameEngineState: GameEngineState
    let graphicsContext: GraphicsBuffer
    let resourceHandler: ResourceHandler
    let stateMachineSpy: MockInstance

    beforeEach(() => {
        graphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mocks.mockResourceHandler(graphicsContext)
        gameEngineState = GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.new({
                    missionMap:
                        MapSearchTestUtils.create1row5columnsAllFlatTerrain(),
                    campaignId: "campaignId",
                    missionId: "missionId",
                }),
            }),
            campaign: CampaignService.default(),
        })
        playerActionTargetSelect = new PlayerActionTargetSelect()
    })

    afterEach(() => {
        if (stateMachineSpy) stateMachineSpy.mockRestore()
    })

    describe("state machine life cycle", () => {
        beforeEach(() => {
            stateMachineSpy = vi
                .spyOn(playerActionTargetSelect, "updateStateMachine")
                .mockReturnValue()
        })

        it("does not have a state machine upon creation", () => {
            expect(playerActionTargetSelect.stateMachine).toBeUndefined()
        })

        it("keeps the same state machine with multiple updates", () => {
            playerActionTargetSelect.update({
                gameEngineState,
                graphicsContext,
                resourceHandler,
            })
            const originalStateMachine = playerActionTargetSelect.stateMachine

            playerActionTargetSelect.update({
                gameEngineState,
                graphicsContext,
                resourceHandler,
            })
            expect(playerActionTargetSelect.stateMachine).toBe(
                originalStateMachine
            )
        })

        it("will destroy the state machine when it resets", () => {
            playerActionTargetSelect.update({
                gameEngineState,
                graphicsContext,
                resourceHandler,
            })
            playerActionTargetSelect.reset(gameEngineState)
            expect(playerActionTargetSelect.stateMachine).toBeUndefined()
        })
    })

    describe("state machine is run while update", () => {
        beforeEach(() => {
            playerActionTargetSelect.lazyInitializeStateMachine(gameEngineState)
            stateMachineSpy = vi
                .spyOn(playerActionTargetSelect.stateMachine, "updateUntil")
                .mockReturnValue()
            playerActionTargetSelect.update({
                gameEngineState,
                graphicsContext,
                resourceHandler,
            })
        })

        it("will run the state machine when it updates", () => {
            expect(stateMachineSpy).toBeCalled()
        })

        it("is not complete if the state machine has not finished", () => {
            expect(
                playerActionTargetSelect.hasCompleted(gameEngineState)
            ).toBeFalsy()
        })
    })

    describe("when the state machine is finished", () => {
        beforeEach(() => {
            playerActionTargetSelect.lazyInitializeStateMachine(gameEngineState)
            stateMachineSpy = vi
                .spyOn(playerActionTargetSelect.stateMachine, "update")
                .mockReturnValue({
                    stateMachineId: "stateMachineId",
                    transitionFired: PlayerActionTargetTransitionEnum.FINISHED,
                    actions: [],
                    targetedState: PlayerActionTargetStateEnum.FINISHED,
                })
            playerActionTargetSelect.update({
                gameEngineState,
                graphicsContext,
                resourceHandler,
            })
        })

        afterEach(() => {
            stateMachineSpy.mockRestore()
        })

        it("updates the state machine", () => {
            expect(stateMachineSpy).toBeCalled()
        })

        it("the state machine is in the finished state", () => {
            expect(playerActionTargetSelect.stateMachine.currentState).toEqual(
                PlayerActionTargetStateEnum.FINISHED
            )
        })

        it("hasCompleted the component", () => {
            expect(playerActionTargetSelect.hasCompleted(gameEngineState)).toBe(
                true
            )
        })
    })

    describe("Select next mode based on state machine transition", () => {
        const tests = [
            {
                name: "player wants to cancel their action selection",
                triggeredTransition:
                    PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND,
                nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            },
            {
                name: "the state machine is not applicable",
                triggeredTransition:
                    PlayerActionTargetTransitionEnum.UNSUPPORTED_COUNT_TARGETS,
                nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET,
            },
        ]

        let stateMachineSpy: MockInstance
        afterEach(() => {
            stateMachineSpy.mockRestore()
        })

        const setup = (
            triggeredTransition: PlayerActionTargetTransitionEnum
        ) => {
            playerActionTargetSelect.lazyInitializeStateMachine(gameEngineState)
            stateMachineSpy = vi
                .spyOn(
                    playerActionTargetSelect.stateMachine,
                    "getTriggeredTransition"
                )
                .mockReturnValueOnce(triggeredTransition)

            playerActionTargetSelect.update({
                gameEngineState,
                graphicsContext,
                resourceHandler,
            })
        }

        it.each(tests)(
            `$name will expect the state machine to be called`,
            ({ triggeredTransition }) => {
                setup(triggeredTransition)
                expect(stateMachineSpy).toBeCalled()
            }
        )

        it.each(tests)(`$name has completed`, ({ triggeredTransition }) => {
            setup(triggeredTransition)
            expect(
                playerActionTargetSelect.hasCompleted(gameEngineState)
            ).toBeTruthy()
        })

        it.each(tests)(
            `$name will recommend a new mode`,
            ({ triggeredTransition, nextMode }) => {
                setup(triggeredTransition)
                const recommendedInfo =
                    playerActionTargetSelect.recommendStateChanges(
                        gameEngineState
                    )
                expect(recommendedInfo.nextMode).toBe(nextMode)
            }
        )
    })
})
