import { TrashRobotWorld } from "./trashRobotWorld"
import { StateMachine } from "../stateMachine"
import { TTrashRobotLookForTrashState } from "./trashRobotLookForTrashStateEnum"
import {
    TrashRobotLookForTrashTransitionEnum,
    TTrashRobotLookForTrashTransition,
} from "./trashRobotLookForTrashTransitionEnum"
import { TTrashRobotLookForTrashAction } from "./trashRobotLookForTrashActionEnum"
import {
    StateMachineData,
    StateMachineDataService,
} from "../stateMachineData/stateMachineData"

export class TrashRobotLookForTrashStateMachine extends StateMachine<
    TTrashRobotLookForTrashState,
    TTrashRobotLookForTrashTransition,
    TTrashRobotLookForTrashAction,
    TrashRobotWorld
> {
    currentState: TTrashRobotLookForTrashState
    stateMachineData: StateMachineData<
        TTrashRobotLookForTrashState,
        TTrashRobotLookForTrashTransition,
        TTrashRobotLookForTrashAction,
        TrashRobotWorld
    >

    constructor({
        id,
        trashRobotWorld,
        stateMachineData,
    }: {
        id: string
        trashRobotWorld: TrashRobotWorld
        stateMachineData: StateMachineData<
            TTrashRobotLookForTrashState,
            TTrashRobotLookForTrashTransition,
            TTrashRobotLookForTrashAction,
            TrashRobotWorld
        >
    }) {
        super({ id, stateMachineData, worldData: trashRobotWorld })
        this.stateMachineData = stateMachineData
        this.setTransitionTriggerFunctions()
    }

    setTransitionTriggerFunctions() {
        StateMachineDataService.setTransitionTriggerFunctions(
            this.stateMachineData,
            {
                [TrashRobotLookForTrashTransitionEnum.INITIALIZED]: (
                    _: TrashRobotWorld
                ) => true,
                [TrashRobotLookForTrashTransitionEnum.SEEN_TRASH]: (
                    trashRobotWorld: TrashRobotWorld
                ) => isTriggeredSEEN_TRASH(trashRobotWorld),
                [TrashRobotLookForTrashTransitionEnum.PICKED_UP_TRASH]: (
                    trashRobotWorld: TrashRobotWorld
                ) => isTriggeredPICKED_UP_TRASH(trashRobotWorld),
                [TrashRobotLookForTrashTransitionEnum.THREW_TRASH_IN_COMPACTOR]:
                    (trashRobotWorld: TrashRobotWorld) =>
                        isTriggeredTHREW_TRASH_IN_COMPACTOR(trashRobotWorld),
            }
        )
    }
}

const isTriggeredSEEN_TRASH = (trashRobotWorld: TrashRobotWorld): boolean =>
    trashRobotWorld.trashExists

const isTriggeredPICKED_UP_TRASH = (
    trashRobotWorld: TrashRobotWorld
): boolean => trashRobotWorld.trashIsHeld

const isTriggeredTHREW_TRASH_IN_COMPACTOR = (
    trashRobotWorld: TrashRobotWorld
): boolean => trashRobotWorld.trashWasCompacted
