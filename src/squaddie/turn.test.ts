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
import { ActionPerformFailureReason, SquaddieTurnService } from "./turn"

describe("Squaddie battleSquaddie.squaddieTurn and resources", () => {
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

    describe("actions", () => {
        it("should start with 3 action points", () => {
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(3)
        })
        it("should spend 1 action by default", () => {
            SquaddieTurnService.spendActionPoints(
                battleSquaddie.squaddieTurn,
                ActionTemplateService.new({
                    id: "actionSpends1ActionPoint",
                    name: "Power Attack",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                { [Trait.ATTACK]: true }
                            ),
                        }),
                    ],
                }).resourceCost.actionPoints
            )
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(2)
        })
        it("should spend multiple actions if action uses more", () => {
            SquaddieTurnService.spendActionPoints(
                battleSquaddie.squaddieTurn,
                actionSpends2ActionPoints.resourceCost.actionPoints
            )
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(1)
        })
        it("will remove all action when you spend the entire round", () => {
            SquaddieTurnService.spendActionPoints(
                battleSquaddie.squaddieTurn,
                "End Turn"
            )
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(0)
        })
        describe("canPerformAction", () => {
            it("should report when an action cannot be performed because it lacks action points", () => {
                SquaddieTurnService.spendActionPoints(
                    battleSquaddie.squaddieTurn,
                    actionSpends2ActionPoints.resourceCost.actionPoints
                )
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
                const playerConsideredActions =
                    PlayerConsideredActionsService.new()
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
                const playerConsideredActions =
                    PlayerConsideredActionsService.new()
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
        })
        it("should give 3 action points upon starting a new round", () => {
            SquaddieTurnService.spendActionPoints(
                battleSquaddie.squaddieTurn,
                actionSpends2ActionPoints.resourceCost.actionPoints
            )
            SquaddieTurnService.beginNewRound(battleSquaddie.squaddieTurn)
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(3)
        })
        it("can spend arbitrary number of action points", () => {
            SquaddieTurnService.beginNewRound(battleSquaddie.squaddieTurn)
            SquaddieTurnService.spendActionPoints(
                battleSquaddie.squaddieTurn,
                1
            )
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(2)
        })
        it("knows when it is out of action points", () => {
            expect(
                SquaddieTurnService.hasActionPointsRemaining(
                    battleSquaddie.squaddieTurn
                )
            ).toBeTruthy()
            SquaddieTurnService.spendActionPoints(
                battleSquaddie.squaddieTurn,
                3
            )
            expect(
                SquaddieTurnService.hasActionPointsRemaining(
                    battleSquaddie.squaddieTurn
                )
            ).toBeFalsy()
            SquaddieTurnService.beginNewRound(battleSquaddie.squaddieTurn)
            expect(
                SquaddieTurnService.hasActionPointsRemaining(
                    battleSquaddie.squaddieTurn
                )
            ).toBeTruthy()
        })
        it("can end its battleSquaddie.squaddieTurn", () => {
            SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            expect(
                SquaddieTurnService.hasActionPointsRemaining(
                    battleSquaddie.squaddieTurn
                )
            ).toBeFalsy()
        })
    })
})
