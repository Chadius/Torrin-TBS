import { ActorTextWindow } from "./actorTextWindow"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { DefaultArmyAttributes } from "../../../squaddie/armyAttributes"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../../campaign/squaddieTemplate"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import { ActionTimer } from "./actionTimer"
import { ActionAnimationPhase } from "./actionAnimationConstants"
import { ActionEffectTemplateService } from "../../../action/template/actionEffectTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import { BattleActionActorContextService } from "../../history/battleAction/battleActionActorContext"
import { TargetConstraintsService } from "../../../action/targetConstraints"
import {
    RollModifierType,
    RollResultService,
} from "../../calculator/actionCalculator/rollResult"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ActionEffectChangesService } from "../../history/calculatedResult"
import { CoordinateGeneratorShape } from "../../targeting/coordinateGenerator"

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
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
                coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    damageDescriptions: {},
                    healingDescriptions: {},
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
            results: ActionEffectChangesService.new({
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        occurred: true,
                        rolls: [1, 5],
                    }),
                    actingSquaddieModifiers: [],
                }),
                squaddieChanges: [],
            }),
        })

        const timerSpy = vi
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
            results: ActionEffectChangesService.new({
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        occurred: false,
                        rolls: [],
                    }),
                    actingSquaddieModifiers: [],
                }),
                squaddieChanges: [],
            }),
        })

        const timerSpy = vi
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.DURING_ACTION)

        window.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(window.actorUsesActionDescriptionText).toBe("Actor uses\nAction")
    })

    it("will indicate a maximum roll if the actor rolled critically high", () => {
        const window = new ActorTextWindow()

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: undefined,
            actionTemplateName: attackThatUsesAttackRoll.name,
            results: ActionEffectChangesService.new({
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        occurred: true,
                        rolls: [6, 6],
                    }),
                    actingSquaddieModifiers: [],
                }),
                squaddieChanges: [],
            }),
        })

        const timerSpy = vi
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.DURING_ACTION)

        window.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(window.actorUsesActionDescriptionText).toBe(
            "Actor uses\nAction\n\n   rolls(6, 6)\n Total 12\n\nMax!"
        )
    })

    it("will indicate a minimum roll if the actor rolled critically low", () => {
        const window = new ActorTextWindow()

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: undefined,
            actionTemplateName: attackThatUsesAttackRoll.name,
            results: ActionEffectChangesService.new({
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        occurred: true,
                        rolls: [1, 1],
                    }),
                    actingSquaddieModifiers: [],
                }),
                squaddieChanges: [],
            }),
        })

        const timerSpy = vi
            .spyOn(mockedActionTimer, "currentPhase", "get")
            .mockReturnValue(ActionAnimationPhase.DURING_ACTION)

        window.draw(mockedP5GraphicsContext, mockedActionTimer)
        expect(timerSpy).toBeCalled()

        expect(window.actorUsesActionDescriptionText).toBe(
            "Actor uses\nAction\n\n   rolls(1, 1)\n Total 2\n\nbotch..."
        )
    })

    describe("attack modifiers", () => {
        it("will not show any modifiers if the action did not require a roll", () => {
            const window = new ActorTextWindow()

            window.start({
                actorTemplate: actorTemplate,
                actorBattle: undefined,
                actionTemplateName: attackThatUsesAttackRoll.name,
                results: ActionEffectChangesService.new({
                    actorContext: BattleActionActorContextService.new({
                        actingSquaddieRoll: RollResultService.new({
                            occurred: false,
                            rolls: [],
                            rollModifiers: {
                                [RollModifierType.MULTIPLE_ATTACK_PENALTY]: -2,
                            },
                        }),
                        actingSquaddieModifiers: [],
                    }),
                    squaddieChanges: [],
                }),
            })

            const timerSpy = vi
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
                results: ActionEffectChangesService.new({
                    actorContext: BattleActionActorContextService.new({
                        actingSquaddieRoll: RollResultService.new({
                            occurred: true,
                            rolls: [1, 5],
                            rollModifiers: {
                                [RollModifierType.MULTIPLE_ATTACK_PENALTY]: -2,
                            },
                        }),
                        actingSquaddieModifiers: [],
                    }),
                    squaddieChanges: [],
                }),
            })

            const timerSpy = vi
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
