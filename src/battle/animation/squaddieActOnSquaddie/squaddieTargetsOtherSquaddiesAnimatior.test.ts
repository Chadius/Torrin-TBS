import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { BattleSquaddie } from "../../battleSquaddie"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../../orchestrator/battleOrchestratorComponent"
import {
    ResourceRepository,
    ResourceRepositoryService,
} from "../../../resource/resourceRepository"
import { TestLoadImmediatelyImageLoader } from "../../../resource/resourceRepositoryTestUtils"
import { LoadCampaignData } from "../../../utils/fileHandling/loadCampaignData"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import {
    CreateNewKnightSquaddie,
    CreateNewThiefSquaddie,
} from "../../../utils/test/squaddie"
import { Damage } from "../../../squaddie/squaddieService"
import { SquaddieTargetsOtherSquaddiesAnimator } from "./squaddieTargetsOtherSquaddiesAnimatior"
import { BattleStateService } from "../../battleState/battleState"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
    VersusSquaddieResistance,
} from "../../../action/template/actionEffectTemplate"
import { DegreeOfSuccess } from "../../calculator/actionCalculator/degreeOfSuccess"
import { MouseButton } from "../../../utils/mouseConfig"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../../history/battleAction/battleActionSquaddieChange"
import {
    BattleAction,
    BattleActionService,
} from "../../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../../history/battleAction/battleActionRecorder"
import {
    ActionRange,
    TargetConstraintsService,
} from "../../../action/targetConstraints"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlayerInputTestService } from "../../../utils/test/playerInput"
import { BattleActionActorContextService } from "../../history/battleAction/battleActionActorContext"
import {
    RollModifierEnum,
    RollModifierTypeService,
    RollResultService,
} from "../../calculator/actionCalculator/rollResult"
import {
    Attribute,
    AttributeTypeService,
} from "../../../squaddie/attribute/attribute"
import { ModifierDisplayColumnPosition } from "../modifierDisplay/modifierDisplayColumn"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngineState/gameEngineState"
import { CoordinateGeneratorShape } from "../../targeting/coordinateGenerator"
import { SquaddieActionAnimationPlanService } from "../actionAnimation/animationPlanner/squaddieActionAnimationPlanService"

describe("SquaddieTargetsOtherSquaddiesAnimation", () => {
    let objectRepository: ObjectRepository
    let knightBattleSquaddie: BattleSquaddie
    let knightBattleSquaddieId = "knight_0"
    let knightTemplateId = "knight_0"
    let thiefDynamicId = "thief_0"
    let thiefStaticId = "thief_0"

    let longswordActionTemplate: ActionTemplate
    let animator: SquaddieTargetsOtherSquaddiesAnimator
    let resourceRepository: ResourceRepository

    let knightHitsThiefWithLongswordInstructionBattleAction: BattleAction

    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        objectRepository = ObjectRepositoryService.new()
        CreateNewThiefSquaddie({
            squaddieRepository: objectRepository,
            templateId: thiefStaticId,
            battleId: thiefDynamicId,
        })

        longswordActionTemplate = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
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
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                    damageDescriptions: {
                        [Damage.BODY]: 2,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            longswordActionTemplate
        )
        ;({ knightBattleSquaddie } = CreateNewKnightSquaddie({
            squaddieRepository: objectRepository,
            templateId: knightTemplateId,
            battleId: knightBattleSquaddieId,
            actionTemplates: [longswordActionTemplate],
        }))

        animator = new SquaddieTargetsOtherSquaddiesAnimator()

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
                knight_neutral: "knight_neutral",
                knight_attack: "knight_attack",
                knight_assisting: "knight_assisting",
                knight_thankful: "knight_thankful",
                thief_neutral: "thief_neutral",
                thief_damaged: "thief_damaged",
                thief_targeted: "thief_targeted",
                thief_dead: "thief_dead",
                thief_assisting: "thief_assisting",
                thief_thankful: "thief_thankful",
                thief_attack: "thief_attack",
            },
        })

        knightHitsThiefWithLongswordInstructionBattleAction =
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId:
                        knightBattleSquaddie.battleSquaddieId,
                    actorContext: BattleActionActorContextService.new({
                        actingSquaddieRoll: RollResultService.new({
                            rolls: [6, 1],
                            occurred: true,
                        }),
                    }),
                },
                action: { actionTemplateId: longswordActionTemplate.id },
                effect: {
                    squaddie: [
                        BattleActionSquaddieChangeService.new({
                            battleSquaddieId: thiefDynamicId,
                            damageExplanation: DamageExplanationService.new({
                                net: 1,
                            }),
                            healingReceived: 0,
                            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                            successBonus: -7,
                        }),
                    ],
                },
            })
    })

    it("will create an actor sprite and a target sprite", () => {
        const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => 0)
        animateKnightHittingWithLongsword({
            objectRepository: objectRepository,
            resourceRepository: resourceRepository,
            battleAction: knightHitsThiefWithLongswordInstructionBattleAction,
            animator: animator,
            mockedP5GraphicsContext: mockedP5GraphicsContext,
        })
        const drawingInstructions =
            SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions({
                animationPlan:
                    animator.uiObjects!.squaddieActionAnimationDrawState!
                        .animationPlan,
                timeElapsed: 0,
            })
        expect(drawingInstructions[knightBattleSquaddieId]).toBeDefined()
        expect(
            animator.uiObjects!.squaddieActionAnimationDrawState
                ?.imagesBySquaddieAndEmotion[knightBattleSquaddieId][
                drawingInstructions[knightBattleSquaddieId]?.squaddieEmotion
            ]
        ).toBeDefined()

        expect(drawingInstructions[thiefDynamicId]).toBeDefined()
        expect(
            animator.uiObjects!.squaddieActionAnimationDrawState
                ?.imagesBySquaddieAndEmotion[thiefDynamicId][
                drawingInstructions[thiefDynamicId]?.squaddieEmotion
            ]
        ).toBeDefined()
        expect(dateSpy).toHaveBeenCalled()
        dateSpy.mockRestore()
    })

    it("creates dice roll animation", () => {
        animateKnightHittingWithLongsword({
            objectRepository: objectRepository,
            resourceRepository: resourceRepository,
            battleAction: knightHitsThiefWithLongswordInstructionBattleAction,
            animator: animator,
            mockedP5GraphicsContext: mockedP5GraphicsContext,
        })
        expect(
            knightHitsThiefWithLongswordInstructionBattleAction?.effect
                ?.squaddie
        ).not.toBeUndefined()
        if (
            knightHitsThiefWithLongswordInstructionBattleAction?.effect
                ?.squaddie != undefined
        ) {
            expect(
                animator.uiObjects!.diceRollAnimation?.degreeOfSuccess
            ).toEqual(
                knightHitsThiefWithLongswordInstructionBattleAction!.effect!
                    .squaddie[0]!.actorDegreeOfSuccess
            )
        }

        expect(animator.uiObjects!.diceRollAnimation?.dice).toHaveLength(2)
    })

    it("creates modifier display animation", () => {
        const attackWithModifiers = BattleActionService.new({
            actor: {
                actorBattleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        rolls: [6, 1],
                        occurred: true,
                        rollModifiers: {
                            [RollModifierEnum.MULTIPLE_ATTACK_PENALTY]: -3,
                        },
                    }),
                    actingSquaddieModifiers: [
                        {
                            type: Attribute.MOVEMENT,
                            amount: 2,
                        },
                    ],
                    targetSquaddieModifiers: {
                        thiefDynamicId: [
                            {
                                type: Attribute.ARMOR,
                                amount: 1,
                            },
                        ],
                    },
                }),
            },
            action: { actionTemplateId: longswordActionTemplate.id },
            effect: {
                squaddie: [
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: thiefDynamicId,
                        damageExplanation: DamageExplanationService.new({
                            net: 1,
                        }),
                        healingReceived: 0,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        successBonus: -7,
                    }),
                ],
            },
        })

        animateKnightHittingWithLongsword({
            objectRepository: objectRepository,
            resourceRepository: resourceRepository,
            battleAction: attackWithModifiers,
            animator: animator,
            mockedP5GraphicsContext: mockedP5GraphicsContext,
        })

        expect(
            animator.uiObjects!.modifierDisplayColumns![
                ModifierDisplayColumnPosition.LEFT
            ]!.labels
        ).toHaveLength(2)
        expect(
            animator.uiObjects!.modifierDisplayColumns![
                ModifierDisplayColumnPosition.LEFT
            ]!.labels[0]!.textBox!.text
        ).includes(AttributeTypeService.readableName(Attribute.MOVEMENT))
        expect(
            animator.uiObjects!.modifierDisplayColumns![
                ModifierDisplayColumnPosition.LEFT
            ]!.labels[1]!.textBox!.text
        ).includes(
            RollModifierTypeService.readableName({
                type: RollModifierEnum.MULTIPLE_ATTACK_PENALTY,
                abbreviate: false,
            })
        )

        expect(
            animator.uiObjects!.modifierDisplayColumns![
                ModifierDisplayColumnPosition.RIGHT
            ]!.labels
        ).toHaveLength(1)
        expect(
            animator.uiObjects!.modifierDisplayColumns![
                ModifierDisplayColumnPosition.RIGHT
            ]!.labels[0]!.textBox!.text
        ).includes(AttributeTypeService.readableName(Attribute.ARMOR))
    })

    describe("will skip displaying the results", () => {
        const tests = [
            {
                name: "when mouse clicks ACCEPT",
                action: (gameEngineState: GameEngineState) => {
                    const mouseEvent: OrchestratorComponentMouseEvent = {
                        eventType: OrchestratorComponentMouseEventType.RELEASE,
                        mouseRelease: {
                            x: 0,
                            y: 0,
                            button: MouseButton.ACCEPT,
                        },
                    }

                    animator.mouseEventHappened(gameEngineState, mouseEvent)
                },
            },
            {
                name: "when mouse clicks CANCEL",
                action: (gameEngineState: GameEngineState) => {
                    const mouseEvent: OrchestratorComponentMouseEvent = {
                        eventType: OrchestratorComponentMouseEventType.RELEASE,
                        mouseRelease: {
                            x: 0,
                            y: 0,
                            button: MouseButton.CANCEL,
                        },
                    }

                    animator.mouseEventHappened(gameEngineState, mouseEvent)
                },
            },
            {
                name: "when keyboard presses ACCEPT",
                action: (gameEngineState: GameEngineState) => {
                    const keyboardEvent: OrchestratorComponentKeyEvent =
                        PlayerInputTestService.pressAcceptKey()
                    animator.keyEventHappened(gameEngineState, keyboardEvent)
                },
            },
        ]

        it.each(tests)(`$name `, ({ action }) => {
            const gameEngineState = animateKnightHittingWithLongsword({
                objectRepository: objectRepository,
                resourceRepository: resourceRepository,
                battleAction:
                    knightHitsThiefWithLongswordInstructionBattleAction,
                animator: animator,
                mockedP5GraphicsContext: mockedP5GraphicsContext,
            })

            animator.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceRepository: gameEngineState.resourceRepository!,
            })
            expect(animator.hasCompleted(gameEngineState)).toBeFalsy()

            action(gameEngineState)
            animator.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceRepository: gameEngineState.resourceRepository!,
            })
            expect(animator.hasCompleted(gameEngineState)).toBeTruthy()
        })
    })

    it("is complete at the end of the animation time", () => {
        const dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
        const gameEngineState = animateKnightHittingWithLongsword({
            objectRepository: objectRepository,
            resourceRepository: resourceRepository,
            battleAction: knightHitsThiefWithLongswordInstructionBattleAction,
            animator: animator,
            mockedP5GraphicsContext: mockedP5GraphicsContext,
        })
        expect(animator.hasCompleted(gameEngineState)).toBeFalsy()

        const finishingTime =
            SquaddieActionAnimationPlanService.getTotalAnimationTime({
                animationPlan:
                    animator.uiObjects!.squaddieActionAnimationDrawState!
                        .animationPlan,
            })
        expect(finishingTime).toBeDefined()
        if (finishingTime == undefined) {
            throw new Error("finishingTime is undefined")
        }
        dateSpy.mockReturnValue(finishingTime)

        animator.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceRepository: gameEngineState.resourceRepository!,
        })
        expect(animator.hasCompleted(gameEngineState)).toBeTruthy()
        expect(dateSpy).toHaveBeenCalled()
        dateSpy.mockRestore()
    })

    it("will set the battle action animation to true when it resets", () => {
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            resourceRepository: resourceRepository,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                }),
            }),
        })

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            knightHitsThiefWithLongswordInstructionBattleAction
        )

        animator.reset(gameEngineState)

        const battleAction = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )
        expect(
            BattleActionService.isAnimationComplete(battleAction!)
        ).toBeTruthy()
    })
})

const animateKnightHittingWithLongsword = ({
    objectRepository,
    resourceRepository,
    battleAction,
    animator,
    mockedP5GraphicsContext,
}: {
    objectRepository: ObjectRepository
    resourceRepository: ResourceRepository
    battleAction: BattleAction
    animator: SquaddieTargetsOtherSquaddiesAnimator
    mockedP5GraphicsContext: MockedP5GraphicsBuffer
}) => {
    const gameEngineState: GameEngineState = GameEngineStateService.new({
        repository: objectRepository,
        resourceRepository: resourceRepository,
        battleOrchestratorState: BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
            }),
        }),
    })
    BattleActionRecorderService.addReadyToAnimateBattleAction(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionRecorder,
        battleAction
    )

    animator.reset(gameEngineState)
    animator.update({
        gameEngineState,
        graphicsContext: mockedP5GraphicsContext,
        resourceRepository: gameEngineState.resourceRepository!,
    })
    return gameEngineState
}
