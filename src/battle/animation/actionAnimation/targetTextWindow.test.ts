import {TargetTextWindow} from "./targetTextWindow";
import {SquaddieTemplate, SquaddieTemplateService} from "../../../campaign/squaddieTemplate";
import {SquaddieAffiliation} from "../../../squaddie/squaddieAffiliation";
import {Trait, TraitStatusStorageService} from "../../../trait/traitStatusStorage";
import {DefaultArmyAttributes} from "../../../squaddie/armyAttributes";
import {BattleSquaddie, BattleSquaddieService} from "../../battleSquaddie";
import {SquaddieTurnService} from "../../../squaddie/turn";
import {InBattleAttributesHandler} from "../../stats/inBattleAttributes";
import {ActionResultPerSquaddie} from "../../history/actionResultPerSquaddie";
import {ActionAnimationPhase} from "./actionAnimationConstants";
import {MockedP5GraphicsContext} from "../../../utils/test/mocks";
import {ActionTimer} from "./actionTimer";
import {DamageType, HealingType} from "../../../squaddie/squaddieService";
import {DegreeOfSuccess} from "../../actionCalculator/degreeOfSuccess";
import {ActionTemplate, ActionTemplateService} from "../../../action/template/actionTemplate";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../../action/template/actionEffectSquaddieTemplate";

describe('TargetTextWindow', () => {
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    let mockedActionTimer: ActionTimer;

    let targetWindow: TargetTextWindow;
    let targetSquaddie: SquaddieTemplate;
    let targetBattle: BattleSquaddie;
    let targetResultTakenDamage: ActionResultPerSquaddie;
    let targetResultHealingReceived: ActionResultPerSquaddie;

    let attackAction: ActionTemplate;
    let healingAction: ActionTemplate;

    beforeEach(() => {
        attackAction = ActionTemplateService.new({
            id: "attack",
            name: "attack action",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    damageDescriptions: {
                        [DamageType.BODY]: 2,
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGETS_FOE]: true,
                    })
                })
            ]
        });

        healingAction = ActionTemplateService.new({
            id: "heal",
            name: "healing action",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    healingDescriptions: {
                        [HealingType.LOST_HIT_POINTS]: 3,
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.TARGETS_SELF]: true,
                        [Trait.TARGETS_ALLIES]: true,
                    }),
                })
            ]
        });

        targetSquaddie = SquaddieTemplateService.new({
            squaddieId: {
                name: "Target",
                affiliation: SquaddieAffiliation.UNKNOWN,
                resources: {
                    actionSpritesByEmotion: {},
                    mapIconResourceKey: ""
                },
                templateId: "targetTemplateId",
                traits: TraitStatusStorageService.newUsingTraitValues({}),
            },
            attributes: DefaultArmyAttributes(),
        });

        targetBattle = BattleSquaddieService.new({
            squaddieTemplateId: targetSquaddie.squaddieId.templateId,
            squaddieTurn: SquaddieTurnService.new(),
            battleSquaddieId: "targetBattleId",
            inBattleAttributes: InBattleAttributesHandler.new(),
        })

        targetResultTakenDamage = {
            healingReceived: 0,
            damageTaken: 2,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
        }

        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        mockedActionTimer = new ActionTimer();

        targetWindow = new TargetTextWindow();
    });

    it('shows the target name', () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultTakenDamage,
            actionEffectSquaddieTemplate: attackAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        });

        expect(targetWindow.targetLabel.textBox.text).toContain(targetSquaddie.squaddieId.name);
    });

    it('shows the target armor if the attack deals body damage', () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultTakenDamage,
            actionEffectSquaddieTemplate: attackAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        });

        expect(targetWindow.targetLabel.textBox.text).toContain(`AC ${targetBattle.inBattleAttributes.armyAttributes.armorClass}`);
    });

    it('does not show the target armor if the action heals', () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultHealingReceived,
            actionEffectSquaddieTemplate: healingAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        });

        expect(targetWindow.targetLabel.textBox.text).not.toContain(`AC ${targetBattle.inBattleAttributes.armyAttributes.armorClass}`);
    });

    it('shows the damage taken', () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultTakenDamage,
            actionEffectSquaddieTemplate: attackAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.TARGET_REACTS);
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(targetWindow.targetLabel.textBox.text).toContain(`${targetResultTakenDamage.damageTaken} damage`);
    });

    it('shows if critical damage was taken', () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: {
                ...targetResultTakenDamage,
                actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
            },
            actionEffectSquaddieTemplate: attackAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.TARGET_REACTS);
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(targetWindow.targetLabel.textBox.text).toContain(`CRITICAL HIT!`);
        expect(targetWindow.targetLabel.textBox.text).toContain(`${targetResultTakenDamage.damageTaken} damage`);
    });

    it('shows a critical miss', () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: {
                ...targetResultTakenDamage,
                damageTaken: 0,
                actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
            },
            actionEffectSquaddieTemplate: attackAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.TARGET_REACTS);
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(targetWindow.targetLabel.textBox.text).toContain(`CRITICAL MISS!!`);
    });

    it('shows if the actor missed', () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            actionEffectSquaddieTemplate: attackAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            result: {
                actorDegreeOfSuccess: DegreeOfSuccess.FAILURE,
                damageTaken: 0,
                healingReceived: 0,
            },
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.TARGET_REACTS);
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(targetWindow.targetLabel.textBox.text).toContain(`MISS`);
    });

    it('shows if the actor hit but dealt 0 damage', () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            actionEffectSquaddieTemplate: attackAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            result: {
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                damageTaken: 0,
                healingReceived: 0,
            },
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.TARGET_REACTS);
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(targetWindow.targetLabel.textBox.text).toContain(`NO DAMAGE`);
    });

    it('shows the healing received', () => {
        targetResultHealingReceived = {
            healingReceived: 2,
            damageTaken: 0,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
        }

        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultHealingReceived,
            actionEffectSquaddieTemplate: healingAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.TARGET_REACTS);
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(targetWindow.targetLabel.textBox.text).toBe(`${targetSquaddie.squaddieId.name}\n${targetResultTakenDamage.damageTaken} healed`);
    });
});
