import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { TargetSprite } from "./targetSprite"
import { ActionTimer } from "./actionTimer"
import {
    ActionAnimationPhase,
    SquaddieEmotion,
} from "./actionAnimationConstants"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { SquaddieSprite } from "./squaddieSprite"
import { CreateNewSquaddieMovementWithTraits } from "../../../squaddie/movement"
import { DamageType, HealingType } from "../../../squaddie/squaddieService"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { DegreeOfSuccess } from "../../calculator/actionCalculator/degreeOfSuccess"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../../action/template/actionEffectSquaddieTemplate"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
} from "../../history/battleActionSquaddieChange"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"

describe("Target Sprite", () => {
    let resultTookDamage: BattleActionSquaddieChange
    let resultTookLethalDamage: BattleActionSquaddieChange
    let resultMissed: BattleActionSquaddieChange
    let resultDealsNoDamage: BattleActionSquaddieChange
    let resultHealsSquaddie: BattleActionSquaddieChange

    let hinderingAction: ActionTemplate
    let helpfulAction: ActionTemplate

    let squaddieRepository: ObjectRepository
    let timer: ActionTimer
    const battleSquaddieId = "target0"
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        jest.spyOn(Date, "now").mockImplementation(() => 0)

        squaddieRepository = ObjectRepositoryService.new()
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            affiliation: SquaddieAffiliation.ALLY,
            attributes: {
                maxHitPoints: 5,
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                }),
                armorClass: 0,
            },
            battleId: battleSquaddieId,
            name: "Target",
            objectRepository: squaddieRepository,
            templateId: "target",
            actionTemplateIds: [],
        })

        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                squaddieRepository,
                battleSquaddieId
            )
        )

        resultTookDamage = BattleActionSquaddieChangeService.new({
            battleSquaddieId,
            damageTaken: 1,
            healingReceived: 0,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
        })
        resultTookLethalDamage = BattleActionSquaddieChangeService.new({
            battleSquaddieId,
            damageTaken: squaddieTemplate.attributes.maxHitPoints,
            healingReceived: 0,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
        })
        resultMissed = BattleActionSquaddieChangeService.new({
            battleSquaddieId,
            damageTaken: 0,
            healingReceived: 0,
            actorDegreeOfSuccess: DegreeOfSuccess.FAILURE,
        })
        resultDealsNoDamage = BattleActionSquaddieChangeService.new({
            battleSquaddieId,
            damageTaken: 0,
            healingReceived: 0,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
        })
        resultHealsSquaddie = BattleActionSquaddieChangeService.new({
            battleSquaddieId,
            damageTaken: 0,
            healingReceived: 1,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
        })

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
                        [Trait.TARGETS_FOE]: true,
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
                    }),
                }),
            ],
        })

        timer = new ActionTimer()
        timer.start()

        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
    })

    it("uses helper function to determine the emotion", () => {
        const sprite = new TargetSprite()
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
            actionEffectSquaddieTemplate: undefined,
            resourceHandler: undefined,
            result: resultTookDamage,
            squaddieRepository,
            targetBattleSquaddieId: battleSquaddieId,
            startingPosition: 0,
        })

        sprite.draw(
            timer,
            mockedP5GraphicsContext,
            ActionEffectSquaddieTemplateService.new({
                minimumRange: 0,
                maximumRange: 1,
            }),
            resultTookDamage
        )

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
        const sprite = new TargetSprite()
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultTookDamage,
            actionEffectSquaddieTemplateService: hinderingAction
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        })

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL)
        expect(getterSpy).toBeCalled()
    })
    it("starts with a TARGETED emotion if the effect is damaging and the attack just started", () => {
        const getterSpy = mockActionTimerPhase(
            ActionAnimationPhase.DURING_ACTION
        )
        const sprite = new TargetSprite()
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultTookDamage,
            actionEffectSquaddieTemplateService: hinderingAction
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        })

        expect(emotion).toBe(SquaddieEmotion.TARGETED)
        expect(getterSpy).toBeCalled()
    })
    it("transitions to DAMAGED when the attack hits and the squaddie survives", () => {
        const getterSpy = mockActionTimerPhase(
            ActionAnimationPhase.TARGET_REACTS
        )
        const sprite = new TargetSprite()
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultTookDamage,
            actionEffectSquaddieTemplateService: hinderingAction
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        })

        expect(emotion).toBe(SquaddieEmotion.DAMAGED)
        expect(getterSpy).toBeCalled()
    })
    it("transitions to DEAD if it kills the target", () => {
        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                squaddieRepository,
                battleSquaddieId
            )
        )
        battleSquaddie.inBattleAttributes.currentHitPoints = 0

        const getterSpy = mockActionTimerPhase(
            ActionAnimationPhase.TARGET_REACTS
        )
        const sprite = new TargetSprite()
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultTookLethalDamage,
            actionEffectSquaddieTemplateService: hinderingAction
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        })

        expect(emotion).toBe(SquaddieEmotion.DEAD)
        expect(getterSpy).toBeCalled()
    })
    it("transition to NEUTRAL when the attack misses", () => {
        const getterSpy = mockActionTimerPhase(
            ActionAnimationPhase.TARGET_REACTS
        )
        const sprite = new TargetSprite()
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultMissed,
            actionEffectSquaddieTemplateService: hinderingAction
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        })

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL)
        expect(getterSpy).toBeCalled()
    })
    it("transition to NEUTRAL when the attack deals no damage", () => {
        const getterSpy = mockActionTimerPhase(
            ActionAnimationPhase.TARGET_REACTS
        )
        const sprite = new TargetSprite()
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultDealsNoDamage,
            actionEffectSquaddieTemplateService: hinderingAction
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        })

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL)
        expect(getterSpy).toBeCalled()
    })

    it("starts with a NEUTRAL emotion if the action is Helpful", () => {
        const getterSpy = mockActionTimerPhase(
            ActionAnimationPhase.DURING_ACTION
        )
        const sprite = new TargetSprite()
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultHealsSquaddie,
            actionEffectSquaddieTemplateService: helpfulAction
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        })

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL)
        expect(getterSpy).toBeCalled()
    })
    it("transitions to a THANKFUL emotion if the result helps the target", () => {
        const getterSpy = mockActionTimerPhase(
            ActionAnimationPhase.TARGET_REACTS
        )
        const sprite = new TargetSprite()
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultHealsSquaddie,
            actionEffectSquaddieTemplateService: helpfulAction
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        })

        expect(emotion).toBe(SquaddieEmotion.THANKFUL)
        expect(getterSpy).toBeCalled()
    })

    describe("should keep the same emotion in TARGET_REACTS, SHOWING_RESULTS and FINISHED_SHOWING_RESULTS", () => {
        let mapping: {
            [name: string]: {
                result: BattleActionSquaddieChange
                action: ActionEffectSquaddieTemplate
            }
        }

        const tests: {
            name: string
        }[] = [
            {
                name: "deals nonlethal damage",
            },
            {
                name: "deals lethal damage",
            },
            {
                name: "heals damage",
            },
        ]

        beforeEach(() => {
            mapping = {
                "deals nonlethal damage": {
                    result: resultTookDamage,
                    action: hinderingAction
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                },
                "deals lethal damage": {
                    result: resultTookLethalDamage,
                    action: hinderingAction
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                },
                "heals damage": {
                    result: resultHealsSquaddie,
                    action: helpfulAction
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                },
            }
        })

        it.each(tests)(`$name will show the same emotion`, ({ name }) => {
            const result = mapping[name].result
            const action = mapping[name].action
            const sprite = new TargetSprite()
            mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS)
            const targetReactsEmotion = sprite.getSquaddieEmotion({
                timer,
                battleSquaddieId,
                squaddieRepository,
                result,
                actionEffectSquaddieTemplateService: action,
            })

            const showingResultsSpy = mockActionTimerPhase(
                ActionAnimationPhase.SHOWING_RESULTS
            )
            expect(
                sprite.getSquaddieEmotion({
                    timer,
                    battleSquaddieId,
                    squaddieRepository,
                    result,
                    actionEffectSquaddieTemplateService: action,
                })
            ).toBe(targetReactsEmotion)
            expect(showingResultsSpy).toBeCalled()

            const finishedShowingResultsSpy = mockActionTimerPhase(
                ActionAnimationPhase.FINISHED_SHOWING_RESULTS
            )
            expect(
                sprite.getSquaddieEmotion({
                    timer,
                    battleSquaddieId,
                    squaddieRepository,
                    result,
                    actionEffectSquaddieTemplateService: action,
                })
            ).toBe(targetReactsEmotion)
            expect(finishedShowingResultsSpy).toBeCalled()
        })
    })
})
