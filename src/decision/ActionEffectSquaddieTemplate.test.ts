import {ActionEffectSquaddieTemplate, ActionEffectSquaddieTemplateService} from "./actionEffectSquaddieTemplate";
import {Trait, TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {DamageType} from "../squaddie/squaddieService";
import {TargetingShape} from "../battle/targeting/targetingShapeGenerator";

describe('ActionEffectSquaddieTemplate', () => {
    it('can be constructed using data object', () => {
        const data: ActionEffectSquaddieTemplate = ActionEffectSquaddieTemplateService.new({
            TODODELETEMEid: "action123",
            TODODELETEMEname: "buster wolf",
            TODODELETEMEactionPointCost: 1,
            damageDescriptions: {[DamageType.SOUL]: 2},
            healingDescriptions: {},
            minimumRange: 1,
            maximumRange: 4,
            targetingShape: TargetingShape.SNAKE,
            traits: {booleanTraits: {[Trait.ATTACK]: true}},
        });

        const newAction: ActionEffectSquaddieTemplate = data;

        expect(newAction.TODODELETEMEid).toBe(data.TODODELETEMEid);
        expect(newAction.TODODELETEMEname).toBe(data.TODODELETEMEname);
        expect(newAction.minimumRange).toBe(data.minimumRange);
        expect(newAction.maximumRange).toBe(data.maximumRange);
        expect(newAction.targetingShape).toBe(data.targetingShape);
        expect(newAction.damageDescriptions).toBe(data.damageDescriptions);
        expect(newAction.healingDescriptions).toBe(data.healingDescriptions);
        expect(newAction.TODODELETEMEactionPointCost).toBe(data.TODODELETEMEactionPointCost);
        expect(newAction.traits.booleanTraits[Trait.ATTACK]).toBe(data.traits.booleanTraits[Trait.ATTACK]);
    });

    it('throws an error if non integer turns are used', () => {
        const shouldThrowError = () => {
            ActionEffectSquaddieTemplateService.new({
                TODODELETEMEactionPointCost: 0.1,
                TODODELETEMEid: "non integer action cost",
                maximumRange: 2,
                minimumRange: 3,
                TODODELETEMEname: "non integer action cost",
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
            ActionEffectSquaddieTemplateService.new({
                TODODELETEMEactionPointCost: 1,
                TODODELETEMEid: "non integer minimum range to spend",
                minimumRange: 0.2,
                maximumRange: 3,
                TODODELETEMEname: "non integer minimum range to spend",
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
            ActionEffectSquaddieTemplateService.new({
                TODODELETEMEactionPointCost: 1,
                TODODELETEMEid: "non integer maximum range to spend",
                minimumRange: 2,
                maximumRange: 0.3,
                TODODELETEMEname: "non integer maximum range to spend",
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
        const harmfulAttack = ActionEffectSquaddieTemplateService.new({
            TODODELETEMEname: "longsword",
            TODODELETEMEid: "longsword",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
            }),
        });
        expect(ActionEffectSquaddieTemplateService.isHelpful(harmfulAttack)).toBeFalsy();
        expect(ActionEffectSquaddieTemplateService.isHindering(harmfulAttack)).toBeTruthy();
    });

    it('uses the traits to determine if it is Helpful', () => {
        const helpfulAttack = ActionEffectSquaddieTemplateService.new({
            TODODELETEMEname: "healing word",
            TODODELETEMEid: "healing",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.HEALING]: true,
            }),
        });
        expect(ActionEffectSquaddieTemplateService.isHelpful(helpfulAttack)).toBeTruthy();
        expect(ActionEffectSquaddieTemplateService.isHindering(helpfulAttack)).toBeFalsy();
    });

    it('can be sanitized to fill in missing fields', () => {
        const actionWithMissingFields: ActionEffectSquaddieTemplate = ActionEffectSquaddieTemplateService.new({
            TODODELETEMEname: "missing stuff",
            TODODELETEMEid: "id",
            minimumRange: 0,
            maximumRange: 1,
            traits: undefined,
            targetingShape: undefined,
            healingDescriptions: undefined,
            TODODELETEMEactionPointCost: undefined,
            damageDescriptions: undefined,
        });

        ActionEffectSquaddieTemplateService.sanitize(actionWithMissingFields);

        expect(actionWithMissingFields.targetingShape).toEqual(TargetingShape.SNAKE);
        expect(actionWithMissingFields.TODODELETEMEactionPointCost).toEqual(1);
        expect(actionWithMissingFields.traits).toEqual(TraitStatusStorageHelper.newUsingTraitValues({}));
        expect(actionWithMissingFields.damageDescriptions).toEqual({});
        expect(actionWithMissingFields.healingDescriptions).toEqual({});
    });

    describe('sanitization', () => {
        let invalidActionBase: ActionEffectSquaddieTemplate;

        beforeEach(() => {
            invalidActionBase = ActionEffectSquaddieTemplateService.new({
                TODODELETEMEname: "missing stuff",
                TODODELETEMEid: "id",
                minimumRange: 0,
                maximumRange: 1,
                traits: undefined,
                targetingShape: undefined,
                healingDescriptions: undefined,
                TODODELETEMEactionPointCost: undefined,
                damageDescriptions: undefined,
            });
        });

        const tests: { field: string, value: any }[] = [
            {
                field: "TODODELETEMEid",
                value: "",
            },
            {
                field: "TODODELETEMEid",
                value: undefined,
            },
            {
                field: "TODODELETEMEid",
                value: null,
            },
            {
                field: "TODODELETEMEname",
                value: "",
            },
            {
                field: "TODODELETEMEname",
                value: undefined,
            },
            {
                field: "TODODELETEMEname",
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
                ActionEffectSquaddieTemplateService.sanitize(invalidAction);
            };

            expect(throwErrorBecauseOfNoIdNameOrRange).toThrowError('cannot sanitize');
        });

        it('will throw an error during sanitization if minimum range is more than maximum range', () => {
            const invalidAction: ActionEffectSquaddieTemplate = {
                ...invalidActionBase,
                minimumRange: 2,
                maximumRange: 1,
            };

            const throwErrorBecauseOfNoIdNameOrRange = () => {
                ActionEffectSquaddieTemplateService.sanitize(invalidAction);
            };

            expect(throwErrorBecauseOfNoIdNameOrRange).toThrowError('cannot sanitize');
        });
    });
});
