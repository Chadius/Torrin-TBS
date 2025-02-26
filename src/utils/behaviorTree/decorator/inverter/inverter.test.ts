import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataBlob, DataBlobService } from "../../../dataBlob/dataBlob"
import { AlwaysTrueCondition } from "../../condition/alwaysTrue"
import { InverterDecorator } from "./inverter"
import { AlwaysFalseCondition } from "../../condition/alwaysFalse"

describe("Inverter decorator", () => {
    let blackboard: DataBlob
    beforeEach(() => {
        blackboard = DataBlobService.new()
    })

    it("runs the child and returns false if it returns true", () => {
        const trueTask: AlwaysTrueCondition = new AlwaysTrueCondition(
            blackboard
        )
        const trueTaskSpy = vi.spyOn(trueTask, "run")
        const decorator = new InverterDecorator(blackboard, trueTask)
        expect(decorator.run()).toBe(false)
        expect(trueTaskSpy).toHaveBeenCalled()
    })

    it("runs the child and returns true if it returns false", () => {
        const falseTask: AlwaysFalseCondition = new AlwaysFalseCondition(
            blackboard
        )
        const falseTaskSpy = vi.spyOn(falseTask, "run")
        const decorator = new InverterDecorator(blackboard, falseTask)
        expect(decorator.run()).toBe(true)
        expect(falseTaskSpy).toHaveBeenCalled()
    })

    it("throws an error when run with without a task", () => {
        expect(() => {
            new InverterDecorator(blackboard, undefined)
        }).toThrow("[InverterDecorator.constructor] must have a child task")
    })
})
