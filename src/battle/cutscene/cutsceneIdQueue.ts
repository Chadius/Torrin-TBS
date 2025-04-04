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
    peek: (cutsceneQueue: CutsceneIdQueue): string => {
        if (cutsceneQueue.cutsceneIds.length === 0) {
            return undefined
        }

        return cutsceneQueue.cutsceneIds[0]
    },
    dequeue: (cutsceneQueue: CutsceneIdQueue): string => {
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
}
