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
import { ResourceHandler } from "../../../../../resource/resourceHandler"
import {
    SquaddieActionAnimationDrawState,
    SquaddieActionAnimationDrawStateService,
} from "./squaddieActionAnimationDrawState"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
    mockResourceHandler,
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
    let resourceHandler: ResourceHandler
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let graphicsBufferSpies: { [key: string]: MockInstance }

    beforeEach(() => {
        repository = ObjectRepositoryService.new()
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mockResourceHandler(mockedP5GraphicsContext)
        resourceHandler.loadResource = vi.fn().mockImplementation(() => {})
        resourceHandler.getResource = vi
            .fn()
            .mockReturnValue({ width: 32, height: 32 })
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
        squaddieActionAnimationDrawState =
            SquaddieActionAnimationDrawStateService.new({
                animationPlan,
                resourceHandler,
                repository,
            })
    })

    afterEach(() => {
        MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
    })

    it("will call the resource handler to load the images for the actor and target sprites", () => {
        let resourceSpy = vi
            .spyOn(resourceHandler, "loadResource")
            .mockImplementation(() => {})

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
            expect(resourceSpy).toHaveBeenCalledWith(key)
        })

        resourceSpy.mockRestore()
    })

    it("once the resource handler loads the images it will create objects to store each sprite", () => {
        let resourceSpy = vi.spyOn(resourceHandler, "getResource")

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
            expect(resourceSpy).toHaveBeenCalledWith(key.resourceKey)
        })

        expectedSquaddieImageKeys.forEach((key) => {
            expect(
                squaddieActionAnimationDrawState.imagesBySquaddieAndEmotion[
                    key.battleSquaddieId
                ]?.[key.emotion]?.resourceKey
            ).toBe(key.resourceKey)
        })

        resourceSpy.mockRestore()
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
