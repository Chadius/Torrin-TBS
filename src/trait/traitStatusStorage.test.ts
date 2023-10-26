import {Trait, TraitCategory, TraitStatusStorage, TraitStatusStorageData} from "./traitStatusStorage";

describe('Trait Status Storage', () => {
    let storage: TraitStatusStorage;
    beforeEach(() => {
        storage = new TraitStatusStorage({});
    })
    it('should be able to create and store a value', () => {
        const error = storage.setStatus(Trait.ATTACK, true);
        expect(error).toBeUndefined();
        expect(storage.getStatus(Trait.ATTACK)).toBe(true);
    })
    it('can be created using data objects', () => {
        const data: TraitStatusStorageData = {
            booleanTraits: {
                [Trait.ATTACK]: true,
                [Trait.SKIP_ANIMATION]: false,
            }
        };
        const traitStorageFromData: TraitStatusStorage = new TraitStatusStorage({data});
        expect(traitStorageFromData.getStatus(Trait.ATTACK)).toBe(true);
        expect(traitStorageFromData.getStatus(Trait.HUMANOID)).toBeUndefined();
        expect(traitStorageFromData.getStatus(Trait.SKIP_ANIMATION)).toBe(false);
    });
    it('can filter traits by type', () => {
        const constructedStorage: TraitStatusStorage = new TraitStatusStorage({
            initialTraitValues: {
                [Trait.ATTACK]: true,
                [Trait.HUMANOID]: true,
            }
        }).filterCategory(TraitCategory.CREATURE)

        expect(constructedStorage.getStatus(Trait.ATTACK)).toBeUndefined();
        expect(constructedStorage.getStatus(Trait.HUMANOID)).toBe(true);
    });
});
