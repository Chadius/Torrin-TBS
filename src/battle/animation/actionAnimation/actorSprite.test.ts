import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { ActorSprite } from "./actorSprite"
import { ActionTimer } from "./actionTimer"
import {
    ActionAnimationPhase,
    SquaddieEmotion,
} from "./actionAnimationConstants"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import { SquaddieSprite } from "./squaddieSprite"
import { SquaddieMovementService } from "../../../squaddie/movement"
import { DamageType, HealingType } from "../../../squaddie/squaddieService"
import { TraitStatusStorageService } from "../../../trait/traitStatusStorage"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../../action/template/actionEffectSquaddieTemplate"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { BattleActionSquaddieChangeService } from "../../history/battleAction/battleActionSquaddieChange"

describe("Actor Sprite", () => {
    let squaddieRepository: ObjectRepository
    let timer: ActionTimer
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    const battleSquaddieId = "actor0"

    let hinderingAction: ActionTemplate
    let helpfulAction: ActionTemplate

    beforeEach(() => {
        jest.spyOn(Date, "now").mockImplementation(() => 0)

        squaddieRepository = ObjectRepositoryService.new()
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            affiliation: SquaddieAffiliation.ALLY,
            attributes: {
                maxHitPoints: 5,
                movement: SquaddieMovementService.new({
                    movementPerAction: 2,
                }),
                armorClass: 0,
            },
            battleId: battleSquaddieId,
            name: "actor",
            objectRepository: squaddieRepository,
            templateId: "actor",
            actionTemplateIds: [],
        })

        timer = new ActionTimer()
        timer.start()
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()

        hinderingAction = ActionTemplateService.new({
            id: "hindering",
            name: "hindering",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    damageDescriptions: {
                        [DamageType.BODY]: 1,
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        ATTACK: true,
                        TARGET_FOE: true,
                    }),
                }),
            ],
        })

        helpfulAction = ActionTemplateService.new({
            id: "helping",
            name: "helping",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    healingDescriptions: {
                        [HealingType.LOST_HIT_POINTS]: 1,
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        HEALING: true,
                        TARGET_ALLY: true,
                    }),
                }),
            ],
        })
    })

    it("uses helper function to determine the emotion", () => {
        const sprite = new ActorSprite()
        const getterSpy = mockActionTimerPhase(
            ActionAnimationPhase.BEFORE_ACTION
        )
        jest.spyOn(
            SquaddieSprite.prototype,
            "beginLoadingActorImages"
        ).mockReturnValue()
        jest.spyOn(
            SquaddieSprite.prototype,
            "createActorImagesWithLoadedData"
        ).mockReturnValue({ justCreatedImages: false })
        const getSquaddieEmotionSpy = jest
            .spyOn(sprite, "getSquaddieEmotion")
            .mockReturnValue(SquaddieEmotion.NEUTRAL)

        sprite.start({
            resourceHandler: undefined,
            squaddieRepository,
            actorBattleSquaddieId: battleSquaddieId,
            startingPosition: 0,
            squaddieChanges: BattleActionSquaddieChangeService.new({
                battleSquaddieId: "target squaddie id",
            }),
        })

        sprite.draw({
            timer,
            graphicsContext: mockedP5GraphicsContext,
            actionEffectSquaddieTemplate: hinderingAction
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        })

        expect(getSquaddieEmotionSpy).toBeCalled()
        expect(getterSpy).toBeCalled()
    })

    function mockActionTimerPhase(actionAnimationPhase: ActionAnimationPhase) {
        return jest
            .spyOn(timer, "currentPhase", "get")
            .mockReturnValue(actionAnimationPhase)
    }

    it("starts with a NEUTRAL emotion if the attack has not started", () => {
        const getterSpy = mockActionTimerPhase(
            ActionAnimationPhase.BEFORE_ACTION
        )
        const sprite = new ActorSprite()
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            action: hinderingAction
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        })

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL)
        expect(getterSpy).toBeCalled()
    })
    it("starts with a ATTACK emotion if the effect is damaging and the attack just started", () => {
        const getterSpy = mockActionTimerPhase(
            ActionAnimationPhase.DURING_ACTION
        )
        const sprite = new ActorSprite()
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            action: hinderingAction
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        })

        expect(emotion).toBe(SquaddieEmotion.ATTACK)
        expect(getterSpy).toBeCalled()
    })

    it("starts with a ASSISTING emotion if the effect is helpful and the attack just started", () => {
        const getterSpy = mockActionTimerPhase(
            ActionAnimationPhase.DURING_ACTION
        )
        const sprite = new ActorSprite()
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            action: helpfulAction
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        })

        expect(emotion).toBe(SquaddieEmotion.ASSISTING)
        expect(getterSpy).toBeCalled()
    })

    describe("should keep the same emotion in DURING_ACTION, TARGET_REACTS, SHOWING_RESULTS and FINISHED_SHOWING_RESULTS", () => {
        let mapping: {
            [name: string]: {
                action: ActionEffectSquaddieTemplate
            }
        }

        const tests: { name: string }[] = [
            {
                name: "deals damage",
            },
            {
                name: "heals damage",
            },
        ]
        beforeEach(() => {
            mapping = {
                "deals damage": {
                    action: hinderingAction
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                },
                "heals damage": {
                    action: helpfulAction
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                },
            }
        })
        it.each(tests)(`$name will show the same emotion`, ({ name }) => {
            const action = mapping[name].action
            const sprite = new ActorSprite()
            mockActionTimerPhase(ActionAnimationPhase.DURING_ACTION)
            const duringActionEmotion = sprite.getSquaddieEmotion({
                timer,
                battleSquaddieId,
                squaddieRepository,
                action,
            })

            const targetReactsSpy = mockActionTimerPhase(
                ActionAnimationPhase.TARGET_REACTS
            )
            expect(
                sprite.getSquaddieEmotion({
                    timer,
                    battleSquaddieId,
                    squaddieRepository,
                    action,
                })
            ).toBe(duringActionEmotion)
            expect(targetReactsSpy).toBeCalled()

            const showingResultsSpy = mockActionTimerPhase(
                ActionAnimationPhase.SHOWING_RESULTS
            )
            expect(
                sprite.getSquaddieEmotion({
                    timer,
                    battleSquaddieId,
                    squaddieRepository,
                    action,
                })
            ).toBe(duringActionEmotion)
            expect(showingResultsSpy).toBeCalled()

            const finishedShowingResultsSpy = mockActionTimerPhase(
                ActionAnimationPhase.FINISHED_SHOWING_RESULTS
            )
            expect(
                sprite.getSquaddieEmotion({
                    timer,
                    battleSquaddieId,
                    squaddieRepository,
                    action,
                })
            ).toBe(duringActionEmotion)
            expect(finishedShowingResultsSpy).toBeCalled()
        })
    })
})
