import { BattleEvent } from "../event/battleEvent"
import { CutsceneEffect } from "../../cutscene/cutsceneEffect"

export interface CutsceneIdQueue {
    cutsceneIds: string[]
}

export const CutsceneQueueService = {
    new: (): CutsceneIdQueue => ({
        cutsceneIds: [],
    }),
    isEmpty: (cutsceneQueue: CutsceneIdQueue): boolean =>
        cutsceneQueue.cutsceneIds.length === 0,
    add: (cutsceneQueue: CutsceneIdQueue, cutscene: string) => {
        cutsceneQueue.cutsceneIds.push(cutscene)
    },
    peek: (cutsceneQueue: CutsceneIdQueue): string | undefined => {
        if (cutsceneQueue.cutsceneIds.length === 0) {
            return undefined
        }

        return cutsceneQueue.cutsceneIds[0]
    },
    dequeue: (cutsceneQueue: CutsceneIdQueue): string | undefined => {
        if (cutsceneQueue.cutsceneIds.length === 0) {
            return undefined
        }

        return cutsceneQueue.cutsceneIds.shift()
    },
    addList: (cutsceneQueue: CutsceneIdQueue, cutscenes: string[]) => {
        cutscenes.forEach((cutscene) =>
            cutsceneQueue.cutsceneIds.push(cutscene)
        )
    },
    processBattleEvents: (
        cutsceneQueue: CutsceneIdQueue,
        battleEvents: (BattleEvent & { effect: CutsceneEffect })[]
    ) => {
        battleEvents.forEach((battleEvent) =>
            cutsceneQueue.cutsceneIds.push(battleEvent.effect.cutsceneId)
        )
    },
}
