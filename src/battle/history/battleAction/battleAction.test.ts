import {
    BattleAction,
    BattleActionAction,
    BattleActionActor,
    BattleActionAnimation,
    BattleActionEffect,
    BattleActionService,
} from "./battleAction"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { ObjectRepositoryService } from "../../objectRepository"
import { BattleActionActorContextService } from "./battleActionActorContext"
import { RollResultService } from "../../calculator/actionCalculator/rollResult"
import { describe, expect, it } from "vitest"

describe("BattleAction", () => {
    describe("Creation and Sanitization", () => {
        it("Can create a BattleAction", () => {
            const newBattleAction: BattleAction = BattleActionService.new({
                actor: { actorBattleSquaddieId: "battleSquaddieId" },
                action: {
                    actionTemplateId: "longsword",
                },
                effect: {
                    endTurn: true,
                },
            })

            expect(newBattleAction.actor.actorBattleSquaddieId).toEqual(
                "battleSquaddieId"
            )
            expect(newBattleAction.action.actionTemplateId).toEqual("longsword")
            expect(newBattleAction.effect.endTurn).toBeTruthy()
            expect(newBattleAction.animation.completed).toBeFalsy()
            expect(
                BattleActionService.isAnimationComplete(newBattleAction)
            ).toEqual(false)
        })

        it("Must include at least one effect", () => {
            const createBattleActionWithoutEffect = () => {
                BattleActionService.new({
                    actor: { actorBattleSquaddieId: "battleSquaddieId" },
                    action: {},
                    effect: {},
                })
            }

            expect(() => {
                createBattleActionWithoutEffect()
            }).toThrow("cannot sanitize")
        })
    })
    describe("MultipleAttackPenalty", () => {
        it("cannot contribute if it has no effects", () => {
            const justMovement: BattleAction = BattleActionService.new({
                actor: { actorBattleSquaddieId: "soldier" },
                action: { isMovement: true },
                effect: {
                    movement: {
                        startCoordinate: { q: 0, r: 0 },
                        endCoordinate: { q: 0, r: 0 },
                    },
                },
            })

            expect(
                BattleActionService.multipleAttackPenaltyMultiplier(
                    justMovement,
                    ObjectRepositoryService.new()
                )
            ).toEqual(0)
        })
        it("knows if none of its effect templates contribute", () => {
            const actionDoesNotIncreaseMAP: ActionTemplate =
                ActionTemplateService.new({
                    id: "noMAP",
                    name: "noMAP",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.ATTACK]: true,
                                    [Trait.NO_MULTIPLE_ATTACK_PENALTY]: true,
                                }
                            ),
                        }),
                    ],
                })
            const objectRepository = ObjectRepositoryService.new()
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                actionDoesNotIncreaseMAP
            )

            const noMAPAction: BattleAction = BattleActionService.new({
                actor: { actorBattleSquaddieId: "soldier" },
                action: { actionTemplateId: actionDoesNotIncreaseMAP.id },
                effect: {
                    squaddie: [],
                },
            })

            expect(
                BattleActionService.multipleAttackPenaltyMultiplier(
                    noMAPAction,
                    objectRepository
                )
            ).toEqual(0)
        })
        it("knows if at least one of its effect templates contributes", () => {
            const actionIncreasesMAP: ActionTemplate =
                ActionTemplateService.new({
                    id: "increaseMAP",
                    name: "increaseMAP",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.ATTACK]: true,
                                }
                            ),
                        }),
                    ],
                })

            const objectRepository = ObjectRepositoryService.new()
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                actionIncreasesMAP
            )

            const noMAPAction: BattleAction = BattleActionService.new({
                actor: { actorBattleSquaddieId: "soldier" },
                action: { actionTemplateId: actionIncreasesMAP.id },
                effect: {
                    squaddie: [],
                },
            })

            expect(
                BattleActionService.multipleAttackPenaltyMultiplier(
                    noMAPAction,
                    objectRepository
                )
            ).toEqual(-3)
        })
    })
    it("can be cloned to a separate object", () => {
        const actor: BattleActionActor = {
            actorBattleSquaddieId: "original",
            actorContext: BattleActionActorContextService.new({
                actingSquaddieRoll: RollResultService.new({
                    occurred: true,
                    rolls: [5, 6],
                }),
            }),
        }
        const action: BattleActionAction = {
            actionTemplateId: "action",
            isMovement: true,
            isEndTurn: true,
        }
        const effect: BattleActionEffect = {
            endTurn: true,
            squaddie: [],
            movement: {
                startCoordinate: { q: 0, r: 1 },
                endCoordinate: { q: 2, r: 3 },
            },
        }
        const animation: BattleActionAnimation = {
            completed: true,
        }

        const original = BattleActionService.new({
            actor,
            action,
            effect,
            animation,
        })

        const clone: BattleAction = BattleActionService.clone(original)

        expect(clone).toEqual(original)

        original.actor = undefined
        original.action = undefined
        original.effect = undefined
        original.animation = undefined

        expect(clone.actor).toEqual(actor)
        expect(clone.action).toEqual(action)
        expect(clone.effect).toEqual(effect)
        expect(clone.animation).toEqual(animation)
    })
})
