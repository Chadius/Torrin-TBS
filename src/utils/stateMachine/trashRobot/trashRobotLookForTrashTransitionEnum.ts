import { EnumLike } from "../../enum"

export const TrashRobotLookForTrashTransitionEnum = {
    UNKNOWN: "UNKNOWN",
    INITIALIZED: "INITIALIZED",
    SEEN_TRASH: "SEEN_TRASH",
    PICKED_UP_TRASH: "PICKED_UP_TRASH",
    THREW_TRASH_IN_COMPACTOR: "THREW_TRASH_IN_COMPACTOR",
} as const satisfies Record<string, string>
export type TTrashRobotLookForTrashTransition = EnumLike<
    typeof TrashRobotLookForTrashTransitionEnum
>
