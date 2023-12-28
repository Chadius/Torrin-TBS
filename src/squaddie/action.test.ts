import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "./action";
import {Trait, TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {DamageType} from "./squaddieService";
import {TargetingShape} from "../battle/targeting/targetingShapeGenerator";

describe('SquaddieAction', () => {
    it('can be constructed using data object', () => {
        const data: SquaddieSquaddieAction = {
            id: "action123",
            name: "buster wolf",
            actionPointCost: 1,
            damageDescriptions: {[DamageType.SOUL]: 2},
            healingDescriptions: {},
            maximumRange: 1,
            minimumRange: 4,
            targetingShape: TargetingShape.SNAKE,
            traits: {booleanTraits: {[Trait.ATTACK]: true}},
        };

        const newAction: SquaddieSquaddieAction = data;

        expect(newAction.id).toBe(data.id);
        expect(newAction.name).toBe(data.name);
        expect(newAction.minimumRange).toBe(data.minimumRange);
        expect(newAction.maximumRange).toBe(data.maximumRange);
        expect(newAction.targetingShape).toBe(data.targetingShape);
        expect(newAction.damageDescriptions).toBe(data.damageDescriptions);
        expect(newAction.healingDescriptions).toBe(data.healingDescriptions);
        expect(newAction.actionPointCost).toBe(data.actionPointCost);
        expect(newAction.traits.booleanTraits[Trait.ATTACK]).toBe(data.traits.booleanTraits[Trait.ATTACK]);
    });

    it('throws an error if non integer turns are used', () => {
        const shouldThrowError = () => {
            SquaddieSquaddieActionService.new({
                actionPointCost: 0.1,
                id: "non integer action cost",
                maximumRange: 2,
                minimumRange: 3,
                name: "non integer action cost",
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
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
            SquaddieSquaddieActionService.new({
                actionPointCost: 1,
                id: "non integer minimum range to spend",
                minimumRange: 0.2,
                maximumRange: 3,
                name: "non integer minimum range to spend",
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
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
            SquaddieSquaddieActionService.new({
                actionPointCost: 1,
                id: "non integer maximum range to spend",
                minimumRange: 2,
                maximumRange: 0.3,
                name: "non integer maximum range to spend",
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
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
        const harmfulAttack = SquaddieSquaddieActionService.new({
            name: "longsword",
            id: "longsword",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
            }),
        });
        expect(SquaddieSquaddieActionService.isHelpful(harmfulAttack)).toBeFalsy();
        expect(SquaddieSquaddieActionService.isHindering(harmfulAttack)).toBeTruthy();
    });

    it('uses the traits to determine if it is Helpful', () => {
        const helpfulAttack = SquaddieSquaddieActionService.new({
            name: "healing word",
            id: "healing",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.HEALING]: true,
            }),
        });
        expect(SquaddieSquaddieActionService.isHelpful(helpfulAttack)).toBeTruthy();
        expect(SquaddieSquaddieActionService.isHindering(helpfulAttack)).toBeFalsy();
    });

    it('can be sanitized to fill in missing fields', () => {
        const actionWithMissingFields: SquaddieSquaddieAction = {
            name: "missing stuff",
            id: "id",
            minimumRange: 0,
            maximumRange: 1,
            traits: undefined,
            targetingShape: undefined,
            healingDescriptions: undefined,
            actionPointCost: undefined,
            damageDescriptions: undefined,
        };

        SquaddieSquaddieActionService.sanitize(actionWithMissingFields);

        expect(actionWithMissingFields.targetingShape).toEqual(TargetingShape.SNAKE);
        expect(actionWithMissingFields.actionPointCost).toEqual(1);
        expect(actionWithMissingFields.traits).toEqual(TraitStatusStorageHelper.newUsingTraitValues({}));
        expect(actionWithMissingFields.damageDescriptions).toEqual({});
        expect(actionWithMissingFields.healingDescriptions).toEqual({});
    });

    describe('sanitization', () => {
        let invalidActionBase: SquaddieSquaddieAction;

        beforeEach(() => {
            invalidActionBase = {
                name: "missing stuff",
                id: "id",
                minimumRange: 0,
                maximumRange: 1,
                traits: undefined,
                targetingShape: undefined,
                healingDescriptions: undefined,
                actionPointCost: undefined,
                damageDescriptions: undefined,
            };
        });

        const tests: { field: string, value: any }[] = [
            {
                field: "id",
                value: "",
            },
            {
                field: "id",
                value: undefined,
            },
            {
                field: "id",
                value: null,
            },
            {
                field: "name",
                value: "",
            },
            {
                field: "name",
                value: undefined,
            },
            {
                field: "name",
                value: null,
            },
            {
                field: "minimumRange",
                value: NaN,
            },
            {
                field: "minimumRange",
                value: -1,
            },
            {
                field: "minimumRange",
                value: undefined,
            },
            {
                field: "minimumRange",
                value: null,
            },
            {
                field: "maximumRange",
                value: NaN,
            },
            {
                field: "maximumRange",
                value: -1,
            },
            {
                field: "maximumRange",
                value: undefined,
            },
            {
                field: "maximumRange",
                value: null,
            },
        ];

        it.each(tests)(`$field: $value will throw an error for being invalid`, ({
                                                                                    field,
                                                                                    value
                                                                                }) => {
            const invalidAction = {
                ...invalidActionBase,
                [field]: value,
            }
            const throwErrorBecauseOfNoIdNameOrRange = () => {
                SquaddieSquaddieActionService.sanitize(invalidAction);
            };

            expect(throwErrorBecauseOfNoIdNameOrRange).toThrowError('cannot sanitize');
        });

        it('will throw an error during sanitization if minimum range is more than maximum range', () => {
            const invalidAction: SquaddieSquaddieAction = {
                ...invalidActionBase,
                minimumRange: 2,
                maximumRange: 1,
            };

            const throwErrorBecauseOfNoIdNameOrRange = () => {
                SquaddieSquaddieActionService.sanitize(invalidAction);
            };

            expect(throwErrorBecauseOfNoIdNameOrRange).toThrowError('cannot sanitize');
        });
    });
});
