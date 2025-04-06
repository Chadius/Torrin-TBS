import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import {
    TrashRobotWorld,
    TrashRobotWorldService,
} from "./trashRobot/trashRobotWorld"
import { TrashRobotLookForTrashStateEnum } from "./trashRobot/trashRobotLookForTrashStateEnum"
import { TrashRobotLookForTrashStateMachine } from "./trashRobot/trashRobotLookForTrashStateMachine"
import { TrashRobotLookForTrashTransitionEnum } from "./trashRobot/trashRobotLookForTrashTransitionEnum"
import { StateMachineUpdate } from "./stateMachineUpdate"
import { TrashRobotLookForTrashActionEnum } from "./trashRobot/trashRobotLookForTrashActionEnum"
import {
    StateMachineData,
    StateMachineDataService,
} from "./stateMachineData/stateMachineData"
import { StateMachineStateData } from "./stateMachineData/stateMachineStateData"
import { StateMachineTransitionData } from "./stateMachineData/stateMachineTransitionData"
import { STATE_MACHINE_DEFAULT_UPDATE_UNTIL_TIMEOUT_MS } from "./stateMachine"

const infoByState: {
    [s in TrashRobotLookForTrashStateEnum]?: StateMachineStateData<
        TrashRobotLookForTrashTransitionEnum,
        TrashRobotLookForTrashActionEnum
    >
} = {
    [TrashRobotLookForTrashStateEnum.INITIALIZED]: {
        transitions: [TrashRobotLookForTrashTransitionEnum.INITIALIZED],
        entryAction: undefined,
        actions: [],
        exitAction: TrashRobotLookForTrashActionEnum.INITIALIZED_EXIT,
    },
    [TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH]: {
        actions: [TrashRobotLookForTrashActionEnum.SEARCH_FOR_TRASH],
        entryAction: TrashRobotLookForTrashActionEnum.SEARCH_FOR_TRASH_ENTRY,
        transitions: [TrashRobotLookForTrashTransitionEnum.SEEN_TRASH],
        exitAction: TrashRobotLookForTrashActionEnum.SEARCH_FOR_TRASH_EXIT,
    },
}

const infoByTransition: {
    [s in TrashRobotLookForTrashTransitionEnum]?: StateMachineTransitionData<
        TrashRobotLookForTrashStateEnum,
        TrashRobotLookForTrashActionEnum
    >
} = {
    [TrashRobotLookForTrashTransitionEnum.INITIALIZED]: {
        targetedState: TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH,
        action: TrashRobotLookForTrashActionEnum.TRIGGER_INITIALIZED,
    },
}

describe("StateMachine", () => {
    describe("Trash Robot State Machine on a single level", () => {
        let trashRobotStateMachine: TrashRobotLookForTrashStateMachine
        let trashRobotWorld: TrashRobotWorld
        let trashStateMachineData: StateMachineData<
            TrashRobotLookForTrashStateEnum,
            TrashRobotLookForTrashTransitionEnum,
            TrashRobotLookForTrashActionEnum,
            TrashRobotWorld
        >

        beforeEach(() => {
            trashStateMachineData = StateMachineDataService.new({
                initialState: TrashRobotLookForTrashStateEnum.INITIALIZED,
                infoByTransition,
                infoByState,
            })
            trashRobotWorld = TrashRobotWorldService.new()
            trashRobotStateMachine = new TrashRobotLookForTrashStateMachine({
                id: "trashRobotStateMachine",
                trashRobotWorld: trashRobotWorld,
                stateMachineData: trashStateMachineData,
            })
        })

        it("current state is the the initial state", () => {
            expect(trashRobotStateMachine.currentState).toEqual(
                TrashRobotLookForTrashStateEnum.INITIALIZED
            )
        })

        describe("triggering a transition generates updates", () => {
            let stateMachineUpdate: StateMachineUpdate<
                TrashRobotLookForTrashStateEnum,
                TrashRobotLookForTrashTransitionEnum,
                TrashRobotLookForTrashActionEnum
            >

            beforeEach(() => {
                stateMachineUpdate = trashRobotStateMachine.update()
            })
            it("knows which state machine is responsible for the transition", () => {
                expect(stateMachineUpdate.stateMachineId).toEqual(
                    trashRobotStateMachine.id
                )
            })
            it("knows which transition was triggered and fired", () => {
                expect(stateMachineUpdate.transitionFired).toEqual(
                    TrashRobotLookForTrashTransitionEnum.INITIALIZED
                )
            })
            it("knows what state to transition to", () => {
                expect(stateMachineUpdate.targetedState).toEqual(
                    TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH
                )
            })
            it("knows to exit the current action, run an action associated with the trigger, and enter the new action", () => {
                expect(stateMachineUpdate.actions).toEqual([
                    TrashRobotLookForTrashActionEnum.INITIALIZED_EXIT,
                    TrashRobotLookForTrashActionEnum.TRIGGER_INITIALIZED,
                    TrashRobotLookForTrashActionEnum.SEARCH_FOR_TRASH_ENTRY,
                ])
            })
        })

        it("can run functions associated with actions", () => {
            const spy = vi.fn().mockReturnValue(1)
            trashRobotStateMachine.stateMachineData.logicByAction[
                TrashRobotLookForTrashActionEnum.HEAD_FOR_TRASH
            ] = spy
            trashRobotStateMachine.getActionLogic(
                TrashRobotLookForTrashActionEnum.HEAD_FOR_TRASH
            )(trashRobotWorld)
            expect(spy).toBeCalled()
            spy.mockRestore()
        })

        describe("can autorun", () => {
            let dateSpy: MockInstance

            beforeEach(() => {
                dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
            })

            afterEach(() => {
                dateSpy.mockRestore()
            })

            it("will run until the predicate is true", () => {
                trashRobotStateMachine.updateUntil({
                    stopPredicate: (
                        stateMachine: TrashRobotLookForTrashStateMachine
                    ) =>
                        stateMachine.currentState ==
                        TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH,
                })

                expect(trashRobotStateMachine.currentState).toEqual(
                    TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH
                )
            })

            it("will stop processing if too much time has elapsed", () => {
                dateSpy
                    .mockReturnValueOnce(0)
                    .mockReturnValue(
                        STATE_MACHINE_DEFAULT_UPDATE_UNTIL_TIMEOUT_MS * 10
                    )
                trashRobotStateMachine.updateUntil({
                    stopPredicate: (
                        stateMachine: TrashRobotLookForTrashStateMachine
                    ) =>
                        stateMachine.currentState ==
                        TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH,
                })
                expect(dateSpy).toBeCalled()
                expect(trashRobotStateMachine.currentState).toEqual(
                    TrashRobotLookForTrashStateEnum.INITIALIZED
                )
            })
        })
    })
})
