import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../action/template/actionEffectTemplate"
import { ActionResourceCostService } from "../action/actionResourceCost"
import { beforeEach, describe, expect, it } from "vitest"
import { PlayerConsideredActionsService } from "../battle/battleState/playerConsideredActions"
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
            expect(battleSquaddie.squaddieTurn.unallocatedActionPoints).toBe(3)
        })

        it("should give refresh action points at the end of a round", () => {
            SquaddieTurnService.spendActionPointsAndReservedPoints({
                data: battleSquaddie.squaddieTurn,
                actionTemplate: actionSpends2ActionPoints,
            })
            SquaddieTurnService.refreshActionPoints(battleSquaddie.squaddieTurn)
            expect(battleSquaddie.squaddieTurn.unallocatedActionPoints).toBe(3)
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
            SquaddieTurnService.spendActionPointsAndReservedPoints({
                data: battleSquaddie.squaddieTurn,
                actionTemplate,
            })
            expect(battleSquaddie.squaddieTurn.unallocatedActionPoints).toBe(2)
        })
        it("should spend multiple action points if action uses more", () => {
            SquaddieTurnService.spendActionPointsAndReservedPoints({
                data: battleSquaddie.squaddieTurn,
                actionTemplate: actionSpends2ActionPoints,
            })
            expect(battleSquaddie.squaddieTurn.unallocatedActionPoints).toBe(1)
        })
    })

    describe("canPerformAction", () => {
        it("should report when an action cannot be performed because it lacks action points", () => {
            SquaddieTurnService.spendActionPointsAndReservedPoints({
                data: battleSquaddie.squaddieTurn,
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
        it("should report when an action can be performed but there are too many action points considered", () => {
            const playerConsideredActions = PlayerConsideredActionsService.new()
            playerConsideredActions.movement = {
                actionPointCost: 2,
                coordinates: [],
                destination: { q: 0, r: 0 },
            }

            const query = SquaddieTurnService.canPerformAction({
                actionTemplate: actionSpends2ActionPoints,
                playerConsideredActions,
                objectRepository,
                battleSquaddie,
            })
            expect(query.canPerform).toBeTruthy()
            expect(query.reason).toBe(
                ActionPerformFailureReason.CAN_PERFORM_BUT_TOO_MANY_CONSIDERED_ACTION_POINTS
            )
        })
        it("should report when an action can be performed even if too many points are considered because this action is considered", () => {
            const playerConsideredActions = PlayerConsideredActionsService.new()
            playerConsideredActions.actionTemplateId =
                actionSpends2ActionPoints.id

            const query = SquaddieTurnService.canPerformAction({
                actionTemplate: actionSpends2ActionPoints,
                playerConsideredActions,
                objectRepository,
                battleSquaddie,
            })
            expect(query.canPerform).toBeTruthy()
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

    describe("spend action points on movement", () => {
        it("can spend action points on movement", () => {
            SquaddieTurnService.spendActionPointsForMovement({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionPoints: 1,
            })
            expect(
                SquaddieTurnService.getActionPointsReservedForMovement(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(1)
            expect(
                SquaddieTurnService.getUnallocatedActionPoints(
                    battleSquaddie.squaddieTurn
                )
            ).toBe(2)
            expect(
                SquaddieTurnService.hasActionPointsRemaining(
                    battleSquaddie.squaddieTurn
                )
            ).toBeTruthy()
        })
    })

    describe("end turn", () => {
        it("will not have action points after ending its turn", () => {
            SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            expect(
                SquaddieTurnService.hasActionPointsRemaining(
                    battleSquaddie.squaddieTurn
                )
            ).toBeFalsy()
            expect(battleSquaddie.squaddieTurn.unallocatedActionPoints).toBe(0)
        })
    })

    describe("begin new turn", () => {
        it("will regain its action points", () => {
            SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            expect(battleSquaddie.squaddieTurn.unallocatedActionPoints).toEqual(
                0
            )
            SquaddieTurnService.beginNewTurn(battleSquaddie.squaddieTurn)
            expect(battleSquaddie.squaddieTurn.unallocatedActionPoints).toEqual(
                DEFAULT_ACTION_POINTS_PER_TURN
            )
        })
    })
})
