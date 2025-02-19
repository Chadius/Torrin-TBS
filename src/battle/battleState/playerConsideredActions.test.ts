import { beforeEach, describe, expect, it } from "vitest"
import {
    PlayerConsideredActions,
    PlayerConsideredActionsService,
} from "./playerConsideredActions"
import { BattleSquaddie } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ActionResourceCostService } from "../../action/actionResourceCost"

describe("Player Considered Actions", () => {
    let battleSquaddie: BattleSquaddie
    let objectRepository: ObjectRepository
    let actionCost1Point: ActionTemplate
    let actionCost2Point: ActionTemplate
    let actionCost3Point: ActionTemplate

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()

        const actionTemplates = [
            {
                id: "actionCost1Point",
                name: "actionCost1Point",
                actionPoints: 1,
            },
            {
                id: "actionCost2Point",
                name: "actionCost2Point",
                actionPoints: 2,
            },
            {
                id: "actionCost3Point",
                name: "actionCost3Point",
                actionPoints: 3,
            },
        ].map((info) => {
            const action = ActionTemplateService.new({
                id: info.id,
                name: info.name,
                resourceCost: ActionResourceCostService.new({
                    actionPoints: info.actionPoints,
                }),
            })
            ObjectRepositoryService.addActionTemplate(objectRepository, action)
            return action
        })

        actionCost1Point = actionTemplates[0]
        actionCost2Point = actionTemplates[1]
        actionCost3Point = actionTemplates[2]
        ;({ battleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "player squaddie name",
                templateId: "player squaddie template id",
                battleId: "player battle squaddie id",
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository,
                actionTemplateIds: [],
            }))
    })

    describe("Player considers ending their turn", () => {
        let endTurnConsideration: PlayerConsideredActions
        beforeEach(() => {
            endTurnConsideration = PlayerConsideredActionsService.new()
            endTurnConsideration.endTurn = true
        })

        it("will expect to consume remaining action points", () => {
            expect(
                PlayerConsideredActionsService.getExpectedMarkedActionPointsBasedOnPlayerConsideration(
                    {
                        battleSquaddie,
                        objectRepository,
                        playerConsideredActions: endTurnConsideration,
                    }
                )
            ).toEqual(battleSquaddie.squaddieTurn.remainingActionPoints)
        })

        it("will expect to consume remaining action points even after spending some", () => {
            SquaddieTurnService.spendActionPoints(
                battleSquaddie.squaddieTurn,
                1
            )
            expect(
                PlayerConsideredActionsService.getExpectedMarkedActionPointsBasedOnPlayerConsideration(
                    {
                        battleSquaddie,
                        objectRepository,
                        playerConsideredActions: endTurnConsideration,
                    }
                )
            ).toEqual(battleSquaddie.squaddieTurn.remainingActionPoints)
        })
    })

    describe("Player considers using an action", () => {
        let actionPointConsideration: PlayerConsideredActions
        beforeEach(() => {
            actionPointConsideration = PlayerConsideredActionsService.new()
        })

        it("considers 1 action point", () => {
            actionPointConsideration.actionTemplateId = actionCost1Point.id
            expect(
                PlayerConsideredActionsService.getExpectedMarkedActionPointsBasedOnPlayerConsideration(
                    {
                        battleSquaddie,
                        objectRepository,
                        playerConsideredActions: actionPointConsideration,
                    }
                )
            ).toEqual(actionCost1Point.resourceCost.actionPoints)
        })
        it("considers 2 action points", () => {
            actionPointConsideration.actionTemplateId = actionCost2Point.id
            expect(
                PlayerConsideredActionsService.getExpectedMarkedActionPointsBasedOnPlayerConsideration(
                    {
                        battleSquaddie,
                        objectRepository,
                        playerConsideredActions: actionPointConsideration,
                    }
                )
            ).toEqual(actionCost2Point.resourceCost.actionPoints)
        })
        it("considers 3 action points", () => {
            actionPointConsideration.actionTemplateId = actionCost3Point.id
            expect(
                PlayerConsideredActionsService.getExpectedMarkedActionPointsBasedOnPlayerConsideration(
                    {
                        battleSquaddie,
                        objectRepository,
                        playerConsideredActions: actionPointConsideration,
                    }
                )
            ).toEqual(actionCost3Point.resourceCost.actionPoints)
        })
    })

    it("Player considers moving", () => {
        let movementPointConsideration: PlayerConsideredActions =
            PlayerConsideredActionsService.new()
        movementPointConsideration.movement = {
            actionPointCost: 1,
            destination: { q: 0, r: 1 },
            coordinates: [
                { q: 0, r: 0 },
                { q: 0, r: 1 },
            ],
        }
        expect(
            PlayerConsideredActionsService.getExpectedMarkedActionPointsBasedOnPlayerConsideration(
                {
                    battleSquaddie,
                    objectRepository,
                    playerConsideredActions: movementPointConsideration,
                }
            )
        ).toEqual(actionCost1Point.resourceCost.actionPoints)
    })
})
