import { describe, expect, it } from "vitest"
import { DataBlobService } from "../../dataBlob/dataBlob"
import { DoesObjectHaveKeyExistCondition } from "./doesObjectHaveKeyExistCondition"

interface TestCustomObject {
    customInteger?: number
}

describe("Does Object Have Key Exist Condition", () => {
    it("returns false if the object does not exist", () => {
        const data = DataBlobService.new()
        const condition = new DoesObjectHaveKeyExistCondition<TestCustomObject>(
            {
                data: data,
                dataObjectName: "testCustomObject",
                objectKey: "customInteger",
            }
        )
        expect(condition.run()).toBeFalsy()
    })
    it("returns false if the key does not exist in the object", () => {
        const data = DataBlobService.new()
        DataBlobService.add<TestCustomObject>(data, "testCustomObject", {})
        const condition = new DoesObjectHaveKeyExistCondition<TestCustomObject>(
            {
                data: data,
                dataObjectName: "testCustomObject",
                objectKey: "customInteger",
            }
        )
        expect(condition.run()).toBeFalsy()
    })
    it("returns true if the key does exist in the object", () => {
        const data = DataBlobService.new()
        DataBlobService.add<TestCustomObject>(data, "testCustomObject", {
            customInteger: 1,
        })
        const condition = new DoesObjectHaveKeyExistCondition<TestCustomObject>(
            {
                data: data,
                dataObjectName: "testCustomObject",
                objectKey: "customInteger",
            }
        )
        expect(condition.run()).toBeTruthy()
    })
})
