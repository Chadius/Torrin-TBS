import { ActionPerformFailureReason } from "../../squaddie/turn"
import { ObjectRepositoryService } from "../objectRepository"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { SquaddieTemplateService } from "../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../squaddie/id"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddieService } from "../battleSquaddie"
import { ValidityCheckService } from "./validityChecker"
import { ActionPointCheck } from "./actionPointCheck"
import { BuffSelfCheck } from "./buffSelfCheck"

describe("validity checker", () => {
    const setupSingleSquaddie = () => {
        const objectRepository = ObjectRepositoryService.new()
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            ActionTemplateService.new({
                id: "actionTemplate",
                name: "actionTemplate",
                actionPoints: 1,
            })
        )
        ObjectRepositoryService.addSquaddie(
            objectRepository,
            SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "squaddieTemplate",
                    name: "squaddieTemplate",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                actionTemplateIds: ["actionTemplate"],
            }),
            BattleSquaddieService.new({
                squaddieTemplateId: "squaddieTemplate",
                battleSquaddieId: "battleSquaddieId",
            })
        )
        return {
            objectRepository,
            battleSquaddieId: "battleSquaddieId",
            actionTemplateId: "actionTemplate",
        }
    }

    const actionIsInvalidTests = [
        {
            checkerName: "actionPointCheck",
            setupSpy: () => {
                const spy = jest.spyOn(ActionPointCheck, "canAfford")
                spy.mockReturnValue({
                    isValid: false,
                    reason: ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING,
                    message: "Need 1 action point",
                })
                return spy
            },
            expectedMessages: ["Need 1 action point"],
        },
        {
            checkerName: "buffSelfCheck",
            setupSpy: () => {
                const spy = jest.spyOn(BuffSelfCheck, "willBuffUser")
                spy.mockReturnValue({
                    isValid: false,
                    reason: ActionPerformFailureReason.BUFF_HAS_NO_EFFECT,
                    message: "Will have no effect on squaddieName",
                })
                return spy
            },
            expectedMessages: ["Will have no effect on squaddieName"],
        },
    ]

    it.each(actionIsInvalidTests)(
        `$checkerName will disable the action`,
        ({ setupSpy, expectedMessages }) => {
            const { actionTemplateId, battleSquaddieId, objectRepository } =
                setupSingleSquaddie()

            const spy: jest.SpyInstance = setupSpy()

            const actionStatus = ValidityCheckService.calculateActionValidity({
                objectRepository,
                battleSquaddieId,
            })

            expect(actionStatus[actionTemplateId]).toEqual({
                disabled: true,
                messages: expectedMessages,
            })

            spy.mockRestore()
        }
    )

    it("can combine multiple messages from different validity checkers", () => {
        const { actionTemplateId, battleSquaddieId, objectRepository } =
            setupSingleSquaddie()

        const actionPointCheckSpy = jest.spyOn(ActionPointCheck, "canAfford")
        actionPointCheckSpy.mockReturnValue({
            isValid: false,
            reason: ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING,
            message: "Need 1 action point",
        })

        const willBuffUserSpy = jest.spyOn(BuffSelfCheck, "willBuffUser")
        willBuffUserSpy.mockReturnValue({
            isValid: false,
            reason: ActionPerformFailureReason.BUFF_HAS_NO_EFFECT,
            message: "Will have no effect on squaddieName",
        })

        const actionStatus = ValidityCheckService.calculateActionValidity({
            objectRepository,
            battleSquaddieId,
        })

        expect(actionStatus[actionTemplateId]).toEqual({
            disabled: true,
            messages: [
                "Need 1 action point",
                "Will have no effect on squaddieName",
            ],
        })

        actionPointCheckSpy.mockRestore()
        willBuffUserSpy.mockRestore()
    })
})
