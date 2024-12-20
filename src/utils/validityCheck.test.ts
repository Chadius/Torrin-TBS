import { getValidValueOrDefault, isValidValue } from "./validityCheck"
import { describe, expect, it } from "vitest"

describe("validity test", () => {
    it("knows when a field is invalid", () => {
        expect(isValidValue("apple")).toBeTruthy()
        expect(isValidValue("")).toBeTruthy()
        expect(isValidValue(5)).toBeTruthy()
        expect(isValidValue([])).toBeTruthy()
        expect(isValidValue({})).toBeTruthy()
        expect(isValidValue(true)).toBeTruthy()

        expect(isValidValue(undefined)).toBeFalsy()
        expect(isValidValue(null)).toBeFalsy()
        expect(isValidValue(NaN)).toBeFalsy()
        expect(isValidValue(false)).toBeFalsy()
    })

    it("can get a default value when requested", () => {
        expect(getValidValueOrDefault("apple", "defaultValue")).toEqual("apple")
        expect(getValidValueOrDefault("", "defaultValue")).toEqual("")
        expect(getValidValueOrDefault(5, 0)).toEqual(5)
        expect(getValidValueOrDefault([], [0])).toEqual([])
        expect(getValidValueOrDefault({}, { key: "value" })).toEqual({})
        expect(getValidValueOrDefault(true, false)).toEqual(true)

        expect(getValidValueOrDefault(undefined, "defaultValue")).toEqual(
            "defaultValue"
        )
        expect(getValidValueOrDefault(null, "defaultValue")).toEqual(
            "defaultValue"
        )
        expect(getValidValueOrDefault(NaN, 0)).toEqual(0)
        expect(getValidValueOrDefault(false, true)).toEqual(true)
    })
})
