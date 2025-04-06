import { beforeEach, describe, expect, it } from "vitest"
import { StateMachineData, StateMachineDataService } from "./stateMachineData"
import { TrashRobotLookForTrashStateEnum } from "../trashRobot/trashRobotLookForTrashStateEnum"
import { TrashRobotLookForTrashTransitionEnum } from "../trashRobot/trashRobotLookForTrashTransitionEnum"
import { TrashRobotLookForTrashActionEnum } from "../trashRobot/trashRobotLookForTrashActionEnum"
import {
    TrashRobotWorld,
    TrashRobotWorldService,
} from "../trashRobot/trashRobotWorld"
import { StateMachineStateData } from "./stateMachineStateData"
import { StateMachineTransitionData } from "./stateMachineTransitionData"

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
    [TrashRobotLookForTrashStateEnum.HEAD_FOR_TRASH]: {
        transitions: [TrashRobotLookForTrashTransitionEnum.PICKED_UP_TRASH],
        entryAction: TrashRobotLookForTrashActionEnum.HEAD_FOR_TRASH_ENTRY,
        actions: [TrashRobotLookForTrashActionEnum.HEAD_FOR_TRASH],
        exitAction: TrashRobotLookForTrashActionEnum.HEAD_FOR_TRASH_EXIT,
    },
    [TrashRobotLookForTrashStateEnum.HEAD_FOR_COMPACTOR]: {
        transitions: [
            TrashRobotLookForTrashTransitionEnum.THREW_TRASH_IN_COMPACTOR,
        ],
        entryAction: TrashRobotLookForTrashActionEnum.HEAD_FOR_COMPACTOR_ENTRY,
        actions: [TrashRobotLookForTrashActionEnum.HEAD_FOR_COMPACTOR],
        exitAction: TrashRobotLookForTrashActionEnum.HEAD_FOR_COMPACTOR_EXIT,
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
    [TrashRobotLookForTrashTransitionEnum.SEEN_TRASH]: {
        targetedState: TrashRobotLookForTrashStateEnum.HEAD_FOR_TRASH,
        action: TrashRobotLookForTrashActionEnum.TRIGGER_SEEN_TRASH,
    },
    [TrashRobotLookForTrashTransitionEnum.PICKED_UP_TRASH]: {
        targetedState: TrashRobotLookForTrashStateEnum.HEAD_FOR_COMPACTOR,
        action: TrashRobotLookForTrashActionEnum.TRIGGER_PICKED_UP_TRASH,
    },
    [TrashRobotLookForTrashTransitionEnum.THREW_TRASH_IN_COMPACTOR]: {
        targetedState: TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH,
        action: TrashRobotLookForTrashActionEnum.TRIGGER_THREW_TRASH_IN_COMPACTOR,
    },
}

describe("State Machine Data", () => {
    let data: StateMachineData<
        TrashRobotLookForTrashStateEnum,
        TrashRobotLookForTrashTransitionEnum,
        TrashRobotLookForTrashActionEnum,
        TrashRobotWorld
    >

    beforeEach(() => {
        data = StateMachineDataService.new({
            initialState: TrashRobotLookForTrashStateEnum.INITIALIZED,
            infoByState,
            infoByTransition,
        })
    })

    it("will use initialized fields", () => {
        expect(data.initialState).toEqual(
            TrashRobotLookForTrashStateEnum.INITIALIZED
        )
    })

    it("will use info by state", () => {
        expect(data.infoByState).toEqual(infoByState)
    })

    it("will use info by transition", () => {
        expect(data.infoByTransition).toEqual(infoByTransition)
    })

    describe("getTransitionsForState", () => {
        it("will return all of the transitions for a given state", () => {
            expect(
                StateMachineDataService.getTransitionsForState(
                    data,
                    TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH
                )
            ).toEqual(
                infoByState[TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH]
                    .transitions
            )
        })

        it("if not found it will return an empty list", () => {
            expect(
                StateMachineDataService.getTransitionsForState(
                    data,
                    TrashRobotLookForTrashStateEnum.UNKNOWN
                )
            ).toEqual([])
        })
    })
    describe("getActionsFromCurrentState", () => {
        it("will return all of the actions for a given state", () => {
            expect(
                StateMachineDataService.getActionsFromState(
                    data,
                    TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH
                )
            ).toEqual(
                infoByState[TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH]
                    .actions
            )
        })

        it("if not found it will return an empty list", () => {
            expect(
                StateMachineDataService.getActionsFromState(
                    data,
                    TrashRobotLookForTrashStateEnum.UNKNOWN
                )
            ).toEqual([])
        })
    })
    describe("getEntryActionFromState", () => {
        it("will return the entry action for a given state", () => {
            expect(
                StateMachineDataService.getEntryActionFromState(
                    data,
                    TrashRobotLookForTrashStateEnum.HEAD_FOR_COMPACTOR
                )
            ).toEqual(
                infoByState[TrashRobotLookForTrashStateEnum.HEAD_FOR_COMPACTOR]
                    .entryAction
            )
        })

        it("if not found it will return undefined", () => {
            expect(
                StateMachineDataService.getEntryActionFromState(
                    data,
                    TrashRobotLookForTrashStateEnum.UNKNOWN
                )
            ).toBeUndefined()
        })
    })
    describe("getExitActionFromState", () => {
        it("will return the exit action for a given state", () => {
            expect(
                StateMachineDataService.getExitActionFromState(
                    data,
                    TrashRobotLookForTrashStateEnum.HEAD_FOR_COMPACTOR
                )
            ).toEqual(
                infoByState[TrashRobotLookForTrashStateEnum.HEAD_FOR_COMPACTOR]
                    .exitAction
            )
        })

        it("if not found it will return undefined", () => {
            expect(
                StateMachineDataService.getExitActionFromState(
                    data,
                    TrashRobotLookForTrashStateEnum.UNKNOWN
                )
            ).toBeUndefined()
        })
    })
    describe("getTargetedStateFromTransition", () => {
        it("will return the state for a given transition", () => {
            expect(
                StateMachineDataService.getTargetedStateFromTransition(
                    data,
                    TrashRobotLookForTrashTransitionEnum.SEEN_TRASH
                )
            ).toEqual(
                infoByTransition[
                    TrashRobotLookForTrashTransitionEnum.SEEN_TRASH
                ].targetedState
            )
        })

        it("if not found it will return undefined", () => {
            expect(
                StateMachineDataService.getTargetedStateFromTransition(
                    data,
                    TrashRobotLookForTrashTransitionEnum.UNKNOWN
                )
            ).toBeUndefined()
        })
    })
    describe("getActionFromTriggeredTransition", () => {
        it("will return the action for a given transition", () => {
            expect(
                StateMachineDataService.getActionFromTriggeredTransition(
                    data,
                    TrashRobotLookForTrashTransitionEnum.PICKED_UP_TRASH
                )
            ).toEqual(
                infoByTransition[
                    TrashRobotLookForTrashTransitionEnum.PICKED_UP_TRASH
                ].action
            )
        })

        it("if not found it will return undefined", () => {
            expect(
                StateMachineDataService.getActionFromTriggeredTransition(
                    data,
                    TrashRobotLookForTrashTransitionEnum.UNKNOWN
                )
            ).toBeUndefined()
        })
    })

    it("will copy the given transition keys to populate the transition trigger", () => {
        expect(Object.keys(data.isTriggerByTransition)).toEqual(
            expect.arrayContaining(Object.keys(infoByTransition))
        )
    })

    describe("hydrate the transition trigger logic after creation", () => {
        beforeEach(() => {
            StateMachineDataService.setTransitionTriggerFunctions(data, {
                [TrashRobotLookForTrashTransitionEnum.THREW_TRASH_IN_COMPACTOR]:
                    (trashRobotWorld: TrashRobotWorld) =>
                        trashRobotWorld.trashWasCompacted,
            })
        })

        it("will use provided trigger tests", () => {
            const trashRobotWorld: TrashRobotWorld =
                TrashRobotWorldService.new()
            expect(
                StateMachineDataService.isTransitionTriggered({
                    stateMachineData: data,
                    transition:
                        TrashRobotLookForTrashTransitionEnum.THREW_TRASH_IN_COMPACTOR,
                    worldData: trashRobotWorld,
                })
            ).toEqual(false)
            TrashRobotWorldService.throwTrashInCompactor(trashRobotWorld)
            expect(
                StateMachineDataService.isTransitionTriggered({
                    stateMachineData: data,
                    transition:
                        TrashRobotLookForTrashTransitionEnum.THREW_TRASH_IN_COMPACTOR,
                    worldData: trashRobotWorld,
                })
            ).toEqual(true)
        })

        it("will default to never trigger", () => {
            const trashRobotWorld: TrashRobotWorld =
                TrashRobotWorldService.new()
            expect(
                StateMachineDataService.isTransitionTriggered({
                    stateMachineData: data,
                    transition:
                        TrashRobotLookForTrashTransitionEnum.INITIALIZED,
                    worldData: trashRobotWorld,
                })
            ).toEqual(false)
        })
    })

    describe("hydrate the action logic after creation", () => {
        let testFunctionWasRun: boolean
        beforeEach(() => {
            testFunctionWasRun = false
            StateMachineDataService.setActionLogic(data, {
                [TrashRobotLookForTrashActionEnum.SEARCH_FOR_TRASH]: (
                    _: TrashRobotWorld
                ) => {
                    testFunctionWasRun = true
                },
            })
        })

        it("will set the provided action function", () => {
            expect(
                data.logicByAction[
                    TrashRobotLookForTrashActionEnum.SEARCH_FOR_TRASH
                ]
            ).not.toBeUndefined()
            expect(
                StateMachineDataService.getActionLogic(
                    data,
                    TrashRobotLookForTrashActionEnum.SEARCH_FOR_TRASH
                )
            ).not.toBeUndefined()
            StateMachineDataService.getActionLogic(
                data,
                TrashRobotLookForTrashActionEnum.SEARCH_FOR_TRASH
            )(TrashRobotWorldService.new())
            expect(testFunctionWasRun).toBe(true)
        })

        it("will always return a function even if it was not defined", () => {
            expect(
                data.logicByAction[
                    TrashRobotLookForTrashActionEnum.HEAD_FOR_COMPACTOR
                ]
            ).not.toBeUndefined()
            expect(
                StateMachineDataService.getActionLogic(
                    data,
                    TrashRobotLookForTrashActionEnum.HEAD_FOR_COMPACTOR
                )
            ).not.toBeUndefined()
        })
    })
})
