import {SquaddieAction, SquaddieActionData} from "./action";
import {Trait, TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";
import {DamageType} from "./squaddieService";
import {TargetingShape} from "../battle/targeting/targetingShapeGenerator";

describe('SquaddieAction', () => {
    it('can be constructed using data object', () => {
        const data: SquaddieActionData = {
            id: "action123",
            name: "buster wolf",
            actionPointCost: 1,
            damageDescriptions: {[DamageType.Soul]: 2},
            healingDescriptions: {},
            maximumRange: 1,
            minimumRange: 4,
            targetingShape: TargetingShape.Snake,
            traits: {booleanTraits: {[Trait.ATTACK]: true}},
        };

        const newAction: SquaddieAction = new SquaddieAction({data});

        expect(newAction.id).toBe(data.id);
        expect(newAction.name).toBe(data.name);
        expect(newAction.minimumRange).toBe(data.minimumRange);
        expect(newAction.maximumRange).toBe(data.maximumRange);
        expect(newAction.targetingShape).toBe(data.targetingShape);
        expect(newAction.damageDescriptions).toBe(data.damageDescriptions);
        expect(newAction.healingDescriptions).toBe(data.healingDescriptions);
        expect(newAction.actionPointCost).toBe(data.actionPointCost);
        expect(newAction.traits.getStatus(Trait.ATTACK)).toBe(data.traits.booleanTraits[Trait.ATTACK]);
    });

    it('throws an error if non integer turns are used', () => {
        const shouldThrowError = () => {
            new SquaddieAction({
                actionPointCost: 0.1,
                id: "non integer action cost",
                maximumRange: 2,
                minimumRange: 3,
                name: "non integer action cost",
                traits: new TraitStatusStorage({}),
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Value must be an integer: 0.1");
    });

    it('throws an error if non integer minimum range is used', () => {
        const shouldThrowError = () => {
            new SquaddieAction({
                actionPointCost: 1,
                id: "non integer minimum range to spend",
                minimumRange: 0.2,
                maximumRange: 3,
                name: "non integer minimum range to spend",
                traits: new TraitStatusStorage({}),
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Value must be an integer: 0.2");
    });

    it('throws an error if non integer maximum range is used', () => {
        const shouldThrowError = () => {
            new SquaddieAction({
                actionPointCost: 1,
                id: "non integer maximum range to spend",
                minimumRange: 2,
                maximumRange: 0.3,
                name: "non integer maximum range to spend",
                traits: new TraitStatusStorage({}),
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Value must be an integer: 0.3");
    });

    it('uses the traits to determine if it is Harmful', () => {
        const harmfulAttack = new SquaddieAction({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage({
                initialTraitValues: {
                    [Trait.ATTACK]: true,
                }
            }).filterCategory(TraitCategory.ACTION),
        });
        expect(harmfulAttack.isHelpful).toBeFalsy();
        expect(harmfulAttack.isHindering).toBeTruthy();
    });

    it('uses the traits to determine if it is Helpful', () => {
        const helpfulAttack = new SquaddieAction({
            name: "healing word",
            id: "healing",
            traits: new TraitStatusStorage({
                initialTraitValues: {
                    [Trait.HEALING]: true,
                }
            }).filterCategory(TraitCategory.ACTION),
        });
        expect(helpfulAttack.isHelpful).toBeTruthy();
        expect(helpfulAttack.isHindering).toBeFalsy();
    });
});
