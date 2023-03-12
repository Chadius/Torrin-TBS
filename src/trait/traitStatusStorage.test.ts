import {Trait, TraitCategory, TraitStatusStorage} from "./traitStatusStorage";

describe('Trait Status Storage', () => {
    let storage: TraitStatusStorage;
    beforeEach(() => {
        storage = new TraitStatusStorage();
    })
    it('should be able to create and store a value', () => {
        const error = storage.setStatus(Trait.ATTACK, true);
        expect(error).toBeUndefined();
        expect(storage.getStatus(Trait.ATTACK)).toBe(true);
    })
    it('can filter traits by type', () => {
        const constructedStorage: TraitStatusStorage = new TraitStatusStorage({
            [Trait.ATTACK]: true,
            [Trait.HUMANOID]: true,
        }).filterCategory(TraitCategory.CREATURE)

        expect(constructedStorage.getStatus(Trait.ATTACK)).toBeUndefined();
        expect(constructedStorage.getStatus(Trait.HUMANOID)).toBe(true);
    });
});
