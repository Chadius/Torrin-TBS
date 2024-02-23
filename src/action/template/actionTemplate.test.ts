import {ActionTemplateService} from "./actionTemplate";
import {ActionEffectSquaddieTemplateService} from "./actionEffectSquaddieTemplate";
import {DamageType, HealingType} from "../../squaddie/squaddieService";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {TargetingShape} from "../../battle/targeting/targetingShapeGenerator";
import {ActionEffectMovementTemplateService} from "./actionEffectMovementTemplate";

describe('ActionTemplate', () => {
    it('can create a template with default values without an id', () => {
        const justMovement = ActionTemplateService.new({
            name: "Move",
        });

        expect(justMovement.name).toEqual("Move");
        expect(justMovement.id).toBeUndefined();
        expect(justMovement.actionEffectTemplates).toHaveLength(0);
        expect(justMovement.actionPoints).toEqual(1);
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

    it('can describe the damage and heal totals', () => {
        const actionTemplate = ActionTemplateService.new({
            id: "actionTemplate",
            name: "actionTemplate",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    damageDescriptions: {
                        [DamageType.BODY]: 3,
                        [DamageType.SOUL]: 1,
                    }
                }),
                ActionEffectSquaddieTemplateService.new({
                    damageDescriptions: {
                        [DamageType.MIND]: 2,
                    },
                    healingDescriptions: {
                        [HealingType.LOST_HIT_POINTS]: 4,
                    },
                }),
            ]
        });

        expect(ActionTemplateService.getTotalDamage(actionTemplate)).toEqual(6);
        expect(ActionTemplateService.getTotalHealing(actionTemplate)).toEqual(4);
    });

    describe('MultipleAttackPenalty', () => {
        it('cannot contribute if it has no effects', () => {
            const justMovement = ActionTemplateService.new({
                name: "Move",
            });
            expect(ActionTemplateService.multipleAttackPenaltyMultiplier(justMovement)).toEqual(0);
        });
        it('knows if none of its effect templates contribute', () => {
            const noMAP = ActionTemplateService.new({
                name: "quick slap",
                actionEffectTemplates: [
                    ActionEffectMovementTemplateService.new({}),
                    ActionEffectSquaddieTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.NO_MULTIPLE_ATTACK_PENALTY]: true,
                            [Trait.ATTACK]: true,
                        }),
                    }),
                ],
            });
            expect(ActionTemplateService.multipleAttackPenaltyMultiplier(noMAP)).toEqual(0);
        });
        it('knows if at least one of its effect templates contributes', () => {
            const withMap = ActionTemplateService.new({
                name: "sword strike",
                actionEffectTemplates: [
                    ActionEffectMovementTemplateService.new({}),
                    ActionEffectSquaddieTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                        }),
                    }),
                ],
            });
            expect(ActionTemplateService.multipleAttackPenaltyMultiplier(withMap)).toEqual(1);
        });
    });
});
