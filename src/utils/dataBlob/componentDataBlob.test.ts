import { describe, expect, it } from "vitest"
import { ComponentDataBlob } from "./componentDataBlob"

interface TestContext {
    context: number
}

interface TestUIObjects {
    uiObject: number
}

interface TestUILayout {
    layout: number
}

describe("Component Data Blob", () => {
    it("can set and get the layout", () => {
        const data = new ComponentDataBlob<
            TestUILayout,
            TestContext,
            TestUIObjects
        >()
        data.setLayout({
            layout: 5,
        })

        const layout = data.getLayout()
        expect(layout.layout).toEqual(5)
    })

    it("can set and get the context", () => {
        const data = new ComponentDataBlob<
            TestUILayout,
            TestContext,
            TestUIObjects
        >()
        data.setContext({
            context: 2,
        })

        const context = data.getContext()
        expect(context.context).toEqual(2)
    })

    it("can set and get the UIObjects", () => {
        const data = new ComponentDataBlob<
            TestUILayout,
            TestContext,
            TestUIObjects
        >()
        data.setUIObjects({
            uiObject: 7,
        })

        const uiObject = data.getUIObjects()
        expect(uiObject.uiObject).toEqual(7)
    })
})
