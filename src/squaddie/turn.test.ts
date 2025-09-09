import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../action/template/actionEffectTemplate"
import { ActionResourceCostService } from "../action/actionResourceCost"
import { beforeEach, describe, expect, it } from "vitest"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { BattleSquaddie } from "../battle/battleSquaddie"
import { SquaddieRepositoryService } from "../utils/test/squaddie"
import { SquaddieAffiliation } from "./squaddieAffiliation"
import {
    ActionPerformFailureReason,
    DEFAULT_ACTION_POINTS_PER_TURN,
    SquaddieTurn,
    SquaddieTurnService,
} from "./turn"
import { InBattleAttributesService } from "../battle/stats/inBattleAttributes"

describe("SquaddieTurn and resources", () => {
    let actionSpends2ActionPoints: ActionTemplate
    let battleSquaddie: BattleSquaddie
    let objectRepository: ObjectRepository

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        actionSpends2ActionPoints = ActionTemplateService.new({
            id: "actionSpends2ActionPoints",
            name: "Power Attack",
            resourceCost: ActionResourceCostService.new({
                actionPoints: 2,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionSpends2ActionPoints
        )
        ;({ battleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                affiliation: SquaddieAffiliation.PLAYER,
                battleId: "battleId",
                templateId: "squaddieTemplateId",
                name: "squaddieName",
                objectRepository: objectRepository,
                actionTemplateIds: [actionSpends2ActionPoints.id],
            }))
    })

    describe("action points before and after the phase", () => {
        it("is created with 3 action points", () => {
            expect(
                SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(DEFAULT_ACTION_POINTS_PER_TURN)
        })
    })

    describe("spending action points based on action template", () => {
        it("should spend 1 action by default if the ActionTemplate does not list a cost", () => {
            const actionTemplate = ActionTemplateService.new({
                id: "actionSpends1ActionPoint",
                name: "Power Attack",
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                        }),
                    }),
                ],
            })
            SquaddieTurnService.spendPreviewedMovementActionPointsToRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
            })
            SquaddieTurnService.setSpentMovementActionPointsAsNotRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionTemplate,
            })
            expect(
                SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(DEFAULT_ACTION_POINTS_PER_TURN - 1)
        })
        it("should spend multiple action points if action uses more", () => {
            SquaddieTurnService.spendPreviewedMovementActionPointsToRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
            })

            SquaddieTurnService.setSpentMovementActionPointsAsNotRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionTemplate: actionSpends2ActionPoints,
            })
            expect(
                SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(DEFAULT_ACTION_POINTS_PER_TURN - 2)
        })
    })

    describe("canPerformAction", () => {
        it("should report when an action cannot be performed because it lacks action points", () => {
            SquaddieTurnService.spendPreviewedMovementActionPointsToRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
            })

            SquaddieTurnService.setSpentMovementActionPointsAsNotRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionTemplate: actionSpends2ActionPoints,
            })
            const query = SquaddieTurnService.canPerformAction({
                actionTemplate: actionSpends2ActionPoints,
                battleSquaddie,
            })
            expect(query.canPerform).toBeFalsy()
            expect(query.reason).toBe(
                ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING
            )
        })
        it("cannot perform the action because it would have to spend too many points on movement", () => {
            SquaddieTurnService.spendPreviewedMovementActionPointsToRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
            })
            SquaddieTurnService.setSpentMovementActionPointsAsNotRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionTemplate: actionSpends2ActionPoints,
            })
            const query = SquaddieTurnService.canPerformAction({
                actionTemplate: actionSpends2ActionPoints,
                battleSquaddie,
            })
            expect(query.canPerform).toBeFalsy()
            expect(query.reason).toBe(
                ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING
            )
        })
        it("should report when an action cannot be performed because it is on cooldown", () => {
            InBattleAttributesService.addActionCooldown({
                inBattleAttributes: battleSquaddie.inBattleAttributes,
                actionTemplateId: actionSpends2ActionPoints.id,
                numberOfCooldownTurns: 3,
            })

            const query = SquaddieTurnService.canPerformAction({
                actionTemplate: actionSpends2ActionPoints,
                battleSquaddie,
            })
            expect(query.canPerform).toBeFalsy()
            expect(query.reason).toBe(
                ActionPerformFailureReason.STILL_ON_COOLDOWN
            )
        })
    })

    describe("movement action points", () => {
        it("can spend movement points for moving the squaddie", () => {
            SquaddieTurnService.setMovementActionPointsSpentAndCannotBeRefunded(
                {
                    squaddieTurn: battleSquaddie.squaddieTurn,
                    actionPoints: 1,
                }
            )
            expect(
                SquaddieTurnService.getMovementActionPointsSpentAndCannotBeRefunded(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(1)
            expect(
                SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(2)
            SquaddieTurnService.spendPreviewedMovementActionPointsToRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
            })
            SquaddieTurnService.setSpentMovementActionPointsAsNotRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionTemplate: actionSpends2ActionPoints,
            })
            expect(
                SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(0)
            expect(
                SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(0)
        })
        it("can set aside action points to preview movement that will not cost action points", () => {
            SquaddieTurnService.setMovementActionPointsPreviewedByPlayer({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionPoints: 1,
            })
            expect(
                SquaddieTurnService.getMovementActionPointsSpentAndCannotBeRefunded(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(0)
            expect(
                SquaddieTurnService.getMovementActionPointsPreviewedByPlayer(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(1)
            expect(
                SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(DEFAULT_ACTION_POINTS_PER_TURN)
            expect(
                SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(DEFAULT_ACTION_POINTS_PER_TURN)
        })
        it("can spend previewed movement action points and make the refundable", () => {
            SquaddieTurnService.setMovementActionPointsPreviewedByPlayer({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionPoints: 1,
            })
            SquaddieTurnService.spendPreviewedMovementActionPointsToRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
            })
            expect(
                SquaddieTurnService.getMovementActionPointsPreviewedByPlayer(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(0)
            expect(
                SquaddieTurnService.getMovementActionPointsSpentButCanBeRefunded(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(1)
            expect(
                SquaddieTurnService.getMovementActionPointsSpentAndCannotBeRefunded(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(0)
            expect(
                SquaddieTurnService.getActionPointSpend(
                    battleSquaddie.squaddieTurn
                ).unSpentActionPoints
            ).toBe(2)
            expect(
                SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(2 + 1)
        })
        it("can convert spent movement action points so they cannot be refunded", () => {
            SquaddieTurnService.setMovementActionPointsPreviewedByPlayer({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionPoints: 1,
            })
            SquaddieTurnService.spendPreviewedMovementActionPointsToRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
            })
            SquaddieTurnService.setSpentMovementActionPointsAsNotRefundable({
                squaddieTurn: battleSquaddie.squaddieTurn,
            })
            expect(
                SquaddieTurnService.getMovementActionPointsSpentButCanBeRefunded(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(0)
            expect(
                SquaddieTurnService.getMovementActionPointsSpentAndCannotBeRefunded(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(1)
            expect(
                SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(2)
            expect(
                SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(2)
        })
    })

    describe("end turn", () => {
        it("will not have action points after ending its turn", () => {
            SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            expect(battleSquaddie.squaddieTurn.endTurn).toBe(true)
            expect(
                SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(0)
            expect(
                SquaddieTurnService.getMovementActionPointsSpentButCanBeRefunded(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(0)
            expect(
                SquaddieTurnService.getMovementActionPointsSpentAndCannotBeRefunded(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(DEFAULT_ACTION_POINTS_PER_TURN)
            expect(
                SquaddieTurnService.getActionPointSpend(
                    battleSquaddie.squaddieTurn
                ).unSpentActionPoints
            ).toBe(0)
        })
    })

    describe("begin new turn", () => {
        it("will regain its action points", () => {
            SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            SquaddieTurnService.setMovementActionPointsSpentAndCannotBeRefunded(
                {
                    squaddieTurn: battleSquaddie.squaddieTurn,
                    actionPoints: 1,
                }
            )

            SquaddieTurnService.beginNewTurn(battleSquaddie.squaddieTurn)
            expect(battleSquaddie.squaddieTurn.endTurn).toBe(false)
            expect(battleSquaddie.squaddieTurn.actionTemplatePoints).toBe(0)
            expect(
                battleSquaddie.squaddieTurn.movementActionPoints
                    .previewedByPlayer
            ).toBe(0)
            expect(
                battleSquaddie.squaddieTurn.movementActionPoints
                    .spentAndCannotBeRefunded
            ).toBe(0)
            expect(
                battleSquaddie.squaddieTurn.movementActionPoints
                    .spentButCanBeRefunded
            ).toBe(0)
        })
    })

    describe("get action point spend", () => {
        it("returns the number of action points and preview movement points", () => {
            let squaddieTurn: SquaddieTurn = SquaddieTurnService.new()
            let { unSpentActionPoints, movementActionPoints } =
                SquaddieTurnService.getActionPointSpend(squaddieTurn)
            expect(unSpentActionPoints).toBe(3)
            expect(movementActionPoints.previewedByPlayer).toBe(0)

            SquaddieTurnService.setMovementActionPointsSpentAndCannotBeRefunded(
                {
                    squaddieTurn: squaddieTurn,
                    actionPoints: 1,
                }
            )
            ;({ unSpentActionPoints, movementActionPoints } =
                SquaddieTurnService.getActionPointSpend(squaddieTurn))
            expect(unSpentActionPoints).toBe(2)
            expect(movementActionPoints.previewedByPlayer).toBe(0)
        })
    })
})
