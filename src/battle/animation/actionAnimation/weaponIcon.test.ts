import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../../decision/actionEffectSquaddieTemplate";
import {DamageType, HealingType} from "../../../squaddie/squaddieService";
import {TraitStatusStorageHelper} from "../../../trait/traitStatusStorage";
import {MockedP5GraphicsContext} from "../../../utils/test/mocks";
import {WeaponIcon} from "./weaponIcon";
import {RectArea, RectAreaService} from "../../../ui/rectArea";

describe('weapon icon', () => {
    let hinderingAction: ActionEffectSquaddieTemplate;
    let helpingAction: ActionEffectSquaddieTemplate;

    let textSpy: jest.SpyInstance;
    let mockedGraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        hinderingAction = ActionEffectSquaddieTemplateService.new({
            id: "hindering",
            name: "hindering",
            damageDescriptions: {
                [DamageType.BODY]: 1,
            },
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                ATTACK: true
            }),
        });

        helpingAction = ActionEffectSquaddieTemplateService.new({
            id: "helping",
            name: "helping",
            healingDescriptions: {
                [HealingType.LOST_HIT_POINTS]: 1,
            },
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                HEALING: true
            }),
        });

        mockedGraphicsContext = new MockedP5GraphicsContext();
        textSpy = jest.spyOn(mockedGraphicsContext.mockedP5, "text").mockReturnValue(undefined);
    })

    it('shows the phrase Attacking! when using a hindering ability', () => {
        const icon: WeaponIcon = new WeaponIcon();
        const area: RectArea = RectAreaService.new({
            left: 0,
            top: 0,
            width: 100,
            height: 20,
        });
        icon.draw({
            actionEffectSquaddieTemplate: hinderingAction,
            graphicsContext: mockedGraphicsContext,
            actorImageArea: area,
        });

        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith(expect.stringMatching(`Attacking!`),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        );
    });

    it('shows the phrase Helping... when using a helping ability', () => {
        const icon: WeaponIcon = new WeaponIcon();
        const area: RectArea = RectAreaService.new({
            left: 0,
            top: 0,
            width: 100,
            height: 20,
        });
        icon.draw({
            actionEffectSquaddieTemplate: helpingAction,
            graphicsContext: mockedGraphicsContext,
            actorImageArea: area,
        });

        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith(expect.stringMatching(`Helping...`),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        );
    });
});
