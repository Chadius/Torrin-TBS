import {ActionTemplateService} from "./actionTemplate";
import {ActionEffectSquaddieTemplateService} from "./actionEffectSquaddieTemplate";
import {DamageType} from "../../squaddie/squaddieService";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {TargetingShape} from "../../battle/targeting/targetingShapeGenerator";

describe ('ActionTemplate', () => {
    it('can create a template with default values without an id', () => {
        const justMovement = ActionTemplateService.new({
            name: "Move",
        });

        expect(justMovement.name).toEqual("Move");
        expect(justMovement.id).toBeUndefined();
        expect(justMovement.actionEffectTemplates).toHaveLength(0);
    });

    it('can create a template with new action effects', () => {
        const attackTemplate = ActionEffectSquaddieTemplateService.new({
            damageDescriptions: {[DamageType.BODY]: 2},
            minimumRange: 1,
            maximumRange: 1,
            targetingShape: TargetingShape.SNAKE,
            healingDescriptions: {},
            traits: TraitStatusStorageService.newUsingTraitValues({[Trait.ATTACK]: true}),
        })

        const justMovement = ActionTemplateService.new({
            id: "strike",
            name: "strike",
            actionEffectTemplates: [attackTemplate],
        });

        expect(justMovement.actionEffectTemplates).toHaveLength(1);
        expect(justMovement.actionEffectTemplates[0]).toEqual(attackTemplate);
    });

    it('will throw an error if the template has no name', () => {
        const throwErrorBecauseOfNoName = () => {
            ActionTemplateService.new({
                name: undefined,
            });
        };

        expect(throwErrorBecauseOfNoName).toThrowError('cannot sanitize');
    })
});
