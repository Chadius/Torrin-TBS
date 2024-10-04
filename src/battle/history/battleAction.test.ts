import { BattleAction, BattleActionService } from "./battleAction"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { ObjectRepositoryService } from "../objectRepository"

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
                        startLocation: { q: 0, r: 0 },
                        endLocation: { q: 0, r: 0 },
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
                    actionPoints: 1,
                    actionEffectTemplates: [
                        ActionEffectSquaddieTemplateService.new({
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
                    actionPoints: 1,
                    actionEffectTemplates: [
                        ActionEffectSquaddieTemplateService.new({
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
            ).toEqual(1)
        })
    })
})
