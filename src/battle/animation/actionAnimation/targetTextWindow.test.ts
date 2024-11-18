import { TargetTextWindow } from "./targetTextWindow"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../../campaign/squaddieTemplate"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { DefaultArmyAttributes } from "../../../squaddie/armyAttributes"
import { BattleSquaddie, BattleSquaddieService } from "../../battleSquaddie"
import { SquaddieTurnService } from "../../../squaddie/turn"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import { ActionAnimationPhase } from "./actionAnimationConstants"
import { ActionTimer } from "./actionTimer"
import { DamageType, HealingType } from "../../../squaddie/squaddieService"
import { DegreeOfSuccess } from "../../calculator/actionCalculator/degreeOfSuccess"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    ActionEffectTemplate,
    ActionEffectTemplateService,
} from "../../../action/template/actionEffectTemplate"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../../history/battleAction/battleActionSquaddieChange"
import {
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "../../../squaddie/attributeModifier"

describe("TargetTextWindow", () => {
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let mockedActionTimer: ActionTimer

    let targetWindow: TargetTextWindow
    let targetSquaddie: SquaddieTemplate
    let targetBattle: BattleSquaddie
    let targetResultTakenDamage: BattleActionSquaddieChange
    let targetResultHealingReceived: BattleActionSquaddieChange

    let attackAction: ActionTemplate
    let healingAction: ActionTemplate

    beforeEach(() => {
        attackAction = ActionTemplateService.new({
            id: "attack",
            name: "attack action",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    damageDescriptions: {
                        [DamageType.BODY]: 2,
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_FOE]: true,
                    }),
                }),
            ],
        })

        healingAction = ActionTemplateService.new({
            id: "heal",
            name: "healing action",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    healingDescriptions: {
                        [HealingType.LOST_HIT_POINTS]: 3,
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.TARGET_SELF]: true,
                        [Trait.TARGET_ALLY]: true,
                    }),
                }),
            ],
        })

        targetSquaddie = SquaddieTemplateService.new({
            squaddieId: {
                name: "Target",
                affiliation: SquaddieAffiliation.UNKNOWN,
                resources: {
                    actionSpritesByEmotion: {},
                    mapIconResourceKey: "",
                },
                templateId: "targetTemplateId",
                traits: TraitStatusStorageService.newUsingTraitValues({}),
            },
            attributes: DefaultArmyAttributes(),
        })

        targetBattle = BattleSquaddieService.new({
            squaddieTemplateId: targetSquaddie.squaddieId.templateId,
            squaddieTurn: SquaddieTurnService.new(),
            battleSquaddieId: "targetBattleId",
            inBattleAttributes: InBattleAttributesService.new({}),
        })

        targetResultTakenDamage = BattleActionSquaddieChangeService.new({
            healingReceived: 0,
            damageExplanation: DamageExplanationService.new({
                net: 2,
            }),
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
            battleSquaddieId: "targetBattleId",
        })

        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        mockedActionTimer = new ActionTimer()

        targetWindow = new TargetTextWindow()
    })

    it("shows the target name", () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultTakenDamage,
            actionEffectSquaddieTemplate: attackAction
                .actionEffectTemplates[0] as ActionEffectTemplate,
        })

        expect(targetWindow.targetLabel.textBox.text).toContain(
            targetSquaddie.squaddieId.name
        )
    })

    it("shows the target armor if the attack deals body damage", () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultTakenDamage,
            actionEffectSquaddieTemplate: attackAction
                .actionEffectTemplates[0] as ActionEffectTemplate,
        })

        expect(targetWindow.targetLabel.textBox.text).toContain(
            `Armor ${targetBattle.inBattleAttributes.armyAttributes.armorClass}`
        )
    })

    describe("Armor bonus", () => {
        beforeEach(() => {
            targetBattle.inBattleAttributes.attributeModifiers.push(
                AttributeModifierService.new({
                    type: AttributeType.ARMOR,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 9001,
                    duration: 1,
                    description: "Impenetrable Armor",
                })
            )
        })

        it("shows the target armor bonus in target window if the action is an attack", () => {
            targetWindow.start({
                targetTemplate: targetSquaddie,
                targetBattle: targetBattle,
                result: targetResultTakenDamage,
                actionEffectSquaddieTemplate: attackAction
                    .actionEffectTemplates[0] as ActionEffectTemplate,
            })

            expect(targetWindow.targetLabel.textBox.text).toContain(
                `Armor ${targetBattle.inBattleAttributes.armyAttributes.armorClass + 9001}`
            )
            expect(targetWindow.targetLabel.textBox.text).toContain(
                `${targetBattle.inBattleAttributes.armyAttributes.armorClass}`
            )
            expect(targetWindow.targetLabel.textBox.text).toContain(
                `+9001 Armor`
            )
        })

        it("shows the target armor bonus in text only", () => {
            targetWindow.start({
                targetTemplate: targetSquaddie,
                targetBattle: targetBattle,
                result: targetResultTakenDamage,
                actionEffectSquaddieTemplate: attackAction
                    .actionEffectTemplates[0] as ActionEffectTemplate,
            })

            expect(targetWindow.targetLabel.textBox.text).toContain(
                `Armor ${targetBattle.inBattleAttributes.armyAttributes.armorClass + 9001}`
            )
            expect(targetWindow.targetLabel.textBox.text).toContain(
                `${targetBattle.inBattleAttributes.armyAttributes.armorClass}`
            )
            expect(targetWindow.targetLabel.textBox.text).toContain(
                `+9001 Armor`
            )
        })
    })

    it("does not show the target armor if the action heals", () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultHealingReceived,
            actionEffectSquaddieTemplate: healingAction
                .actionEffectTemplates[0] as ActionEffectTemplate,
        })

        expect(targetWindow.targetLabel.textBox.text).not.toContain(
            `Armor ${targetBattle.inBattleAttributes.armyAttributes.armorClass}`
        )
    })

    it("shows the damage taken", () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultTakenDamage,
            actionEffectSquaddieTemplate: attackAction
                .actionEffectTemplates[0] as ActionEffectTemplate,
        })

        const timerSpy = jest
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.TARGET_REACTS)
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(targetWindow.targetLabel.textBox.text).toContain(
            `${targetResultTakenDamage.damage.net} damage`
        )
    })

    it("shows if critical damage was taken", () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: {
                ...targetResultTakenDamage,
                actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
            },
            actionEffectSquaddieTemplate: attackAction
                .actionEffectTemplates[0] as ActionEffectTemplate,
        })

        const timerSpy = jest
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.TARGET_REACTS)
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(targetWindow.targetLabel.textBox.text).toContain(`CRITICAL HIT!`)
        expect(targetWindow.targetLabel.textBox.text).toContain(
            `${targetResultTakenDamage.damage.net} damage`
        )
    })

    it("shows a critical miss", () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: BattleActionSquaddieChangeService.new({
                ...targetResultTakenDamage,
                damageExplanation: DamageExplanationService.new({
                    net: 0,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
            }),
            actionEffectSquaddieTemplate: attackAction
                .actionEffectTemplates[0] as ActionEffectTemplate,
        })

        const timerSpy = jest
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.TARGET_REACTS)
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(targetWindow.targetLabel.textBox.text).toContain(
            `CRITICAL MISS!!`
        )
    })

    it("shows if the actor missed", () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            actionEffectSquaddieTemplate: attackAction
                .actionEffectTemplates[0] as ActionEffectTemplate,
            result: BattleActionSquaddieChangeService.new({
                actorDegreeOfSuccess: DegreeOfSuccess.FAILURE,
                damageExplanation: DamageExplanationService.new({
                    net: 0,
                }),
                healingReceived: 0,
                battleSquaddieId: targetBattle.battleSquaddieId,
            }),
        })

        const timerSpy = jest
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.TARGET_REACTS)
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(targetWindow.targetLabel.textBox.text).toContain(`MISS`)
    })

    it("shows if the actor hit but dealt 0 damage", () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            actionEffectSquaddieTemplate: attackAction
                .actionEffectTemplates[0] as ActionEffectTemplate,
            result: BattleActionSquaddieChangeService.new({
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                damageExplanation: DamageExplanationService.new({
                    net: 0,
                }),
                healingReceived: 0,
                battleSquaddieId: targetBattle.battleSquaddieId,
            }),
        })

        const timerSpy = jest
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.TARGET_REACTS)
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(targetWindow.targetLabel.textBox.text).toContain(`NO DAMAGE`)
    })

    it("shows the healing received", () => {
        targetResultHealingReceived = BattleActionSquaddieChangeService.new({
            healingReceived: 2,
            damageExplanation: DamageExplanationService.new({
                net: 0,
            }),
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
            battleSquaddieId: targetBattle.battleSquaddieId,
        })

        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultHealingReceived,
            actionEffectSquaddieTemplate: healingAction
                .actionEffectTemplates[0] as ActionEffectTemplate,
        })

        const timerSpy = jest
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.TARGET_REACTS)
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(targetWindow.targetLabel.textBox.text).toBe(
            `${targetSquaddie.squaddieId.name}\n${targetResultTakenDamage.damage.net} healed`
        )
    })
})
