import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataBlob, DataBlobService } from "../../../dataBlob/dataBlob"
import { AlwaysTrueCondition } from "../../condition/alwaysTrue"
import { LimitDecorator } from "./limit"

describe("Limit decorator", () => {
    let blackboard: DataBlob
    beforeEach(() => {
        blackboard = DataBlobService.new()
    })

    it("returns the child run result when run with a positive limit", () => {
        const trueTask: AlwaysTrueCondition = new AlwaysTrueCondition(
            blackboard
        )
        const trueTaskSpy = vi.spyOn(trueTask, "run")

        const condition = new LimitDecorator(blackboard, trueTask, { limit: 1 })
        expect(condition.run()).toBe(true)
        expect(trueTaskSpy).toHaveBeenCalled()
    })

    it("throws an error when run with without a task", () => {
        expect(() => {
            // @ts-ignore intentionally adding an invalid field to throw an exception
            new LimitDecorator(blackboard, undefined, { limit: 1 })
        }).toThrow("[LimitDecorator.constructor] must have a child task")
    })

    it("returns false when run when the limit is exceeded", () => {
        const condition = new LimitDecorator(
            blackboard,
            new AlwaysTrueCondition(blackboard),
            { limit: 1 }
        )
        condition.run()
        expect(condition.run()).toBe(false)
    })

    it("sets the limit to 1 when given an invalid limit", () => {
        ;[undefined, -1, "not a number", true].forEach((it) => {
            const noLimitGiven = new LimitDecorator(
                blackboard,
                new AlwaysTrueCondition(blackboard),
                { limit: it }
            )
            expect(noLimitGiven.limit).toEqual(1)
        })
    })
})
