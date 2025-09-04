import { beforeEach, describe, expect, it } from "vitest"
import { TrashRobotLookForTrashStateMachine } from "./trashRobotLookForTrashStateMachine"
import { TrashRobotWorld, TrashRobotWorldService } from "./trashRobotWorld"
import {
    TrashRobotLookForTrashStateEnum,
    TTrashRobotLookForTrashState,
} from "./trashRobotLookForTrashStateEnum"
import { StateMachineUpdate } from "../stateMachineUpdate"
import {
    TrashRobotLookForTrashTransitionEnum,
    TTrashRobotLookForTrashTransition,
} from "./trashRobotLookForTrashTransitionEnum"
import {
    TrashRobotLookForTrashActionEnum,
    TTrashRobotLookForTrashAction,
} from "./trashRobotLookForTrashActionEnum"
import { StateMachineStateData } from "../stateMachineData/stateMachineStateData"
import { StateMachineTransitionData } from "../stateMachineData/stateMachineTransitionData"
import {
    StateMachineData,
    StateMachineDataService,
} from "../stateMachineData/stateMachineData"

const infoByState: {
    [s in TTrashRobotLookForTrashState]?: StateMachineStateData<
        TTrashRobotLookForTrashTransition,
        TTrashRobotLookForTrashAction
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
    [s in TTrashRobotLookForTrashTransition]?: StateMachineTransitionData<
        TTrashRobotLookForTrashState,
        TTrashRobotLookForTrashAction
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

describe("Trash Robot State Look for Trash Machine", () => {
    let trashRobotStateMachine: TrashRobotLookForTrashStateMachine
    let trashRobotWorld: TrashRobotWorld
    let trashStateMachineData: StateMachineData<
        TTrashRobotLookForTrashState,
        TTrashRobotLookForTrashTransition,
        TTrashRobotLookForTrashAction,
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
            trashRobotWorld,
            stateMachineData: trashStateMachineData,
        })
    })

    it("initial moves to search for trash", () => {
        expect(trashRobotStateMachine.currentState).toEqual(
            TrashRobotLookForTrashStateEnum.INITIALIZED
        )

        let stateMachineUpdate: StateMachineUpdate<
            TTrashRobotLookForTrashState,
            TTrashRobotLookForTrashTransition,
            TTrashRobotLookForTrashAction
        >

        stateMachineUpdate = trashRobotStateMachine.update()
        expect(stateMachineUpdate.targetedState).toEqual(
            TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH
        )
    })

    describe("will pick up trash while searching for trash", () => {
        let stateMachineUpdate: StateMachineUpdate<
            TTrashRobotLookForTrashState,
            TTrashRobotLookForTrashTransition,
            TTrashRobotLookForTrashAction
        >

        beforeEach(() => {
            trashRobotStateMachine.currentState =
                TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH
        })
        it("will keep looking for trash if none is found", () => {
            stateMachineUpdate = trashRobotStateMachine.update()
            expect(stateMachineUpdate.transitionFired).toBeUndefined()
            expect(stateMachineUpdate.targetedState).toBeUndefined()
            expect(stateMachineUpdate.actions).toEqual([
                TrashRobotLookForTrashActionEnum.SEARCH_FOR_TRASH,
            ])
        })
        it("will head towards the trash if it sees it", () => {
            TrashRobotWorldService.dropTrashOnGround(trashRobotWorld)
            stateMachineUpdate = trashRobotStateMachine.update()
            expect(stateMachineUpdate.transitionFired).toEqual(
                TrashRobotLookForTrashTransitionEnum.SEEN_TRASH
            )
            expect(stateMachineUpdate.targetedState).toEqual(
                TrashRobotLookForTrashStateEnum.HEAD_FOR_TRASH
            )
            expect(stateMachineUpdate.actions).toEqual([
                TrashRobotLookForTrashActionEnum.SEARCH_FOR_TRASH_EXIT,
                TrashRobotLookForTrashActionEnum.TRIGGER_SEEN_TRASH,
                TrashRobotLookForTrashActionEnum.HEAD_FOR_TRASH_ENTRY,
            ])
        })
        it("after picking up trash it will head towards the compactor", () => {
            TrashRobotWorldService.dropTrashOnGround(trashRobotWorld)
            trashRobotStateMachine.currentState =
                TrashRobotLookForTrashStateEnum.HEAD_FOR_TRASH
            TrashRobotWorldService.pickUpTrash(trashRobotWorld)
            stateMachineUpdate = trashRobotStateMachine.update()
            expect(stateMachineUpdate.transitionFired).toEqual(
                TrashRobotLookForTrashTransitionEnum.PICKED_UP_TRASH
            )
            expect(stateMachineUpdate.targetedState).toEqual(
                TrashRobotLookForTrashStateEnum.HEAD_FOR_COMPACTOR
            )
            expect(stateMachineUpdate.actions).toEqual([
                TrashRobotLookForTrashActionEnum.HEAD_FOR_TRASH_EXIT,
                TrashRobotLookForTrashActionEnum.TRIGGER_PICKED_UP_TRASH,
                TrashRobotLookForTrashActionEnum.HEAD_FOR_COMPACTOR_ENTRY,
            ])
        })
        it("after throwing the trash in the compactor it will begin looking for more trash", () => {
            TrashRobotWorldService.dropTrashOnGround(trashRobotWorld)
            TrashRobotWorldService.pickUpTrash(trashRobotWorld)
            trashRobotStateMachine.currentState =
                TrashRobotLookForTrashStateEnum.HEAD_FOR_COMPACTOR
            TrashRobotWorldService.throwTrashInCompactor(trashRobotWorld)
            stateMachineUpdate = trashRobotStateMachine.update()
            expect(stateMachineUpdate.transitionFired).toEqual(
                TrashRobotLookForTrashTransitionEnum.THREW_TRASH_IN_COMPACTOR
            )
            expect(stateMachineUpdate.targetedState).toEqual(
                TrashRobotLookForTrashStateEnum.SEARCH_FOR_TRASH
            )
            expect(stateMachineUpdate.actions).toEqual([
                TrashRobotLookForTrashActionEnum.HEAD_FOR_COMPACTOR_EXIT,
                TrashRobotLookForTrashActionEnum.TRIGGER_THREW_TRASH_IN_COMPACTOR,
                TrashRobotLookForTrashActionEnum.SEARCH_FOR_TRASH_ENTRY,
            ])
        })
    })
})
