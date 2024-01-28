import {ActionEffectSquaddieTemplate, ActionEffectSquaddieTemplateService} from "./actionEffectSquaddieTemplate";
import {Trait, TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {DamageType} from "../squaddie/squaddieService";
import {TargetingShape} from "../battle/targeting/targetingShapeGenerator";
import {ActionTemplate, ActionTemplateService} from "./actionTemplate";

describe('ActionTemplate', () => {
    it('can be constructed using data object', () => {
        const actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate = ActionEffectSquaddieTemplateService.new({
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

        const data = ActionTemplateService.new({
            id: "action123",
            name: "buster wolf",
            actionPointCost: 1,
            traits: {booleanTraits: {[Trait.ATTACK]: true}},
            actionEffectTemplates: [
                actionEffectSquaddieTemplate,
            ],
        });

        expect(data.id).toEqual("action123");
        expect(data.name).toEqual("buster wolf");
        expect(data.actionPointCost).toEqual(1);
        expect(data.traits.booleanTraits[Trait.ATTACK]).toEqual(true);
    });

    it('throws an error if using non integer action point', () => {
        const shouldThrowError = () => {
            ActionTemplateService.new({
                id: "non integer action cost",
                name: "non integer action cost",
                actionPointCost: 0.1,
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
            });
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Value must be an integer: 0.1");
    });

    it('can be sanitized to fill in missing fields', () => {
        const actionTemplateWithMissingFields = ActionTemplateService.new({
            id: "id",
            name: "missing stuff",
            traits: undefined,
        });

        ActionTemplateService.sanitize(actionTemplateWithMissingFields);

        expect(actionTemplateWithMissingFields.actionPointCost).toEqual(1);
        expect(actionTemplateWithMissingFields.traits).toEqual(TraitStatusStorageHelper.newUsingTraitValues({}));
    });

    describe('sanitization', () => {
        let invalidActionBase: ActionTemplate;

        beforeEach(() => {
            invalidActionBase = {
                id: "id",
                name: "missing stuff",
                actionEffectTemplates: undefined,
                actionPointCost: undefined,
                traits: undefined,
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
        ];

        it.each(tests)(`$field: $value will throw an error for being invalid`, ({
                                                                                    field,
                                                                                    value
                                                                                }) => {
            const invalidAction = {
                ...invalidActionBase,
                [field]: value,
            }
            const throwErrorBecauseOfNoIdName = () => {
                ActionTemplateService.sanitize(invalidAction);
            };

            expect(throwErrorBecauseOfNoIdName).toThrowError('cannot sanitize');
        });
    });
});
