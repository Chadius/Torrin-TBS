import { ActionPerformFailureReason } from "../../squaddie/turn"
import { ObjectRepositoryService } from "../objectRepository"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { SquaddieTemplateService } from "../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../squaddie/id"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddieService } from "../battleSquaddie"
import { ValidityCheckService } from "./validityChecker"
import { ActionPointCheck } from "./actionPointCheck"

describe("validity checker", () => {
    let actionCheckSpy: jest.SpyInstance

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

    it("actionPointCheck will disable and warn the user", () => {
        const { actionTemplateId, battleSquaddieId, objectRepository } =
            setupSingleSquaddie()
        actionCheckSpy = jest.spyOn(ActionPointCheck, "canAfford")
        actionCheckSpy.mockReturnValue({
            isValid: false,
            reason: ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING,
            message: "Need 1 action point",
        })

        const actionStatus = ValidityCheckService.calculateActionValidity({
            objectRepository,
            battleSquaddieId,
        })

        expect(actionStatus[actionTemplateId]).toEqual({
            disabled: true,
            warn: true,
            messages: ["Need 1 action point"],
        })

        actionCheckSpy.mockRestore()
    })
})
