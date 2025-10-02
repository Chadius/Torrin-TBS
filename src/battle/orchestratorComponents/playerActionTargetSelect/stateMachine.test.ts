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
    PlayerActionTargetActionType,
    PlayerActionTargetStateEnum,
    PlayerActionTargetStateMachine,
    PlayerActionTargetStateMachineInfoByState,
    PlayerActionTargetStateMachineInfoByTransition,
    PlayerActionTargetTransitionEnum,
    PlayerActionTargetTransitionType,
    TPlayerActionTargetState,
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
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../../action/template/actionEffectTemplate"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../actionDecision/battleActionDecisionStep"
import { MessageBoard } from "../../../message/messageBoard"
import { CampaignResourcesService } from "../../../campaign/campaignResources"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import {
    SummaryHUDState,
    SummaryHUDStateService,
} from "../../hud/summary/summaryHUD"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../../history/battleAction/battleActionRecorder"
import { NumberGeneratorStrategy } from "../../numberGenerator/strategy"
import { RandomNumberGenerator } from "../../numberGenerator/random"
import { MissionStatisticsService } from "../../missionStatistics/missionStatistics"
import {
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEventType,
} from "../../orchestrator/battleOrchestratorComponent"
import { PlayerInputStateService } from "../../../ui/playerInput/playerInputState"
import { PlayerConsideredActionsService } from "../../battleState/playerConsideredActions"
import { PlayerDecisionHUDService } from "../../hud/playerActionPanel/playerDecisionHUD"
import {
    PlayerActionTargetContextService,
    PlayerActionTargetStateInvalidTargetReason,
    PlayerActionTargetStateMachineContext,
} from "./playerActionTargetStateMachineContext"
import { PlayerActionTargetStateMachineUIObjectsService } from "./playerActionTargetStateMachineUIObjects"
import { Button } from "../../../ui/button/button"
import { ButtonLogicChangeOnRelease } from "../../../ui/button/logic/buttonLogicChangeOnRelease"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { TestButtonStyle } from "../../../ui/button/button.test"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID } from "./playerActionConfirm/okButton"
import { PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID } from "./playerActionConfirm/cancelButton"
import { MouseButton, ScreenLocation } from "../../../utils/mouseConfig"
import { PlayerCommandStateService } from "../../hud/playerCommand/playerCommandHUD"
import { CoordinateGeneratorShape } from "../../targeting/coordinateGenerator"
import { Damage, Healing } from "../../../squaddie/squaddieService"
import { ActionValidityTestUtils } from "../../actionValidity/commonTest"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../../squaddie/attribute/attributeModifier"
import { Attribute } from "../../../squaddie/attribute/attribute"
import { CanHealTargetCheck } from "../../actionValidity/canHealTargetCheck"
import { CanAddModifiersCheck } from "../../actionValidity/canAddModifiersCheck"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import { PLAYER_ACTION_SELECT_TARGET_CREATE_CANCEL_BUTTON_ID } from "./playerActionTarget/cancelButton"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import { BattleCamera } from "../../battleCamera"
import { Label, LabelService } from "../../../ui/label"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../../hexMap/hexCoordinate/hexCoordinate"
import { StateMachineUpdate } from "../../../utils/stateMachine/stateMachineUpdate"
import { SearchResultsCacheService } from "../../../hexMap/pathfinder/searchResults/searchResultsCache"
import { ChallengeModifierSettingService } from "../../challengeModifier/challengeModifierSetting"

describe("PlayerActionTargetSelect State Machine", () => {
    let stateMachine: PlayerActionTargetStateMachine
    let objectRepository: ObjectRepository
    let actionTemplate: ActionTemplate
    let missionMap: MissionMap
    let context: PlayerActionTargetStateMachineContext
    let battleSquaddieId = "battleSquaddieId"
    let squaddieTemplateId = "squaddieTemplateId"
    let messageBoard: MessageBoard
    let battleActionDecisionStep: BattleActionDecisionStep
    let summaryHUDState: SummaryHUDState
    let battleActionRecorder: BattleActionRecorder
    let numberGenerator: NumberGeneratorStrategy
    let getButtonsSpy: MockInstance
    let confirmOKButton: Button
    let confirmCancelButton: Button
    let selectTargetCancelButton: Button
    let selectTargetExplanationLabel: Label
    let camera: BattleCamera

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
            originMapCoordinate: { q: 0, r: 0 },
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

        summaryHUDState = SummaryHUDStateService.new()
        battleActionRecorder = BattleActionRecorderService.new()
        numberGenerator = new RandomNumberGenerator()
        camera = new BattleCamera()
        context = PlayerActionTargetContextService.new({
            objectRepository,
            missionMap,
            camera,
            battleActionDecisionStep,
            messageBoard,
            battleActionRecorder,
            numberGenerator,
            playerInputState: PlayerInputStateService.newFromEnvironment(),
            summaryHUDState: summaryHUDState,
            campaignResources: CampaignResourcesService.default(),
            missionStatistics: MissionStatisticsService.new({}),
            playerConsideredActions: PlayerConsideredActionsService.new(),
            playerDecisionHUD: PlayerDecisionHUDService.new(),
            playerCommandState: PlayerCommandStateService.new(),
            squaddieAllMovementCache: SearchResultsCacheService.new(),
            challengeModifierSetting: ChallengeModifierSettingService.new(),
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
        stateMachine.uiObjects =
            PlayerActionTargetStateMachineUIObjectsService.empty()
        confirmOKButton = new Button({
            id: PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID,
            buttonLogic: new ButtonLogicChangeOnRelease({
                dataBlob: {
                    data: {},
                },
            }),
            drawTask: new TestButtonStyle(
                DataBlobService.new(),
                RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: 10,
                    height: 10,
                })
            ),
        })
        confirmCancelButton = new Button({
            id: PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID,
            buttonLogic: new ButtonLogicChangeOnRelease({
                dataBlob: {
                    data: {},
                },
            }),
            drawTask: new TestButtonStyle(
                DataBlobService.new(),
                RectAreaService.new({
                    left: 100,
                    top: 100,
                    width: 10,
                    height: 10,
                })
            ),
        })
        stateMachine.uiObjects.confirm = {
            okButton: confirmOKButton,
            cancelButton: confirmCancelButton,
        }
        selectTargetCancelButton = new Button({
            id: PLAYER_ACTION_SELECT_TARGET_CREATE_CANCEL_BUTTON_ID,
            buttonLogic: new ButtonLogicChangeOnRelease({
                dataBlob: {
                    data: {},
                },
            }),
            drawTask: new TestButtonStyle(
                DataBlobService.new(),
                RectAreaService.new({
                    left: 100,
                    top: 100,
                    width: 10,
                    height: 10,
                })
            ),
        })

        selectTargetExplanationLabel = LabelService.new({
            text: "test",
            area: RectAreaService.new({
                left: 100,
                top: 100,
                width: 10,
                height: 20,
            }),
            fontSize: 12,
            fontColor: [10, 20, 30],
            textBoxMargin: [],
        })
        stateMachine.uiObjects.selectTarget = {
            cancelButton: selectTargetCancelButton,
            explanationLabel: selectTargetExplanationLabel,
        }
    })

    afterEach(() => {
        if (getButtonsSpy) getButtonsSpy.mockRestore()
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
        let targetingResults: TargetingResults

        beforeEach(() => {
            targetingResults = TargetingResultsService.new()
            ;[1, 2, 3].forEach((target) => {
                targetingResults =
                    TargetingResultsService.withBattleSquaddieIdsInRange(
                        targetingResults,
                        [`${target}`]
                    )
                const mapCoordinate = { q: 0, r: target }
                targetingResults =
                    TargetingResultsService.withCoordinatesInRange(
                        targetingResults,
                        [mapCoordinate]
                    )
                MissionMapService.addSquaddie({
                    missionMap,
                    battleSquaddieId: `${target}`,
                    squaddieTemplateId: `${target}`,
                    originMapCoordinate: mapCoordinate,
                })
            })
            targetingResults =
                TargetingResultsService.withBattleSquaddieIdsNotAFoe(
                    targetingResults,
                    ["4"]
                )
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: "4",
                squaddieTemplateId: "4",
                originMapCoordinate: { q: 0, r: 4 },
            })
            targetingResults =
                TargetingResultsService.withBattleSquaddieIdsNotAnAlly(
                    targetingResults,
                    ["5"]
                )
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: "5",
                squaddieTemplateId: "5",
                originMapCoordinate: undefined,
            })

            findValidTargetsSpy = vi
                .spyOn(TargetingResultsService, "findValidTargets")
                .mockReturnValue(targetingResults)
        })

        afterEach(() => {
            if (findValidTargetsSpy) findValidTargetsSpy.mockRestore()
        })

        it("tries to calculate the valid targets", () => {
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )!(context)

            expect(findValidTargetsSpy).toBeCalled()
        })

        it("maps the valid squaddies to their map coordinate", () => {
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )!(context)

            expect(context.targetResults.validTargets).toEqual(
                expect.objectContaining({
                    "1": { currentMapCoordinate: { q: 0, r: 1 } },
                    "2": { currentMapCoordinate: { q: 0, r: 2 } },
                    "3": { currentMapCoordinate: { q: 0, r: 3 } },
                })
            )
        })

        it("remembers targets that are not foes or allies", () => {
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )!(context)

            expect(context.targetResults.invalidTargets).toEqual(
                expect.objectContaining({
                    "4": {
                        currentMapCoordinate: { q: 0, r: 4 },
                        reason: PlayerActionTargetStateInvalidTargetReason.NOT_A_FOE,
                    },
                    "5": {
                        currentMapCoordinate: undefined,
                        reason: PlayerActionTargetStateInvalidTargetReason.NOT_AN_ALLY,
                    },
                })
            )
        })

        it("stores the coordinates that are in range", () => {
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )!(context)

            expect(context.targetResults.validCoordinates).toEqual(
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
                    // @ts-ignore Purposely using invalid parameters to throw an error
                    battleSquaddieId: undefined,
                })
                expect(() => {
                    stateMachine.getActionLogic(
                        PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
                    )!(context)
                }).toThrow("no actor found")
            })
            it("throws an error if no action is set", () => {
                context.battleActionDecisionStep.action = undefined
                expect(() => {
                    stateMachine.getActionLogic(
                        PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
                    )!(context)
                }).toThrow("no action found")
            })
        })

        describe("if the action does not target foes use action validity checks to determine targets", () => {
            let healingAction: ActionTemplate
            let addArmorAction: ActionTemplate
            let targetingResults: TargetingResults
            let healCheckSpy: MockInstance
            let addModifierCheckSpy: MockInstance

            beforeEach(() => {
                healingAction = ActionTemplateService.new({
                    id: "healingAction",
                    name: "healingAction",
                    targetConstraints: {
                        maximumRange: 1,
                        minimumRange: 0,
                        coordinateGeneratorShape:
                            CoordinateGeneratorShape.BLOOM,
                    },
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                                [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                                [TargetBySquaddieAffiliationRelation.TARGET_FOE]: false,
                            },
                            healingDescriptions: {
                                [Healing.LOST_HIT_POINTS]: 2,
                            },
                        }),
                    ],
                })
                ActionValidityTestUtils.addActionTemplateToSquaddie({
                    objectRepository,
                    actionTemplate: healingAction,
                    actorSquaddieName: battleSquaddieId,
                })
                addArmorAction = ActionTemplateService.new({
                    id: "addArmorAction",
                    name: "addArmorAction",
                    targetConstraints: {
                        maximumRange: 0,
                        minimumRange: 0,
                        coordinateGeneratorShape:
                            CoordinateGeneratorShape.BLOOM,
                    },
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                                [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: false,
                                [TargetBySquaddieAffiliationRelation.TARGET_FOE]: false,
                            },
                            attributeModifiers: [
                                AttributeModifierService.new({
                                    type: Attribute.ARMOR,
                                    source: AttributeSource.CIRCUMSTANCE,
                                    amount: 1,
                                }),
                            ],
                        }),
                    ],
                })
                ActionValidityTestUtils.addActionTemplateToSquaddie({
                    objectRepository,
                    actionTemplate: addArmorAction,
                    actorSquaddieName: battleSquaddieId,
                })

                healCheckSpy = vi.spyOn(
                    CanHealTargetCheck,
                    "calculateHealingOnTarget"
                )
                addModifierCheckSpy = vi.spyOn(
                    CanAddModifiersCheck,
                    "willAddModifiersToTarget"
                )

                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    name: "ally",
                    battleId: "ally",
                    templateId: "ally",
                    affiliation: SquaddieAffiliation.ALLY,
                    actionTemplateIds: [],
                    objectRepository,
                })
                MissionMapService.addSquaddie({
                    missionMap,
                    battleSquaddieId: "ally",
                    squaddieTemplateId: "ally",
                    originMapCoordinate: { q: 0, r: 1 },
                })

                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    name: "enemy",
                    battleId: "enemy",
                    templateId: "enemy",
                    affiliation: SquaddieAffiliation.ENEMY,
                    actionTemplateIds: [],
                    objectRepository,
                })
                MissionMapService.addSquaddie({
                    missionMap,
                    battleSquaddieId: "enemy",
                    squaddieTemplateId: "enemy",
                    originMapCoordinate: { q: 0, r: 2 },
                })

                targetingResults = TargetingResultsService.new()
                targetingResults =
                    TargetingResultsService.withBattleSquaddieIdsInRange(
                        targetingResults,
                        ["ally"]
                    )
                targetingResults =
                    TargetingResultsService.withCoordinatesInRange(
                        targetingResults,
                        [
                            { q: 0, r: 0 },
                            { q: 0, r: 1 },
                        ]
                    )
                findValidTargetsSpy = vi
                    .spyOn(TargetingResultsService, "findValidTargets")
                    .mockReturnValue(targetingResults)
            })

            afterEach(() => {
                if (healCheckSpy) healCheckSpy.mockRestore()
                if (addModifierCheckSpy) addModifierCheckSpy.mockRestore()
            })

            it("if the action only targets foes it does not check", () => {
                context.battleActionDecisionStep.action!.actionTemplateId =
                    undefined
                BattleActionDecisionStepService.addAction({
                    actionDecisionStep: context.battleActionDecisionStep,
                    actionTemplateId: actionTemplate.id,
                })
                stateMachine.getActionLogic(
                    PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
                )!(context)
                expect(healCheckSpy).not.toBeCalled()
                expect(addModifierCheckSpy).not.toBeCalled()
            })

            const useActionCountTargetsAndUpdateStateMachine = (
                actionTemplate: ActionTemplate
            ) => {
                context.battleActionDecisionStep.action!.actionTemplateId =
                    undefined
                BattleActionDecisionStepService.addAction({
                    actionDecisionStep: context.battleActionDecisionStep,
                    actionTemplateId: actionTemplate.id,
                })
                stateMachine.getActionLogic(
                    PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
                )!(context)
                stateMachine.currentState =
                    PlayerActionTargetStateEnum.COUNT_TARGETS
                return stateMachine.update()
            }

            const tests = [
                {
                    name: "healing",
                    getActionTemplate: () => healingAction,
                    getExpectedSpy: () => findValidTargetsSpy,
                    mockTheSpyToFail: () => healCheckSpy.mockReturnValue(0),
                    makeAllyTheOnlyValidTarget: () => {
                        const { battleSquaddie } =
                            ObjectRepositoryService.getSquaddieByBattleId(
                                objectRepository,
                                "ally"
                            )

                        InBattleAttributesService.takeDamage({
                            damageToTake: 1,
                            damageType: Damage.BODY,
                            inBattleAttributes:
                                battleSquaddie.inBattleAttributes,
                        })
                    },
                },
                {
                    name: "attribute modifier",
                    getActionTemplate: () => addArmorAction,
                    getExpectedSpy: () => addModifierCheckSpy,
                    mockTheSpyToFail: () =>
                        addModifierCheckSpy.mockReturnValue(false),
                    makeAllyTheOnlyValidTarget: () => {
                        const { battleSquaddie } =
                            ObjectRepositoryService.getSquaddieByBattleId(
                                objectRepository,
                                battleSquaddieId
                            )

                        InBattleAttributesService.addActiveAttributeModifier(
                            battleSquaddie.inBattleAttributes,
                            AttributeModifierService.new({
                                type: Attribute.ARMOR,
                                amount: 5,
                                source: AttributeSource.CIRCUMSTANCE,
                            })
                        )
                    },
                },
            ]

            describe("if a friend or self is targeted, it will make more specific checks", () => {
                it.each(tests)(
                    `$name`,
                    ({ getActionTemplate, getExpectedSpy }) => {
                        useActionCountTargetsAndUpdateStateMachine(
                            getActionTemplate()
                        )
                        expect(findValidTargetsSpy).toBeCalled()
                        expect(getExpectedSpy()).toBeCalled()
                    }
                )
            })

            describe("will not consider allies targets if the action has no effect", () => {
                it.each(tests)(
                    `$name`,
                    ({ getActionTemplate, mockTheSpyToFail }) => {
                        mockTheSpyToFail()
                        const update =
                            useActionCountTargetsAndUpdateStateMachine(
                                getActionTemplate()
                            )
                        expect(update.transitionFired).toEqual(
                            PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND
                        )
                    }
                )
            })

            describe("will target the only ally who can benefit", () => {
                it.each(tests)(
                    `$name`,
                    ({ getActionTemplate, makeAllyTheOnlyValidTarget }) => {
                        makeAllyTheOnlyValidTarget()
                        const update =
                            useActionCountTargetsAndUpdateStateMachine(
                                getActionTemplate()
                            )
                        expect(update.transitionFired).toEqual(
                            PlayerActionTargetTransitionEnum.TARGETS_AUTOMATICALLY_SELECTED
                        )
                        expect(
                            Object.keys(
                                stateMachine.context.targetResults.validTargets
                            )
                        ).toEqual(["ally"])
                    }
                )
            })
        })
    })

    const clickMouse = (validMouseLocation: ScreenLocation) => {
        stateMachine.acceptPlayerInput({
            eventType: OrchestratorComponentMouseEventType.PRESS,
            mousePress: {
                ...validMouseLocation,
                button: MouseButton.ACCEPT,
            },
        })
        stateMachine.acceptPlayerInput({
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                ...validMouseLocation,
                button: MouseButton.ACCEPT,
            },
        })
    }
    const clickOnTarget = () => {
        const validMouseLocation =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: { q: 0, r: 1 },
                cameraLocation: context.camera.getWorldLocation(),
            })
        clickMouse(validMouseLocation)
    }
    const clickMouseAndRunActions = () => {
        context.playerInput.push({
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                button: MouseButton.ACCEPT,
                x: 100,
                y: 200,
            },
        })
        const update = stateMachine.update()
        update.actions.forEach((action) => {
            stateMachine.getActionLogic(action)!(context)
        })
    }

    describe("More than one target found", () => {
        beforeEach(() => {
            StateMachineDataService.setActionLogic(
                stateMachine.stateMachineData,
                {
                    [PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY]: (
                        context: PlayerActionTargetStateMachineContext
                    ) => {
                        context.targetResults.validTargets = {
                            "1": { currentMapCoordinate: { q: 0, r: 1 } },
                            "2": { currentMapCoordinate: { q: 0, r: 2 } },
                            "3": { currentMapCoordinate: { q: 0, r: 3 } },
                        }
                        context.targetResults.invalidTargets = {
                            "4": {
                                currentMapCoordinate: { q: 0, r: 4 },
                                reason: PlayerActionTargetStateInvalidTargetReason.NOT_AN_ALLY,
                            },
                            "5": {
                                currentMapCoordinate: { q: 0, r: 5 },
                                reason: PlayerActionTargetStateInvalidTargetReason.NOT_A_FOE,
                            },
                        }
                    },
                }
            )
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )!(context)
            stateMachine.currentState =
                PlayerActionTargetStateEnum.COUNT_TARGETS
        })

        it("will fire a MULTIPLE_TARGETS_FOUND transition", () => {
            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.MULTIPLE_TARGETS_FOUND
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET,
            ])
        })

        const selectActionAndWaitToTarget = (messageSpy: MockInstance) => {
            stateMachine.currentState =
                PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET
            context.targetResults.validTargets = {
                "1": { currentMapCoordinate: { q: 0, r: 1 } },
                "2": { currentMapCoordinate: { q: 0, r: 2 } },
            }
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET
            )!(context)
            messageSpy = vi.spyOn(context.messageBoard, "sendMessage")
            stateMachine.update()
            return messageSpy
        }

        describe("waiting for the user to select a target", () => {
            beforeEach(() => {
                stateMachine.getActionLogic(
                    PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET
                )!(context)
                stateMachine.currentState =
                    PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET
            })

            describe("Player peeks at targets", () => {
                let messageSpy: MockInstance

                beforeEach(() => {
                    MissionMapService.addSquaddie({
                        missionMap,
                        battleSquaddieId: "1",
                        squaddieTemplateId: "valid target",
                        originMapCoordinate: { q: 0, r: 1 },
                    })
                    MissionMapService.addSquaddie({
                        missionMap,
                        battleSquaddieId: "2",
                        squaddieTemplateId: "valid target",
                        originMapCoordinate: { q: 0, r: 2 },
                    })
                    MissionMapService.addSquaddie({
                        missionMap,
                        battleSquaddieId: "3",
                        squaddieTemplateId: "valid target",
                        originMapCoordinate: { q: 0, r: 3 },
                    })
                    MissionMapService.addSquaddie({
                        missionMap,
                        battleSquaddieId,
                        squaddieTemplateId,
                        originMapCoordinate: { q: 0, r: 0 },
                    })

                    messageSpy = vi.spyOn(messageBoard, "sendMessage")
                })

                afterEach(() => {
                    messageSpy.mockRestore()
                })

                const hoverMouseOverCoordinate = (
                    mapCoordinate: HexCoordinate
                ) => {
                    const validMouseLocation =
                        ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                            {
                                mapCoordinate,
                                cameraLocation:
                                    context.camera.getWorldLocation(),
                            }
                        )
                    stateMachine.acceptPlayerInput({
                        eventType: OrchestratorComponentMouseEventType.LOCATION,
                        mouseLocation: validMouseLocation,
                    })
                }

                const validTargetTests = [
                    {
                        battleSquaddieSelectedId: "1",
                        mapCoordinate: { q: 0, r: 1 },
                    },
                    {
                        battleSquaddieSelectedId: "2",
                        mapCoordinate: { q: 0, r: 2 },
                    },
                    {
                        battleSquaddieSelectedId: "3",
                        mapCoordinate: { q: 0, r: 3 },
                    },
                ]

                it.each(validTargetTests)(
                    "$battleSquaddieSelectedId, $mapCoordinate, hover over and expect to send a message",
                    ({ battleSquaddieSelectedId, mapCoordinate }) => {
                        hoverMouseOverCoordinate(mapCoordinate)
                        let update = stateMachine.update()
                        update.actions.forEach((action) => {
                            stateMachine.getActionLogic(action)!(context)
                        })
                        expect(messageSpy).toHaveBeenCalledWith({
                            type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                            battleSquaddieSelectedId,
                            selectionMethod: {
                                mapCoordinate: mapCoordinate,
                            },
                            summaryHUDState:
                                context.messageParameters.summaryHUDState,
                            missionMap: context.missionMap,
                            objectRepository: context.objectRepository,
                            campaignResources:
                                context.messageParameters.campaignResources,
                            squaddieAllMovementCache:
                                context.messageParameters
                                    .squaddieAllMovementCache,
                        })
                    }
                )

                it("will not fire an event if the player moves the mouse over a different squaddie", () => {})
            })

            it("will retrieve the cancel button", () => {
                expect(stateMachine.getSelectTargetButtons()).toEqual([
                    selectTargetCancelButton,
                ])
            })

            it("will retrieve the explanation text", () => {
                expect(stateMachine.getSelectTargetExplanationText()).toEqual([
                    selectTargetExplanationLabel,
                ])
            })

            it("does not transition while waiting for player input", () => {
                const update = stateMachine.update()
                expect(update.transitionFired).toBeUndefined()
                expect(update.actions).toEqual([
                    PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET,
                ])
                expect(update.targetedState).toBeUndefined()
            })

            it("clears the player input after processing", () => {
                clickMouseAndRunActions()
                expect(context.playerInput).toHaveLength(0)
            })

            describe("player selects a target", () => {
                let messageSpy: MockInstance

                beforeEach(() => {
                    messageSpy = selectActionAndWaitToTarget(messageSpy)
                })

                afterEach(() => {
                    if (messageSpy) messageSpy.mockRestore()
                })

                const selectValidTargetTests = [
                    {
                        name: "clicking on a valid target",
                        action: () => {
                            clickOnTarget()
                        },
                    },
                ]

                it.each(selectValidTargetTests)(
                    `$name will trigger a transition`,
                    ({ action }) => {
                        action()
                        let update = stateMachine.update()
                        update.actions.forEach((action) => {
                            stateMachine.getActionLogic(action)!(context)
                        })

                        update = stateMachine.update()
                        expect(update.transitionFired).toEqual(
                            PlayerActionTargetTransitionEnum.PLAYER_CONSIDERS_TARGET_SELECTION
                        )

                        expect(update.targetedState).toEqual(
                            PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM
                        )
                        expect(update.actions).toEqual([
                            PlayerActionTargetActionEnum.TRIGGER_PLAYER_CONSIDERS_TARGET_SELECTION,
                        ])
                    }
                )

                const notATargetTests = [
                    {
                        name: "on a tile without a target",
                        action: () => {
                            const invalidMouseLocation =
                                ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                                    {
                                        mapCoordinate: { q: -20, r: 30 },
                                        cameraLocation:
                                            context.camera.getWorldLocation(),
                                    }
                                )
                            clickMouse(invalidMouseLocation)
                        },
                        expectedExplanationLabelSubstring:
                            HexCoordinateService.toString({ q: -20, r: 30 }),
                    },
                ]

                it.each(notATargetTests)(
                    `$name will not trigger a transition`,
                    ({ action }) => {
                        action()
                        let update = stateMachine.update()
                        update.actions.forEach((action) => {
                            stateMachine.getActionLogic(action)!(context)
                        })

                        update = stateMachine.update()
                        expect(update.transitionFired).not.toEqual(
                            PlayerActionTargetTransitionEnum.PLAYER_CONSIDERS_TARGET_SELECTION
                        )
                    }
                )

                it.each(notATargetTests)(
                    `$name will update the explanation text`,
                    ({ action, expectedExplanationLabelSubstring }) => {
                        action()
                        let update = stateMachine.update()
                        update.actions.forEach((action) => {
                            stateMachine.getActionLogic(action)!(context)
                        })

                        stateMachine.update()
                        expect(
                            stateMachine.context.explanationLabelText.includes(
                                expectedExplanationLabelSubstring
                            )
                        ).toBe(true)
                    }
                )

                it("will explain when the invalid target in range is selected", () => {
                    SquaddieRepositoryService.createNewSquaddieAndAddToRepository(
                        {
                            name: "4",
                            battleId: "4",
                            templateId: "4",
                            affiliation: "UNKNOWN",
                            objectRepository: context.objectRepository!,
                            actionTemplateIds: [],
                        }
                    )
                    MissionMapService.addSquaddie({
                        missionMap: context.missionMap,
                        squaddieTemplateId: "4",
                        battleSquaddieId: "4",
                        originMapCoordinate: { q: 0, r: 4 },
                    })
                    const invalidMouseLocation =
                        ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                            {
                                mapCoordinate: { q: 0, r: 4 },
                                cameraLocation:
                                    context.camera.getWorldLocation(),
                            }
                        )
                    clickMouse(invalidMouseLocation)
                    let update = stateMachine.update()
                    update.actions.forEach((action) => {
                        stateMachine.getActionLogic(action)!(context)
                    })

                    stateMachine.update()
                    expect(
                        stateMachine.context.explanationLabelText.includes(
                            "not an ally"
                        )
                    ).toBe(true)
                })

                it("will explain the location is in range but there are no targets present", () => {
                    const invalidMouseLocation =
                        ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                            {
                                mapCoordinate: { q: 0, r: 4 },
                                cameraLocation:
                                    context.camera.getWorldLocation(),
                            }
                        )
                    context.targetResults.validCoordinates.push({ q: 0, r: 4 })
                    clickMouse(invalidMouseLocation)
                    let update = stateMachine.update()
                    update.actions.forEach((action) => {
                        stateMachine.getActionLogic(action)!(context)
                    })

                    stateMachine.update()
                    expect(
                        stateMachine.context.explanationLabelText.includes(
                            "is empty"
                        )
                    ).toBe(true)
                })

                describe("TRIGGER_PLAYER_CONSIDERS_TARGET_SELECTION", () => {
                    let update: StateMachineUpdate<
                        TPlayerActionTargetState,
                        PlayerActionTargetTransitionType,
                        PlayerActionTargetActionType
                    >

                    beforeEach(() => {
                        clickOnTarget()
                        update = stateMachine.update()
                        update.actions.forEach((action) => {
                            stateMachine.getActionLogic(action)!(context)
                        })
                        stateMachine.getActionLogic(
                            PlayerActionTargetActionEnum.TRIGGER_PLAYER_CONSIDERS_TARGET_SELECTION
                        )!(context)
                    })

                    it("sends a message to select the target", () => {
                        expect(messageSpy).toHaveBeenCalledWith({
                            type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE,
                            missionMap: context.missionMap,
                            objectRepository: context.objectRepository,
                            battleActionDecisionStep:
                                context.battleActionDecisionStep,
                            numberGenerator:
                                context.messageParameters.numberGenerator,
                            battleActionRecorder: context.battleActionRecorder,
                            targetCoordinate: { q: 0, r: 1 },
                            summaryHUDState:
                                context.messageParameters.summaryHUDState,
                        })
                    })
                })
            })

            const cancelTests = [
                {
                    name: "player presses cancel key on their keyboard",
                    acceptPlayerInput: () => {
                        stateMachine.acceptPlayerInput({
                            eventType:
                                OrchestratorComponentKeyEventType.PRESSED,
                            keyCode: JSON.parse(
                                process.env.PLAYER_INPUT_CANCEL!
                            )[0]["press"],
                        })
                    },
                },
                {
                    name: "player clicks on the the cancel button on screen",
                    acceptPlayerInput: () => {
                        clickOnButton(
                            selectTargetCancelButton.getArea(),
                            stateMachine
                        )
                    },
                },
                {
                    name: "player clicks the cancel key on their mouse",
                    acceptPlayerInput: () => {
                        stateMachine.acceptPlayerInput({
                            eventType:
                                OrchestratorComponentMouseEventType.PRESS,
                            mousePress: {
                                x: 9001,
                                y: -9001,
                                button: MouseButton.CANCEL,
                            },
                        })
                        stateMachine.acceptPlayerInput({
                            eventType:
                                OrchestratorComponentMouseEventType.RELEASE,
                            mouseRelease: {
                                x: -9001,
                                y: 9001,
                                button: MouseButton.CANCEL,
                            },
                        })
                    },
                },
            ]

            describe("player cancels before selecting a target", () => {
                let messageSpy: MockInstance

                beforeEach(() => {
                    messageSpy = selectActionAndWaitToTarget(messageSpy)
                })

                afterEach(() => {
                    if (messageSpy) messageSpy.mockRestore()
                })

                it.each(cancelTests)(
                    "$name will trigger a transition",
                    ({ acceptPlayerInput }) => {
                        acceptPlayerInput()
                        expect(
                            expectTransitionToCancelActionState(
                                stateMachine,
                                context
                            )
                        ).toBe(true)
                    }
                )

                describe("trigger player cancels action selection", () => {
                    beforeEach(() => {
                        cancelTests[0].acceptPlayerInput()
                        const update = stateMachine.update()
                        update.actions.forEach((action) => {
                            stateMachine.getActionLogic(action)!(context)
                        })
                        stateMachine.getActionLogic(
                            PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_ACTION_SELECTION
                        )!(context)
                    })

                    it("sends a message indicating the player cancels the action", () => {
                        expect(messageSpy).toHaveBeenCalledWith(
                            expect.objectContaining({
                                type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                            })
                        )
                    })

                    it("sends a message indicating the player unselected the targets", () => {
                        expect(messageSpy).toHaveBeenCalledWith(
                            expect.objectContaining({
                                type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                            })
                        )
                    })
                })
            })
        })
    })

    describe("No targets found", () => {
        beforeEach(() => {
            StateMachineDataService.setActionLogic(
                stateMachine.stateMachineData,
                {
                    [PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY]: (
                        context: PlayerActionTargetStateMachineContext
                    ) => {
                        context.targetResults.validTargets = {}
                    },
                }
            )
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )(context)
            stateMachine.currentState =
                PlayerActionTargetStateEnum.COUNT_TARGETS
        })

        it("will transition to cancel selections", () => {
            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.CANCEL_ACTION_SELECTION
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_ACTION_SELECTION,
                PlayerActionTargetActionEnum.CANCEL_ACTION_SELECTION_ENTRY,
            ])
        })
    })

    describe("One target found", () => {
        beforeEach(() => {
            StateMachineDataService.setActionLogic(
                stateMachine.stateMachineData,
                {
                    [PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY]: (
                        context: PlayerActionTargetStateMachineContext
                    ) => {
                        context.targetResults.validTargets = {
                            "1": { currentMapCoordinate: { q: 0, r: 1 } },
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

        it("will fire the expected transition", () => {
            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.TARGETS_AUTOMATICALLY_SELECTED
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.TRIGGER_TARGETS_AUTOMATICALLY_SELECTED,
            ])
        })

        describe("running the trigger action", () => {
            let messageSpy: MockInstance
            beforeEach(() => {
                messageSpy = vi.spyOn(context.messageBoard, "sendMessage")
                stateMachine.getActionLogic(
                    PlayerActionTargetActionEnum.TRIGGER_TARGETS_AUTOMATICALLY_SELECTED
                )(context)
            })
            it("sends messages indicating the target is known", () => {
                stateMachine.update()
                expect(messageSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE,
                        battleActionRecorder,
                        numberGenerator,
                        missionMap,
                        battleActionDecisionStep,
                        summaryHUDState,
                        objectRepository,
                        targetCoordinate: { q: 0, r: 1 },
                    })
                )
            })
        })
    })

    const cancelTests = [
        {
            name: "player presses cancel key",
            acceptPlayerInput: () => {
                stateMachine.acceptPlayerInput({
                    eventType: OrchestratorComponentKeyEventType.PRESSED,
                    keyCode: JSON.parse(process.env.PLAYER_INPUT_CANCEL!)[0][
                        "press"
                    ],
                })
            },
        },
        {
            name: "player clicks on the the cancel button",
            acceptPlayerInput: () => {
                clickOnButton(confirmCancelButton.getArea(), stateMachine)
            },
        },
        {
            name: "player clicks the cancel key",
            acceptPlayerInput: () => {
                stateMachine.acceptPlayerInput({
                    eventType: OrchestratorComponentMouseEventType.PRESS,
                    mousePress: {
                        x: 9001,
                        y: -9001,
                        button: MouseButton.CANCEL,
                    },
                })
                stateMachine.acceptPlayerInput({
                    eventType: OrchestratorComponentMouseEventType.RELEASE,
                    mouseRelease: {
                        x: -9001,
                        y: 9001,
                        button: MouseButton.CANCEL,
                    },
                })
            },
        },
    ]

    const cancelConfirmTests = [
        {
            name: "player clicks on the the cancel button",
            acceptPlayerInput: () => {
                clickOnButton(confirmCancelButton.getArea(), stateMachine)
            },
        },
    ]

    describe("Waiting for Player to confirm when target is automatically set", () => {
        beforeEach(() => {
            mockGetConfirmButtons()
            stateMachine.currentState =
                PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM
            context.targetResults.validTargets = {
                "1": { currentMapCoordinate: { q: 0, r: 1 } },
            }
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.TRIGGER_TARGETS_AUTOMATICALLY_SELECTED
            )(context)
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_CONFIRM
            )(context)
        })

        it("will retrieve the confirm buttons", () => {
            expect(stateMachine.getConfirmButtons()).toEqual([
                confirmOKButton,
                confirmCancelButton,
            ])
        })

        it("does not transition while waiting for player input", () => {
            const update = stateMachine.update()
            expect(update.transitionFired).toBeUndefined()
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_CONFIRM,
            ])
            expect(update.targetedState).toBeUndefined()
        })

        it("clears the player input after processing", () => {
            clickMouseAndRunActions()
            expect(context.playerInput).toHaveLength(0)
        })

        const mockGetConfirmButtons = () => {
            getButtonsSpy = vi.spyOn(stateMachine, "getConfirmButtons")
            return {
                okButton: confirmOKButton,
                cancelButton: confirmCancelButton,
            }
        }

        describe("player confirms", () => {
            let messageSpy: MockInstance

            const tests = [
                {
                    name: "player presses accept key",
                    acceptPlayerInput: () => {
                        stateMachine.acceptPlayerInput({
                            eventType:
                                OrchestratorComponentKeyEventType.PRESSED,
                            keyCode: JSON.parse(
                                process.env.PLAYER_INPUT_ACCEPT!
                            )[0]["press"],
                        })
                    },
                },
                {
                    name: "player presses and releases the ok button",
                    acceptPlayerInput: () => {
                        clickOnButton(confirmOKButton.getArea(), stateMachine)
                    },
                },
            ]

            beforeEach(() => {
                messageSpy = vi.spyOn(context.messageBoard, "sendMessage")
                stateMachine.update()
            })

            afterEach(() => {
                if (messageSpy) messageSpy.mockRestore()
                if (getButtonsSpy) getButtonsSpy.mockRestore()
            })

            it.each(tests)(
                "$name will set the external flag",
                ({ acceptPlayerInput }) => {
                    acceptPlayerInput()
                    let update = stateMachine.update()
                    update.actions.forEach((action) => {
                        stateMachine.getActionLogic(action)(context)
                    })

                    update = stateMachine.update()

                    expect(update.transitionFired).toEqual(
                        PlayerActionTargetTransitionEnum.PLAYER_CONFIRMS_TARGET_SELECTION
                    )

                    expect(update.actions).toEqual([
                        PlayerActionTargetActionEnum.TRIGGER_PLAYER_CONFIRMS_ACTION_SELECTION,
                        PlayerActionTargetActionEnum.CONFIRM_ACTION_SELECTION_ENTRY,
                    ])

                    expect(getButtonsSpy).toHaveBeenCalled()
                }
            )

            describe("TRIGGER_PLAYER_CONFIRMS_ACTION_SELECTION", () => {
                beforeEach(() => {
                    tests[0].acceptPlayerInput()
                    const update = stateMachine.update()
                    update.actions.forEach((action) => {
                        stateMachine.getActionLogic(action)(context)
                    })
                    stateMachine.getActionLogic(
                        PlayerActionTargetActionEnum.TRIGGER_PLAYER_CONFIRMS_ACTION_SELECTION
                    )(context)
                })

                it("sends a message to confirm the action", () => {
                    expect(messageSpy).toHaveBeenCalledWith({
                        type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        missionMap: context.missionMap,
                        objectRepository: context.objectRepository,
                        battleActionRecorder: context.battleActionRecorder,
                        numberGenerator:
                            context.messageParameters.numberGenerator,
                        missionStatistics:
                            context.messageParameters
                                .playerConfirmsActionMessageParameters
                                .missionStatistics,
                        challengeModifierSetting:
                            context.messageParameters.challengeModifierSetting,
                    })
                })

                it("sets an external flag to true", () => {
                    expect(context.externalFlags.actionConfirmed).toBeTruthy()
                })
            })
        })

        describe("player cancels when targets were automatically set", () => {
            let messageSpy: MockInstance

            beforeEach(() => {
                stateMachine.currentState =
                    PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM
                context.targetResults.validTargets = {
                    "1": { currentMapCoordinate: { q: 0, r: 1 } },
                }
                stateMachine.getActionLogic(
                    PlayerActionTargetActionEnum.TRIGGER_TARGETS_AUTOMATICALLY_SELECTED
                )(context)
                stateMachine.getActionLogic(
                    PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_CONFIRM
                )(context)
                messageSpy = vi.spyOn(context.messageBoard, "sendMessage")
                stateMachine.update()
            })

            afterEach(() => {
                if (messageSpy) messageSpy.mockRestore()
            })

            it.each([...cancelTests, ...cancelConfirmTests])(
                "$name will trigger a transition",
                ({ acceptPlayerInput }) => {
                    acceptPlayerInput()
                    expect(
                        expectTransitionToCancelActionState(
                            stateMachine,
                            context
                        )
                    ).toBe(true)
                }
            )

            describe("trigger player cancels action selection", () => {
                beforeEach(() => {
                    cancelConfirmTests[0].acceptPlayerInput()
                    const update = stateMachine.update()
                    update.actions.forEach((action) => {
                        stateMachine.getActionLogic(action)(context)
                    })
                    stateMachine.getActionLogic(
                        PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_ACTION_SELECTION
                    )(context)
                })

                it("sends a message indicating the player unselected the targets", () => {
                    expect(messageSpy).toHaveBeenCalledWith({
                        type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                        summaryHUDState:
                            context.messageParameters.summaryHUDState,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        missionMap: context.missionMap,
                        objectRepository: context.objectRepository,
                        campaignResources:
                            context.messageParameters.campaignResources,
                        squaddieAllMovementCache:
                            context.messageParameters.squaddieAllMovementCache,
                    })
                })
                it("sends a message indicating the player unselected the action", () => {
                    expect(messageSpy).toHaveBeenCalledWith({
                        type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        objectRepository: context.objectRepository,
                        battleActionRecorder: context.battleActionRecorder,
                        summaryHUDState:
                            context.messageParameters.summaryHUDState,
                        missionMap: context.missionMap,
                        playerConsideredActions:
                            context.messageParameters
                                .playerCancelsPlayerActionConsiderationsParameters
                                .playerConsideredActions,
                        playerDecisionHUD:
                            context.messageParameters
                                .playerCancelsPlayerActionConsiderationsParameters
                                .playerDecisionHUD,
                        playerCommandState: context.playerCommandState,
                    })
                })
            })
        })
    })

    describe("player cancels after manually selecting a target", () => {
        let messageSpy: MockInstance

        beforeEach(() => {
            stateMachine.currentState =
                PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET
            stateMachine.context.targetResults.validTargets["1"] = {
                currentMapCoordinate: { q: 0, r: 1 },
            }
            stateMachine.context.targetResults.validTargets["2"] = {
                currentMapCoordinate: { q: 0, r: 2 },
            }
            clickOnTarget()
            let update = stateMachine.update()
            update.actions.forEach((action) => {
                stateMachine.getActionLogic(action)(context)
            })
            update = stateMachine.update()
            update.actions.forEach((action) => {
                stateMachine.getActionLogic(action)(context)
            })
            expect(update.targetedState).not.toBeUndefined()
            if (update.targetedState != undefined) {
                stateMachine.currentState = update.targetedState
            }
            expect(stateMachine.currentState).toEqual(
                PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_CONFIRM
            )
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_CONFIRM
            )(context)
            messageSpy = vi.spyOn(context.messageBoard, "sendMessage")
        })

        afterEach(() => {
            if (messageSpy) messageSpy.mockRestore()
        })

        it.each([...cancelTests, ...cancelConfirmTests])(
            "$name will trigger a transition",
            ({ acceptPlayerInput }) => {
                acceptPlayerInput()
                let update = stateMachine.update()
                update.actions.forEach((action) => {
                    stateMachine.getActionLogic(action)(context)
                })

                update = stateMachine.update()
                expect(update.transitionFired).toEqual(
                    PlayerActionTargetTransitionEnum.PLAYER_CANCELS_TARGET_SELECTION
                )
                expect(update.targetedState).toEqual(
                    PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET
                )
                expect(update.actions).toEqual([
                    PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_TARGET_SELECTION,
                ])
            }
        )

        const cancelTargetTests = [
            {
                name: "player clicks on the the cancel button",
                acceptPlayerInput: () => {
                    const cancelButtonArea = selectTargetCancelButton.getArea()
                    stateMachine.acceptPlayerInput({
                        eventType: OrchestratorComponentMouseEventType.PRESS,
                        mousePress: {
                            x: RectAreaService.centerX(cancelButtonArea),
                            y: RectAreaService.centerY(cancelButtonArea),
                            button: MouseButton.ACCEPT,
                        },
                    })
                    stateMachine.acceptPlayerInput({
                        eventType: OrchestratorComponentMouseEventType.RELEASE,
                        mouseRelease: {
                            x: RectAreaService.centerX(cancelButtonArea),
                            y: RectAreaService.centerY(cancelButtonArea),
                            button: MouseButton.ACCEPT,
                        },
                    })
                },
            },
        ]
        describe("player cancels target selection", () => {
            beforeEach(() => {
                cancelTargetTests[0].acceptPlayerInput()
                const update = stateMachine.update()
                update.actions.forEach((action) => {
                    stateMachine.getActionLogic(action)(context)
                })
                stateMachine.getActionLogic(
                    PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_TARGET_SELECTION
                )(context)
            })

            it("sends a message indicating the player unselected the targets", () => {
                expect(messageSpy).toHaveBeenCalledWith({
                    type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                    summaryHUDState: context.messageParameters.summaryHUDState,
                    battleActionDecisionStep: context.battleActionDecisionStep,
                    missionMap: context.missionMap,
                    objectRepository: context.objectRepository,
                    campaignResources:
                        context.messageParameters.campaignResources,
                    squaddieAllMovementCache:
                        context.messageParameters.squaddieAllMovementCache,
                })
            })
            it("does not send a message to unselected the action", () => {
                expect(messageSpy).not.toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                    })
                )
            })
            it("unselects targets from player intent", () => {
                expect(
                    stateMachine.context.playerIntent.targetSelection
                        .battleSquaddieIds
                ).toHaveLength(0)
            })
        })
    })
})

const clickOnButton = (
    buttonArea: RectArea,
    stateMachine: PlayerActionTargetStateMachine
) => {
    stateMachine.acceptPlayerInput({
        eventType: OrchestratorComponentMouseEventType.PRESS,
        mousePress: {
            x: RectAreaService.centerX(buttonArea),
            y: RectAreaService.centerY(buttonArea),
            button: MouseButton.ACCEPT,
        },
    })
    stateMachine.acceptPlayerInput({
        eventType: OrchestratorComponentMouseEventType.RELEASE,
        mouseRelease: {
            x: RectAreaService.centerX(buttonArea),
            y: RectAreaService.centerY(buttonArea),
            button: MouseButton.ACCEPT,
        },
    })
}

const expectTransitionToCancelActionState = (
    stateMachine: PlayerActionTargetStateMachine,
    context: PlayerActionTargetStateMachineContext
): boolean => {
    let update = stateMachine.update()
    update.actions.forEach((action) => {
        stateMachine.getActionLogic(action)(context)
    })

    update = stateMachine.update()
    expect(update.transitionFired).toEqual(
        PlayerActionTargetTransitionEnum.PLAYER_CANCELS_ACTION_SELECTION
    )

    expect(update.targetedState).toEqual(
        PlayerActionTargetStateEnum.CANCEL_ACTION_SELECTION
    )
    expect(update.actions).toEqual([
        PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_ACTION_SELECTION,
        PlayerActionTargetActionEnum.CANCEL_ACTION_SELECTION_ENTRY,
    ])
    return true
}
