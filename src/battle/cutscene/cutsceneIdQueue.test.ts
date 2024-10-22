import { CutsceneIdQueue, CutsceneQueueService } from "./cutsceneIdQueue"

describe("Cutscene Queue", () => {
    it("can create a new empty queue", () => {
        const cutsceneQueue: CutsceneIdQueue = CutsceneQueueService.new()
        expect(CutsceneQueueService.isEmpty(cutsceneQueue)).toBeTruthy()
    })
    describe("add a cutscene to the queue", () => {
        let cutsceneQueue: CutsceneIdQueue
        beforeEach(() => {
            cutsceneQueue = CutsceneQueueService.new()
            CutsceneQueueService.add(cutsceneQueue, "cutscene0")
        })
        it("knows it is no longer empty", () => {
            expect(CutsceneQueueService.isEmpty(cutsceneQueue)).toBeFalsy()
        })
        it("knows it can peek without affecting the queue", () => {
            expect(CutsceneQueueService.peek(cutsceneQueue)).toEqual(
                "cutscene0"
            )
        })
    })

    it("can pop a cutscene from the front of the queue", () => {
        const cutsceneQueue: CutsceneIdQueue = CutsceneQueueService.new()
        CutsceneQueueService.add(cutsceneQueue, "cutscene0")
        expect(CutsceneQueueService.dequeue(cutsceneQueue)).toEqual("cutscene0")
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
