import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataBlob, DataBlobService } from "../../../dataBlob/dataBlob"
import { AlwaysTrueCondition } from "../../condition/alwaysTrue"
import { UntilFailDecorator } from "./untilFail"
import { LimitDecorator } from "../limit/limit"

describe("Until Fail decorator", () => {
    let blackboard: DataBlob
    beforeEach(() => {
        blackboard = DataBlobService.new()
    })

    it("returns true once the child task fails", () => {
        const failOnTheThirdAttempt: LimitDecorator = new LimitDecorator(
            blackboard,
            new AlwaysTrueCondition(blackboard),
            { limit: 2 }
        )
        const limitSpy = vi.spyOn(failOnTheThirdAttempt, "run")

        const condition = new UntilFailDecorator(
            blackboard,
            failOnTheThirdAttempt
        )
        expect(condition.run()).toBe(true)
        expect(limitSpy).toHaveBeenCalledTimes(3)
    })

    it("throws an error when run with without a task", () => {
        expect(() => {
            new UntilFailDecorator(blackboard, undefined)
        }).toThrow("[UntilFailDecorator.constructor] must have a child task")
    })
})
