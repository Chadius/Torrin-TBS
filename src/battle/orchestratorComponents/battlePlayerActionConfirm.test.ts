import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattlePlayerActionConfirm } from "./battlePlayerActionConfirm"
import { BattleSquaddie } from "../battleSquaddie"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { HexCoordinateToKey } from "../../hexMap/hexCoordinate/hexCoordinate"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { convertMapCoordinatesToScreenCoordinates } from "../../hexMap/convertCoordinates"
import { HighlightPulseRedColor } from "../../hexMap/hexDrawingUtils"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { ResourceHandler } from "../../resource/resourceHandler"
import { makeResult } from "../../utils/ResultOrError"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { CreateNewSquaddieAndAddToRepository } from "../../utils/test/squaddie"
import {
    DamageType,
    GetHitPoints,
    GetNumberOfActionPoints,
} from "../../squaddie/squaddieService"
import { BattleEvent } from "../history/battleEvent"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { CreateNewSquaddieMovementWithTraits } from "../../squaddie/movement"
import { BattleStateService } from "../orchestrator/battleState"
import { BattleSquaddieSelectedHUD } from "../hud/BattleSquaddieSelectedHUD"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../action/template/actionEffectSquaddieTemplate"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { DecidedActionService } from "../../action/decided/decidedAction"
import {
    DecidedActionSquaddieEffect,
    DecidedActionSquaddieEffectService,
} from "../../action/decided/decidedActionSquaddieEffect"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { ProcessedActionSquaddieEffectService } from "../../action/processed/processedActionSquaddieEffect"
import { DegreeOfSuccess } from "../actionCalculator/degreeOfSuccess"
import { CampaignService } from "../../campaign/campaign"
import { BattleHUDService } from "../hud/battleHUD"
import { MouseButton } from "../../utils/mouseConfig"
import { PlayerBattleActionBuilderStateService } from "../actionBuilder/playerBattleActionBuilderState"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { SummaryHUDStateService } from "../hud/summaryHUD"
import { SquaddieSummaryPopoverPosition } from "../hud/playerActionPanel/squaddieSummaryPopover"

describe("BattleActionConfirm", () => {
    let squaddieRepo: ObjectRepository = ObjectRepositoryService.new()
    let playerActionConfirm: BattlePlayerActionConfirm
    let knightSquaddieTemplate: SquaddieTemplate
    let knightBattleSquaddie: BattleSquaddie
    let citizenStatic: SquaddieTemplate
    let citizenBattleSquaddie: BattleSquaddie
    let thiefStatic: SquaddieTemplate
    let thiefBattleSquaddie: BattleSquaddie
    let battleMap: MissionMap
    let longswordAction: ActionTemplate
    let longswordActionId: string = "longsword"
    let longswordActionDamage: number = 2
    let gameEngineState: GameEngineState
    let mockResourceHandler: jest.Mocked<ResourceHandler>
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let messageSpy: jest.SpyInstance

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        playerActionConfirm = new BattlePlayerActionConfirm()
        squaddieRepo = ObjectRepositoryService.new()
        battleMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
            }),
        })

        longswordActionDamage = 2
        longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: longswordActionId,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {
                        [DamageType.BODY]: longswordActionDamage,
                    },
                }),
            ],
        })
        ;({
            squaddieTemplate: knightSquaddieTemplate,
            battleSquaddie: knightBattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Knight",
            templateId: "Knight",
            battleId: "Knight 0",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
            actionTemplates: [longswordAction],
        }))
        battleMap.addSquaddie(
            knightSquaddieTemplate.squaddieId.templateId,
            knightBattleSquaddie.battleSquaddieId,
            { q: 1, r: 1 }
        )
        ;({
            squaddieTemplate: citizenStatic,
            battleSquaddie: citizenBattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Citizen",
            templateId: "Citizen",
            battleId: "Citizen 0",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository: squaddieRepo,
        }))
        battleMap.addSquaddie(
            citizenStatic.squaddieId.templateId,
            citizenBattleSquaddie.battleSquaddieId,
            {
                q: 0,
                r: 1,
            }
        )
        ;({
            squaddieTemplate: thiefStatic,
            battleSquaddie: thiefBattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Thief",
            templateId: "Thief",
            battleId: "Thief 0",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepo,
            actionTemplates: [longswordAction],
            attributes: {
                maxHitPoints: 5,
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                }),
                armorClass: 0,
            },
        }))
        battleMap.addSquaddie(
            thiefStatic.squaddieId.templateId,
            thiefBattleSquaddie.battleSquaddieId,
            { q: 1, r: 2 }
        )

        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            startingLocation: { q: 1, r: 1 },
            previewedActionTemplateId: longswordActionId,
        })

        mockResourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
        mockResourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult(null))

        gameEngineState = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                }),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: battleMap,
                    actionsThisRound,
                    recording: { history: [] },
                }),
            }),
            repository: squaddieRepo,
            campaign: CampaignService.default({}),
        })

        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
            PlayerBattleActionBuilderStateService.new({})
        PlayerBattleActionBuilderStateService.setActor({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
        })

        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            SummaryHUDStateService.new({
                mouseSelectionLocation: { x: 0, y: 0 },
            })
        SummaryHUDStateService.setMainSummaryPopover({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            resourceHandler: gameEngineState.resourceHandler,
            objectRepository: gameEngineState.repository,
            gameEngineState,
            position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
        })

        messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
    })

    afterEach(() => {
        messageSpy.mockRestore()
    })

    const attackThiefWithLongsword = () => {
        PlayerBattleActionBuilderStateService.addAction({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            actionTemplate: longswordAction,
        })

        const { mapLocation } = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            thiefBattleSquaddie.battleSquaddieId
        )

        PlayerBattleActionBuilderStateService.setConsideredTarget({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            targetLocation: mapLocation,
        })

        SummaryHUDStateService.setTargetSummaryPopover({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            battleSquaddieId: thiefBattleSquaddie.battleSquaddieId,
            gameEngineState,
            objectRepository: gameEngineState.repository,
            resourceHandler: gameEngineState.resourceHandler,
            position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
        })
    }

    const clickOnConfirm = () => {
        const confirmSelectionClick: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
            mouseButton: MouseButton.ACCEPT,
        }

        playerActionConfirm.mouseEventHappened(
            gameEngineState,
            confirmSelectionClick
        )
    }

    const clickOnCancel = () => {
        const cancelTargetClick: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
            mouseButton: MouseButton.ACCEPT,
        }

        playerActionConfirm.mouseEventHappened(
            gameEngineState,
            cancelTargetClick
        )
    }

    describe("user cancels confirmation", () => {
        beforeEach(() => {
            attackThiefWithLongsword()
            playerActionConfirm.update(gameEngineState, mockedP5GraphicsContext)
            clickOnCancel()
        })

        it("should complete", () => {
            expect(
                playerActionConfirm.hasCompleted(gameEngineState)
            ).toBeTruthy()
        })

        it("should recommend squaddie target", () => {
            const changes =
                playerActionConfirm.recommendStateChanges(gameEngineState)
            expect(changes.nextMode).toEqual(
                BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET
            )
        })

        it("sends a message indicating the user canceled", () => {
            expect(messageSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION,
                })
            )
        })
    })

    describe("user confirms the target", () => {
        beforeEach(() => {
            playerActionConfirm.update(gameEngineState, mockedP5GraphicsContext)
            attackThiefWithLongsword()
            clickOnConfirm()
        })

        it("should create ActionsThisRound", () => {
            const decidedActionSquaddieEffect =
                DecidedActionSquaddieEffectService.new({
                    template: longswordAction
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                    target: { q: 1, r: 2 },
                })
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                startingLocation: { q: 1, r: 1 },
                previewedActionTemplateId: undefined,
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            actionPointCost: 1,
                            battleSquaddieId:
                                knightBattleSquaddie.battleSquaddieId,
                            actionTemplateName: longswordAction.name,
                            actionTemplateId: longswordAction.id,
                            actionEffects: [decidedActionSquaddieEffect],
                        }),
                        processedActionEffects: [
                            ProcessedActionSquaddieEffectService.new({
                                decidedActionEffect:
                                    decidedActionSquaddieEffect,
                                results: {
                                    actingBattleSquaddieId: "Knight 0",
                                    actingSquaddieModifiers: {},
                                    actingSquaddieRoll: {
                                        occurred: false,
                                        rolls: [],
                                    },
                                    resultPerTarget: {
                                        "Thief 0": {
                                            actorDegreeOfSuccess:
                                                DegreeOfSuccess.SUCCESS,
                                            damageTaken: 2,
                                            healingReceived: 0,
                                        },
                                    },
                                    targetedBattleSquaddieIds: ["Thief 0"],
                                },
                            }),
                        ],
                    }),
                ],
            })
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            ).toEqual(actionsThisRound)
        })

        it("should be completed", () => {
            expect(
                playerActionConfirm.hasCompleted(gameEngineState)
            ).toBeTruthy()
        })

        it("should change the gameEngineState to Player HUD Controller", () => {
            const recommendedInfo =
                playerActionConfirm.recommendStateChanges(gameEngineState)
            expect(recommendedInfo.nextMode).toBe(
                BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
            )
        })

        // TODO Add a test to send a message
        it("should send a message indicating the player confirmed their action", () => {
            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                gameEngineState,
            })
        })

        // TODO Should be part of BattleHUD
        it("should create a confirmed action in the action builder", () => {
            expect(
                PlayerBattleActionBuilderStateService.isTargetConfirmed(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeTruthy()
        })

        // TODO Should be part of BattleHUD
        it("should consume the squaddie action points", () => {
            const { actionPointsRemaining } = GetNumberOfActionPoints({
                squaddieTemplate: knightSquaddieTemplate,
                battleSquaddie: knightBattleSquaddie,
            })
            expect(actionPointsRemaining).toBe(2)
        })
    })

    describe("confirming an action mid turn", () => {
        beforeEach(() => {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                ActionsThisRoundService.new({
                    battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                    startingLocation: { q: 1, r: 1 },
                    previewedActionTemplateId: longswordActionId,
                    processedActions: [
                        ProcessedActionService.new({
                            decidedAction: DecidedActionService.new({
                                battleSquaddieId:
                                    knightBattleSquaddie.battleSquaddieId,
                                actionPointCost: longswordAction.actionPoints,
                                actionTemplateName: longswordAction.name,
                                actionTemplateId: longswordActionId,
                                actionEffects: [
                                    DecidedActionSquaddieEffectService.new({
                                        template: longswordAction
                                            .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                        target: { q: 0, r: 0 },
                                    }),
                                ],
                            }),
                        }),
                    ],
                })

            expect(
                playerActionConfirm.hasCompleted(gameEngineState)
            ).toBeFalsy()
            playerActionConfirm.update(gameEngineState, mockedP5GraphicsContext)
            attackThiefWithLongsword()
            clickOnConfirm()
            expect(
                playerActionConfirm.hasCompleted(gameEngineState)
            ).toBeTruthy()
        })

        // TODO Should be part of BattleHUD
        it("should add to existing instruction when confirmed mid turn", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.processedActions
            ).toHaveLength(2)
            const newProcessedAction =
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.processedActions[1]
            expect(newProcessedAction.decidedAction.actionTemplateId).toEqual(
                longswordAction.id
            )
            expect(newProcessedAction.decidedAction.actionTemplateName).toEqual(
                longswordAction.name
            )
            expect(newProcessedAction.decidedAction.battleSquaddieId).toEqual(
                knightBattleSquaddie.battleSquaddieId
            )

            expect(newProcessedAction.decidedAction.actionEffects).toHaveLength(
                1
            )
            expect(
                newProcessedAction.decidedAction.actionEffects[0].type
            ).toEqual(ActionEffectType.SQUADDIE)
            const newDecidedActionEffect = newProcessedAction.decidedAction
                .actionEffects[0] as DecidedActionSquaddieEffect
            expect(newDecidedActionEffect.target).toEqual({ q: 1, r: 2 })
            expect(newDecidedActionEffect.type).toEqual(
                ActionEffectType.SQUADDIE
            )
            expect(newDecidedActionEffect.template).toEqual(
                longswordAction.actionEffectTemplates[0]
            )
        })

        // TODO Should be part of BattleHUD
        it("should spend the action resource cost after confirming but before showing results", () => {
            const { actionPointsRemaining } = GetNumberOfActionPoints({
                squaddieTemplate: knightSquaddieTemplate,
                battleSquaddie: knightBattleSquaddie,
            })
            expect(actionPointsRemaining).toBe(3 - longswordAction.actionPoints)
        })

        // TODO Should be part of BattleHUD
        it("should add the results to the history", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState.recording
                    .history
            ).toHaveLength(1)
            const mostRecentEvent: BattleEvent =
                gameEngineState.battleOrchestratorState.battleState.recording
                    .history[0]
            expect(
                mostRecentEvent.processedAction.processedActionEffects
            ).toHaveLength(1)
            expect(
                mostRecentEvent.processedAction.processedActionEffects[0]
                    .decidedActionEffect.type
            ).toEqual(ActionEffectType.SQUADDIE)

            expect(
                (
                    mostRecentEvent.processedAction.processedActionEffects[0]
                        .decidedActionEffect as DecidedActionSquaddieEffect
                ).template
            ).toEqual(
                longswordAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate
            )

            const results = mostRecentEvent.results
            expect(results.actingBattleSquaddieId).toBe(
                knightBattleSquaddie.battleSquaddieId
            )
            expect(results.targetedBattleSquaddieIds).toHaveLength(1)
            expect(results.targetedBattleSquaddieIds[0]).toBe(
                thiefBattleSquaddie.battleSquaddieId
            )
            expect(
                results.resultPerTarget[thiefBattleSquaddie.battleSquaddieId]
            ).toBeTruthy()
        })

        // TODO Should be part of BattleHUD
        it("should store the calculated results", () => {
            const mostRecentEvent: BattleEvent =
                gameEngineState.battleOrchestratorState.battleState.recording
                    .history[0]
            const knightUsesLongswordOnThiefResults =
                mostRecentEvent.results.resultPerTarget[
                    thiefBattleSquaddie.battleSquaddieId
                ]
            expect(knightUsesLongswordOnThiefResults.damageTaken).toBe(
                longswordActionDamage
            )

            const { maxHitPoints, currentHitPoints } = GetHitPoints({
                squaddieTemplate: thiefStatic,
                battleSquaddie: thiefBattleSquaddie,
            })
            expect(currentHitPoints).toBe(maxHitPoints - longswordActionDamage)
        })
    })
})
