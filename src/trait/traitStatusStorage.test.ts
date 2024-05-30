import {
    Trait,
    TraitCategory,
    TraitStatusStorage,
    TraitStatusStorageService,
} from "./traitStatusStorage"

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
})
