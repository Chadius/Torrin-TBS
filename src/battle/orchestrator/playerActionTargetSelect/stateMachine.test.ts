import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import {
    PlayerActionTargetActionEnum,
    PlayerActionTargetContext,
    PlayerActionTargetContextService,
    PlayerActionTargetStateEnum,
    PlayerActionTargetStateMachine,
    PlayerActionTargetStateMachineInfoByState,
    PlayerActionTargetStateMachineInfoByTransition,
    PlayerActionTargetTransitionEnum,
} from "./stateMachine"
import { StateMachineDataService } from "../../../utils/stateMachine/stateMachineData/stateMachineData"
import {
    TargetingResults,
    TargetingResultsService,
} from "../../targeting/targetingService"
import { MapSearchTestUtils } from "../../../hexMap/pathfinder/pathGeneration/mapSearchTests/mapSearchTestUtils"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../../../action/template/actionEffectTemplate"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../actionDecision/battleActionDecisionStep"
import { MessageBoard } from "../../../message/messageBoard"
import { CampaignResourcesService } from "../../../campaign/campaignResources"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"

describe("PlayerActionTargetSelect State Machine", () => {
    let stateMachine: PlayerActionTargetStateMachine
    let objectRepository: ObjectRepository
    let actionTemplate: ActionTemplate
    let missionMap: MissionMap
    let context: PlayerActionTargetContext
    let battleSquaddieId = "battleSquaddieId"
    let squaddieTemplateId = "squaddieTemplateId"
    let messageBoard: MessageBoard
    let battleActionDecisionStep: BattleActionDecisionStep

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        actionTemplate = ActionTemplateService.new({
            id: "actionTemplate",
            name: "actionTemplate",
            actionEffectTemplates: [ActionEffectTemplateService.new({})],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplate
        )
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            battleId: battleSquaddieId,
            templateId: squaddieTemplateId,
            name: "name",
            actionTemplateIds: [],
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository,
        })
        missionMap = MapSearchTestUtils.create1row5columnsAllFlatTerrain()
        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId,
            squaddieTemplateId,
            coordinate: { q: 0, r: 0 },
        })

        battleActionDecisionStep = BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: battleActionDecisionStep,
            battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: battleActionDecisionStep,
            actionTemplateId: actionTemplate.id,
        })
        messageBoard = new MessageBoard()

        context = PlayerActionTargetContextService.new({
            objectRepository,
            missionMap,
            battleActionDecisionStep,
            messageBoard,
            campaignResources: CampaignResourcesService.default(),
        })

        stateMachine = new PlayerActionTargetStateMachine({
            id: "PlayerActionTargetStateMachine",
            context: context,
            stateMachineData: StateMachineDataService.new({
                initialState: PlayerActionTargetStateEnum.INITIALIZED,
                infoByState: PlayerActionTargetStateMachineInfoByState,
                infoByTransition:
                    PlayerActionTargetStateMachineInfoByTransition,
            }),
        })
    })

    describe("initialized state", () => {
        it("starts in initialized state", () => {
            expect(stateMachine.currentState).toEqual(
                PlayerActionTargetStateEnum.INITIALIZED
            )
        })
        it("will trigger the initialized trigger", () => {
            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.INITIALIZED
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.COUNT_TARGETS
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY,
            ])
        })
    })

    describe("COUNT_TARGETS_ENTRY action counts the number of valid targets found", () => {
        let findValidTargetsSpy: MockInstance
        let lotsOfTargets: TargetingResults

        beforeEach(() => {
            lotsOfTargets = new TargetingResults()
            ;[1, 2, 3].forEach((target) => {
                lotsOfTargets.addBattleSquaddieIdsInRange([`${target}`])
                const mapCoordinate = { q: 0, r: target }
                lotsOfTargets.addCoordinatesInRange([mapCoordinate])
                MissionMapService.addSquaddie({
                    missionMap,
                    battleSquaddieId: `${target}`,
                    squaddieTemplateId: `${target}`,
                    coordinate: mapCoordinate,
                })
            })

            findValidTargetsSpy = vi
                .spyOn(TargetingResultsService, "findValidTargets")
                .mockReturnValue(lotsOfTargets)
        })

        afterEach(() => {
            if (findValidTargetsSpy) findValidTargetsSpy.mockRestore()
        })

        it("tries to calculate the valid targets", () => {
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )(context)

            expect(findValidTargetsSpy).toBeCalled()
        })

        it("maps the valid squaddies to their map coordinate", () => {
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )(context)

            expect(context.validTargets).toEqual(
                expect.objectContaining({
                    "1": { mapCoordinate: { q: 0, r: 1 } },
                    "2": { mapCoordinate: { q: 0, r: 2 } },
                    "3": { mapCoordinate: { q: 0, r: 3 } },
                })
            )
        })

        it("stores the coordinates that are in range", () => {
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )(context)

            expect(context.validCoordinates).toEqual(
                expect.arrayContaining([
                    { q: 0, r: 1 },
                    { q: 0, r: 2 },
                    { q: 0, r: 3 },
                ])
            )
        })

        describe("throw errors when data is missing", () => {
            it("throws an error if there is no actor", () => {
                BattleActionDecisionStepService.setActor({
                    actionDecisionStep: context.battleActionDecisionStep,
                    battleSquaddieId: undefined,
                })
                expect(() => {
                    stateMachine.getActionLogic(
                        PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
                    )(context)
                }).toThrow("no actor found")
            })
            it("throws an error if no action is set", () => {
                context.battleActionDecisionStep.action = undefined
                expect(() => {
                    stateMachine.getActionLogic(
                        PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
                    )(context)
                }).toThrow("no action found")
            })
        })
    })

    describe("Unsupported number of targets found", () => {
        beforeEach(() => {
            StateMachineDataService.setActionLogic(
                stateMachine.stateMachineData,
                {
                    [PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY]: (
                        context: PlayerActionTargetContext
                    ) => {
                        context.validTargets = {
                            "1": { mapCoordinate: { q: 0, r: 1 } },
                            "2": { mapCoordinate: { q: 0, r: 2 } },
                            "3": { mapCoordinate: { q: 0, r: 3 } },
                        }
                    },
                }
            )
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )(context)
            stateMachine.currentState =
                PlayerActionTargetStateEnum.COUNT_TARGETS
        })

        it("will fire an UNSUPPORTED_COUNT_TARGETS transition", () => {
            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.UNSUPPORTED_COUNT_TARGETS
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.NOT_APPLICABLE
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.NOT_APPLICABLE_ENTRY,
            ])
        })
    })

    it("NOT_APPLICABLE_ENTRY action sets the use legacy selector flag", () => {
        stateMachine.getActionLogic(
            PlayerActionTargetActionEnum.NOT_APPLICABLE_ENTRY
        )(context)

        expect(context.useLegacySelector).toBeTruthy()
    })

    describe("Transition to completed state", () => {
        it("will transition if the legacy selector should be used", () => {
            stateMachine.currentState =
                PlayerActionTargetStateEnum.NOT_APPLICABLE
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.NOT_APPLICABLE_ENTRY
            )(context)

            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.FINISHED
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.FINISHED
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.FINISHED_ENTRY,
            ])
        })

        it("will transition if there are no targets", () => {
            stateMachine.currentState =
                PlayerActionTargetStateEnum.CANCEL_ACTION_TARGET
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.CANCEL_ACTION_TARGET_ENTRY
            )(context)

            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.FINISHED
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.FINISHED
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.FINISHED_ENTRY,
            ])
        })
    })

    it("FINISHED_ENTRY action sets the completed flag", () => {
        stateMachine.getActionLogic(
            PlayerActionTargetActionEnum.FINISHED_ENTRY
        )(context)

        expect(context.finished).toBeTruthy()
    })

    describe("No targets found", () => {
        beforeEach(() => {
            StateMachineDataService.setActionLogic(
                stateMachine.stateMachineData,
                {
                    [PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY]: (
                        context: PlayerActionTargetContext
                    ) => {
                        context.validTargets = {}
                    },
                }
            )
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )(context)
            stateMachine.currentState =
                PlayerActionTargetStateEnum.COUNT_TARGETS
        })

        it("will fire a NO_TARGETS_FOUND transition", () => {
            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.CANCEL_ACTION_TARGET
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.CANCEL_ACTION_TARGET_ENTRY,
            ])
        })
    })

    describe("CANCEL_ACTION_TARGET_ENTRY", () => {
        let messageSpy: MockInstance
        beforeEach(() => {
            messageSpy = vi.spyOn(context.messageBoard, "sendMessage")
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.CANCEL_ACTION_TARGET_ENTRY
            )(context)
        })

        afterEach(() => {
            if (messageSpy) messageSpy.mockRestore()
        })

        it("sets the player canceled flag", () => {
            expect(context.cancelActionTarget).toBeTruthy()
        })

        it("sends a message the user canceled their selection", () => {
            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                battleActionDecisionStep: context.battleActionDecisionStep,
                missionMap: context.missionMap,
                objectRepository: context.objectRepository,
                campaignResources: context.campaignResources,
            })

            expect(context.cancelActionTarget).toBeTruthy()
        })
    })
})
