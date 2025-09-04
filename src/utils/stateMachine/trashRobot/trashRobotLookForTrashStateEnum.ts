export const TrashRobotLookForTrashStateEnum = {
    UNKNOWN: "UNKNOWN",
    INITIALIZED: "INITIALIZED",
    SEARCH_FOR_TRASH: "SEARCH_FOR_TRASH",
    HEAD_FOR_TRASH: "HEAD_FOR_TRASH",
    HEAD_FOR_COMPACTOR: "HEAD_FOR_COMPACTOR",
} as const satisfies Record<string, string>

export type TTrashRobotLookForTrashState = EnumLike<
    typeof TrashRobotLookForTrashStateEnum
>
