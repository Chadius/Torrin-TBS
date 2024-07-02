import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattlePlayerSquaddieTarget } from "./battlePlayerSquaddieTarget"
import { BattleSquaddie } from "../battleSquaddie"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { MissionMap } from "../../missionMap/missionMap"
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
import { OrchestratorUtilities } from "./orchestratorUtils"
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

describe("BattleSquaddieTarget", () => {
    let squaddieRepo: ObjectRepository = ObjectRepositoryService.new()
    let targetComponent: BattlePlayerSquaddieTarget
    let knightStatic: SquaddieTemplate
    let knightDynamic: BattleSquaddie
    let citizenStatic: SquaddieTemplate
    let citizenDynamic: BattleSquaddie
    let thiefStatic: SquaddieTemplate
    let thiefDynamic: BattleSquaddie
    let battleMap: MissionMap
    let longswordAction: ActionTemplate
    let longswordActionId: string = "longsword"
    let longswordActionDamage: number = 2
    let bandageWoundsAction: ActionTemplate
    let bandageWoundsActionId: string = "bandage wounds"
    let gameEngineState: GameEngineState
    let mockResourceHandler: jest.Mocked<ResourceHandler>
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let messageSpy: jest.SpyInstance

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        targetComponent = new BattlePlayerSquaddieTarget()
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

        bandageWoundsAction = ActionTemplateService.new({
            name: "Bandage Wounds",
            id: bandageWoundsActionId,
            actionPoints: 2,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.HEALING]: true,
                        [Trait.TARGETS_ALLIES]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                }),
            ],
        })
        ;({ squaddieTemplate: knightStatic, battleSquaddie: knightDynamic } =
            CreateNewSquaddieAndAddToRepository({
                name: "Knight",
                templateId: "Knight",
                battleId: "Knight 0",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository: squaddieRepo,
                actionTemplates: [longswordAction, bandageWoundsAction],
            }))
        battleMap.addSquaddie(
            knightStatic.squaddieId.templateId,
            knightDynamic.battleSquaddieId,
            { q: 1, r: 1 }
        )
        ;({ squaddieTemplate: citizenStatic, battleSquaddie: citizenDynamic } =
            CreateNewSquaddieAndAddToRepository({
                name: "Citizen",
                templateId: "Citizen",
                battleId: "Citizen 0",
                affiliation: SquaddieAffiliation.ALLY,
                squaddieRepository: squaddieRepo,
            }))
        battleMap.addSquaddie(
            citizenStatic.squaddieId.templateId,
            citizenDynamic.battleSquaddieId,
            {
                q: 0,
                r: 1,
            }
        )
        ;({ squaddieTemplate: thiefStatic, battleSquaddie: thiefDynamic } =
            CreateNewSquaddieAndAddToRepository({
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
            thiefDynamic.battleSquaddieId,
            { q: 1, r: 2 }
        )

        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: knightDynamic.battleSquaddieId,
            startingLocation: { q: 1, r: 1 },
            previewedActionTemplateId: longswordActionId,
        })

        mockResourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
        mockResourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult(null))

        gameEngineState = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
            battleOrchestratorState:
                BattleOrchestratorStateService.newOrchestratorState({
                    battleHUD: BattleHUDService.new({
                        battleSquaddieSelectedHUD:
                            new BattleSquaddieSelectedHUD(),
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
            battleSquaddieId: knightDynamic.battleSquaddieId,
        })
        PlayerBattleActionBuilderStateService.addAction({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            actionTemplate: longswordAction,
        })

        messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
    })

    afterEach(() => {
        messageSpy.mockRestore()
    })

    const clickOnThief = () => {
        const { mapLocation } =
            gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                thiefDynamic.battleSquaddieId
            )
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            mapLocation.q,
            mapLocation.r,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
        )
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        }

        targetComponent.mouseEventHappened(gameEngineState, mouseEvent)
    }

    const clickOnCitizen = () => {
        const { mapLocation } =
            gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                citizenDynamic.battleSquaddieId
            )
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            mapLocation.q,
            mapLocation.r,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
        )
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        }

        targetComponent.mouseEventHappened(gameEngineState, mouseEvent)
    }

    const clickOnConfirmTarget = () => {
        const confirmSelectionClick: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
            mouseButton: MouseButton.ACCEPT,
        }

        targetComponent.mouseEventHappened(
            gameEngineState,
            confirmSelectionClick
        )
    }

    it("should highlight the map with the ability range", () => {
        targetComponent.update(gameEngineState, mockedP5GraphicsContext)

        expect(targetComponent.hasCompleted(gameEngineState)).toBeFalsy()

        const highlightedTileDescription = {
            pulseColor: HighlightPulseRedColor,
            name: "map icon attack 1 action",
        }

        expect(battleMap.terrainTileMap.highlightedTiles).toStrictEqual({
            [HexCoordinateToKey({ q: 1, r: 0 })]: highlightedTileDescription,
            [HexCoordinateToKey({ q: 1, r: 2 })]: highlightedTileDescription,
            [HexCoordinateToKey({ q: 0, r: 1 })]: highlightedTileDescription,
            [HexCoordinateToKey({ q: 2, r: 1 })]: highlightedTileDescription,
            [HexCoordinateToKey({ q: 2, r: 0 })]: highlightedTileDescription,
            [HexCoordinateToKey({ q: 0, r: 2 })]: highlightedTileDescription,
        })
    })

    describe("canceling after selecting action but before selecting target", () => {
        const tests = [
            {
                mouseX: 0,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            },
            {
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            },
        ]
        it.each(tests)(
            "should cancel target if the user clicks on the cancel button",
            ({ mouseX, mouseY }) => {
                const mouseEvent: OrchestratorComponentMouseEvent = {
                    eventType: OrchestratorComponentMouseEventType.CLICKED,
                    mouseX,
                    mouseY,
                    mouseButton: MouseButton.ACCEPT,
                }

                targetComponent.mouseEventHappened(gameEngineState, mouseEvent)

                expect(
                    targetComponent.hasCompleted(gameEngineState)
                ).toBeTruthy()
                const recommendedInfo =
                    targetComponent.recommendStateChanges(gameEngineState)
                expect(recommendedInfo.nextMode).toBe(
                    BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                )
                expect(messageSpy).toHaveBeenCalledWith({
                    type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                    gameEngineState,
                })
            }
        )
    })

    it("should ignore if the user does not click off of the map", () => {
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            battleMap.terrainTileMap.getDimensions().numberOfRows + 1,
            0,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
        )
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        }

        targetComponent.mouseEventHappened(gameEngineState, mouseEvent)
        expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy()
        expect(targetComponent.hasCompleted(gameEngineState)).toBeFalsy()
        expect(
            PlayerBattleActionBuilderStateService.isActionSet(
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState
            )
        ).toBeTruthy()
        expect(
            PlayerBattleActionBuilderStateService.isActionSet(
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState
            )
        ).toBeTruthy()
    })

    it("should ignore if the target is out of range", () => {
        gameEngineState.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(
            thiefDynamic.battleSquaddieId,
            {
                q: 0,
                r: 0,
            }
        )
        targetComponent.update(gameEngineState, mockedP5GraphicsContext)
        clickOnThief()
        expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy()
        expect(targetComponent.hasCompleted(gameEngineState)).toBeFalsy()
        expect(
            PlayerBattleActionBuilderStateService.isTargetConsidered(
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState
            )
        ).toBeFalsy()
        expect(
            PlayerBattleActionBuilderStateService.isTargetConfirmed(
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState
            )
        ).toBeFalsy()
    })

    describe("user clicks on target with attack", () => {
        beforeEach(() => {
            targetComponent.update(gameEngineState, mockedP5GraphicsContext)
            clickOnThief()
        })

        it("should show the confirm window", () => {
            expect(targetComponent.shouldDrawConfirmWindow()).toBeTruthy()
            expect(targetComponent.hasCompleted(gameEngineState)).toBeFalsy()
        })

        it("should consider the target for the action builder", () => {
            expect(
                PlayerBattleActionBuilderStateService.isTargetConsidered(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeTruthy()
            expect(
                PlayerBattleActionBuilderStateService.isTargetConfirmed(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeFalsy()

            const { mapLocation } =
                gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                    thiefDynamic.battleSquaddieId
                )
            expect(
                PlayerBattleActionBuilderStateService.getTarget(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                ).targetLocation
            ).toEqual(mapLocation)
        })

        it("should cancel decision if the user cancels the target", () => {
            const cancelTargetClick: OrchestratorComponentMouseEvent = {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
                mouseButton: MouseButton.ACCEPT,
            }

            targetComponent.mouseEventHappened(
                gameEngineState,
                cancelTargetClick
            )

            expect(targetComponent.hasCompleted(gameEngineState)).toBeFalsy()
            expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy()
        })
    })

    describe("user clicks on target with heal", () => {
        beforeEach(() => {
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: knightDynamic.battleSquaddieId,
                startingLocation: { q: 1, r: 1 },
                previewedActionTemplateId: bandageWoundsActionId,
            })

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mockResourceHandler,
                battleOrchestratorState:
                    BattleOrchestratorStateService.newOrchestratorState({
                        battleHUD: BattleHUDService.new({
                            battleSquaddieSelectedHUD:
                                new BattleSquaddieSelectedHUD(),
                        }),
                        battleState: BattleStateService.newBattleState({
                            campaignId: "test campaign",
                            missionId: "test mission",
                            missionMap: battleMap,
                            actionsThisRound,
                            recording: { history: [] },
                        }),
                    }),
                repository: squaddieRepo,
            })

            targetComponent.update(gameEngineState, mockedP5GraphicsContext)
            clickOnCitizen()
        })

        it("should show the confirm window", () => {
            expect(targetComponent.shouldDrawConfirmWindow()).toBeTruthy()
            expect(targetComponent.hasCompleted(gameEngineState)).toBeFalsy()
        })
    })

    describe("user confirms the target", () => {
        beforeEach(() => {
            targetComponent.update(gameEngineState, mockedP5GraphicsContext)
            clickOnThief()
            clickOnConfirmTarget()
        })

        it("should create ActionsThisRound", () => {
            const decidedActionSquaddieEffect =
                DecidedActionSquaddieEffectService.new({
                    template: longswordAction
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                    target: { q: 1, r: 2 },
                })
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: knightDynamic.battleSquaddieId,
                startingLocation: { q: 1, r: 1 },
                previewedActionTemplateId: undefined,
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            actionPointCost: 1,
                            battleSquaddieId: knightDynamic.battleSquaddieId,
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
            expect(targetComponent.hasCompleted(gameEngineState)).toBeTruthy()
        })

        it("should create a confirmed action in the action builder", () => {
            expect(
                PlayerBattleActionBuilderStateService.isTargetConsidered(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeTruthy()
            expect(
                PlayerBattleActionBuilderStateService.isTargetConfirmed(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeTruthy()
        })

        it("should change the gameEngineState to Player HUD Controller", () => {
            const recommendedInfo =
                targetComponent.recommendStateChanges(gameEngineState)
            expect(recommendedInfo.nextMode).toBe(
                BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
            )
        })

        it("should consume the squaddie action points", () => {
            const { actionPointsRemaining } = GetNumberOfActionPoints({
                squaddieTemplate: knightStatic,
                battleSquaddie: knightDynamic,
            })
            expect(actionPointsRemaining).toBe(2)
        })
    })

    describe("confirming an action mid turn", () => {
        beforeEach(() => {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                ActionsThisRoundService.new({
                    battleSquaddieId: knightDynamic.battleSquaddieId,
                    startingLocation: { q: 1, r: 1 },
                    previewedActionTemplateId: longswordActionId,
                    processedActions: [
                        ProcessedActionService.new({
                            decidedAction: DecidedActionService.new({
                                battleSquaddieId:
                                    knightDynamic.battleSquaddieId,
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

            expect(targetComponent.hasCompleted(gameEngineState)).toBeFalsy()
            targetComponent.update(gameEngineState, mockedP5GraphicsContext)
            clickOnThief()
            clickOnConfirmTarget()
            expect(targetComponent.hasCompleted(gameEngineState)).toBeTruthy()
        })

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
                knightDynamic.battleSquaddieId
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

        it("should spend the action resource cost after confirming but before showing results", () => {
            const { actionPointsRemaining } = GetNumberOfActionPoints({
                squaddieTemplate: knightStatic,
                battleSquaddie: knightDynamic,
            })
            expect(actionPointsRemaining).toBe(3 - longswordAction.actionPoints)
        })

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
                knightDynamic.battleSquaddieId
            )
            expect(results.targetedBattleSquaddieIds).toHaveLength(1)
            expect(results.targetedBattleSquaddieIds[0]).toBe(
                thiefDynamic.battleSquaddieId
            )
            expect(
                results.resultPerTarget[thiefDynamic.battleSquaddieId]
            ).toBeTruthy()
        })

        it("should store the calculated results", () => {
            const mostRecentEvent: BattleEvent =
                gameEngineState.battleOrchestratorState.battleState.recording
                    .history[0]
            const knightUsesLongswordOnThiefResults =
                mostRecentEvent.results.resultPerTarget[
                    thiefDynamic.battleSquaddieId
                ]
            expect(knightUsesLongswordOnThiefResults.damageTaken).toBe(
                longswordActionDamage
            )

            const { maxHitPoints, currentHitPoints } = GetHitPoints({
                squaddieTemplate: thiefStatic,
                battleSquaddie: thiefDynamic,
            })
            expect(currentHitPoints).toBe(maxHitPoints - longswordActionDamage)
        })
    })

    describe("invalid target based on affiliation", () => {
        const tests = [
            {
                name: "target foe tries to attack an ally",
                actionTraits: [Trait.ATTACK, Trait.TARGETS_FOE],
                invalidTargetClicker: clickOnCitizen,
            },
            {
                name: "heal ally tries to heal a foe",
                actionTraits: [Trait.HEALING, Trait.TARGETS_ALLIES],
                invalidTargetClicker: clickOnThief,
            },
        ]
        it.each(tests)(
            `$name do not show a confirm window`,
            ({ name, actionTraits, invalidTargetClicker }) => {
                const traits: { [key in Trait]?: boolean } = Object.fromEntries(
                    actionTraits.map((e) => [e, true])
                )

                const action = ActionTemplateService.new({
                    id: name,
                    name,
                    actionEffectTemplates: [
                        ActionEffectSquaddieTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                traits
                            ),
                            minimumRange: 0,
                            maximumRange: 9001,
                        }),
                    ],
                })

                const actionsThisRound = ActionsThisRoundService.new({
                    battleSquaddieId: knightDynamic.battleSquaddieId,
                    startingLocation: { q: 1, r: 1 },
                    processedActions: [
                        ProcessedActionService.new({
                            decidedAction: DecidedActionService.new({
                                battleSquaddieId:
                                    knightDynamic.battleSquaddieId,
                                actionPointCost: action.actionPoints,
                                actionTemplateName: name,
                                actionTemplateId: name,
                                actionEffects: [
                                    DecidedActionSquaddieEffectService.new({
                                        template: action
                                            .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                        target: { q: 0, r: 0 },
                                    }),
                                ],
                            }),
                        }),
                    ],
                })

                gameEngineState = GameEngineStateService.new({
                    resourceHandler: mockResourceHandler,
                    battleOrchestratorState:
                        BattleOrchestratorStateService.newOrchestratorState({
                            battleHUD: BattleHUDService.new({
                                battleSquaddieSelectedHUD:
                                    new BattleSquaddieSelectedHUD(),
                            }),
                            battleState: BattleStateService.newBattleState({
                                campaignId: "test campaign",
                                missionId: "test mission",
                                missionMap: battleMap,
                                actionsThisRound,
                            }),
                        }),
                    repository: squaddieRepo,
                })

                targetComponent.update(gameEngineState, mockedP5GraphicsContext)
                invalidTargetClicker()

                expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy()
                expect(
                    targetComponent.hasCompleted(gameEngineState)
                ).toBeFalsy()
            }
        )
    })
})
