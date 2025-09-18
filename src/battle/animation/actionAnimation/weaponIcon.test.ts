import { Damage, Healing } from "../../../squaddie/squaddieService"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../utils/test/mocks"
import { WeaponIcon } from "./weaponIcon"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../../action/template/actionEffectTemplate"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
} from "vitest"

describe("weapon icon", () => {
    let hinderingAction: ActionTemplate
    let helpingAction: ActionTemplate

    let textSpy: MockInstance
    let mockedGraphicsContext: MockedP5GraphicsBuffer
    let graphicsSpies: { [key: string]: MockInstance }

    beforeEach(() => {
        hinderingAction = ActionTemplateService.new({
            id: "hindering",
            name: "hindering",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    damageDescriptions: {
                        [Damage.BODY]: 1,
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                }),
            ],
        })

        helpingAction = ActionTemplateService.new({
            id: "helping",
            name: "helping",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    healingDescriptions: {
                        [Healing.LOST_HIT_POINTS]: 1,
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.HEALING]: true,
                    }),
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                    },
                }),
            ],
        })

        mockedGraphicsContext = new MockedP5GraphicsBuffer()
        graphicsSpies = MockedGraphicsBufferService.addSpies(
            mockedGraphicsContext
        )
        textSpy = graphicsSpies["text"]
    })

    afterEach(() => {
        MockedGraphicsBufferService.resetSpies(graphicsSpies)
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
