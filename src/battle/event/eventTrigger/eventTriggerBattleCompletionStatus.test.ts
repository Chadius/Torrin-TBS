import { describe, expect, it } from "vitest"
import { BattleCompletionStatus } from "../../orchestrator/missionObjectivesAndCutscenes"
import {
    EventTriggerBattleCompletionStatus,
    EventTriggerBattleCompletionStatusService,
} from "./eventTriggerBattleCompletionStatus"

describe("EventTrigger Battle Completion Status", () => {
    describe("sanitize", () => {
        it("throws an error if no completion status is given", () => {
            const shouldThrowError = () => {
                // @ts-ignore Test deliberately removes argument
                EventTriggerBattleCompletionStatusService.new({})
            }
            expect(shouldThrowError).toThrowError("BattleCompletionStatus")
        })
    })
    describe("shouldTrigger", () => {
        const completionTests = [
            {
                eventBattleCompletionStatus: BattleCompletionStatus.VICTORY,
                missionBattleCompletionStatus: BattleCompletionStatus.VICTORY,
                shouldTrigger: true,
            },
            {
                eventBattleCompletionStatus: BattleCompletionStatus.DEFEAT,
                missionBattleCompletionStatus: BattleCompletionStatus.DEFEAT,
                shouldTrigger: true,
            },
            {
                eventBattleCompletionStatus: BattleCompletionStatus.VICTORY,
                missionBattleCompletionStatus:
                    BattleCompletionStatus.IN_PROGRESS,
                shouldTrigger: false,
            },
            {
                eventBattleCompletionStatus: BattleCompletionStatus.DEFEAT,
                missionBattleCompletionStatus:
                    BattleCompletionStatus.IN_PROGRESS,
                shouldTrigger: false,
            },
            {
                eventBattleCompletionStatus: BattleCompletionStatus.VICTORY,
                missionBattleCompletionStatus: BattleCompletionStatus.DEFEAT,
                shouldTrigger: false,
            },
            {
                eventBattleCompletionStatus: BattleCompletionStatus.DEFEAT,
                missionBattleCompletionStatus: BattleCompletionStatus.VICTORY,
                shouldTrigger: false,
            },
        ]

        it.each(completionTests)(
            `$shouldTrigger $eventBattleCompletionStatus $missionBattleCompletionStatus`,
            ({
                shouldTrigger,
                eventBattleCompletionStatus,
                missionBattleCompletionStatus,
            }) => {
                const eventTrigger: EventTriggerBattleCompletionStatus =
                    EventTriggerBattleCompletionStatusService.new({
                        battleCompletionStatus: eventBattleCompletionStatus,
                    })
                expect(
                    EventTriggerBattleCompletionStatusService.shouldTrigger({
                        eventTrigger,
                        battleCompletionStatus: missionBattleCompletionStatus,
                    })
                ).toBe(shouldTrigger)
            }
        )
    })
})
