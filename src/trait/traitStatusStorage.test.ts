import {Trait, TraitCategory, TraitStatusStorage, TraitStatusStorageHelper} from "./traitStatusStorage";

describe('Trait Status Storage', () => {
    let storage: TraitStatusStorage;
    beforeEach(() => {
        storage = TraitStatusStorageHelper.newUsingTraitValues();
    })
    it('should be able to create and store a value', () => {
        TraitStatusStorageHelper.setStatus(storage, Trait.ATTACK, true);
        expect(TraitStatusStorageHelper.getStatus(storage, Trait.ATTACK)).toBe(true);
    })
    it('can be created using data objects', () => {
        const data: TraitStatusStorage = {
            booleanTraits: {
                [Trait.ATTACK]: true,
                [Trait.SKIP_ANIMATION]: false,
            }
        };
        const traitStorageFromData: TraitStatusStorage = TraitStatusStorageHelper.clone(data);
        expect(TraitStatusStorageHelper.getStatus(traitStorageFromData, Trait.ATTACK)).toBe(true);
        expect(TraitStatusStorageHelper.getStatus(traitStorageFromData, Trait.HUMANOID)).toBeUndefined();
        expect(TraitStatusStorageHelper.getStatus(traitStorageFromData, Trait.SKIP_ANIMATION)).toBe(false);
    });
    it('can filter traits by type', () => {
        const constructedStorage: TraitStatusStorage = TraitStatusStorageHelper.newUsingTraitValues({
            [Trait.ATTACK]: true,
            [Trait.HUMANOID]: true,
        });
        const storageWithCreatureTraits: TraitStatusStorage = TraitStatusStorageHelper.filterCategory(constructedStorage, TraitCategory.CREATURE);

        expect(TraitStatusStorageHelper.getStatus(storageWithCreatureTraits, Trait.ATTACK)).toBeUndefined();
        expect(TraitStatusStorageHelper.getStatus(storageWithCreatureTraits, Trait.HUMANOID)).toBe(true);
    });
});
