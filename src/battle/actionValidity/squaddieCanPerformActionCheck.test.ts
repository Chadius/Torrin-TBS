import { ObjectRepositoryService } from "../objectRepository"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    ActionPerformFailureReason,
    SquaddieTurnService,
} from "../../squaddie/turn"
import { SquaddieCanPerformActionCheck } from "./squaddieCanPerformActionCheck"
import { ActionResourceCostService } from "../../action/actionResourceCost"
import { beforeEach, describe, expect, it } from "vitest"
import {
    PlayerConsideredActions,
    PlayerConsideredActionsService,
} from "../battleState/playerConsideredActions"
import { InBattleAttributesService } from "../stats/inBattleAttributes"

describe("Squaddie Can Perform Action", () => {
    describe("Has enough Action Points", () => {
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
                const {
                    objectRepository,
                    battleSquaddie,
                    squaddieTemplate,
                    actionTemplate,
                } = setup({
                    actionTemplateId: actionTemplateId,
                    actionPointCost: actionPointCost,
                    startingActionPoints: startingActionPoints,
                })
                expect(
                    SquaddieService.getNumberOfActionPoints({
                        battleSquaddie,
                        squaddieTemplate,
                    })
                ).toEqual({
                    movementActionPoints: 3 - startingActionPoints,
                    unallocatedActionPoints: startingActionPoints,
                })
                expect(
                    SquaddieCanPerformActionCheck.canPerform({
                        battleSquaddie,
                        actionTemplate,
                        objectRepository,
                        playerConsideredActions: undefined,
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
                const {
                    objectRepository,
                    battleSquaddie,
                    squaddieTemplate,
                    actionTemplate,
                } = setup({
                    actionTemplateId: actionTemplateId,
                    actionPointCost: actionPointCost,
                    startingActionPoints: startingActionPoints,
                })
                expect(
                    SquaddieService.getNumberOfActionPoints({
                        battleSquaddie,
                        squaddieTemplate,
                    })
                ).toEqual({
                    movementActionPoints: 3 - startingActionPoints,
                    unallocatedActionPoints: startingActionPoints,
                })
                expect(
                    SquaddieCanPerformActionCheck.canPerform({
                        battleSquaddie,
                        actionTemplate,
                        objectRepository,
                        playerConsideredActions: undefined,
                    })
                ).toEqual({
                    isValid: true,
                })
            }
        )
    })

    describe("Player is considering an action while checking highlighted actions", () => {
        let playerConsideredActions: PlayerConsideredActions
        beforeEach(() => {
            playerConsideredActions = PlayerConsideredActionsService.new()
        })

        it("You can afford the action if you have more than the action point cost + considered action points", () => {
            const { objectRepository, battleSquaddie, actionTemplate } = setup({
                actionTemplateId: "action1PointCost",
                actionPointCost: 1,
                startingActionPoints: 3,
            })
            playerConsideredActions.movement = {
                actionPointCost: 1,
                coordinates: [],
                destination: { q: 0, r: 0 },
            }
            expect(
                SquaddieCanPerformActionCheck.canPerform({
                    battleSquaddie,
                    actionTemplate,
                    objectRepository,
                    playerConsideredActions,
                })
            ).toEqual({
                isValid: true,
            })
        })
        it("You can afford if too many action points are considered but there will be a warning", () => {
            const { objectRepository, battleSquaddie, actionTemplate } = setup({
                actionTemplateId: "action1PointCost",
                actionPointCost: 1,
                startingActionPoints: 1,
            })
            playerConsideredActions.movement = {
                actionPointCost: 1,
                coordinates: [],
                destination: { q: 0, r: 0 },
            }
            expect(
                SquaddieCanPerformActionCheck.canPerform({
                    battleSquaddie,
                    actionTemplate,
                    objectRepository,
                    playerConsideredActions,
                })
            ).toEqual(
                expect.objectContaining({
                    isValid: true,
                    warning: true,
                    reason: ActionPerformFailureReason.CAN_PERFORM_BUT_TOO_MANY_CONSIDERED_ACTION_POINTS,
                })
            )
        })
        it("The marked action points are ignored if it's marked because of this action", () => {
            const { objectRepository, battleSquaddie, actionTemplate } = setup({
                actionTemplateId: "action1PointCost",
                actionPointCost: 1,
                startingActionPoints: 1,
            })
            playerConsideredActions.actionTemplateId = "action1PointCost"
            expect(
                SquaddieCanPerformActionCheck.canPerform({
                    battleSquaddie,
                    actionTemplate,
                    objectRepository,
                    playerConsideredActions,
                })
            ).toEqual(
                expect.objectContaining({
                    isValid: true,
                })
            )
        })
    })

    it("Cannot perform action that is on cooldown", () => {
        const { battleSquaddie, actionTemplate, objectRepository } = setup({
            actionTemplateId: "3 rounds of cooldown",
            actionPointCost: 0,
            startingActionPoints: 3,
        })

        let playerConsideredActions = PlayerConsideredActionsService.new()
        playerConsideredActions.movement = {
            actionPointCost: 1,
            coordinates: [],
            destination: { q: 0, r: 0 },
        }

        expect(
            SquaddieCanPerformActionCheck.canPerform({
                battleSquaddie,
                objectRepository,
                actionTemplate,
                playerConsideredActions,
            }).isValid
        ).toBeTruthy()
        InBattleAttributesService.addActionCooldown({
            inBattleAttributes: battleSquaddie.inBattleAttributes,
            actionTemplateId: "3 rounds of cooldown",
            numberOfCooldownTurns: 3,
        })

        expect(
            SquaddieCanPerformActionCheck.canPerform({
                battleSquaddie,
                objectRepository,
                actionTemplate,
                playerConsideredActions,
            }).isValid
        ).toBeFalsy()
    })
})

const setup = ({
    actionTemplateId,
    actionPointCost,
    startingActionPoints,
}: {
    actionTemplateId: string
    actionPointCost: number
    startingActionPoints: number
}) => {
    const objectRepository = ObjectRepositoryService.new()
    const actionTemplate = ActionTemplateService.new({
        id: actionTemplateId,
        name: actionTemplateId,
        resourceCost: ActionResourceCostService.new({
            actionPoints: actionPointCost,
        }),
    })
    ObjectRepositoryService.addActionTemplate(objectRepository, actionTemplate)
    const { battleSquaddie, squaddieTemplate } =
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            affiliation: SquaddieAffiliation.PLAYER,
            battleId: "battleId",
            templateId: "squaddieTemplateId",
            name: "squaddieName",
            objectRepository: objectRepository,
            actionTemplateIds: [actionTemplateId],
        })
    SquaddieTurnService.spendActionPointsForMovement({
        squaddieTurn: battleSquaddie.squaddieTurn,
        actionPoints: 3 - startingActionPoints,
    })
    return {
        objectRepository,
        battleSquaddie,
        squaddieTemplate,
        actionTemplate,
    }
}
