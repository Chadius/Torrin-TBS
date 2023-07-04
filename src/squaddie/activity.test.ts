import {SquaddieActivity} from "./activity";
import {TraitStatusStorage} from "../trait/traitStatusStorage";

describe('SquaddieActivity', () => {
    it('throws an error if non integer turns are used', () => {
        const shouldThrowError = () => {
            new SquaddieActivity({
                actionsToSpend: 0.1,
                id: "non integer actions to spend",
                maximumRange: 2,
                minimumRange: 3,
                name: "non integer actions to spend",
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
            new SquaddieActivity({
                actionsToSpend: 1,
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
            new SquaddieActivity({
                actionsToSpend: 1,
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
});
