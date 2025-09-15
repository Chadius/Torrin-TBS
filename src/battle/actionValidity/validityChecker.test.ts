import { ActionPerformFailureReason } from "../../squaddie/turn"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { SquaddieTemplateService } from "../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../squaddie/id"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddieService } from "../battleSquaddie"
import { ValidityCheckService } from "./validityChecker"
import { SquaddieCanPerformActionCheck } from "./squaddieCanPerformActionCheck"
import { PerRoundCheck } from "./perRoundCheck"
import { GameEngineStateService } from "../../gameEngine/gameEngine"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { CanHealTargetCheck } from "./canHealTargetCheck"
import {
    TargetingResults,
    TargetingResultsService,
} from "../targeting/targetingService"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../action/template/actionEffectTemplate"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../squaddie/attribute/attributeModifier"
import { Attribute } from "../../squaddie/attribute/attribute"
import { CanAddModifiersCheck } from "./canAddModifiersCheck"
import { MapSearchTestUtils } from "../../hexMap/pathfinder/pathGeneration/mapSearchTests/mapSearchTestUtils"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"

describe("validity checker", () => {
    const setupSingleSquaddie = (actionTemplate?: ActionTemplate) => {
        if (!actionTemplate) {
            actionTemplate = ActionTemplateService.new({
                id: "actionTemplate",
                name: "actionTemplate",
            })
        }

        const objectRepository = ObjectRepositoryService.new()
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplate
        )
        ObjectRepositoryService.addSquaddie({
            repo: objectRepository,
            squaddieTemplate: SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    squaddieTemplateId: "squaddieTemplate",
                    name: "squaddieTemplate",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                actionTemplateIds: [actionTemplate.id],
            }),
            battleSquaddie: BattleSquaddieService.new({
                squaddieTemplateId: "squaddieTemplate",
                battleSquaddieId: "battleSquaddieId",
            }),
        })
        return {
            objectRepository,
            battleSquaddieId: "battleSquaddieId",
            actionTemplateId: actionTemplate.id,
        }
    }

    const actionIsInvalidTests = [
        {
            checkerName: "actionPointCheck",
            setupSpy: () => {
                const spy = vi.spyOn(
                    SquaddieCanPerformActionCheck,
                    "canPerform"
                )
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

            const gameEngineState = GameEngineStateService.new({})
            const actionStatus = ValidityCheckService.calculateActionValidity({
                objectRepository,
                battleSquaddieId,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
            })

            expect(actionStatus[actionTemplateId]).toEqual({
                isValid: false,
                warning: false,
                messages: expectedMessages,
            })

            spy.mockRestore()
        }
    )

    it("will first check to see if the actor can afford it", () => {
        const { actionTemplateId, battleSquaddieId, objectRepository } =
            setupSingleSquaddie()

        const actionPointCheckSpy = vi.spyOn(
            SquaddieCanPerformActionCheck,
            "canPerform"
        )
        actionPointCheckSpy.mockReturnValue({
            isValid: false,
            reason: ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING,
            message: "Need 1 action point",
        })

        const willBuffUserSpy = vi.spyOn(
            CanAddModifiersCheck,
            "canAddAttributeModifiers"
        )
        willBuffUserSpy.mockReturnValue({
            isValid: false,
            reason: ActionPerformFailureReason.NO_ATTRIBUTES_WILL_BE_ADDED,
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
            missionMap: MapSearchTestUtils.create1row5columnsWithPitAndWall(),
            battleActionRecorder: BattleActionRecorderService.new(),
        })

        expect(actionStatus[actionTemplateId]).toEqual({
            isValid: false,
            warning: false,
            messages: ["Need 1 action point"],
        })
        expect(actionPointCheckSpy).toBeCalled()
        expect(willBuffUserSpy).not.toBeCalled()

        actionPointCheckSpy.mockRestore()
        willBuffUserSpy.mockRestore()
    })

    it("will make the check have a warning if a validity checker returns a warning", () => {
        const { actionTemplateId, battleSquaddieId, objectRepository } =
            setupSingleSquaddie(
                ActionTemplateService.new({
                    id: "single target",
                    name: "single target",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            healingDescriptions: { LOST_HIT_POINTS: 2 },
                            attributeModifiers: [
                                AttributeModifierService.new({
                                    type: Attribute.ARMOR,
                                    source: AttributeSource.CIRCUMSTANCE,
                                    amount: 1,
                                }),
                            ],
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                            },
                        }),
                    ],
                })
            )

        const targetingResults = new TargetingResults()
        targetingResults.addBattleSquaddieIdsInRange(["1"])
        const targetSpy = vi
            .spyOn(TargetingResultsService, "findValidTargets")
            .mockReturnValue(targetingResults)

        const actionPointCheckSpy = vi.spyOn(
            SquaddieCanPerformActionCheck,
            "canPerform"
        )
        actionPointCheckSpy.mockReturnValue({
            isValid: true,
            warning: true,
            reason: ActionPerformFailureReason.UNKNOWN,
        })

        const willBuffUserSpy = vi.spyOn(
            CanAddModifiersCheck,
            "canAddAttributeModifiers"
        )
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
            missionMap: MapSearchTestUtils.create1row5columnsWithPitAndWall(),
            battleActionRecorder: BattleActionRecorderService.new(),
        })

        expect(actionStatus[actionTemplateId]).toEqual({
            isValid: true,
            warning: true,
            messages: [],
        })

        expect(targetSpy).toHaveBeenCalled()
        expect(canHealSpy).toHaveBeenCalled()
        expect(actionPointCheckSpy).toHaveBeenCalled()
        expect(willBuffUserSpy).toHaveBeenCalled()

        targetSpy.mockRestore()
        canHealSpy.mockRestore()
        actionPointCheckSpy.mockRestore()
        willBuffUserSpy.mockRestore()
    })

    describe("action can heal and buff", () => {
        let willBuffUserSpy: MockInstance
        let canHealSpy: MockInstance
        let targetSpy: MockInstance
        let actionTemplateId: string
        let battleSquaddieId: string
        let objectRepository: ObjectRepository

        beforeEach(() => {
            ;({ actionTemplateId, battleSquaddieId, objectRepository } =
                setupSingleSquaddie(
                    ActionTemplateService.new({
                        id: "single target",
                        name: "single target",
                        actionEffectTemplates: [
                            ActionEffectTemplateService.new({
                                healingDescriptions: { LOST_HIT_POINTS: 2 },
                                attributeModifiers: [
                                    AttributeModifierService.new({
                                        type: Attribute.ARMOR,
                                        source: AttributeSource.CIRCUMSTANCE,
                                        amount: 1,
                                    }),
                                ],
                                squaddieAffiliationRelation: {
                                    [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                                },
                            }),
                        ],
                    })
                ))

            const targetingResults = new TargetingResults()
            targetingResults.addBattleSquaddieIdsInRange(["1"])
            targetSpy = vi
                .spyOn(TargetingResultsService, "findValidTargets")
                .mockReturnValue(targetingResults)
            willBuffUserSpy = vi.spyOn(
                CanAddModifiersCheck,
                "canAddAttributeModifiers"
            )
            canHealSpy = vi.spyOn(
                CanHealTargetCheck,
                "targetInRangeCanBeAffected"
            )
        })

        afterEach(() => {
            targetSpy.mockRestore()
            canHealSpy.mockRestore()
            willBuffUserSpy.mockRestore()
        })

        it("if the targets do not need buffs or healing, the action is invalid and combines messages", () => {
            willBuffUserSpy.mockReturnValue({
                isValid: false,
                reason: ActionPerformFailureReason.NO_ATTRIBUTES_WILL_BE_ADDED,
                message: "Will have no effect on squaddieName",
            })

            canHealSpy.mockReturnValue({
                isValid: false,
                reason: ActionPerformFailureReason.HEAL_HAS_NO_EFFECT,
                message: "No targets to heal",
            })

            const gameEngineState = GameEngineStateService.new({})
            const actionStatus = ValidityCheckService.calculateActionValidity({
                objectRepository,
                battleSquaddieId,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
            })

            expect(actionStatus[actionTemplateId]).toEqual({
                isValid: false,
                warning: false,
                messages: [
                    "No targets to heal",
                    "Will have no effect on squaddieName",
                ],
            })

            expect(targetSpy).toBeCalled()
            expect(willBuffUserSpy).toBeCalled()
            expect(canHealSpy).toBeCalled()
        })

        it("if the target needs healing and buffing, it is valid", () => {
            willBuffUserSpy.mockReturnValue({
                isValid: true,
            })

            canHealSpy.mockReturnValue({
                isValid: true,
            })

            const gameEngineState = GameEngineStateService.new({})
            const actionStatus = ValidityCheckService.calculateActionValidity({
                objectRepository,
                battleSquaddieId,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
            })

            expect(actionStatus[actionTemplateId]).toEqual({
                isValid: true,
                warning: false,
                messages: [],
            })

            expect(targetSpy).toBeCalled()
            expect(willBuffUserSpy).toBeCalled()
            expect(canHealSpy).toBeCalled()
        })

        it("if the target needs healing but no buffing, it is valid but message the buff will not apply", () => {
            willBuffUserSpy.mockReturnValue({
                isValid: false,
                reason: ActionPerformFailureReason.NO_ATTRIBUTES_WILL_BE_ADDED,
                message: "Will have no effect on squaddieName",
            })

            canHealSpy.mockReturnValue({
                isValid: true,
            })

            const gameEngineState = GameEngineStateService.new({})
            const actionStatus = ValidityCheckService.calculateActionValidity({
                objectRepository,
                battleSquaddieId,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
            })

            expect(actionStatus[actionTemplateId]).toEqual({
                isValid: true,
                warning: false,
                messages: ["Will have no effect on squaddieName"],
            })

            expect(targetSpy).toBeCalled()
            expect(willBuffUserSpy).toBeCalled()
            expect(canHealSpy).toBeCalled()
        })

        it("if the target needs buffs but no healing, it is valid but message the healing will not apply", () => {
            willBuffUserSpy.mockReturnValue({
                isValid: true,
            })

            canHealSpy.mockReturnValue({
                isValid: false,
                reason: ActionPerformFailureReason.HEAL_HAS_NO_EFFECT,
                message: "No targets to heal",
            })

            const gameEngineState = GameEngineStateService.new({})
            const actionStatus = ValidityCheckService.calculateActionValidity({
                objectRepository,
                battleSquaddieId,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
            })

            expect(actionStatus[actionTemplateId]).toEqual({
                isValid: true,
                warning: false,
                messages: ["No targets to heal"],
            })

            expect(targetSpy).toBeCalled()
            expect(willBuffUserSpy).toBeCalled()
            expect(canHealSpy).toBeCalled()
        })
    })
})
