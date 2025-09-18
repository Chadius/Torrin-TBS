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
    RollModifierEnum,
    RollResultService,
} from "../../calculator/actionCalculator/rollResult"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ActionEffectChangesService } from "../../history/calculatedResult"
import { CoordinateGeneratorShape } from "../../targeting/coordinateGenerator"
import { SquaddieResourceService } from "../../../squaddie/resource"
import { BattleSquaddie, BattleSquaddieService } from "../../battleSquaddie"

describe("ActorTextWindow", () => {
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let mockedActionTimer: ActionTimer

    let actorTemplate: SquaddieTemplate
    let battleSquaddie: BattleSquaddie
    let attackThatUsesAttackRoll: ActionTemplate

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        mockedActionTimer = new ActionTimer()

        actorTemplate = SquaddieTemplateService.new({
            squaddieId: {
                templateId: "actor id",
                name: "Actor",
                resources: SquaddieResourceService.new({}),
                traits: TraitStatusStorageService.newUsingTraitValues({}),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            attributes: DefaultArmyAttributes(),
        })
        battleSquaddie = BattleSquaddieService.new({
            squaddieTemplate: actorTemplate,
            battleSquaddieId: "battleSquaddie",
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
            actorBattle: battleSquaddie,
            actionTemplateName: attackThatUsesAttackRoll.name,
            results: ActionEffectChangesService.new({
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        rolls: [1, 6],
                        occurred: true,
                    }),
                }),
                squaddieChanges: [],
            }),
        })

        expect(window.actorUsesActionDescriptionText).toBe("Actor uses\nAction")
    })

    it("will show the rolls if the actor had to make rolls", () => {
        const window = new ActorTextWindow()

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: battleSquaddie,
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
            "Actor uses\nAction\n Total 6"
        )
    })

    it("will not show rolls if the actor did not need them", () => {
        const window = new ActorTextWindow()

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: battleSquaddie,
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

    describe("attack modifiers", () => {
        it("will not show any modifiers if the action did not require a roll", () => {
            const window = new ActorTextWindow()

            window.start({
                actorTemplate: actorTemplate,
                actorBattle: battleSquaddie,
                actionTemplateName: attackThatUsesAttackRoll.name,
                results: ActionEffectChangesService.new({
                    actorContext: BattleActionActorContextService.new({
                        actingSquaddieRoll: RollResultService.new({
                            occurred: false,
                            rolls: [],
                            rollModifiers: {
                                [RollModifierEnum.MULTIPLE_ATTACK_PENALTY]: -2,
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
                actorBattle: battleSquaddie,
                actionTemplateName: attackThatUsesAttackRoll.name,
                results: ActionEffectChangesService.new({
                    actorContext: BattleActionActorContextService.new({
                        actingSquaddieRoll: RollResultService.new({
                            occurred: true,
                            rolls: [1, 5],
                            rollModifiers: {
                                [RollModifierEnum.MULTIPLE_ATTACK_PENALTY]: -2,
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
                "Actor uses\nAction\n   -2: Multiple attack penalty\n Total 4"
            )
        })
    })
})
