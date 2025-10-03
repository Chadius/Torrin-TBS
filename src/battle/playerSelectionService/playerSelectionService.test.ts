import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
    VersusSquaddieResistance,
} from "../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { Damage, Healing } from "../../squaddie/squaddieService"
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { BattleSquaddie } from "../battleSquaddie"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { CampaignService } from "../../campaign/campaign"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battleState/battleState"
import { MouseButton, MouseConfigService } from "../../utils/mouseConfig"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import {
    PlayerIntent,
    TPlayerIntent,
    PlayerSelectionService,
} from "./playerSelectionService"
import { SquaddieTurnService } from "../../squaddie/turn"
import { BattleSquaddieTeamService } from "../battleSquaddieTeam"
import { BattlePhaseStateService } from "../orchestratorComponents/battlePhaseController"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { PlayerSelectionChanges } from "./playerSelectionChanges"
import {
    PlayerSelectionContext,
    PlayerSelectionContextService,
} from "./playerSelectionContext"
import {
    MessageBoardMessage,
    MessageBoardMessagePlayerSelectsAndLocksSquaddie,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import { BattleActionService } from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { TargetConstraintsService } from "../../action/targetConstraints"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { PlayerInputAction } from "../../ui/playerInput/playerInputState"
import { SquaddieSelectorPanelService } from "../hud/playerActionPanel/squaddieSelectorPanel/squaddieSelectorPanel"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { SquaddieSelectorPanelButtonService } from "../hud/playerActionPanel/squaddieSelectorPanel/squaddieSelectorPanelButton/squaddieSelectorPanelButton"
import { RectAreaService } from "../../ui/rectArea"
import { PlayerConsideredActionsService } from "../battleState/playerConsideredActions"
import { CampaignResourcesService } from "../../campaign/campaignResources"
import { SearchResultsCacheService } from "../../hexMap/pathfinder/searchResults/searchResultsCache"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngineState/gameEngineState"

describe("Player Selection Service", () => {
    let gameEngineState: GameEngineState
    let objectRepository: ObjectRepository
    let missionMap: MissionMap
    let messageSpy: MockInstance

    describe("At the start of the turn, Player tries to select a squaddie but all playable squaddies have acted", () => {
        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            missionMap = createMap()
            const { battleSquaddie: playerBattleSquaddie } = createSquaddie({
                objectRepository,
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
            })
            const playerTeam = BattleSquaddieTeamService.new({
                id: "player_team",
                name: "player_team",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
            })
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                squaddieTemplateId: playerBattleSquaddie.squaddieTemplateId,
                originMapCoordinate: {
                    q: 0,
                    r: 0,
                },
            })
            SquaddieTurnService.endTurn(playerBattleSquaddie.squaddieTurn)

            gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.new({
                        missionMap,
                        missionId: "missionId",
                        campaignId: "campaignId",
                        teams: [playerTeam],
                        battlePhaseState: BattlePhaseStateService.new({
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        }),
                    }),
                }),
                repository: objectRepository,
                campaign: CampaignService.default(),
            })
        })

        it("knows the user wants to end the phase", () => {
            const actualContext: PlayerSelectionContext = clickOnMapCoordinate({
                mapCoordinate: {
                    q: 0,
                    r: 0,
                },
                gameEngineState,
            })

            expect(actualContext.playerIntent).toEqual(PlayerIntent.END_PHASE)
        })

        it("will suggest BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR next", () => {
            const actualContext: PlayerSelectionContext = clickOnMapCoordinate({
                mapCoordinate: {
                    q: 0,
                    r: 0,
                },
                gameEngineState,
            })

            const changes: PlayerSelectionChanges =
                PlayerSelectionService.applyContextToGetChanges({
                    gameEngineState,
                    context: actualContext,
                })

            expect(changes.battleOrchestratorMode).toBe(
                BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR
            )
        })
    })

    const createGameEngineWith1PlayerAnd1EnemyAndSpyMessages = (
        movementCost?: string[]
    ) => {
        objectRepository = ObjectRepositoryService.new()
        missionMap = createMap(movementCost)
        gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
            objectRepository,
            missionMap,
        })
        gameEngineState.battleOrchestratorState.cache.searchResultsCache =
            SearchResultsCacheService.new()

        messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
    }
    describe("At the start of the turn, Player tries to select a squaddie when there are controllable squaddies around", () => {
        beforeEach(() => {
            createGameEngineWith1PlayerAnd1EnemyAndSpyMessages()
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })

        describe("squaddie is normally not controllable", () => {
            let actualContext: PlayerSelectionContext
            beforeEach(() => {
                actualContext = clickOnMapCoordinate({
                    mapCoordinate: {
                        q: 0,
                        r: 1,
                    },
                    gameEngineState,
                })
            })

            it("if squaddie is normally not controllable, sends a message about uncontrollable squaddies", () => {
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE
                )
            })

            it("knows which squaddie was clicked on", () => {
                expect(actualContext.actorBattleSquaddieId).toEqual("ENEMY")
            })

            it("knows where the player clicked", () => {
                const { x, y } =
                    ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                        {
                            mapCoordinate: {
                                q: 0,
                                r: 1,
                            },
                            cameraLocation:
                                gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
                        }
                    )

                expect(actualContext.mouseClick).toEqual(
                    MouseConfigService.newMouseClick({
                        x,
                        y,
                        button: MouseButton.ACCEPT,
                    })
                )
            })

            describe("When the context is applied", () => {
                let expectedMessage: MessageBoardMessagePlayerSelectsAndLocksSquaddie
                let actualChanges: PlayerSelectionChanges

                beforeEach(() => {
                    actualChanges =
                        PlayerSelectionService.applyContextToGetChanges({
                            context: actualContext,
                            gameEngineState,
                        })

                    expectedMessage = {
                        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                        gameEngineState,
                        battleSquaddieSelectedId: "ENEMY",
                    }
                })

                it("will mention a message was sent", () => {
                    expect(actualChanges.messageSent).toEqual(expectedMessage)
                })

                it("will send a message", () => {
                    expect(messageSpy).toBeCalled()
                    expect(messageSpy).toBeCalledWith(
                        expect.objectContaining(expectedMessage)
                    )
                })
            })
        })

        describe("squaddie is normally controllable", () => {
            let actualContext: PlayerSelectionContext
            beforeEach(() => {
                actualContext = clickOnMapCoordinate({
                    mapCoordinate: {
                        q: 0,
                        r: 0,
                    },
                    gameEngineState,
                })
            })

            it("knows the player wants to select the playable squaddie", () => {
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE
                )
            })

            it("knows which squaddie was clicked on", () => {
                expect(actualContext.actorBattleSquaddieId).toEqual("PLAYER")
            })

            it("knows where the player clicked", () => {
                const { x, y } =
                    ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                        {
                            mapCoordinate: {
                                q: 0,
                                r: 0,
                            },
                            cameraLocation:
                                gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
                        }
                    )

                expect(actualContext.mouseClick).toEqual(
                    MouseConfigService.newMouseClick({
                        x,
                        y,
                        button: MouseButton.ACCEPT,
                    })
                )
            })

            describe("When the context is applied", () => {
                let expectedMessage: MessageBoardMessagePlayerSelectsAndLocksSquaddie
                let actualChanges: PlayerSelectionChanges

                beforeEach(() => {
                    actualChanges =
                        PlayerSelectionService.applyContextToGetChanges({
                            context: actualContext,
                            gameEngineState,
                        })

                    expectedMessage = {
                        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                        gameEngineState,
                        battleSquaddieSelectedId: "PLAYER",
                    }
                })

                it("will mention a message was sent", () => {
                    expect(actualChanges.messageSent).toEqual(expectedMessage)
                })

                it("will send a message", () => {
                    expect(messageSpy).toBeCalled()
                    expect(messageSpy).toBeCalledWith(
                        expect.objectContaining(expectedMessage)
                    )
                })
            })

            describe("When the player selects a different squaddie before making any actions", () => {
                let battleSquaddie2: BattleSquaddie
                beforeEach(() => {
                    ;({ battleSquaddie: battleSquaddie2 } = createSquaddie({
                        objectRepository: gameEngineState.repository!,
                        squaddieAffiliation: SquaddieAffiliation.PLAYER,
                    }))
                    MissionMapService.addSquaddie({
                        battleSquaddieId: battleSquaddie2.battleSquaddieId,
                        squaddieTemplateId: battleSquaddie2.squaddieTemplateId,
                        missionMap:
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap,
                        originMapCoordinate: { q: 0, r: 2 },
                    })

                    BattleActionDecisionStepService.setActor({
                        actionDecisionStep:
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionDecisionStep,
                        battleSquaddieId: "PLAYER",
                    })
                    gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                        SummaryHUDStateService.new()
                    actualContext = clickOnMapCoordinate({
                        mapCoordinate: {
                            q: 0,
                            r: 2,
                        },
                        gameEngineState,
                    })
                })

                it("knows the player intends to select a different squaddie", () => {
                    expect(actualContext.playerIntent).toEqual(
                        PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE
                    )

                    expect(actualContext.actorBattleSquaddieId).toEqual(
                        battleSquaddie2.battleSquaddieId
                    )
                })
            })
        })

        describe("click directly on the squaddie selector", () => {
            let mockedP5GraphicsContext: GraphicsBuffer
            let playerBattleSquaddie2: BattleSquaddie
            let actualContext: PlayerSelectionContext

            beforeEach(() => {
                mockedP5GraphicsContext = new MockedP5GraphicsBuffer()

                createGameEngineWith1PlayerAnd1EnemyAndSpyMessages()
                ;({ battleSquaddie: playerBattleSquaddie2 } = createSquaddie({
                    objectRepository,
                    squaddieAffiliation: SquaddieAffiliation.PLAYER,
                }))

                MissionMapService.addSquaddie({
                    missionMap,
                    battleSquaddieId: playerBattleSquaddie2.battleSquaddieId,
                    squaddieTemplateId:
                        playerBattleSquaddie2.squaddieTemplateId,
                    originMapCoordinate: {
                        q: 0,
                        r: 3,
                    },
                })

                const playerTeam =
                    gameEngineState.battleOrchestratorState.battleState.teams.find(
                        (team) => team.id == "player_team"
                    )
                BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam!, [
                    playerBattleSquaddie2.battleSquaddieId,
                ])

                gameEngineState.battleOrchestratorState.battleHUDState.squaddieSelectorPanel =
                    SquaddieSelectorPanelService.new({
                        objectRepository: gameEngineState.repository!,
                        battleSquaddieIds: [...playerTeam!.battleSquaddieIds],
                    })
                SquaddieSelectorPanelService.draw({
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler!,
                    objectRepository: gameEngineState.repository!,
                    squaddieSelectorPanel:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .squaddieSelectorPanel,
                })
            })

            const clickOnSquaddieSelectorAndCalculateContext = (
                battleSquaddieId: string
            ) => {
                const battleSquaddieButton =
                    gameEngineState.battleOrchestratorState.battleHUDState.squaddieSelectorPanel!.buttons.find(
                        (button) =>
                            SquaddieSelectorPanelButtonService.getBattleSquaddieId(
                                button
                            ) === battleSquaddieId
                    )

                actualContext = PlayerSelectionService.calculateContext({
                    playerInputActions: [],
                    gameEngineState,
                    mouseClick: {
                        button: MouseButton.ACCEPT,
                        x: RectAreaService.centerX(
                            SquaddieSelectorPanelButtonService.getDrawingArea(
                                battleSquaddieButton!
                            )!
                        ),
                        y: RectAreaService.centerY(
                            SquaddieSelectorPanelButtonService.getDrawingArea(
                                battleSquaddieButton!
                            )!
                        ),
                    },
                })
            }
            it("clicking on the squaddie selector button will indicate the player wants to choose that squaddie", () => {
                gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                    BattleActionDecisionStepService.new()
                BattleActionDecisionStepService.setActor({
                    actionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    battleSquaddieId: "player",
                })
                clickOnSquaddieSelectorAndCalculateContext(
                    playerBattleSquaddie2.battleSquaddieId
                )
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE
                )
            })
            it("clicking on the squaddie selector mid turn will have no effect", () => {
                gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                    BattleActionDecisionStepService.new()
                BattleActionDecisionStepService.setActor({
                    actionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    battleSquaddieId: playerBattleSquaddie2.battleSquaddieId,
                })
                BattleActionDecisionStepService.addAction({
                    actionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    movement: true,
                })
                BattleActionRecorderService.addReadyToAnimateBattleAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                    BattleActionService.new({
                        actor: {
                            actorBattleSquaddieId:
                                playerBattleSquaddie2.battleSquaddieId,
                        },
                        action: { isMovement: true },
                        effect: {
                            movement: {
                                startCoordinate: { q: 0, r: 0 },
                                endCoordinate: { q: 0, r: 0 },
                            },
                        },
                    })
                )

                clickOnSquaddieSelectorAndCalculateContext(
                    playerBattleSquaddie2.battleSquaddieId
                )
                expect(actualContext.playerIntent).not.toEqual(
                    PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE
                )
            })
            it("applying the context will send a message to select the squaddie", () => {
                clickOnSquaddieSelectorAndCalculateContext(
                    playerBattleSquaddie2.battleSquaddieId
                )
                PlayerSelectionService.applyContextToGetChanges({
                    gameEngineState,
                    context: actualContext,
                })

                expect(messageSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                        battleSquaddieSelectedId:
                            playerBattleSquaddie2.battleSquaddieId,
                    })
                )
            })
        })
    })

    describe("At the start of the turn, Player peeks on a squaddie", () => {
        beforeEach(() => {
            createGameEngineWith1PlayerAnd1EnemyAndSpyMessages()
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("indicates the player wants to peek at a squaddie", () => {
            const actualContext: PlayerSelectionContext =
                hoverOverMapCoordinate({
                    mapCoordinate: { q: 0, r: 0 },
                    gameEngineState,
                })
            expect(actualContext.playerIntent).toEqual(
                PlayerIntent.PEEK_AT_SQUADDIE
            )
            const { x, y } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: { q: 0, r: 0 },
                    cameraLocation:
                        gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
                })

            expect(actualContext.mouseMovement).toEqual({
                x,
                y,
            })
            expect(actualContext.actorBattleSquaddieId).toEqual("PLAYER")
        })

        it("sends a message after applying the context", () => {
            const actualContext: PlayerSelectionContext =
                hoverOverMapCoordinate({
                    mapCoordinate: { q: 0, r: 0 },
                    gameEngineState,
                })
            const actualChanges =
                PlayerSelectionService.applyContextToGetChanges({
                    context: actualContext,
                    gameEngineState,
                })

            const { x, y } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: {
                        q: 0,
                        r: 0,
                    },
                    cameraLocation:
                        gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
                })

            const expectedMessage = {
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                battleSquaddieSelectedId: "PLAYER",
                selectionMethod: {
                    mouse: {
                        x,
                        y,
                    },
                },
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                objectRepository: gameEngineState.repository!,
                campaignResources: CampaignResourcesService.default(),
                squaddieAllMovementCache:
                    gameEngineState.battleOrchestratorState.cache
                        .searchResultsCache,
            }
            expect(messageSpy).toBeCalledWith(expectedMessage)
            expect(actualChanges.messageSent).toEqual(expectedMessage)
        })
    })

    describe("Player presses the NEXT SQUADDIE BUTTON", () => {
        let actualContext: PlayerSelectionContext
        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            missionMap = createMap()
            const { battleSquaddie: playerBattleSquaddie } = createSquaddie({
                objectRepository,
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
            })
            const { battleSquaddie: playerBattleSquaddie2 } = createSquaddie({
                objectRepository,
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
            })
            const playerTeam = BattleSquaddieTeamService.new({
                id: "player_team",
                name: "player_team",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: [
                    playerBattleSquaddie.battleSquaddieId,
                    playerBattleSquaddie2.battleSquaddieId,
                ],
            })
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                squaddieTemplateId: playerBattleSquaddie.squaddieTemplateId,
                originMapCoordinate: {
                    q: 0,
                    r: 0,
                },
            })
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: playerBattleSquaddie2.battleSquaddieId,
                squaddieTemplateId: playerBattleSquaddie2.squaddieTemplateId,
                originMapCoordinate: { q: 0, r: 1 },
            })

            gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.new({
                        missionMap,
                        missionId: "missionId",
                        campaignId: "campaignId",
                        teams: [playerTeam],
                        battlePhaseState: BattlePhaseStateService.new({
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        }),
                    }),
                }),
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")

            actualContext = PlayerSelectionService.calculateContext({
                gameEngineState,
                playerInputActions: [PlayerInputAction.NEXT],
            })
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("knows the player wants to select a new squaddie", () => {
            expect(actualContext.playerIntent).toEqual(
                PlayerIntent.START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE
            )
        })

        it("knows the button that was pressed", () => {
            expect(actualContext.playerInputActions).includes(
                PlayerInputAction.NEXT
            )
        })

        it("when applying the context, send a message indicating we should select the next available squaddie", () => {
            const expectedMessage = {
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            }
            const actualChanges =
                PlayerSelectionService.applyContextToGetChanges({
                    context: PlayerSelectionContextService.new({
                        playerIntent:
                            PlayerIntent.START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE,
                    }),
                    gameEngineState,
                })
            expect(messageSpy).toHaveBeenCalledWith(expectedMessage)
            expect(actualChanges.messageSent).toEqual(expectedMessage)
        })
    })

    describe("Calculation context is UNKNOWN", () => {
        beforeEach(() => {
            createGameEngineWith1PlayerAnd1EnemyAndSpyMessages()
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })
        it("will generate UNKNOWN context if it does not interact with the map or squaddies", () => {
            const actualContext: PlayerSelectionContext =
                hoverOverMapCoordinate({
                    mapCoordinate: { q: -10, r: -10 },
                    gameEngineState,
                })
            expect(actualContext.playerIntent).toEqual(PlayerIntent.UNKNOWN)
        })
        it("will not send messages when using an unknown context", () => {
            const actualChanges =
                PlayerSelectionService.applyContextToGetChanges({
                    context: PlayerSelectionContextService.new({
                        playerIntent: PlayerIntent.UNKNOWN,
                    }),
                    gameEngineState,
                })
            expect(messageSpy).not.toHaveBeenCalled()
            expect(actualChanges.messageSent).toBeUndefined()
            expect(actualChanges.battleOrchestratorMode).toBe(
                BattleOrchestratorMode.UNKNOWN
            )
        })
    })

    describe("Try to move a player squaddie by clicking in range", () => {
        let x: number
        let y: number

        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            missionMap = createMap()
            gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
                objectRepository,
                missionMap,
                enemyMapCoordinate: { q: 0, r: 2 },
            })

            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()

            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: "PLAYER",
            })

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
            ;({ x, y } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: {
                        q: 0,
                        r: 1,
                    },
                    cameraLocation:
                        gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
                }))
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })

        describe("user clicks on the map to indicate intent", () => {
            let actualContext: PlayerSelectionContext
            beforeEach(() => {
                actualContext = clickOnMapCoordinate({
                    gameEngineState,
                    mapCoordinate: {
                        q: 0,
                        r: 1,
                    },
                })
            })

            it("knows the player intends to move the squaddie", () => {
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_COORDINATE
                )
            })

            it("knows which squaddie to move", () => {
                expect(actualContext.actorBattleSquaddieId).toEqual("PLAYER")
            })

            it("knows where the player wants to move the squaddie", () => {
                expect(actualContext.mouseClick).toEqual(
                    MouseConfigService.newMouseClick({
                        button: MouseButton.ACCEPT,
                        x,
                        y,
                    })
                )
            })
        })

        it("sends a message indicating the squaddie wants to move", () => {
            const { actualChanges, expectedMessage } =
                clickOnScreenAndCalculateChangesAndMessage({
                    x,
                    y,
                    gameEngineState,
                    targetCoordinate: { q: 0, r: 1 },
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_COORDINATE,
                })

            expect(
                gameEngineState.messageBoard.sendMessage
            ).toHaveBeenCalledWith(expectedMessage)
            expect(actualChanges.messageSent).toEqual(expectedMessage)
        })
    })

    describe("After selecting a squaddie and considering an action, the user moves the mouse off map", () => {
        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            missionMap = createMap()
            gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
                objectRepository,
                missionMap,
                enemyMapCoordinate: { q: 0, r: 2 },
            })

            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()

            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: "PLAYER",
            })

            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions =
                PlayerConsideredActionsService.new()
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.movement =
                {
                    actionPointCost: 1,
                    coordinates: [],
                    destination: { q: 0, r: 3 },
                }

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })

        describe("user moves the mouse off the map to indicate intent", () => {
            let actualContext: PlayerSelectionContext
            beforeEach(() => {
                actualContext = hoverOverMapCoordinate({
                    gameEngineState,
                    mapCoordinate: {
                        q: -100,
                        r: 9001,
                    },
                })
            })

            it("knows the player intends to cancel considered actions", () => {
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.CANCEL_SQUADDIE_CONSIDERED_ACTIONS
                )
            })
        })

        it("sends a message indicating the squaddie wants to cancel their selection", () => {
            const actualContext = PlayerSelectionContextService.new({
                playerIntent: PlayerIntent.CANCEL_SQUADDIE_CONSIDERED_ACTIONS,
            })

            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                SummaryHUDStateService.new()

            const actualChanges: PlayerSelectionChanges =
                PlayerSelectionService.applyContextToGetChanges({
                    gameEngineState,
                    context: actualContext,
                })

            const expectedMessage: MessageBoardMessage = {
                type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                playerDecisionHUD:
                    gameEngineState.battleOrchestratorState.playerDecisionHUD,
                objectRepository: gameEngineState.repository!,
                playerCommandState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.playerCommandState,
            }

            expect(
                gameEngineState.messageBoard.sendMessage
            ).toHaveBeenCalledWith(expectedMessage)
            expect(actualChanges.messageSent).toEqual(expectedMessage)
        })
    })

    describe("user selects a squaddie then hovers over the map", () => {
        beforeEach(() => {
            createGameEngineWith1PlayerAnd1EnemyAndSpyMessages([
                "1 1 x 1 ",
                " 1 1 x x ",
            ])
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()

            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: "PLAYER",
            })
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        describe("path is possible", () => {
            let actualContext: PlayerSelectionContext
            beforeEach(() => {
                actualContext = hoverOverMapCoordinate({
                    mapCoordinate: {
                        q: 1,
                        r: 0,
                    },
                    gameEngineState,
                })
            })

            it("knows the player wants to consider moving the squaddie", () => {
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.CONSIDER_MOVING_SQUADDIE
                )
            })

            it("will send a message indicating the path and its cost if the path is possible", () => {
                PlayerSelectionService.applyContextToGetChanges({
                    gameEngineState,
                    context: actualContext,
                })
                expect(messageSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_CONSIDERS_MOVEMENT,
                        movementDecision: {
                            actionPointCost: 1,
                            coordinates: [
                                { q: 0, r: 0 },
                                { q: 1, r: 0 },
                            ],
                            destination: { q: 1, r: 0 },
                        },
                    })
                )
            })
        })
        it("if the path is impossible clear the considered movement", () => {
            const actualContext = hoverOverMapCoordinate({
                mapCoordinate: {
                    q: 0,
                    r: 3,
                },
                gameEngineState,
            })
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                SummaryHUDStateService.new()
            PlayerSelectionService.applyContextToGetChanges({
                gameEngineState,
                context: actualContext,
            })

            expect(messageSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                })
            )
        })
    })

    const playerActsImmediately = ({
        gameEngineState,
        actionTemplateId,
    }: {
        gameEngineState: GameEngineState
        actionTemplateId: string
    }): PlayerSelectionContext => {
        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()

        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleSquaddieId: "PLAYER",
        })

        return PlayerSelectionService.calculateContext({
            gameEngineState,
            actionTemplateId: actionTemplateId,
            mouseClick: MouseConfigService.newMouseClick({
                x: 0,
                y: 0,
                button: MouseButton.ACCEPT,
            }),
            playerInputActions: [],
        })
    }

    const playerIsPartwayThroughTheirTurn = ({
        gameEngineState,
        actionTemplateId,
    }: {
        gameEngineState: GameEngineState
        actionTemplateId: string
    }): PlayerSelectionContext => {
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            BattleActionService.new({
                actor: { actorBattleSquaddieId: "PLAYER" },
                action: { isMovement: true },
                effect: {
                    movement: {
                        startCoordinate: { q: 0, r: 0 },
                        endCoordinate: { q: 0, r: 1 },
                    },
                },
            })
        )
        BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )

        return PlayerSelectionService.calculateContext({
            gameEngineState,
            actionTemplateId: actionTemplateId,
            mouseClick: MouseConfigService.newMouseClick({
                x: 0,
                y: 0,
                button: MouseButton.ACCEPT,
            }),
            playerInputActions: [],
        })
    }

    describe("user selects an action template", () => {
        let meleeActionId: string = "melee"
        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            missionMap = createMap()
            gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
                objectRepository,
                missionMap,
            })

            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                affiliation: SquaddieAffiliation.ENEMY,
                battleId: "enemy10",
                templateId: "enemy",
                name: "enemy10",
                objectRepository: objectRepository,
                actionTemplateIds: [],
            })
            MissionMapService.addSquaddie({
                missionMap,
                squaddieTemplateId: "enemy",
                battleSquaddieId: "enemy10",
                originMapCoordinate: { q: 1, r: 0 },
            })

            clickOnMapCoordinate({
                mapCoordinate: {
                    q: 0,
                    r: 0,
                },
                gameEngineState,
            })
        })

        const tests = [
            {
                name: "player acts immediately",
                setup: () =>
                    playerActsImmediately({
                        gameEngineState,
                        actionTemplateId: meleeActionId,
                    }),
            },
            {
                name: "player is partway through their turn",
                setup: () =>
                    playerIsPartwayThroughTheirTurn({
                        gameEngineState,
                        actionTemplateId: meleeActionId,
                    }),
            },
        ]

        it.each(tests)(
            `$name expects the player selected an action`,
            ({ setup }) => {
                let actualContext: PlayerSelectionContext = setup()
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.PLAYER_SELECTS_AN_ACTION
                )
            }
        )

        it.each(tests)(`$name knows which action was selected`, ({ setup }) => {
            let actualContext: PlayerSelectionContext = setup()
            expect(actualContext.actionTemplateId).toEqual(meleeActionId)
        })

        it.each(tests)(`$name knows which squaddie is acting`, ({ setup }) => {
            let actualContext: PlayerSelectionContext = setup()
            expect(actualContext.actorBattleSquaddieId).toEqual("PLAYER")
        })

        describe("apply context", () => {
            let changes: PlayerSelectionChanges
            let expectedMessage: MessageBoardMessage
            let actualContext: PlayerSelectionContext
            let rangedActionId: string = "ranged"

            beforeEach(() => {
                messageSpy = vi.spyOn(
                    gameEngineState.messageBoard,
                    "sendMessage"
                )

                playerActsImmediately({
                    gameEngineState,
                    actionTemplateId: rangedActionId,
                })
                actualContext = PlayerSelectionService.calculateContext({
                    gameEngineState,
                    actionTemplateId: rangedActionId,
                    mouseClick: MouseConfigService.newMouseClick({
                        x: 0,
                        y: 0,
                        button: MouseButton.ACCEPT,
                    }),
                    playerInputActions: [],
                })
                actualContext.targetBattleSquaddieIds = [
                    "squaddie0",
                    "squaddie1",
                ]
                changes = PlayerSelectionService.applyContextToGetChanges({
                    gameEngineState,
                    context: actualContext,
                })
                expectedMessage = {
                    type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_TEMPLATE,
                    objectRepository,
                    missionMap,
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    glossary: gameEngineState.battleOrchestratorState.glossary,
                    messageBoard: gameEngineState.messageBoard,
                    actionTemplateId: rangedActionId,
                    battleSquaddieId: "PLAYER",
                    mapStartingCoordinate: { q: 0, r: 0 },
                }
            })
            afterEach(() => {
                messageSpy.mockRestore()
            })

            it("will recommend player HUD controller as the next phase", () => {
                expect(changes.battleOrchestratorMode).toBe(
                    BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                )
            })

            it("sends a message that an action template was selected", () => {
                expect(messageSpy).toBeCalledWith(expectedMessage)
            })
        })
    })
    describe("user ends the squaddie turn", () => {
        let actualContext: PlayerSelectionContext

        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            missionMap = createMap()
            gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
                objectRepository,
                missionMap,
            })
            clickOnMapCoordinate({
                mapCoordinate: {
                    q: 0,
                    r: 0,
                },
                gameEngineState,
            })
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()

            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: "PLAYER",
            })

            actualContext = PlayerSelectionService.calculateContext({
                gameEngineState,
                endTurnSelected: true,
                mouseClick: MouseConfigService.newMouseClick({
                    x: 0,
                    y: 0,
                    button: MouseButton.ACCEPT,
                }),
                playerInputActions: [],
            })
        })

        it("expects the player will end their turn", () => {
            expect(actualContext.playerIntent).toEqual(
                PlayerIntent.END_SQUADDIE_TURN
            )
        })

        it("knows which squaddie is ending their turn", () => {
            expect(actualContext.actorBattleSquaddieId).toEqual("PLAYER")
        })

        describe("apply context", () => {
            let changes: PlayerSelectionChanges
            let expectedMessage: MessageBoardMessage

            beforeEach(() => {
                messageSpy = vi.spyOn(
                    gameEngineState.messageBoard,
                    "sendMessage"
                )

                changes = PlayerSelectionService.applyContextToGetChanges({
                    gameEngineState,
                    context: actualContext,
                })
                expectedMessage = {
                    type: MessageBoardMessageType.PLAYER_ENDS_TURN,
                    battleState:
                        gameEngineState.battleOrchestratorState.battleState,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    objectRepository: gameEngineState.repository,
                    messageBoard: gameEngineState.messageBoard,
                    battleAction: BattleActionService.new({
                        actor: {
                            actorBattleSquaddieId: "PLAYER",
                        },
                        action: { isEndTurn: true },
                        effect: { endTurn: true },
                    }),
                }
            })
            afterEach(() => {
                messageSpy.mockRestore()
            })

            it("will recommend player HUD controller as the next phase", () => {
                expect(changes.battleOrchestratorMode).toBe(
                    BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                )
            })

            it("sends a message that an action was selected that needs a target", () => {
                expect(messageSpy).toBeCalledWith(expectedMessage)
            })
        })
    })
})

const createMap = (movementCost?: string[]): MissionMap => {
    return MissionMapService.new({
        terrainTileMap: TerrainTileMapService.new({
            movementCost: movementCost ?? ["1 1 1 1 1 ", " 1 1 1 1 1 "],
        }),
    })
}

const createSquaddie = ({
    objectRepository,
    squaddieAffiliation,
    actionTemplateIds,
}: {
    objectRepository: ObjectRepository
    squaddieAffiliation: TSquaddieAffiliation
    actionTemplateIds?: string[]
}): {
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
} => {
    if (
        !ObjectRepositoryService.hasActionTemplateId(objectRepository, "melee")
    ) {
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            ActionTemplateService.new({
                id: "melee",
                name: "melee",
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 0,
                    maximumRange: 1,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                        }),
                        versusSquaddieResistance:
                            VersusSquaddieResistance.ARMOR,
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                        },
                        damageDescriptions: {
                            [Damage.BODY]: 1,
                        },
                    }),
                ],
            })
        )
    }
    if (
        !ObjectRepositoryService.hasActionTemplateId(objectRepository, "ranged")
    ) {
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            ActionTemplateService.new({
                id: "ranged",
                name: "ranged",
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 1,
                    maximumRange: 2,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                        }),
                        versusSquaddieResistance:
                            VersusSquaddieResistance.ARMOR,
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                        },
                        damageDescriptions: {
                            [Damage.BODY]: 1,
                        },
                    }),
                ],
            })
        )
    }
    if (
        !ObjectRepositoryService.hasActionTemplateId(objectRepository, "heal")
    ) {
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            ActionTemplateService.new({
                id: "heal",
                name: "heal",
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 0,
                    maximumRange: 1,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.HEALING]: true,
                        }),
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                            [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                        },
                        healingDescriptions: {
                            [Healing.LOST_HIT_POINTS]: 1,
                        },
                    }),
                ],
            })
        )
    }
    if (
        !ObjectRepositoryService.hasActionTemplateId(objectRepository, "self")
    ) {
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            ActionTemplateService.new({
                id: "self",
                name: "self",
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 0,
                    maximumRange: 1,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.HEALING]: true,
                        }),
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                        },
                        healingDescriptions: {
                            [Healing.LOST_HIT_POINTS]: 1,
                        },
                    }),
                ],
            })
        )
    }

    let squaddieName: string = squaddieAffiliation.toString()

    let uuid = 1
    while (
        ObjectRepositoryService.hasSquaddieByBattleId(
            objectRepository,
            squaddieName
        )
    ) {
        uuid = uuid + 1
        squaddieName = `${squaddieAffiliation.toString()}${uuid}`
    }

    if (actionTemplateIds == undefined) {
        actionTemplateIds = ["melee", "ranged", "heal", "self"]
    }

    const { battleSquaddie, squaddieTemplate } =
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            affiliation: squaddieAffiliation,
            battleId: squaddieName,
            templateId: squaddieAffiliation.toString(),
            name: squaddieName,
            objectRepository: objectRepository,
            actionTemplateIds,
        })

    return {
        battleSquaddie,
        squaddieTemplate,
    }
}

const clickOnMapCoordinate = ({
    mapCoordinate,
    gameEngineState,
}: {
    mapCoordinate: HexCoordinate
    gameEngineState: GameEngineState
}): PlayerSelectionContext => {
    const { x, y } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate,
            cameraLocation:
                gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
        })

    return PlayerSelectionService.calculateContext({
        gameEngineState,
        mouseClick: MouseConfigService.newMouseClick({
            x,
            y,
            button: MouseButton.ACCEPT,
        }),
        playerInputActions: [],
    })
}

const hoverOverMapCoordinate = ({
    mapCoordinate,
    gameEngineState,
}: {
    mapCoordinate: HexCoordinate
    gameEngineState: GameEngineState
}): PlayerSelectionContext => {
    const { x, y } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate,
            cameraLocation:
                gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
        })

    return PlayerSelectionService.calculateContext({
        gameEngineState,
        mouseMovement: {
            x,
            y,
        },
        playerInputActions: [],
    })
}

const createGameEngineStateWith1PlayerAnd1Enemy = ({
    objectRepository,
    missionMap,
    enemyMapCoordinate,
    playerBattleSquaddie,
}: {
    objectRepository: ObjectRepository
    missionMap: MissionMap
    enemyMapCoordinate?: HexCoordinate
    playerBattleSquaddie?: BattleSquaddie
}) => {
    if (playerBattleSquaddie === undefined) {
        ;({ battleSquaddie: playerBattleSquaddie } = createSquaddie({
            objectRepository,
            squaddieAffiliation: SquaddieAffiliation.PLAYER,
        }))
    }
    const playerTeam = BattleSquaddieTeamService.new({
        id: "player_team",
        name: "player_team",
        affiliation: SquaddieAffiliation.PLAYER,
        battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
    })
    MissionMapService.addSquaddie({
        missionMap,
        battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
        squaddieTemplateId: playerBattleSquaddie.squaddieTemplateId,
        originMapCoordinate: {
            q: 0,
            r: 0,
        },
    })

    const { battleSquaddie: enemyBattleSquaddie } = createSquaddie({
        objectRepository,
        squaddieAffiliation: SquaddieAffiliation.ENEMY,
    })
    const enemyTeam = BattleSquaddieTeamService.new({
        id: "enemy_team",
        name: "enemy_team",
        affiliation: SquaddieAffiliation.ENEMY,
        battleSquaddieIds: [enemyBattleSquaddie.battleSquaddieId],
    })
    MissionMapService.addSquaddie({
        missionMap,
        battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
        squaddieTemplateId: enemyBattleSquaddie.squaddieTemplateId,
        originMapCoordinate: enemyMapCoordinate ?? {
            q: 0,
            r: 1,
        },
    })

    return GameEngineStateService.new({
        battleOrchestratorState: BattleOrchestratorStateService.new({
            battleState: BattleStateService.new({
                missionMap,
                missionId: "missionId",
                campaignId: "campaignId",
                teams: [playerTeam, enemyTeam],
                battlePhaseState: BattlePhaseStateService.new({
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                }),
            }),
        }),
        repository: objectRepository,
        campaign: CampaignService.default(),
        resourceHandler: mocks.mockResourceHandler(
            new MockedP5GraphicsBuffer()
        ),
    })
}

const clickOnScreenAndCalculateChangesAndMessage = ({
    x,
    y,
    gameEngineState,
    targetCoordinate,
    playerIntent,
}: {
    x: number
    y: number
    gameEngineState: GameEngineState
    targetCoordinate: HexCoordinate
    playerIntent: TPlayerIntent
}) => {
    const actualContext = PlayerSelectionContextService.new({
        playerIntent,
        actorBattleSquaddieId: "PLAYER",
        mouseClick: MouseConfigService.newMouseClick({
            button: MouseButton.ACCEPT,
            x,
            y,
        }),
    })

    const actualChanges: PlayerSelectionChanges =
        PlayerSelectionService.applyContextToGetChanges({
            gameEngineState,
            context: actualContext,
        })

    const expectedMessage: MessageBoardMessage = {
        type: MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE,
        battleSquaddieId: "PLAYER",
        targetCoordinate: targetCoordinate,
        missionMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap,
        objectRepository: gameEngineState.repository!,
        messageBoard: gameEngineState.messageBoard,
        battleActionDecisionStep:
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep,
        campaignResources: gameEngineState.campaign.resources,
        battleState: gameEngineState.battleOrchestratorState.battleState,
        battleActionRecorder:
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
        squaddieAllMovementCache:
            gameEngineState.battleOrchestratorState.cache.searchResultsCache,
    }
    return { actualChanges, expectedMessage }
}
