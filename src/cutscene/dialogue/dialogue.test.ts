import { Dialogue, DialogueService } from "./dialogue"

describe("dialogue", () => {
    it("can create new dialogue data objects", () => {
        const dialogue: Dialogue = DialogueService.new({
            id: "the talk",
            speakerPortraitResourceKey: "talking",
            dialogueText: "I'm saying something",
            backgroundColor: [1, 2, 3],
        })

        expect(dialogue.answers).toHaveLength(0)
        expect(dialogue.animationDuration).toEqual(0)

        expect(dialogue.id).toEqual("the talk")
        expect(dialogue.speakerPortraitResourceKey).toEqual("talking")
        expect(dialogue.dialogueText).toEqual("I'm saying something")
        expect(dialogue.backgroundColor).toEqual([1, 2, 3])
    })
})
