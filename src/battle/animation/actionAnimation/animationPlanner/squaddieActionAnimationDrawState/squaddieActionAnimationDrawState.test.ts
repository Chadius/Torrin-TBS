import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import {
    SquaddieActionAnimationPlan,
    SquaddieActionAnimationPlanService,
} from "../squaddieActionAnimationPlanService"
import { BattleActionService } from "../../../../history/battleAction/battleAction"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../../../../history/battleAction/battleActionSquaddieChange"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../objectRepository"
import {
    ResourceRepository,
    ResourceRepositoryScope,
    ResourceRepositoryService,
} from "../../../../../resource/resourceRepository"
import { TestLoadImmediatelyImageLoader } from "../../../../../resource/resourceRepositoryTestUtils"
import { LoadCampaignData } from "../../../../../utils/fileHandling/loadCampaignData"
import {
    SquaddieActionAnimationDrawState,
    SquaddieActionAnimationDrawStateService,
} from "./squaddieActionAnimationDrawState"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../../utils/test/mocks"
import {
    ActionRange,
    TargetConstraintsService,
} from "../../../../../action/targetConstraints"
import { CoordinateGeneratorShape } from "../../../../targeting/coordinateGenerator"
import { ActionTemplateService } from "../../../../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
    VersusSquaddieResistance,
} from "../../../../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../../../trait/traitStatusStorage"
import { Damage } from "../../../../../squaddie/squaddieService"
import { SquaddieRepositoryService } from "../../../../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../../../../squaddie/squaddieAffiliation"
import {
    SquaddieEmotion,
    TSquaddieEmotion,
} from "../../actionAnimationConstants"
import { DegreeOfSuccess } from "../../../../calculator/actionCalculator/degreeOfSuccess"

describe("SquaddieActionAnimationDrawer", () => {
    let squaddieActionAnimationDrawState: SquaddieActionAnimationDrawState
    let animationPlan: SquaddieActionAnimationPlan

    let repository: ObjectRepository
    let resourceRepository: ResourceRepository
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let graphicsBufferSpies: { [key: string]: MockInstance }

    beforeEach(async () => {
        repository = ObjectRepositoryService.new()
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        const loadImmediatelyImageLoader = new TestLoadImmediatelyImageLoader(
            {}
        )
        resourceRepository = ResourceRepositoryService.new({
            imageLoader: loadImmediatelyImageLoader,
            urls: {
                ...Object.fromEntries(
                    LoadCampaignData.getResourceKeys().map((key) => [
                        key,
                        "url",
                    ])
                ),
                actor_neutral: "actor_neutral",
                actor_attack: "actor_attack",
                actor_assisting: "actor_assisting",
                target_neutral: "target_neutral",
                target_damaged: "target_damaged",
                target_targeted: "target_targeted",
                target_dead: "target_dead",
            },
        })
        graphicsBufferSpies = MockedGraphicsBufferService.addSpies(
            mockedP5GraphicsContext
        )
        ObjectRepositoryService.addActionTemplate(
            repository,
            ActionTemplateService.new({
                id: "longsword",
                name: "longsword",
                buttonIconResourceKey: "longsword",
                targetConstraints: TargetConstraintsService.new({
                    range: ActionRange.MELEE,
                    coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                        },
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                        }),
                        versusSquaddieResistance:
                            VersusSquaddieResistance.ARMOR,
                        damageDescriptions: {
                            [Damage.BODY]: 2,
                        },
                    }),
                ],
            })
        )
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "actor",
            templateId: "actor",
            battleId: "actor",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: repository,
            actionTemplateIds: ["longsword"],
            actionSpritesByEmotion: {
                [SquaddieEmotion.NEUTRAL]: "actor_neutral",
                [SquaddieEmotion.ATTACK]: "actor_attack",
                [SquaddieEmotion.ASSISTING]: "actor_assisting",
            },
        })
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "target",
            templateId: "target",
            battleId: "target",
            affiliation: SquaddieAffiliation.ENEMY,
            objectRepository: repository,
            actionTemplateIds: [],
            actionSpritesByEmotion: {
                [SquaddieEmotion.NEUTRAL]: "target_neutral",
                [SquaddieEmotion.DAMAGED]: "target_damaged",
                [SquaddieEmotion.TARGETED]: "target_targeted",
                [SquaddieEmotion.DEAD]: "target_dead",
            },
        })
        animationPlan = SquaddieActionAnimationPlanService.createAnimationPlan({
            repository,
            battleAction: BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: "actor",
                },
                action: { actionTemplateId: "longsword" },
                effect: {
                    squaddie: [
                        BattleActionSquaddieChangeService.new({
                            battleSquaddieId: "target",
                            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                            damageExplanation: DamageExplanationService.new({
                                net: 1,
                                absorbed: 0,
                                raw: 2,
                                willKo: false,
                            }),
                        }),
                    ],
                },
            }),
        })
        resourceRepository = ResourceRepositoryService.queueImages({
            resourceRepository,
            imagesToQueue: [
                { key: "actor_neutral", scope: ResourceRepositoryScope.BATTLE },
                { key: "actor_attack", scope: ResourceRepositoryScope.BATTLE },
                {
                    key: "actor_assisting",
                    scope: ResourceRepositoryScope.BATTLE,
                },
                {
                    key: "target_neutral",
                    scope: ResourceRepositoryScope.BATTLE,
                },
                {
                    key: "target_damaged",
                    scope: ResourceRepositoryScope.BATTLE,
                },
                {
                    key: "target_targeted",
                    scope: ResourceRepositoryScope.BATTLE,
                },
                { key: "target_dead", scope: ResourceRepositoryScope.BATTLE },
            ],
        })

        resourceRepository =
            ResourceRepositoryService.beginLoadingAllQueuedImages({
                graphics: mockedP5GraphicsContext,
                resourceRepository,
            })
        resourceRepository =
            await ResourceRepositoryService.blockUntilLoadingCompletes({
                resourceRepository,
            })

        squaddieActionAnimationDrawState =
            SquaddieActionAnimationDrawStateService.new({
                animationPlan,
                resourceRepository,
                repository,
            })
    })

    afterEach(() => {
        MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
    })

    it("will use the resource repository to get the images for the actor and target sprites", () => {
        SquaddieActionAnimationDrawStateService.draw({
            drawState: squaddieActionAnimationDrawState,
            graphicsContext: mockedP5GraphicsContext,
        })

        const squaddieImageResourceKeys = animationPlan.events.map((event) => {
            const { squaddieTemplate } =
                ObjectRepositoryService.getSquaddieByBattleId(
                    repository,
                    event.battleSquaddieId
                )

            return squaddieTemplate.squaddieId.resources.actionSpritesByEmotion[
                event.squaddieEmotion
            ]
        })

        expect(squaddieImageResourceKeys.some((key) => key == undefined)).toBe(
            false
        )

        const expectedResourceKeys = squaddieImageResourceKeys.filter(
            (key) => key !== undefined
        )

        expectedResourceKeys.forEach((key) => {
            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository,
                    key,
                }).status
            ).toBeDefined()
        })
    })

    it("once the resource repository provides the images it will create objects to store each sprite", () => {
        SquaddieActionAnimationDrawStateService.draw({
            drawState: squaddieActionAnimationDrawState,
            graphicsContext: mockedP5GraphicsContext,
        })

        const expectedSquaddieImageKeys: {
            battleSquaddieId: string
            emotion: TSquaddieEmotion
            resourceKey: string
        }[] = animationPlan.events
            .map((event) => {
                const { squaddieTemplate } =
                    ObjectRepositoryService.getSquaddieByBattleId(
                        repository,
                        event.battleSquaddieId
                    )

                const resourceKey =
                    squaddieTemplate.squaddieId.resources
                        .actionSpritesByEmotion[event.squaddieEmotion]
                return resourceKey
                    ? {
                          battleSquaddieId: event.battleSquaddieId,
                          emotion: event.squaddieEmotion,
                          resourceKey: resourceKey,
                      }
                    : undefined
            })
            .filter((key) => key !== undefined)

        expectedSquaddieImageKeys.forEach((key) => {
            expect(
                ResourceRepositoryService.getImage({
                    resourceRepository,
                    key: key.resourceKey,
                })
            ).toBeDefined()
        })

        expectedSquaddieImageKeys.forEach((key) => {
            expect(
                squaddieActionAnimationDrawState.imagesBySquaddieAndEmotion[
                    key.battleSquaddieId
                ]?.[key.emotion]?.resourceKey
            ).toBe(key.resourceKey)
        })
    })

    it("will position the images correctly", () => {
        const dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)

        SquaddieActionAnimationDrawStateService.draw({
            drawState: squaddieActionAnimationDrawState,
            graphicsContext: mockedP5GraphicsContext,
        })

        const expectedSquaddieInformation =
            SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions({
                animationPlan,
                timeElapsed: 0,
            })
        expect(expectedSquaddieInformation["actor"]).toBeDefined()
        const actorCurrentImage =
            squaddieActionAnimationDrawState.imagesBySquaddieAndEmotion[
                "actor"
            ]?.[expectedSquaddieInformation["actor"]?.squaddieEmotion]

        expect(actorCurrentImage).toBeDefined()
        if (actorCurrentImage == undefined) return

        expect(mockedP5GraphicsContext.image).toHaveBeenCalledWith(
            actorCurrentImage.graphic,
            expectedSquaddieInformation["actor"]?.screenLocation.x -
                actorCurrentImage.drawArea.width,
            expectedSquaddieInformation["actor"]?.screenLocation.y -
                actorCurrentImage.drawArea.height,
            actorCurrentImage.drawArea.width,
            actorCurrentImage.drawArea.height
        )

        expect(expectedSquaddieInformation["target"]).toBeDefined()
        const targetCurrentImage =
            squaddieActionAnimationDrawState.imagesBySquaddieAndEmotion[
                "target"
            ]?.[expectedSquaddieInformation["target"]?.squaddieEmotion]
        expect(targetCurrentImage).toBeDefined()
        if (targetCurrentImage == undefined) return

        expect(mockedP5GraphicsContext.image).toHaveBeenCalledWith(
            targetCurrentImage.graphic,
            expectedSquaddieInformation["target"]?.screenLocation.x,
            expectedSquaddieInformation["target"]?.screenLocation.y -
                targetCurrentImage.drawArea.height,
            targetCurrentImage.drawArea.width,
            targetCurrentImage.drawArea.height
        )

        expect(dateSpy).toHaveBeenCalled()
        dateSpy.mockRestore()
    })
})
