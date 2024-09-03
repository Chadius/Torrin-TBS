import { BattlePlayerSquaddieSelector } from "./battlePlayerSquaddieSelector"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattlePhase } from "./battlePhaseTracker"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddie } from "../battleSquaddie"
import { OrchestratorComponentMouseEventType } from "../orchestrator/battleOrchestratorComponent"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { MissionMap } from "../../missionMap/missionMap"
import { BattleCamera } from "../battleCamera"
import {
    ConvertCoordinateService,
    convertMapCoordinatesToScreenCoordinates,
} from "../../hexMap/convertCoordinates"
import { makeResult } from "../../utils/ResultOrError"
import { TargetingShape } from "../targeting/targetingShapeGenerator"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { CampaignService } from "../../campaign/campaign"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { DecidedActionService } from "../../action/decided/decidedAction"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { BattlePhaseState } from "./battlePhaseController"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { BattleHUDListener, BattleHUDService } from "../hud/battleHUD"
import { MouseButton, MouseClickService } from "../../utils/mouseConfig"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { RectAreaService } from "../../ui/rectArea"
import {
    PlayerCommandSelection,
    PlayerCommandStateService,
} from "../hud/playerCommandHUD"
import { BattleActionService } from "../history/battleAction"
import { SquaddieSummaryPopoverPosition } from "../hud/playerActionPanel/squaddieSummaryPopover"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    PlayerIntent,
    PlayerSelectionContextCalculationArgs,
    PlayerSelectionContextCalculationArgsService,
    PlayerSelectionService,
} from "../playerSelectionService/playerSelectionService"
import {
    PlayerSelectionContext,
    PlayerSelectionContextService,
} from "../playerSelectionService/playerSelectionContext"
import {
    PlayerSelectionChanges,
    PlayerSelectionChangesService,
} from "../playerSelectionService/playerSelectionChanges"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"

describe("BattleSquaddieSelector", () => {
    let selector: BattlePlayerSquaddieSelector =
        new BattlePlayerSquaddieSelector()
    let objectRepository: ObjectRepository = ObjectRepositoryService.new()
    let missionMap: MissionMap
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let teams: BattleSquaddieTeam[]
    let playerSoldierBattleSquaddie: BattleSquaddie
    let messageSpy: jest.SpyInstance
    let calculateContextSpy: jest.SpyInstance
    let applyContextSpy: jest.SpyInstance

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        selector = new BattlePlayerSquaddieSelector()
        objectRepository = ObjectRepositoryService.new()
        missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 "],
            }),
        })
        teams = []
        calculateContextSpy = jest.spyOn(
            PlayerSelectionService,
            "calculateContext"
        )
        applyContextSpy = jest.spyOn(
            PlayerSelectionService,
            "applyContextToGetChanges"
        )
    })
    afterEach(() => {
        messageSpy.mockRestore()
        calculateContextSpy.mockRestore()
        applyContextSpy.mockRestore()
    })

    const expectContextSpiesWereCalled = ({
        expectedPlayerSelectionContextCalculationArgs,
        expectedPlayerSelectionContext,
        expectedPlayerSelectionChanges,
    }: {
        expectedPlayerSelectionContextCalculationArgs?: PlayerSelectionContextCalculationArgs
        expectedPlayerSelectionContext?: PlayerSelectionContext
        expectedPlayerSelectionChanges?: PlayerSelectionChanges
    }) => {
        if (expectedPlayerSelectionContextCalculationArgs) {
            expect(calculateContextSpy).toHaveBeenCalledWith(
                expectedPlayerSelectionContextCalculationArgs
            )
        } else {
            expect(calculateContextSpy).toHaveBeenCalled()
        }

        if (expectedPlayerSelectionContext) {
            expect(calculateContextSpy.mock.results.slice(-1)[0].value).toEqual(
                expectedPlayerSelectionContext
            )
            expect(applyContextSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    context: expectedPlayerSelectionContext,
                })
            )
        }

        if (expectedPlayerSelectionChanges) {
            expect(applyContextSpy.mock.results.slice(-1)[0].value).toEqual(
                expectedPlayerSelectionChanges
            )
        } else {
            expect(applyContextSpy).toHaveBeenCalled()
        }
    }

    const makeBattlePhaseTrackerWithPlayerTeam = (
        missionMap: MissionMap
    ): BattlePhaseState => {
        const playerTeam: BattleSquaddieTeam = {
            id: "playerTeamId",
            name: "player controlled team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
            iconResourceKey: "icon_player_team",
        }
        teams.push(playerTeam)
        ;({ battleSquaddie: playerSoldierBattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Player Soldier",
                templateId: "player_soldier",
                battleId: "battleSquaddieId",
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository: objectRepository,
                actionTemplateIds: [],
            }))
        BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
            "battleSquaddieId",
        ])

        missionMap.addSquaddie("player_soldier", "battleSquaddieId", {
            q: 0,
            r: 0,
        })

        return {
            currentAffiliation: BattlePhase.PLAYER,
            turnCount: 1,
        }
    }

    const createGameEngineState = ({
        battlePhaseState,
        missionMap,
    }: {
        battlePhaseState: BattlePhaseState
        missionMap: MissionMap
    }): GameEngineState => {
        return GameEngineStateService.new({
            resourceHandler: mocks.mockResourceHandler(mockedP5GraphicsContext),
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap,
                    camera: new BattleCamera(),
                    battlePhaseState,
                    teams,
                    recording: { history: [] },
                }),
            }),
            repository: objectRepository,
            campaign: CampaignService.default({}),
        })
    }

    describe("player hovers over a squaddie", () => {
        let gameEngineState: GameEngineState
        let battleSquaddieScreenPositionX: number
        let battleSquaddieScreenPositionY: number

        beforeEach(() => {
            const missionMap: MissionMap = new MissionMap({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 "],
                }),
            })
            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)

            gameEngineState = createGameEngineState({
                battlePhaseState,
                missionMap,
            })
            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
            ;[battleSquaddieScreenPositionX, battleSquaddieScreenPositionY] =
                convertMapCoordinatesToScreenCoordinates(
                    0,
                    0,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
                )

            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.MOVED,
                mouseX: battleSquaddieScreenPositionX,
                mouseY: battleSquaddieScreenPositionY,
            })
        })

        it("will use the player selection service to make the needed changes", () => {
            expectContextSpiesWereCalled({
                expectedPlayerSelectionContextCalculationArgs:
                    PlayerSelectionContextCalculationArgsService.new({
                        gameEngineState,
                        mouseMovement: {
                            x: battleSquaddieScreenPositionX,
                            y: battleSquaddieScreenPositionY,
                        },
                    }),
                expectedPlayerSelectionContext:
                    PlayerSelectionContextService.new({
                        playerIntent: PlayerIntent.PEEK_AT_SQUADDIE,
                        mouseMovement: {
                            x: battleSquaddieScreenPositionX,
                            y: battleSquaddieScreenPositionY,
                        },
                        battleSquaddieId: "battleSquaddieId",
                    }),
            })
        })

        it("will generate a message to indicate player hovered over the squaddie", () => {
            expect(messageSpy).toBeCalledWith({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: "battleSquaddieId",
                selectionMethod: {
                    mouseMovement: {
                        x: battleSquaddieScreenPositionX,
                        y: battleSquaddieScreenPositionY,
                    },
                },
                squaddieSummaryPopoverPosition:
                    SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
        })
    })

    describe("can make a movement action by clicking on the field", () => {
        let gameEngineState: GameEngineState
        let x: number
        let y: number
        beforeEach(() => {
            const missionMap: MissionMap = new MissionMap({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 "],
                }),
            })

            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)

            gameEngineState = createGameEngineState({
                battlePhaseState,
                missionMap,
            })
            gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
                BattleActionDecisionStepService.new()

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")

            BattleHUDService.playerSelectsSquaddie(
                gameEngineState.battleOrchestratorState.battleHUD,
                {
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: "battleSquaddieId",
                    selectionMethod: {
                        mouseClick: MouseClickService.new({
                            x: 0,
                            y: 0,
                            button: MouseButton.ACCEPT,
                        }),
                    },
                }
            )
            expect(
                BattleActionDecisionStepService.isActorSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeTruthy()
        })

        describe("user clicks on destination to start movement", () => {
            beforeEach(() => {
                ;({ x, y } =
                    ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                        {
                            q: 0,
                            r: 1,
                            camera: gameEngineState.battleOrchestratorState
                                .battleState.camera,
                        }
                    ))

                clickOnMapCoordinate({
                    selector,
                    gameEngineState: gameEngineState,
                    q: 0,
                    r: 1,
                    camera: new BattleCamera(),
                })
            })

            it("will use the player selection service to make the needed changes", () => {
                expectContextSpiesWereCalled({
                    expectedPlayerSelectionContextCalculationArgs:
                        PlayerSelectionContextCalculationArgsService.new({
                            gameEngineState,
                            mouseClick: {
                                x: x,
                                y: y,
                                button: MouseButton.ACCEPT,
                            },
                        }),
                    expectedPlayerSelectionContext:
                        PlayerSelectionContextService.new({
                            playerIntent:
                                PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_LOCATION,
                            mouseClick: {
                                x: x,
                                y: y,
                                button: MouseButton.ACCEPT,
                            },
                            battleSquaddieId: "battleSquaddieId",
                        }),
                    expectedPlayerSelectionChanges:
                        PlayerSelectionChangesService.new({
                            messageSent: {
                                type: MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION,
                                battleSquaddieId: "battleSquaddieId",
                                targetLocation: { q: 0, r: 1 },
                                gameEngineState,
                            },
                        }),
                })
            })

            it("will generate a message to indicate player wants to move the squaddie", () => {
                expect(messageSpy).toBeCalledWith({
                    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION,
                    targetLocation: { q: 0, r: 1 },
                    gameEngineState,
                    battleSquaddieId: "battleSquaddieId",
                })
            })
        })

        it("Does not make a movement action if you click on the player command HUD", () => {
            const playerCommandSpy = jest
                .spyOn(PlayerCommandStateService, "mouseClicked")
                .mockReturnValue(
                    PlayerCommandSelection.PLAYER_COMMAND_SELECTION_MOVE
                )

            clickOnMapCoordinate({
                selector,
                gameEngineState: gameEngineState,
                q: 0,
                r: 1,
                camera: new BattleCamera(),
            })

            expect(playerCommandSpy).toBeCalled()
            expect(
                BattleActionDecisionStepService.isActionRecordReadyToAnimate(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeFalsy()

            playerCommandSpy.mockRestore()
        })
    })

    // TODO
    describe("player ends the squaddie turn", () => {
        let gameEngineState: GameEngineState
        let messageSpy: jest.SpyInstance

        beforeEach(() => {
            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)

            const camera: BattleCamera = new BattleCamera()

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mocks.mockResourceHandler(
                    mockedP5GraphicsContext
                ),
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap,
                        camera,
                        battlePhaseState,
                        teams,
                        recording: { history: [] },
                    }),
                }),
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })

            BattleHUDService.playerSelectsSquaddie(
                gameEngineState.battleOrchestratorState.battleHUD,
                {
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: "battleSquaddieId",
                    selectionMethod: {
                        mouseClick: MouseClickService.new({
                            x: 0,
                            y: 0,
                            button: MouseButton.ACCEPT,
                        }),
                    },
                }
            )

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")

            selector.mouseClicked({
                mouseX: RectAreaService.centerX(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.playerCommandState.endTurnButton
                        .buttonArea
                ),
                mouseY: RectAreaService.centerY(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.playerCommandState.endTurnButton
                        .buttonArea
                ),
                mouseButton: MouseButton.ACCEPT,
                gameEngineState,
            })
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("sends a message to end the turn", () => {
            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.PLAYER_ENDS_TURN,
                gameEngineState,
                battleAction: BattleActionService.new({
                    action: {
                        isEndTurn: true,
                    },
                    actor: {
                        battleSquaddieId: "battleSquaddieId",
                    },
                    effect: {
                        endTurn: true,
                    },
                }),
            })
        })
    })

    // TODO
    describe("an action is selected that requires a target", () => {
        let gameEngineState: GameEngineState
        let longswordAction: ActionTemplate
        let messageSpy: jest.SpyInstance

        // TODO change setup so the actor and action are set, don't bother clicking
        beforeEach(() => {
            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)

            const camera: BattleCamera = new BattleCamera()

            longswordAction = ActionTemplateService.new({
                name: "longsword",
                id: "longsword",
                actionEffectTemplates: [
                    ActionEffectSquaddieTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues(),
                        minimumRange: 0,
                        maximumRange: 1,
                        targetingShape: TargetingShape.SNAKE,
                    }),
                ],
            })

            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Player Soldier with a Longsword Action",
                templateId: "player_soldier_longsword",
                battleId: "player_soldier_1",
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository: objectRepository,
                actionTemplateIds: [longswordAction.id],
            })

            missionMap.addSquaddie("player_soldier", "player_soldier_1", {
                q: 0,
                r: 1,
            })

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mocks.mockResourceHandler(
                    mockedP5GraphicsContext
                ),
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap,
                        camera,
                        battlePhaseState,
                        teams,
                        recording: { history: [] },
                    }),
                }),
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })
            ObjectRepositoryService.addActionTemplate(
                gameEngineState.repository,
                longswordAction
            )
            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")

            BattleSquaddieTeamService.addBattleSquaddieIds(
                gameEngineState.battleOrchestratorState.battleState.teams[0],
                ["player_soldier_1"]
            )
            clickOnMapCoordinate({
                selector,
                gameEngineState: gameEngineState,
                q: 0,
                r: 1,
                camera,
            })

            clickOnMapCoordinate({
                selector,
                gameEngineState: gameEngineState,
                q: 0,
                r: 1,
                camera,
            })
            const longswordButton =
                gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
                    (button) => button.actionTemplateId === longswordAction.id
                )
            selector.mouseClicked({
                mouseX: RectAreaService.centerX(longswordButton.buttonArea),
                mouseY: RectAreaService.centerY(longswordButton.buttonArea),
                mouseButton: MouseButton.ACCEPT,
                gameEngineState,
            })
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        // TODO change test so it tries to calculate intent
        it("will complete the selector", () => {
            expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
        })
    })

    // DONE Move to BattleHUD
    describe("squaddie must complete their turn before moving other squaddies", () => {
        let missionMap: MissionMap
        let interruptSquaddieStatic: SquaddieTemplate
        let interruptBattleSquaddie: BattleSquaddie
        let actionsThisRound: ActionsThisRound
        let camera: BattleCamera
        let gameEngineState: GameEngineState
        let startingMouseX: number
        let startingMouseY: number
        let messageSpy: jest.SpyInstance

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 1 "],
                }),
            })
            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)
            ;({
                squaddieTemplate: interruptSquaddieStatic,
                battleSquaddie: interruptBattleSquaddie,
            } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "interrupting squaddie",
                templateId: "interrupting squaddie",
                battleId: "interrupting squaddie",
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository: objectRepository,
                actionTemplateIds: [],
            }))

            missionMap.addSquaddie(
                interruptSquaddieStatic.squaddieId.templateId,
                interruptBattleSquaddie.battleSquaddieId,
                { q: 0, r: 1 }
            )

            const soldierSquaddieInfo =
                missionMap.getSquaddieByBattleId("battleSquaddieId")

            const decidedActionMovementEffect =
                DecidedActionMovementEffectService.new({
                    template: ActionEffectMovementTemplateService.new({}),
                    destination: { q: 0, r: 2 },
                })
            actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: soldierSquaddieInfo.battleSquaddieId,
                startingLocation: soldierSquaddieInfo.mapLocation,
                previewedActionTemplateId: undefined,
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            actionPointCost: 1,
                            battleSquaddieId:
                                soldierSquaddieInfo.battleSquaddieId,
                            actionTemplateName: "Move",
                            actionEffects: [decidedActionMovementEffect],
                        }),
                        processedActionEffects: [
                            ProcessedActionMovementEffectService.new({
                                decidedActionEffect:
                                    decidedActionMovementEffect,
                            }),
                        ],
                    }),
                ],
            })

            let mockResourceHandler = mocks.mockResourceHandler(
                mockedP5GraphicsContext
            )
            mockResourceHandler.getResource = jest
                .fn()
                .mockReturnValue(makeResult(null))

            camera = new BattleCamera()

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mockResourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap,
                        camera,
                        battlePhaseState,
                        teams,
                        recording: { history: [] },
                        actionsThisRound,
                    }),
                }),
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })
            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            BattleHUDService.playerSelectsSquaddie(
                gameEngineState.battleOrchestratorState.battleHUD,
                {
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: "battleSquaddieId",
                    selectionMethod: {
                        mouseClick: MouseClickService.new({
                            x: 0,
                            y: 0,
                            button: MouseButton.ACCEPT,
                        }),
                    },
                }
            )

            const interruptSquaddieOnMap = missionMap.getSquaddieByBattleId(
                "interrupting squaddie"
            )
            ;[startingMouseX, startingMouseY] =
                convertMapCoordinatesToScreenCoordinates(
                    interruptSquaddieOnMap.mapLocation.q,
                    interruptSquaddieOnMap.mapLocation.r,
                    ...camera.getCoordinates()
                )
            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: startingMouseX,
                mouseY: startingMouseY,
                mouseButton: MouseButton.ACCEPT,
            })

            expect(messageSpy).toBeCalledWith({
                gameEngineState,
                type: MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN,
            })
        })

        it("ignores movement commands issued to other squaddies", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.battleSquaddieId
            ).toEqual(actionsThisRound.battleSquaddieId)

            const location =
                gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                    interruptBattleSquaddie.battleSquaddieId
                )
            clickOnMapCoordinate({
                selector,
                gameEngineState: gameEngineState,
                q: location.mapLocation.q,
                r: location.mapLocation.r,
                camera,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            ).toEqual(actionsThisRound)
            expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
        })

        it("ignores action commands issued to other squaddies", () => {
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    gameEngineState
                )
            ).toBeTruthy()

            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: 0,
                mouseY: 0,
                mouseButton: MouseButton.ACCEPT,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.battleSquaddieId
            ).toEqual(actionsThisRound.battleSquaddieId)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.previewedActionTemplateId
            ).toBeUndefined()
            expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
        })

        it("sends a message indicating which squaddie is still acting", () => {
            const location =
                gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                    interruptBattleSquaddie.battleSquaddieId
                )
            clickOnMapCoordinate({
                selector,
                gameEngineState: gameEngineState,
                q: location.mapLocation.q,
                r: location.mapLocation.r,
                camera,
            })

            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN,
                gameEngineState,
            })
        })
    })

    // TODO - KEEP but modify the expectations so it expects a message to be sent
    it("will accept commands even after canceling", () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 "],
            }),
        })
        const battlePhaseState: BattlePhaseState =
            makeBattlePhaseTrackerWithPlayerTeam(missionMap)
        const decidedActionMovementEffect =
            DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
                destination: { q: 0, r: 1 },
            })
        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
            startingLocation: { q: 0, r: 0 },
            previewedActionTemplateId: undefined,
            processedActions: [
                ProcessedActionService.new({
                    decidedAction: DecidedActionService.new({
                        actionPointCost: 1,
                        battleSquaddieId:
                            playerSoldierBattleSquaddie.battleSquaddieId,
                        actionTemplateName: "Move",
                        actionEffects: [decidedActionMovementEffect],
                    }),
                    processedActionEffects: [
                        ProcessedActionMovementEffectService.new({
                            decidedActionEffect: decidedActionMovementEffect,
                        }),
                    ],
                }),
            ],
        })

        const camera: BattleCamera = new BattleCamera()

        const gameEngineState: GameEngineState = GameEngineStateService.new({
            resourceHandler: mocks.mockResourceHandler(mockedP5GraphicsContext),
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                    actionsThisRound,
                    recording: { history: [] },
                }),
            }),
            repository: objectRepository,
            campaign: CampaignService.default({}),
        })

        BattleHUDService.playerSelectsSquaddie(
            gameEngineState.battleOrchestratorState.battleHUD,
            {
                type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: "battleSquaddieId",
                selectionMethod: {
                    mouseClick: MouseClickService.new({
                        x: 0,
                        y: 0,
                        button: MouseButton.ACCEPT,
                    }),
                },
            }
        )

        clickOnMapCoordinate({
            selector,
            gameEngineState: gameEngineState,
            q: 0,
            r: 1,
            camera,
        })

        expect(
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .processedActions
        ).toHaveLength(2)
        expect(
            ActionsThisRoundService.getProcessedActionEffectToShow(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            ).type
        ).toEqual(ActionEffectType.MOVEMENT)
    })

    // TODO - Add new test
    describe("Next Squaddie button", () => {
        // TODO Make a new test saying when the button is pressed it sends a message to BattleHUD
        it("TODO", () => {})
    })

    // TODO ---- NEW TESTS

    // TODO need to check to see if it clicks on the HUD, do NOT calculate player intent
    // TODO need to check to see if it clicks on the ActionSelector, do NOT calculate player intent

    // "knows the component has completed when an action is ready to animate"
    // "knows the component has completed when an action requires a target"
    // "knows the component has completed when applied context has a recommended mode"
    // TODO make test that says the turn is complete if the action is ready to animate
    // it("marks this component as complete", () => {
    //     selector.update(gameEngineState, mockedP5GraphicsContext)
    //     expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
    // })

    // TODO When the user gives input on the map, generate the PlayerSelectionContext, calculate the PlayerIntent, and apply it (don't read the results it may be delivered asynchronously)
    // TODO Know when the turn has ended because something else just set the action
    // TODO Use the change's recommended action when given (where is this stored?)
})

const clickOnMapCoordinate = ({
    selector,
    gameEngineState,
    q,
    r,
    camera,
}: {
    selector: BattlePlayerSquaddieSelector
    gameEngineState: GameEngineState
    q: number
    r: number
    camera: BattleCamera
}) => {
    let [destinationScreenX, destinationScreenY] =
        convertMapCoordinatesToScreenCoordinates(
            q,
            r,
            ...camera.getCoordinates()
        )
    selector.mouseEventHappened(gameEngineState, {
        eventType: OrchestratorComponentMouseEventType.MOVED,
        mouseX: destinationScreenX,
        mouseY: destinationScreenY,
    })

    selector.mouseEventHappened(gameEngineState, {
        eventType: OrchestratorComponentMouseEventType.CLICKED,
        mouseX: destinationScreenX,
        mouseY: destinationScreenY,
        mouseButton: MouseButton.ACCEPT,
    })
}
