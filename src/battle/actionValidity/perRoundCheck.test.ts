import { ObjectRepositoryService } from "../objectRepository"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { ActionPerformFailureReason } from "../../squaddie/turn"
import { ActionResourceCostService } from "../../action/actionResourceCost"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { BattleActionService } from "../history/battleAction/battleAction"
import { PerRoundCheck } from "./perRoundCheck"
import { describe, expect, it } from "vitest"

describe("Per Round Checker", () => {
    const testTooManyTimesPerRound = [
        {
            numberOfTimesAlreadyUsed: 1,
            numberOfAllowedUses: 1,
            expectedMessage: "Already used this round",
        },
        {
            numberOfTimesAlreadyUsed: 2,
            numberOfAllowedUses: 2,
            expectedMessage: "Already used 2 times",
        },
    ]

    it.each(testTooManyTimesPerRound)(
        `$numberOfAllowedUses $numberOfTimesAlreadyUsed is NOT possible`,
        ({
            numberOfTimesAlreadyUsed,
            numberOfAllowedUses,
            expectedMessage,
        }) => {
            const { recorder, actionTemplate } = setup(
                numberOfAllowedUses,
                numberOfTimesAlreadyUsed
            )

            expect(
                PerRoundCheck.withinLimitedUsesThisRound({
                    actionTemplate,
                    battleActionRecorder: recorder,
                })
            ).toEqual({
                isValid: false,
                reason: ActionPerformFailureReason.TOO_MANY_USES_THIS_ROUND,
                message: expectedMessage,
            })
        }
    )

    const testAllowedTimesPerRound = [
        {
            numberOfTimesAlreadyUsed: 1,
            numberOfAllowedUses: 2,
        },
        {
            numberOfTimesAlreadyUsed: 9001,
            numberOfAllowedUses: undefined,
        },
    ]

    it.each(testAllowedTimesPerRound)(
        `$numberOfAllowedUses $numberOfTimesAlreadyUsed is possible`,
        ({ numberOfTimesAlreadyUsed, numberOfAllowedUses }) => {
            const { recorder, actionTemplate } = setup(
                numberOfAllowedUses,
                numberOfTimesAlreadyUsed
            )

            expect(
                PerRoundCheck.withinLimitedUsesThisRound({
                    actionTemplate,
                    battleActionRecorder: recorder,
                })
            ).toEqual({
                isValid: true,
            })
        }
    )
})

const setup = (
    numberOfAllowedUses: number | undefined,
    numberOfTimesAlreadyUsed: number
) => {
    const objectRepository = ObjectRepositoryService.new()
    const actionTemplate = ActionTemplateService.new({
        id: "action",
        name: "action",
        resourceCost: ActionResourceCostService.new({
            actionPoints: 0,
            numberOfTimesPerRound: numberOfAllowedUses,
        }),
    })
    ObjectRepositoryService.addActionTemplate(objectRepository, actionTemplate)

    SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
        affiliation: SquaddieAffiliation.PLAYER,
        battleId: "battleId",
        templateId: "squaddieTemplateId",
        name: "squaddieName",
        objectRepository: objectRepository,
        actionTemplateIds: ["action"],
    })

    const recorder = BattleActionRecorderService.new()
    for (let i = 0; i < numberOfTimesAlreadyUsed; i++) {
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            recorder,
            BattleActionService.new({
                actor: { actorBattleSquaddieId: "battleId" },
                action: { actionTemplateId: "action" },
                effect: { squaddie: [] },
            })
        )
        BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
            recorder
        )
    }
    return { objectRepository, recorder, actionTemplate }
}
