import { ProcessedActionService } from "./processedAction"
import { ActionEffectMovementTemplateService } from "../template/actionEffectMovementTemplate"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../template/actionEffectSquaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { ProcessedActionMovementEffectService } from "./processedActionMovementEffect"
import { DecidedActionMovementEffectService } from "../decided/decidedActionMovementEffect"
import { ProcessedActionSquaddieEffectService } from "./processedActionSquaddieEffect"
import { DecidedActionSquaddieEffectService } from "../decided/decidedActionSquaddieEffect"
import { BattleActionService } from "../../battle/history/battleAction"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../battle/actionDecision/battleActionDecisionStep"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../template/actionTemplate"

describe("ProcessedAction", () => {
    it("creates default values as needed", () => {
        const action = ProcessedActionService.new({
            actionPointCost: 1,
            battleAction: BattleActionService.new({
                actor: { battleSquaddieId: "nobody" },
                action: { isEndTurn: true },
                effect: { endTurn: true },
            }),
        })
        expect(action.processedActionEffects).toHaveLength(0)
    })

    describe("MultipleAttackPenalty", () => {
        it("cannot contribute if it has no effects", () => {
            const step: BattleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: step,
                battleSquaddieId: "soldier",
            })
            const justMovement = ProcessedActionService.new({
                actionPointCost: 1,
                processedActionEffects: [],
                battleAction: BattleActionService.new({
                    actor: { battleSquaddieId: "nobody" },
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startLocation: { q: 0, r: 0 },
                            endLocation: { q: 0, r: 1 },
                        },
                    },
                }),
            })

            expect(
                ProcessedActionService.multipleAttackPenaltyMultiplier(
                    justMovement
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

            const noMAP = ProcessedActionService.new({
                actionPointCost: 1,
                battleAction: BattleActionService.new({
                    actor: { battleSquaddieId: "soldier" },
                    action: { id: actionDoesNotIncreaseMAP.id },
                    effect: { squaddie: [] },
                }),
                processedActionEffects: [
                    ProcessedActionMovementEffectService.newFromDecidedActionEffect(
                        {
                            decidedActionEffect:
                                DecidedActionMovementEffectService.new({
                                    destination: { q: 0, r: 0 },
                                    template:
                                        ActionEffectMovementTemplateService.new(
                                            {}
                                        ),
                                }),
                        }
                    ),
                    ProcessedActionSquaddieEffectService.newFromDecidedActionEffect(
                        {
                            results: undefined,
                            decidedActionEffect:
                                DecidedActionSquaddieEffectService.new({
                                    target: { q: 0, r: 0 },
                                    template: actionDoesNotIncreaseMAP
                                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                }),
                        }
                    ),
                ],
            })

            expect(
                ProcessedActionService.multipleAttackPenaltyMultiplier(noMAP)
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

            const withMAP = ProcessedActionService.new({
                actionPointCost: 1,
                battleAction: BattleActionService.new({
                    actor: { battleSquaddieId: "soldier" },
                    action: { id: actionIncreasesMAP.id },
                    effect: { squaddie: [] },
                }),
                processedActionEffects: [
                    ProcessedActionMovementEffectService.newFromDecidedActionEffect(
                        {
                            decidedActionEffect:
                                DecidedActionMovementEffectService.new({
                                    destination: { q: 0, r: 0 },
                                    template:
                                        ActionEffectMovementTemplateService.new(
                                            {}
                                        ),
                                }),
                        }
                    ),
                    ProcessedActionSquaddieEffectService.newFromDecidedActionEffect(
                        {
                            results: undefined,
                            decidedActionEffect:
                                DecidedActionSquaddieEffectService.new({
                                    target: { q: 0, r: 0 },
                                    template: actionIncreasesMAP
                                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                }),
                        }
                    ),
                ],
            })

            expect(
                ProcessedActionService.multipleAttackPenaltyMultiplier(withMAP)
            ).toEqual(1)
        })
    })
})
