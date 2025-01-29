import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    ActionPerformFailureReason,
    SquaddieTurnService,
} from "../../squaddie/turn"
import { ActionPointCheck } from "./actionPointCheck"
import { ActionResourceCostService } from "../../action/actionResourceCost"
import { beforeEach, describe, expect, it } from "vitest"
import { BattleSquaddie } from "../battleSquaddie"

describe("Action Point Checker", () => {
    const testNotEnoughActionPoints = [
        {
            actionTemplateId: "onePointAction",
            actionPointCost: 1,
            startingActionPoints: 0,
            expectedMessage: "Need 1 action point",
        },
        {
            actionTemplateId: "twoPointAction",
            actionPointCost: 2,
            startingActionPoints: 0,
            expectedMessage: "Need 2 action points",
        },
        {
            actionTemplateId: "twoPointAction",
            actionPointCost: 2,
            startingActionPoints: 1,
            expectedMessage: "Need 2 action points",
        },
        {
            actionTemplateId: "threePointAction",
            actionPointCost: 3,
            startingActionPoints: 0,
            expectedMessage: "Need 3 action points",
        },
        {
            actionTemplateId: "threePointAction",
            actionPointCost: 3,
            startingActionPoints: 1,
            expectedMessage: "Need 3 action points",
        },
        {
            actionTemplateId: "threePointAction",
            actionPointCost: 3,
            startingActionPoints: 2,
            expectedMessage: "Need 3 action points",
        },
    ]

    it.each(testNotEnoughActionPoints)(
        `$actionTemplateId $startingActionPoints is NOT possible`,
        ({
            actionTemplateId,
            actionPointCost,
            startingActionPoints,
            expectedMessage,
        }) => {
            const objectRepository = ObjectRepositoryService.new()
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                ActionTemplateService.new({
                    id: actionTemplateId,
                    name: actionTemplateId,
                    resourceCost: ActionResourceCostService.new({
                        actionPoints: actionPointCost,
                    }),
                })
            )

            const { battleSquaddie, squaddieTemplate } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleId: "battleId",
                    templateId: "squaddieTemplateId",
                    name: "squaddieName",
                    objectRepository: objectRepository,
                    actionTemplateIds: [actionTemplateId],
                })
            SquaddieTurnService.spendActionPoints(
                battleSquaddie.squaddieTurn,
                3 - startingActionPoints
            )
            expect(
                SquaddieService.getNumberOfActionPoints({
                    battleSquaddie,
                    squaddieTemplate,
                })
            ).toEqual({
                actionPointsRemaining: startingActionPoints,
                actionPointsMarked: 0,
            })
            expect(
                ActionPointCheck.canAfford({
                    battleSquaddie,
                    actionTemplateId,
                    objectRepository,
                })
            ).toEqual({
                isValid: false,
                reason: ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING,
                message: expectedMessage,
            })
        }
    )

    const testHasEnoughActionPoints = [
        {
            actionTemplateId: "onePointAction",
            actionPointCost: 1,
            startingActionPoints: 1,
        },
        {
            actionTemplateId: "onePointAction",
            actionPointCost: 1,
            startingActionPoints: 2,
        },
        {
            actionTemplateId: "onePointAction",
            actionPointCost: 1,
            startingActionPoints: 3,
        },
        {
            actionTemplateId: "twoPointAction",
            actionPointCost: 2,
            startingActionPoints: 2,
        },
        {
            actionTemplateId: "twoPointAction",
            actionPointCost: 2,
            startingActionPoints: 3,
        },
        {
            actionTemplateId: "threePointAction",
            actionPointCost: 3,
            startingActionPoints: 3,
        },
    ]

    it.each(testHasEnoughActionPoints)(
        `$actionTemplateId $startingActionPoints is possible`,
        ({ actionTemplateId, actionPointCost, startingActionPoints }) => {
            const objectRepository = ObjectRepositoryService.new()
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                ActionTemplateService.new({
                    id: actionTemplateId,
                    name: actionTemplateId,
                    resourceCost: ActionResourceCostService.new({
                        actionPoints: actionPointCost,
                    }),
                })
            )
            const { battleSquaddie, squaddieTemplate } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleId: "battleId",
                    templateId: "squaddieTemplateId",
                    name: "squaddieName",
                    objectRepository: objectRepository,
                    actionTemplateIds: [actionTemplateId],
                })
            SquaddieTurnService.spendActionPoints(
                battleSquaddie.squaddieTurn,
                3 - startingActionPoints
            )
            expect(
                SquaddieService.getNumberOfActionPoints({
                    battleSquaddie,
                    squaddieTemplate,
                })
            ).toEqual({
                actionPointsRemaining: startingActionPoints,
                actionPointsMarked: 0,
            })
            expect(
                ActionPointCheck.canAfford({
                    battleSquaddie,
                    actionTemplateId,
                    objectRepository,
                })
            ).toEqual({
                isValid: true,
            })
        }
    )

    describe("marked action points", () => {
        let battleSquaddie: BattleSquaddie
        let objectRepository: ObjectRepository

        const actionTemplateId = "onePointAction"
        const actionPointCost = 1

        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                ActionTemplateService.new({
                    id: actionTemplateId,
                    name: actionTemplateId,
                    resourceCost: ActionResourceCostService.new({
                        actionPoints: actionPointCost,
                    }),
                })
            )
            ;({ battleSquaddie } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleId: "battleId",
                    templateId: "squaddieTemplateId",
                    name: "squaddieName",
                    objectRepository: objectRepository,
                    actionTemplateIds: [actionTemplateId],
                }))

            SquaddieTurnService.markActionPoints(battleSquaddie.squaddieTurn, 3)
        })

        it("ignores marked action points when checking", () => {
            expect(
                ActionPointCheck.canAfford({
                    battleSquaddie,
                    actionTemplateId,
                    objectRepository,
                })
            ).toEqual({
                isValid: true,
            })
        })
    })
})
