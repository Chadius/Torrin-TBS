import { beforeEach, describe, expect, it, vi } from "vitest"
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
import { DamageType } from "../../../squaddie/squaddieService"
import { DegreeOfSuccess } from "../../calculator/actionCalculator/degreeOfSuccess"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    ActionEffectTemplate,
    ActionEffectTemplateService,
} from "../../../action/template/actionEffectTemplate"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../../history/battleAction/battleActionSquaddieChange"
import { ActionResultTextService } from "../actionResultTextService"
import { ActionTimer } from "./actionTimer"
import { ActionAnimationPhase } from "./actionAnimationConstants"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"

describe("TargetTextWindow", () => {
    let targetWindow: TargetTextWindow
    let targetSquaddie: SquaddieTemplate
    let targetBattle: BattleSquaddie
    let targetResultTakenDamage: BattleActionSquaddieChange

    let attackAction: ActionTemplate

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

        targetWindow = new TargetTextWindow()
    })

    it("calls a submodule to generate the before text", () => {
        const textSpy = vi.spyOn(ActionResultTextService, "getBeforeActionText")
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultTakenDamage,
            actionEffectSquaddieTemplate: attackAction
                .actionEffectTemplates[0] as ActionEffectTemplate,
        })
        expect(textSpy).toBeCalledWith({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            actionEffectSquaddieTemplate: attackAction.actionEffectTemplates[0],
        })
        textSpy.mockRestore()
    })

    it("generates the after text once the timer is ready", () => {
        const textSpy = vi.spyOn(ActionResultTextService, "getAfterActionText")

        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultTakenDamage,
            actionEffectSquaddieTemplate: attackAction
                .actionEffectTemplates[0] as ActionEffectTemplate,
        })

        const timer = new ActionTimer()
        const timerSpy = vi
            .spyOn(timer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.TARGET_REACTS)

        const mockedP5GraphicsContext = new MockedP5GraphicsBuffer()

        targetWindow.draw(mockedP5GraphicsContext, timer)
        expect(textSpy).toBeCalledWith({ result: targetResultTakenDamage })
        expect(timerSpy).toBeCalled()

        textSpy.mockRestore()
        timerSpy.mockRestore()
    })
})
