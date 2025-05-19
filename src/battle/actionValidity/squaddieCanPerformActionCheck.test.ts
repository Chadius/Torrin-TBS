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
                movementActionPoints: {
                    spentAndCannotBeRefunded: 3,
                },
                actionPointsRemaining: 0,
                expectedMessage: "Need 1 action point",
            },
            {
                actionTemplateId: "twoPointAction",
                actionPointCost: 2,
                movementActionPoints: {
                    spentAndCannotBeRefunded: 3,
                },
                actionPointsRemaining: 0,
                expectedMessage: "Need 2 action points",
            },
            {
                actionTemplateId: "twoPointAction",
                actionPointCost: 2,
                movementActionPoints: {
                    spentAndCannotBeRefunded: 2,
                },
                actionPointsRemaining: 1,
                expectedMessage: "Need 2 action points",
            },
            {
                actionTemplateId: "threePointAction",
                actionPointCost: 3,
                movementActionPoints: {
                    spentAndCannotBeRefunded: 3,
                },
                actionPointsRemaining: 0,
                expectedMessage: "Need 3 action points",
            },
            {
                actionTemplateId: "threePointAction",
                actionPointCost: 3,
                movementActionPoints: {
                    spentAndCannotBeRefunded: 2,
                },
                actionPointsRemaining: 1,
                expectedMessage: "Need 3 action points",
            },
            {
                actionTemplateId: "threePointAction",
                actionPointCost: 3,
                movementActionPoints: {
                    spentAndCannotBeRefunded: 1,
                },
                actionPointsRemaining: 2,
                expectedMessage: "Need 3 action points",
            },
        ]

        it.each(testNotEnoughActionPoints)(
            `$actionTemplateId with $actionPointsRemaining points remaining is NOT possible`,
            ({
                actionTemplateId,
                actionPointCost,
                movementActionPoints,
                expectedMessage,
                actionPointsRemaining,
            }) => {
                const { battleSquaddie, actionTemplate } = setup({
                    actionTemplateId: actionTemplateId,
                    actionPointCost: actionPointCost,
                    movementActionPoints,
                })
                expect(
                    SquaddieService.getActionPointSpend({
                        battleSquaddie,
                    })
                ).toEqual({
                    movementActionPoints: {
                        previewedByPlayer: 0,
                        spentButCanBeRefunded: 0,
                        spentAndCannotBeRefunded:
                            movementActionPoints.spentAndCannotBeRefunded,
                    },
                    unSpentActionPoints: actionPointsRemaining,
                })
                expect(
                    SquaddieCanPerformActionCheck.canPerform({
                        battleSquaddie,
                        actionTemplate,
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
                actionPointsRemaining: 1,
                movementActionPoints: {
                    spentAndCannotBeRefunded: 2,
                },
            },
            {
                actionTemplateId: "onePointAction",
                actionPointCost: 1,
                actionPointsRemaining: 2,
                movementActionPoints: {
                    spentAndCannotBeRefunded: 1,
                },
            },
            {
                actionTemplateId: "onePointAction",
                actionPointCost: 1,
                actionPointsRemaining: 3,
                movementActionPoints: {},
            },
            {
                actionTemplateId: "twoPointAction",
                actionPointCost: 2,
                actionPointsRemaining: 2,
                movementActionPoints: {
                    spentAndCannotBeRefunded: 1,
                },
            },
            {
                actionTemplateId: "twoPointAction",
                actionPointCost: 2,
                actionPointsRemaining: 3,
                movementActionPoints: {},
            },
            {
                actionTemplateId: "threePointAction",
                actionPointCost: 3,
                actionPointsRemaining: 3,
                movementActionPoints: {},
            },
        ]

        it.each(testHasEnoughActionPoints)(
            `$actionTemplateId with $actionPointsRemaining points remaining is possible`,
            ({
                actionTemplateId,
                actionPointCost,
                actionPointsRemaining,
                movementActionPoints,
            }) => {
                const { battleSquaddie, actionTemplate } = setup({
                    actionTemplateId: actionTemplateId,
                    actionPointCost: actionPointCost,
                    movementActionPoints,
                })
                expect(
                    SquaddieService.getActionPointSpend({
                        battleSquaddie,
                    })
                ).toEqual({
                    movementActionPoints: {
                        previewedByPlayer: 0,
                        spentButCanBeRefunded: 0,
                        spentAndCannotBeRefunded:
                            movementActionPoints.spentAndCannotBeRefunded || 0,
                    },
                    unSpentActionPoints: actionPointsRemaining,
                })
                expect(
                    SquaddieCanPerformActionCheck.canPerform({
                        battleSquaddie,
                        actionTemplate,
                    })
                ).toEqual({
                    isValid: true,
                })
            }
        )

        it("cannot perform action if points were spent moving, even if they can be refunded", () => {
            const { battleSquaddie, actionTemplate } = setup({
                actionTemplateId: "onePointAction",
                actionPointCost: 1,
                movementActionPoints: {
                    spentAndCannotBeRefunded: 1,
                    spentButCanBeRefunded: 2,
                },
            })
            expect(
                SquaddieService.getActionPointSpend({
                    battleSquaddie,
                })
            ).toEqual({
                movementActionPoints: {
                    previewedByPlayer: 0,
                    spentButCanBeRefunded: 2,
                    spentAndCannotBeRefunded: 1,
                },
                unSpentActionPoints: 0,
            })
            expect(
                SquaddieCanPerformActionCheck.canPerform({
                    battleSquaddie,
                    actionTemplate,
                })
            ).toEqual({
                isValid: false,
                reason: ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING,
                message: "Need 1 action point",
            })
        })
    })

    describe("Player is considering an action while checking highlighted actions", () => {
        let playerConsideredActions: PlayerConsideredActions
        beforeEach(() => {
            playerConsideredActions = PlayerConsideredActionsService.new()
        })

        it("You can afford the action if you have more than the action point cost + considered action points", () => {
            const { battleSquaddie, actionTemplate } = setup({
                actionTemplateId: "action1PointCost",
                actionPointCost: 1,
                movementActionPoints: {},
            })
            SquaddieTurnService.setMovementActionPointsPreviewedByPlayer({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionPoints: 1,
            })

            expect(
                SquaddieCanPerformActionCheck.canPerform({
                    battleSquaddie,
                    actionTemplate,
                })
            ).toEqual({
                isValid: true,
            })
        })
        it("You can afford the action but there is a warning if too many action points are refunded", () => {
            const { battleSquaddie, actionTemplate } = setup({
                actionTemplateId: "action1PointCost",
                actionPointCost: 1,
                movementActionPoints: {
                    previewedByPlayer: 2,
                    spentAndCannotBeRefunded: 1,
                },
            })
            playerConsideredActions.actionTemplateId = "action1PointCost"
            expect(
                SquaddieCanPerformActionCheck.canPerform({
                    battleSquaddie,
                    actionTemplate,
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
            const { battleSquaddie, actionTemplate } = setup({
                actionTemplateId: "action1PointCost",
                actionPointCost: 1,
                movementActionPoints: {
                    spentAndCannotBeRefunded: 2,
                },
            })
            playerConsideredActions.actionTemplateId = "action1PointCost"
            expect(
                SquaddieCanPerformActionCheck.canPerform({
                    battleSquaddie,
                    actionTemplate,
                })
            ).toEqual(
                expect.objectContaining({
                    isValid: true,
                })
            )
        })
    })

    it("Cannot perform action that is on cooldown", () => {
        const { battleSquaddie, actionTemplate } = setup({
            actionTemplateId: "3 rounds of cooldown",
            actionPointCost: 0,
            movementActionPoints: {},
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
                actionTemplate,
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
                actionTemplate,
            }).isValid
        ).toBeFalsy()
    })
})

const setup = ({
    actionTemplateId,
    actionPointCost,
    movementActionPoints,
}: {
    actionTemplateId: string
    actionPointCost: number
    movementActionPoints: {
        previewedByPlayer?: number
        spentButCanBeRefunded?: number
        spentAndCannotBeRefunded?: number
    }
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
    SquaddieTurnService.setMovementActionPointsSpentAndCannotBeRefunded({
        squaddieTurn: battleSquaddie.squaddieTurn,
        actionPoints: movementActionPoints.spentAndCannotBeRefunded || 0,
    })
    SquaddieTurnService.setMovementActionPointsSpentButCanBeRefunded({
        squaddieTurn: battleSquaddie.squaddieTurn,
        actionPoints: movementActionPoints.spentButCanBeRefunded || 0,
    })
    SquaddieTurnService.setMovementActionPointsPreviewedByPlayer({
        squaddieTurn: battleSquaddie.squaddieTurn,
        actionPoints: movementActionPoints.previewedByPlayer || 0,
    })
    return {
        objectRepository,
        battleSquaddie,
        squaddieTemplate,
        actionTemplate,
    }
}
