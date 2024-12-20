import {
    Trait,
    TraitCategory,
    TraitStatusStorage,
    TraitStatusStorageService,
} from "./traitStatusStorage"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"

describe("Trait Status Storage", () => {
    let storage: TraitStatusStorage
    beforeEach(() => {
        storage = TraitStatusStorageService.newUsingTraitValues()
    })
    it("should be able to create and store a value", () => {
        TraitStatusStorageService.setStatus(storage, Trait.ATTACK, true)
        expect(TraitStatusStorageService.getStatus(storage, Trait.ATTACK)).toBe(
            true
        )
    })
    it("can be created using data objects", () => {
        const data: TraitStatusStorage = {
            booleanTraits: {
                [Trait.ATTACK]: true,
                [Trait.SKIP_ANIMATION]: false,
            },
        }
        const traitStorageFromData: TraitStatusStorage =
            TraitStatusStorageService.clone(data)
        expect(
            TraitStatusStorageService.getStatus(
                traitStorageFromData,
                Trait.ATTACK
            )
        ).toBe(true)
        expect(
            TraitStatusStorageService.getStatus(
                traitStorageFromData,
                Trait.HUMANOID
            )
        ).toBeUndefined()
        expect(
            TraitStatusStorageService.getStatus(
                traitStorageFromData,
                Trait.SKIP_ANIMATION
            )
        ).toBe(false)
    })
    it("can filter traits by type", () => {
        const constructedStorage: TraitStatusStorage =
            TraitStatusStorageService.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.HUMANOID]: true,
            })
        const storageWithCreatureTraits: TraitStatusStorage =
            TraitStatusStorageService.filterCategory(
                constructedStorage,
                TraitCategory.CREATURE
            )

        expect(
            TraitStatusStorageService.getStatus(
                storageWithCreatureTraits,
                Trait.ATTACK
            )
        ).toBeUndefined()
        expect(
            TraitStatusStorageService.getStatus(
                storageWithCreatureTraits,
                Trait.HUMANOID
            )
        ).toBe(true)
    })
    describe("warn when the trait names are unknown", () => {
        const jsonBlob: string = `{"ATTACK": true, "BOGUS": true}`
        let consoleLogSpy: MockInstance
        beforeEach(() => {
            consoleLogSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {})
        })
        afterEach(() => {
            consoleLogSpy.mockRestore()
        })

        it("using new", () => {
            const traits: TraitStatusStorage =
                TraitStatusStorageService.newUsingTraitValues(
                    JSON.parse(jsonBlob)
                )
            expect(
                TraitStatusStorageService.getStatus(traits, Trait.ATTACK)
            ).toBeTruthy()
            expect(consoleLogSpy).toBeCalledWith(
                "[TraitStatusStorageService] BOGUS is not a trait, ignoring"
            )
        })
        it("using sanitize", () => {
            const traits: TraitStatusStorage = {
                booleanTraits: JSON.parse(jsonBlob),
            }
            const sanitizedTraits = TraitStatusStorageService.sanitize(traits)
            expect(consoleLogSpy).toBeCalledWith(
                "[TraitStatusStorageService] BOGUS is not a trait, ignoring"
            )
            expect(
                Object.keys(traits.booleanTraits).includes("BOGUS")
            ).toBeFalsy()
            expect(
                Object.keys(sanitizedTraits.booleanTraits).includes("BOGUS")
            ).toBeFalsy()
        })
    })
})
