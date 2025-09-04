import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { TriggeringEvent } from "./eventTrigger/triggeringEvent"
import { BattleEvent, BattleEventService } from "./battleEvent"
import { EventTriggerBaseService } from "./eventTrigger/eventTriggerBase"
import { EventTriggerTurnRangeService } from "./eventTrigger/eventTriggerTurnRange"
import { EventTriggerSquaddieService } from "./eventTrigger/eventTriggerSquaddie"
import { EventTriggerBattleCompletionStatusService } from "./eventTrigger/eventTriggerBattleCompletionStatus"
import { BattleCompletionStatus } from "../orchestrator/missionObjectivesAndCutscenes"
import { CutsceneEffectService } from "../../cutscene/cutsceneEffect"

describe("BattleEvent", () => {
    describe("new will sanitize", () => {
        it("will throw an error if there are no triggers", () => {
            const shouldThrowError = () => {
                // @ts-ignore Test is intentionally throwing an error due to missing fields
                BattleEventService.new({
                    effect: CutsceneEffectService.new("victory"),
                })
            }

            expect(() => {
                shouldThrowError()
            }).toThrow("triggers")
        })
        it("will throw an error if there is no effect", () => {
            const shouldThrowError = () => {
                // @ts-ignore Test is intentionally throwing an error due to missing fields
                BattleEventService.new({
                    triggers: [
                        EventTriggerBaseService.new(
                            TriggeringEvent.MISSION_VICTORY
                        ),
                    ],
                })
            }

            expect(() => {
                shouldThrowError()
            }).toThrow("effect")
        })
        it("will throw an error if a trigger is invalid", () => {
            const shouldThrowError = () => {
                // @ts-ignore Test is intentionally throwing an error due to missing fields
                const turnTrigger = EventTriggerTurnRangeService.new({})
                BattleEventService.new({
                    triggers: [
                        {
                            ...EventTriggerBaseService.new(
                                TriggeringEvent.START_OF_TURN
                            ),
                            ...turnTrigger,
                        },
                    ],
                    effect: CutsceneEffectService.new("victory"),
                })
            }

            expect(() => {
                shouldThrowError()
            }).toThrow("invalid trigger")
        })
    })

    describe("areTriggersSatisfied", () => {
        let squaddieSpy: MockInstance
        let turnSpy: MockInstance
        let battleProgressSpy: MockInstance
        let battleEvent: BattleEvent

        beforeEach(() => {
            squaddieSpy = vi.spyOn(EventTriggerSquaddieService, "shouldTrigger")
            turnSpy = vi.spyOn(EventTriggerTurnRangeService, "shouldTrigger")
            battleProgressSpy = vi.spyOn(
                EventTriggerBattleCompletionStatusService,
                "shouldTrigger"
            )
            battleEvent = BattleEventService.new({
                triggers: [
                    {
                        ...EventTriggerBaseService.new(
                            TriggeringEvent.START_OF_TURN
                        ),
                        exactTurn: 0,
                    },
                    {
                        ...EventTriggerBaseService.new(
                            TriggeringEvent.SQUADDIE_IS_INJURED
                        ),
                        targetingSquaddie: {
                            battleSquaddieIds: ["battleSquaddieId"],
                            squaddieTemplateIds: [],
                        },
                    },
                    {
                        ...EventTriggerBaseService.new(
                            TriggeringEvent.MISSION_VICTORY
                        ),
                        ...EventTriggerBattleCompletionStatusService.new({
                            battleCompletionStatus:
                                BattleCompletionStatus.VICTORY,
                        }),
                    },
                ],
                effect: CutsceneEffectService.new("victory"),
            })
        })

        afterEach(() => {
            squaddieSpy.mockRestore()
            turnSpy.mockRestore()
            battleProgressSpy.mockRestore()
        })

        it("is not satisfied if no triggers are true", () => {
            squaddieSpy.mockReturnValue(false)
            turnSpy.mockReturnValue(false)
            battleProgressSpy.mockReturnValue(false)
            expect(
                BattleEventService.areTriggersSatisfied({
                    battleEvent,
                    context: {
                        turn: {
                            turnCount: 0,
                        },
                        squaddies: {
                            injured: {
                                battleSquaddieIds: ["battleSquaddieId"],
                                squaddieTemplateIds: [],
                            },
                        },
                    },
                })
            ).toBeFalsy()
            expect(atLeastOneEventTriggerValidatorWasCalled()).toBeTruthy()
        })
        const atLeastOneEventTriggerValidatorWasCalled = () => {
            return (
                squaddieSpy.mock.calls.length > 0 ||
                turnSpy.mock.calls.length > 0 ||
                battleProgressSpy.mock.calls.length > 0
            )
        }
        it("is not satisfied if at least one trigger is not true", () => {
            squaddieSpy.mockReturnValue(false)
            turnSpy.mockReturnValue(true)
            battleProgressSpy.mockReturnValue(false)
            expect(
                BattleEventService.areTriggersSatisfied({
                    battleEvent,
                    context: {
                        turn: {
                            turnCount: 0,
                        },
                        squaddies: {
                            injured: {
                                battleSquaddieIds: ["battleSquaddieId"],
                                squaddieTemplateIds: [],
                            },
                        },
                    },
                })
            ).toBeFalsy()
            expect(atLeastOneEventTriggerValidatorWasCalled()).toBeTruthy()
        })
        it("is satisfied if all triggers are true", () => {
            squaddieSpy.mockReturnValue(true)
            turnSpy.mockReturnValue(true)
            battleProgressSpy.mockReturnValue(true)
            expect(
                BattleEventService.areTriggersSatisfied({
                    battleEvent,
                    context: {
                        turn: {
                            turnCount: 0,
                        },
                        squaddies: {
                            injured: {
                                battleSquaddieIds: ["battleSquaddieId"],
                                squaddieTemplateIds: [],
                            },
                        },
                    },
                })
            ).toBeTruthy()
            expect(squaddieSpy).toHaveBeenCalled()
            expect(turnSpy).toHaveBeenCalled()
            expect(battleProgressSpy).toHaveBeenCalled()
        })
    })
})
