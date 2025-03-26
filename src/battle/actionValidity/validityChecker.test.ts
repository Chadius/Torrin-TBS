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
import { PerRoundCheck } from "./perRoundCheck"
import { GameEngineStateService } from "../../gameEngine/gameEngine"
import { describe, expect, it, MockInstance, vi } from "vitest"
import { CanHealTargetCheck } from "./canHealTargetCheck"

describe("validity checker", () => {
    const setupSingleSquaddie = () => {
        const objectRepository = ObjectRepositoryService.new()
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            ActionTemplateService.new({
                id: "actionTemplate",
                name: "actionTemplate",
            })
        )
        ObjectRepositoryService.addSquaddie({
            repo: objectRepository,
            squaddieTemplate: SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "squaddieTemplate",
                    name: "squaddieTemplate",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                actionTemplateIds: ["actionTemplate"],
            }),
            battleSquaddie: BattleSquaddieService.new({
                squaddieTemplateId: "squaddieTemplate",
                battleSquaddieId: "battleSquaddieId",
            }),
        })
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
                const spy = vi.spyOn(ActionPointCheck, "canAfford")
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
            checkerName: "perRoundCheck",
            setupSpy: () => {
                const spy = vi.spyOn(
                    PerRoundCheck,
                    "withinLimitedUsesThisRound"
                )
                spy.mockReturnValue({
                    isValid: false,
                    reason: ActionPerformFailureReason.TOO_MANY_USES_THIS_ROUND,
                    message: "Already used during this round",
                })
                return spy
            },
            expectedMessages: ["Already used during this round"],
        },
    ]

    it.each(actionIsInvalidTests)(
        `$checkerName will disable the action`,
        ({ setupSpy, expectedMessages }) => {
            const { actionTemplateId, battleSquaddieId, objectRepository } =
                setupSingleSquaddie()

            const spy: MockInstance = setupSpy()

            const actionStatus = ValidityCheckService.calculateActionValidity({
                objectRepository,
                battleSquaddieId,
                gameEngineState: GameEngineStateService.new({}),
            })

            expect(actionStatus[actionTemplateId]).toEqual({
                isValid: false,
                warning: false,
                messages: expectedMessages,
            })

            spy.mockRestore()
        }
    )

    it("can combine multiple messages from different validity checkers", () => {
        const { actionTemplateId, battleSquaddieId, objectRepository } =
            setupSingleSquaddie()

        const actionPointCheckSpy = vi.spyOn(ActionPointCheck, "canAfford")
        actionPointCheckSpy.mockReturnValue({
            isValid: false,
            reason: ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING,
            message: "Need 1 action point",
        })

        const willBuffUserSpy = vi.spyOn(BuffSelfCheck, "willBuffUser")
        willBuffUserSpy.mockReturnValue({
            isValid: false,
            reason: ActionPerformFailureReason.BUFF_HAS_NO_EFFECT,
            message: "Will have no effect on squaddieName",
        })

        const canHealSpy = vi.spyOn(
            CanHealTargetCheck,
            "targetInRangeCanBeAffected"
        )
        canHealSpy.mockReturnValue({
            isValid: false,
            reason: ActionPerformFailureReason.HEAL_HAS_NO_EFFECT,
            message: "No targets to heal",
        })

        const actionStatus = ValidityCheckService.calculateActionValidity({
            objectRepository,
            battleSquaddieId,
            gameEngineState: GameEngineStateService.new({}),
        })

        expect(actionStatus[actionTemplateId]).toEqual({
            isValid: false,
            warning: false,
            messages: [
                "Need 1 action point",
                "No targets to heal",
                "Will have no effect on squaddieName",
            ],
        })

        actionPointCheckSpy.mockRestore()
        willBuffUserSpy.mockRestore()
    })

    it("will make the check have a warning if a validity checker returns a warning", () => {
        const { actionTemplateId, battleSquaddieId, objectRepository } =
            setupSingleSquaddie()

        const actionPointCheckSpy = vi.spyOn(ActionPointCheck, "canAfford")
        actionPointCheckSpy.mockReturnValue({
            isValid: true,
            warning: true,
            reason: ActionPerformFailureReason.CAN_PERFORM_BUT_TOO_MANY_CONSIDERED_ACTION_POINTS,
        })

        const willBuffUserSpy = vi.spyOn(BuffSelfCheck, "willBuffUser")
        willBuffUserSpy.mockReturnValue({
            isValid: true,
        })

        const canHealSpy = vi.spyOn(
            CanHealTargetCheck,
            "targetInRangeCanBeAffected"
        )
        canHealSpy.mockReturnValue({
            isValid: true,
        })

        const actionStatus = ValidityCheckService.calculateActionValidity({
            objectRepository,
            battleSquaddieId,
            gameEngineState: GameEngineStateService.new({}),
        })

        expect(actionStatus[actionTemplateId]).toEqual({
            isValid: true,
            warning: true,
            messages: [],
        })

        canHealSpy.mockRestore()
        actionPointCheckSpy.mockRestore()
        willBuffUserSpy.mockRestore()
    })
})
