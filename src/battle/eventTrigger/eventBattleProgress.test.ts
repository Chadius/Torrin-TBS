import { describe, expect, it } from "vitest"
import { BattleCompletionStatus } from "../orchestrator/missionObjectivesAndCutscenes"
import {
    EventBattleProgress,
    EventBattleProgressService,
} from "./eventBattleProgress"

describe("Event Battle Progress", () => {
    describe("sanitize", () => {
        it("throws an error if no completion status is given", () => {
            const shouldThrowError = () => {
                // @ts-ignore Test deliberately removes argument
                EventBattleProgressService.new({})
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
                const eventTrigger: EventBattleProgress =
                    EventBattleProgressService.new({
                        battleCompletionStatus: eventBattleCompletionStatus,
                    })
                expect(
                    EventBattleProgressService.shouldTrigger({
                        eventTrigger,
                        battleCompletionStatus: missionBattleCompletionStatus,
                    })
                ).toBe(shouldTrigger)
            }
        )
    })
})
