import { CutsceneIdQueue, CutsceneQueueService } from "./cutsceneIdQueue"
import { describe, expect, it } from "vitest"

describe("Cutscene Queue", () => {
    it("can create a new empty queue", () => {
        const cutsceneQueue: CutsceneIdQueue = CutsceneQueueService.new()
        expect(CutsceneQueueService.isEmpty(cutsceneQueue)).toBeTruthy()
    })

    it("add multiple cutscenes at once", () => {
        const cutsceneQueue: CutsceneIdQueue = CutsceneQueueService.new()
        CutsceneQueueService.addList(cutsceneQueue, ["cutscene0", "cutscene1"])
        expect(CutsceneQueueService.isEmpty(cutsceneQueue)).toBeFalsy()
        expect(CutsceneQueueService.dequeue(cutsceneQueue)).toEqual("cutscene0")
        expect(CutsceneQueueService.isEmpty(cutsceneQueue)).toBeFalsy()
        expect(CutsceneQueueService.dequeue(cutsceneQueue)).toEqual("cutscene1")
        expect(CutsceneQueueService.isEmpty(cutsceneQueue)).toBeTruthy()
    })
})
