import { DamageType, HealingType } from "../../../squaddie/squaddieService"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import { WeaponIcon } from "./weaponIcon"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../../../action/template/actionEffectTemplate"
import { beforeEach, describe, expect, it, MockInstance, vi } from "vitest"

describe("weapon icon", () => {
    let hinderingAction: ActionTemplate
    let helpingAction: ActionTemplate

    let textSpy: MockInstance
    let mockedGraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        hinderingAction = ActionTemplateService.new({
            id: "hindering",
            name: "hindering",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    damageDescriptions: {
                        [DamageType.BODY]: 1,
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        ATTACK: true,
                        [Trait.TARGET_FOE]: true,
                    }),
                }),
            ],
        })

        helpingAction = ActionTemplateService.new({
            id: "helping",
            name: "helping",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    healingDescriptions: {
                        [HealingType.LOST_HIT_POINTS]: 1,
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        HEALING: true,
                        [Trait.TARGET_ALLY]: true,
                    }),
                }),
            ],
        })

        mockedGraphicsContext = new MockedP5GraphicsBuffer()
        textSpy = vi
            .spyOn(mockedGraphicsContext.mockedP5, "text")
            .mockReturnValue(undefined)
    })

    it("shows the phrase Attacking! when using a hindering ability", () => {
        const icon: WeaponIcon = new WeaponIcon()
        const area: RectArea = RectAreaService.new({
            left: 0,
            top: 0,
            width: 100,
            height: 20,
        })
        icon.draw({
            actionEffectSquaddieTemplate:
                hinderingAction.actionEffectTemplates[0],
            graphicsContext: mockedGraphicsContext,
            actorImageArea: area,
        })

        expect(textSpy).toBeCalled()
        expect(textSpy).toBeCalledWith(
            expect.stringMatching(`Attacking!`),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    it("shows the phrase Helping... when using a helping ability", () => {
        const icon: WeaponIcon = new WeaponIcon()
        const area: RectArea = RectAreaService.new({
            left: 0,
            top: 0,
            width: 100,
            height: 20,
        })
        icon.draw({
            actionEffectSquaddieTemplate:
                helpingAction.actionEffectTemplates[0],
            graphicsContext: mockedGraphicsContext,
            actorImageArea: area,
        })

        expect(textSpy).toBeCalled()
        expect(textSpy).toBeCalledWith(
            expect.stringMatching(`Helping...`),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })
})
