import { ActorTextWindow } from "./actorTextWindow"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { DefaultArmyAttributes } from "../../../squaddie/armyAttributes"
import { TargetingShape } from "../../targeting/targetingShapeGenerator"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../../campaign/squaddieTemplate"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import { ActionTimer } from "./actionTimer"
import { ActionAnimationPhase } from "./actionAnimationConstants"
import { ActionEffectSquaddieTemplateService } from "../../../action/template/actionEffectSquaddieTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import { SquaddieSquaddieResultsService } from "../../history/squaddieSquaddieResults"
import {
    AttributeType,
    AttributeTypeAndAmountService,
} from "../../../squaddie/attributeModifier"
import { BattleActionActionContextService } from "../../history/battleAction/battleActionActionContext"

describe("ActorTextWindow", () => {
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let mockedActionTimer: ActionTimer

    let actorTemplate: SquaddieTemplate
    let attackThatUsesAttackRoll: ActionTemplate

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        mockedActionTimer = new ActionTimer()

        actorTemplate = SquaddieTemplateService.new({
            squaddieId: {
                templateId: "actor id",
                name: "Actor",
                resources: undefined,
                traits: TraitStatusStorageService.newUsingTraitValues({}),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            attributes: DefaultArmyAttributes(),
        })
        attackThatUsesAttackRoll = ActionTemplateService.new({
            id: "action Id",
            name: "Action",
            actionPoints: 1,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    damageDescriptions: {},
                    healingDescriptions: {},
                    targetingShape: TargetingShape.SNAKE,
                    minimumRange: 1,
                    maximumRange: 1,
                }),
            ],
        })
    })

    it("initially shows the actor and their action", () => {
        const window = new ActorTextWindow()

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: undefined,
            actionTemplateName: attackThatUsesAttackRoll.name,
            results: undefined,
        })

        expect(window.actorUsesActionDescriptionText).toBe("Actor uses\nAction")
    })

    it("will show the rolls if the actor had to make rolls", () => {
        const window = new ActorTextWindow()

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: undefined,
            actionTemplateName: attackThatUsesAttackRoll.name,
            results: SquaddieSquaddieResultsService.new({
                squaddieChanges: [],
                actingBattleSquaddieId: "",
                targetedBattleSquaddieIds: [],
                actionContext: BattleActionActionContextService.new({
                    actingSquaddieRoll: {
                        occurred: true,
                        rolls: [1, 5],
                    },
                    actingSquaddieModifiers: [],
                }),
            }),
        })

        const timerSpy = jest
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.DURING_ACTION)

        window.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(window.actorUsesActionDescriptionText).toBe(
            "Actor uses\nAction\n\n   rolls(1, 5)\n Total 6"
        )
    })

    it("will not show rolls if the actor did not need them", () => {
        const window = new ActorTextWindow()

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: undefined,
            actionTemplateName: attackThatUsesAttackRoll.name,
            results: SquaddieSquaddieResultsService.new({
                squaddieChanges: [],
                actingBattleSquaddieId: "",
                targetedBattleSquaddieIds: [],
                actionContext: BattleActionActionContextService.new({
                    actingSquaddieRoll: {
                        occurred: false,
                        rolls: [],
                    },
                    actingSquaddieModifiers: [],
                }),
            }),
        })

        const timerSpy = jest
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.DURING_ACTION)

        window.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(window.actorUsesActionDescriptionText).toBe("Actor uses\nAction")
    })

    it("will indicate a critical hit if the actor rolled critically high", () => {
        const window = new ActorTextWindow()

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: undefined,
            actionTemplateName: attackThatUsesAttackRoll.name,
            results: SquaddieSquaddieResultsService.new({
                squaddieChanges: [],
                actingBattleSquaddieId: "",
                targetedBattleSquaddieIds: [],
                actionContext: BattleActionActionContextService.new({
                    actingSquaddieRoll: {
                        occurred: true,
                        rolls: [6, 6],
                    },
                    actingSquaddieModifiers: [],
                }),
            }),
        })

        const timerSpy = jest
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.DURING_ACTION)

        window.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(window.actorUsesActionDescriptionText).toBe(
            "Actor uses\nAction\n\n   rolls(6, 6)\n Total 12\n\nCRITICAL HIT!"
        )
    })

    it("will indicate a critical miss if the actor rolled critically low", () => {
        const window = new ActorTextWindow()

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: undefined,
            actionTemplateName: attackThatUsesAttackRoll.name,
            results: SquaddieSquaddieResultsService.new({
                squaddieChanges: [],
                actingBattleSquaddieId: "",
                targetedBattleSquaddieIds: [],
                actionContext: BattleActionActionContextService.new({
                    actingSquaddieRoll: {
                        occurred: true,
                        rolls: [1, 1],
                    },
                    actingSquaddieModifiers: [],
                }),
            }),
        })

        const timerSpy = jest
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.DURING_ACTION)

        window.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(window.actorUsesActionDescriptionText).toBe(
            "Actor uses\nAction\n\n   rolls(1, 1)\n Total 2\n\nCRITICAL MISS!!"
        )
    })

    describe("attack modifiers", () => {
        it("will not show any modifiers if the action did not require a roll", () => {
            const window = new ActorTextWindow()

            window.start({
                actorTemplate: actorTemplate,
                actorBattle: undefined,
                actionTemplateName: attackThatUsesAttackRoll.name,
                results: SquaddieSquaddieResultsService.new({
                    squaddieChanges: [],
                    actingBattleSquaddieId: "",
                    targetedBattleSquaddieIds: [],
                    actionContext: BattleActionActionContextService.new({
                        actingSquaddieRoll: {
                            occurred: false,
                            rolls: [],
                        },
                        actingSquaddieModifiers: [
                            AttributeTypeAndAmountService.new({
                                type: AttributeType.MULTIPLE_ATTACK_PENALTY,
                                amount: -2,
                            }),
                        ],
                    }),
                }),
            })

            const timerSpy = jest
                .spyOn(mockedActionTimer, "currentPhase", "get")
                .mockReturnValue(ActionAnimationPhase.DURING_ACTION)

            window.draw(mockedP5GraphicsContext, mockedActionTimer)
            expect(timerSpy).toBeCalled()

            expect(window.actorUsesActionDescriptionText).toBe(
                "Actor uses\nAction"
            )
        })

        it("will show the multiple attack penalty", () => {
            const window = new ActorTextWindow()

            window.start({
                actorTemplate: actorTemplate,
                actorBattle: undefined,
                actionTemplateName: attackThatUsesAttackRoll.name,
                results: SquaddieSquaddieResultsService.new({
                    squaddieChanges: [],
                    actingBattleSquaddieId: "",
                    targetedBattleSquaddieIds: [],
                    actionContext: BattleActionActionContextService.new({
                        actingSquaddieRoll: {
                            occurred: true,
                            rolls: [1, 5],
                        },
                        actingSquaddieModifiers: [
                            AttributeTypeAndAmountService.new({
                                type: AttributeType.MULTIPLE_ATTACK_PENALTY,
                                amount: -2,
                            }),
                        ],
                    }),
                }),
            })

            const timerSpy = jest
                .spyOn(mockedActionTimer, "currentPhase", "get")
                .mockReturnValue(ActionAnimationPhase.DURING_ACTION)

            window.draw(mockedP5GraphicsContext, mockedActionTimer)
            expect(timerSpy).toBeCalled()

            expect(window.actorUsesActionDescriptionText).toBe(
                "Actor uses\nAction\n\n   rolls(1, 5)\n   -2: Multiple attack penalty\n Total 4"
            )
        })
    })
})
