import {SquaddieAction} from "./action";
import {Trait, TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";

describe('SquaddieAction', () => {
    it('throws an error if non integer turns are used', () => {
        const shouldThrowError = () => {
            new SquaddieAction({
                actionPointCost: 0.1,
                id: "non integer action cost",
                maximumRange: 2,
                minimumRange: 3,
                name: "non integer action cost",
                traits: new TraitStatusStorage(),
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
                traits: new TraitStatusStorage(),
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
                traits: new TraitStatusStorage(),
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
                [Trait.ATTACK]: true,
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
                [Trait.HEALING]: true,
            }).filterCategory(TraitCategory.ACTION),
        });
        expect(helpfulAttack.isHelpful).toBeTruthy();
        expect(helpfulAttack.isHindering).toBeFalsy();
    });
});
