import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { DamageType, HealingType } from "../../squaddie/squaddieService"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { BattleSquaddie } from "../battleSquaddie"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { CampaignService } from "../../campaign/campaign"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../orchestrator/battleState"
import { MouseButton, MouseClickService } from "../../utils/mouseConfig"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { PlayerIntent, PlayerSelectionService } from "./playerSelectionService"
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
    MessageBoardMessagePlayerSelectsEmptyTile,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import { SquaddieSummaryPopoverPosition } from "../hud/playerActionPanel/squaddieSummaryPopover"
import { KeyButtonName } from "../../utils/keyboardConfig"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import { DecidedActionService } from "../../action/decided/decidedAction"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { SummaryHUDStateService } from "../hud/summaryHUD"
import { BattleActionService } from "../history/battleAction"
import { getResultOrThrowError } from "../../utils/ResultOrError"

describe("Player Selection Service", () => {
    let gameEngineState: GameEngineState
    let objectRepository: ObjectRepository
    let missionMap: MissionMap
    let messageSpy: jest.SpyInstance

    describe("At the start of the turn, Player selects an empty tile on the map before a squaddie's turn", () => {
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
        it("knows what spot the user clicked on", () => {
            const actualContext: PlayerSelectionContext = clickOnMapCoordinate({
                q: 0,
                r: 1,
                gameEngineState,
            })

            expect(actualContext.playerIntent).toEqual(
                PlayerIntent.START_OF_TURN_CLICK_ON_EMPTY_TILE
            )
            expect(actualContext.mouseClick).toEqual(
                MouseClickService.new({
                    ...ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                        {
                            q: 0,
                            r: 1,
                            camera: gameEngineState.battleOrchestratorState
                                .battleState.camera,
                        }
                    ),
                    button: MouseButton.ACCEPT,
                })
            )
        })
        describe("Apply Context", () => {
            let actualContext: PlayerSelectionContext
            let messageSpy: jest.SpyInstance
            let changes: PlayerSelectionChanges
            let expectedMessage: MessageBoardMessagePlayerSelectsEmptyTile
            beforeEach(() => {
                actualContext = clickOnMapCoordinate({
                    q: 0,
                    r: 1,
                    gameEngineState,
                })
                messageSpy = jest.spyOn(
                    gameEngineState.messageBoard,
                    "sendMessage"
                )
                changes = PlayerSelectionService.applyContextToGetChanges({
                    gameEngineState,
                    context: actualContext,
                })
                expectedMessage = {
                    type: MessageBoardMessageType.PLAYER_SELECTS_EMPTY_TILE,
                    gameEngineState,
                    location: {
                        q: 0,
                        r: 1,
                    },
                }
            })
            afterEach(() => {
                messageSpy.mockRestore()
            })
            it("will send a message to select an empty tile", () => {
                expect(messageSpy).toHaveBeenCalledWith(expectedMessage)
            })
            it("changes will mention the sent message", () => {
                expect(changes.messageSent).toEqual(expectedMessage)
            })
        })
    })

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
                location: {
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
                q: 0,
                r: 0,
                gameEngineState,
            })

            expect(actualContext.playerIntent).toEqual(PlayerIntent.END_PHASE)
        })

        it("will suggest BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR next", () => {
            const actualContext: PlayerSelectionContext = clickOnMapCoordinate({
                q: 0,
                r: 0,
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

    const createGameEngineWith1PlayerAnd1EnemyAndSpyMessages = () => {
        objectRepository = ObjectRepositoryService.new()
        missionMap = createMap()
        gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
            objectRepository,
            missionMap,
        })

        messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
    }
    describe("At the start of the turn, Player tries to select a squaddie when there are controllable squaddies around", () => {
        beforeEach(() => {
            createGameEngineWith1PlayerAnd1EnemyAndSpyMessages()
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("if squaddie is normally not controllable, sends a message about uncontrollable squaddies", () => {
            let actualContext: PlayerSelectionContext
            actualContext = clickOnMapCoordinate({
                q: 0,
                r: 1,
                gameEngineState,
            })

            expect(actualContext.playerIntent).toEqual(
                PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE
            )
        })

        describe("squaddie is normally controllable", () => {
            let actualContext: PlayerSelectionContext
            beforeEach(() => {
                actualContext = clickOnMapCoordinate({
                    q: 0,
                    r: 0,
                    gameEngineState,
                })
            })

            it("knows the player wants to select the playable squaddie", () => {
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE
                )
            })

            it("knows which squaddie was clicked on", () => {
                expect(actualContext.battleSquaddieId).toEqual("PLAYER")
            })

            it("knows where the player clicked", () => {
                expect(actualContext.mouseClick).toEqual(
                    MouseClickService.new({
                        ...ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                            {
                                q: 0,
                                r: 0,
                                camera: gameEngineState.battleOrchestratorState
                                    .battleState.camera,
                            }
                        ),
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
                        selectionMethod: {
                            mouseClick: MouseClickService.new({
                                ...ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                                    {
                                        q: 0,
                                        r: 0,
                                        camera: gameEngineState
                                            .battleOrchestratorState.battleState
                                            .camera,
                                    }
                                ),
                                button: MouseButton.ACCEPT,
                            }),
                        },
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
                        objectRepository: gameEngineState.repository,
                        squaddieAffiliation: SquaddieAffiliation.PLAYER,
                    }))
                    MissionMapService.addSquaddie({
                        battleSquaddieId: battleSquaddie2.battleSquaddieId,
                        squaddieTemplateId: battleSquaddie2.squaddieTemplateId,
                        missionMap:
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap,
                        location: { q: 0, r: 2 },
                    })

                    BattleActionDecisionStepService.setActor({
                        actionDecisionStep:
                            gameEngineState.battleOrchestratorState.battleState
                                .playerBattleActionBuilderState,
                        battleSquaddieId: "PLAYER",
                    })
                    gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                        SummaryHUDStateService.new({
                            mouseSelectionLocation: { x: 0, y: 0 },
                        })
                    SummaryHUDStateService.setMainSummaryPopover({
                        objectRepository: gameEngineState.repository,
                        position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                        resourceHandler: gameEngineState.resourceHandler,
                        summaryHUDState:
                            gameEngineState.battleOrchestratorState
                                .battleHUDState.summaryHUDState,
                        gameEngineState,
                        battleSquaddieId: "PLAYER",
                    })
                    actualContext = clickOnMapCoordinate({
                        q: 0,
                        r: 2,
                        gameEngineState,
                    })
                })

                it("knows the player intends to select a different squaddie", () => {
                    expect(actualContext.playerIntent).toEqual(
                        PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE
                    )

                    expect(actualContext.battleSquaddieId).toEqual(
                        battleSquaddie2.battleSquaddieId
                    )
                })
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
                hoverOverMapCoordinate({ q: 0, r: 0, gameEngineState })
            expect(actualContext.playerIntent).toEqual(
                PlayerIntent.PEEK_AT_SQUADDIE
            )
            expect(actualContext.mouseMovement).toEqual(
                ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                    {
                        q: 0,
                        r: 0,
                        camera: gameEngineState.battleOrchestratorState
                            .battleState.camera,
                    }
                )
            )
            expect(actualContext.battleSquaddieId).toEqual("PLAYER")
        })

        it("sends a message after applying the context", () => {
            const actualContext: PlayerSelectionContext =
                hoverOverMapCoordinate({ q: 0, r: 0, gameEngineState })
            const actualChanges =
                PlayerSelectionService.applyContextToGetChanges({
                    context: actualContext,
                    gameEngineState,
                })

            const { x, y } =
                ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                    {
                        q: 0,
                        r: 0,
                        camera: gameEngineState.battleOrchestratorState
                            .battleState.camera,
                    }
                )

            const expectedMessage = {
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: "PLAYER",
                selectionMethod: {
                    mouseMovement: {
                        x,
                        y,
                    },
                },
                squaddieSummaryPopoverPosition:
                    SquaddieSummaryPopoverPosition.SELECT_MAIN,
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
                location: {
                    q: 0,
                    r: 0,
                },
            })
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: playerBattleSquaddie2.battleSquaddieId,
                squaddieTemplateId: playerBattleSquaddie2.squaddieTemplateId,
                location: { q: 0, r: 1 },
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

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")

            actualContext = pressButton({
                keyButtonName: KeyButtonName.NEXT_SQUADDIE,
                gameEngineState,
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
            expect(actualContext.keyPress.keyButtonName).toEqual(
                KeyButtonName.NEXT_SQUADDIE
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
                hoverOverMapCoordinate({ q: -10, r: -10, gameEngineState })
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
                enemyMapLocation: { q: 0, r: 2 },
            })

            gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
                BattleActionDecisionStepService.new()

            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                battleSquaddieId: "PLAYER",
            })

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
            ;({ x, y } =
                ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                    {
                        q: 0,
                        r: 1,
                        camera: gameEngineState.battleOrchestratorState
                            .battleState.camera,
                    }
                ))
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })

        describe("user clicks on the map to indicate intent", () => {
            let actualContext: PlayerSelectionContext
            beforeEach(() => {
                actualContext = clickOnMapCoordinate({
                    gameEngineState,
                    q: 0,
                    r: 1,
                })
            })

            it("knows the player intends to move the squaddie", () => {
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_LOCATION
                )
            })

            it("knows which squaddie to move", () => {
                expect(actualContext.battleSquaddieId).toEqual("PLAYER")
            })

            it("knows where the player wants to move the squaddie", () => {
                expect(actualContext.mouseClick).toEqual(
                    MouseClickService.new({
                        button: MouseButton.ACCEPT,
                        x,
                        y,
                    })
                )
            })
        })

        it("sends a message indicating the squaddie wants to move", () => {
            const actualContext = PlayerSelectionContextService.new({
                playerIntent:
                    PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_LOCATION,
                battleSquaddieId: "PLAYER",
                mouseClick: MouseClickService.new({
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
                type: MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION,
                battleSquaddieId: "PLAYER",
                targetLocation: { q: 0, r: 1 },
                gameEngineState,
            }

            expect(
                gameEngineState.messageBoard.sendMessage
            ).toHaveBeenCalledWith(expectedMessage)
            expect(actualChanges.messageSent).toEqual(expectedMessage)
        })
    })

    describe("Try to move a player squaddie by clicking on another squaddie", () => {
        let x: number
        let y: number

        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            missionMap = createMap()
            gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
                objectRepository,
                missionMap,
                enemyMapLocation: { q: 0, r: 2 },
            })

            gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
                BattleActionDecisionStepService.new()

            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                battleSquaddieId: "PLAYER",
            })

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
            ;({ x, y } =
                ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                    {
                        q: 0,
                        r: 2,
                        camera: gameEngineState.battleOrchestratorState
                            .battleState.camera,
                    }
                ))
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })

        describe("user clicks on the uncontrollable squaddie to indicate intent to move towards it", () => {
            let actualContext: PlayerSelectionContext
            beforeEach(() => {
                actualContext = clickOnMapCoordinate({
                    gameEngineState,
                    q: 0,
                    r: 2,
                })
            })

            it("knows the player intends to move the squaddie towards another one", () => {
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE
                )
            })

            it("knows which squaddie to move", () => {
                expect(actualContext.battleSquaddieId).toEqual("PLAYER")
            })

            it("knows where the player wants to move the squaddie", () => {
                expect(actualContext.mouseClick).toEqual(
                    MouseClickService.new({
                        button: MouseButton.ACCEPT,
                        x,
                        y,
                    })
                )
            })
        })

        it("sends a message indicating the squaddie wants to move", () => {
            const actualContext = PlayerSelectionContextService.new({
                playerIntent:
                    PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE,
                battleSquaddieId: "PLAYER",
                mouseClick: MouseClickService.new({
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
                type: MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION,
                battleSquaddieId: "PLAYER",
                targetLocation: { q: 0, r: 1 },
                gameEngineState,
            }

            expect(
                gameEngineState.messageBoard.sendMessage
            ).toHaveBeenCalledWith(expectedMessage)
            expect(actualChanges.messageSent).toEqual(expectedMessage)
        })

        describe("Move if target is in range", () => {
            let x: number
            let y: number
            const create1DMapWithPits = (numberOfPits: number) => {
                let firstLine: string = "1 1 1 "
                for (let i = 0; i < numberOfPits; i++) {
                    firstLine += "- "
                }
                firstLine += "1 "

                gameEngineState.battleOrchestratorState.battleState.missionMap =
                    MissionMapService.new({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: [firstLine],
                        }),
                    })

                const { battleSquaddie: playerBattleSquaddie } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            gameEngineState.repository,
                            "PLAYER"
                        )
                    )

                const { battleSquaddie: enemyBattleSquaddie } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            gameEngineState.repository,
                            "ENEMY"
                        )
                    )

                MissionMapService.addSquaddie({
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                    squaddieTemplateId: playerBattleSquaddie.squaddieTemplateId,
                    location: {
                        q: 0,
                        r: 0,
                    },
                })

                const endOfFirstRow =
                    TerrainTileMapService.getDimensions(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap.terrainTileMap
                    ).widthOfWidestRow - 1
                MissionMapService.addSquaddie({
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                    squaddieTemplateId: enemyBattleSquaddie.squaddieTemplateId,
                    location: {
                        q: 0,
                        r: endOfFirstRow,
                    },
                })
                ;({ x, y } =
                    ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                        {
                            q: 0,
                            r: endOfFirstRow,
                            camera: gameEngineState.battleOrchestratorState
                                .battleState.camera,
                        }
                    ))
            }
            it("Target Squaddie is out of range, should indicate this is an invalid action", () => {
                create1DMapWithPits(3)
                const actualContext = clickOnMapCoordinate({
                    gameEngineState,
                    q: 0,
                    r:
                        TerrainTileMapService.getDimensions(
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap.terrainTileMap
                        ).widthOfWidestRow - 1,
                })

                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE
                )
                expect(actualContext.battleSquaddieId).toEqual("PLAYER")
                expect(actualContext.mouseClick).toEqual(
                    MouseClickService.new({
                        button: MouseButton.ACCEPT,
                        x,
                        y,
                    })
                )
            })

            it("when it is out of range, generate a message", () => {
                create1DMapWithPits(3)
                const context = PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE,
                    battleSquaddieId: "PLAYER",
                    mouseClick: MouseClickService.new({
                        button: MouseButton.ACCEPT,
                        x,
                        y,
                    }),
                })

                const actualChanges: PlayerSelectionChanges =
                    PlayerSelectionService.applyContextToGetChanges({
                        gameEngineState,
                        context,
                    })

                const expectedMessage: MessageBoardMessage = {
                    type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                    gameEngineState,
                    reason: "ENEMY is out of range",
                    selectionLocation: { x, y },
                }

                expect(
                    gameEngineState.messageBoard.sendMessage
                ).toHaveBeenCalledWith(expectedMessage)
                expect(actualChanges.messageSent).toEqual(expectedMessage)
            })
        })
    })

    describe("After selecting a squaddie, the user clicks off map", () => {
        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            missionMap = createMap()
            gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
                objectRepository,
                missionMap,
                enemyMapLocation: { q: 0, r: 2 },
            })

            gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
                BattleActionDecisionStepService.new()

            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                battleSquaddieId: "PLAYER",
            })

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })

        describe("user clicks off the map to indicate intent", () => {
            let actualContext: PlayerSelectionContext
            beforeEach(() => {
                actualContext = clickOnMapCoordinate({
                    gameEngineState,
                    q: -100,
                    r: 9001,
                })
            })

            it("knows the player intends to cancel selection", () => {
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.SQUADDIE_SELECTED_CANCEL_SQUADDIE_SELECTION
                )
            })
        })

        it("sends a message indicating the squaddie wants to cancel their selection", () => {
            const actualContext = PlayerSelectionContextService.new({
                playerIntent:
                    PlayerIntent.SQUADDIE_SELECTED_CANCEL_SQUADDIE_SELECTION,
            })

            const actualChanges: PlayerSelectionChanges =
                PlayerSelectionService.applyContextToGetChanges({
                    gameEngineState,
                    context: actualContext,
                })

            const expectedMessage: MessageBoardMessage = {
                type: MessageBoardMessageType.PLAYER_CANCELS_SQUADDIE_SELECTION,
                gameEngineState,
            }

            expect(
                gameEngineState.messageBoard.sendMessage
            ).toHaveBeenCalledWith(expectedMessage)
            expect(actualChanges.messageSent).toEqual(expectedMessage)
        })
    })

    describe("user tries to move to a different squaddie mid turn", () => {
        let x: number
        let y: number
        const setupGameEngineState = ({
            movementCost,
            player2Location,
        }: {
            movementCost?: string[]
            player2Location?: HexCoordinate
        }) => {
            missionMap = createMap(movementCost)
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
                location: {
                    q: 0,
                    r: 0,
                },
            })
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: playerBattleSquaddie2.battleSquaddieId,
                squaddieTemplateId: playerBattleSquaddie2.squaddieTemplateId,
                location: player2Location ?? {
                    q: 0,
                    r: 2,
                },
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

            const movementActionEffect =
                ProcessedActionMovementEffectService.new({
                    decidedActionEffect: DecidedActionMovementEffectService.new(
                        {
                            destination: { q: 0, r: 1 },
                            template: ActionEffectMovementTemplateService.new(
                                {}
                            ),
                        }
                    ),
                })
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                ActionsThisRoundService.new({
                    battleSquaddieId: "PLAYER",
                    startingLocation: { q: 0, r: 0 },
                    processedActions: [
                        ProcessedActionService.new({
                            processedActionEffects: [movementActionEffect],
                            decidedAction: DecidedActionService.new({
                                battleSquaddieId: "PLAYER",
                                actionPointCost: 1,
                                actionTemplateName: "movement",
                                actionTemplateId: "movement id",
                                actionEffects: [
                                    movementActionEffect.decidedActionEffect,
                                ],
                            }),
                        }),
                    ],
                })
            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
        }

        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })

        describe("clicking on another squaddie before the first squaddie's turn is complete", () => {
            let actualContext: PlayerSelectionContext
            beforeEach(() => {
                setupGameEngineState({})
                actualContext = clickOnMapCoordinate({
                    q: 0,
                    r: 2,
                    gameEngineState,
                })
                x = actualContext.mouseClick.x
                y = actualContext.mouseClick.y
            })

            it("knows the player tried to move a different squaddie", () => {
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE
                )
            })

            it("knows the battleSquaddieId that started moving", () => {
                expect(actualContext.battleSquaddieId).toEqual("PLAYER")
            })

            it("knows where the player selected the other squaddie", () => {
                expect(actualContext.mouseClick).toEqual(
                    MouseClickService.new({
                        button: MouseButton.ACCEPT,
                        x,
                        y,
                    })
                )
            })

            it("sends a message indicating the user is trying to move somewhere", () => {
                const actualContext = PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE,
                    battleSquaddieId: "PLAYER",
                    mouseClick: MouseClickService.new({
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
                    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION,
                    battleSquaddieId: "PLAYER",
                    targetLocation: { q: 0, r: 1 },
                    gameEngineState,
                }

                expect(
                    gameEngineState.messageBoard.sendMessage
                ).toHaveBeenCalledWith(expectedMessage)
                expect(actualChanges.messageSent).toEqual(expectedMessage)
            })
        })

        describe("clicking on a squaddie out of range before the first squaddie's turn is complete", () => {
            let actualContext: PlayerSelectionContext
            beforeEach(() => {
                setupGameEngineState({
                    movementCost: ["1 1 x x x x x x x 1 "],
                    player2Location: { q: 0, r: 9 },
                })
                actualContext = clickOnMapCoordinate({
                    q: 0,
                    r: 9,
                    gameEngineState,
                })
                x = actualContext.mouseClick.x
                y = actualContext.mouseClick.y
            })

            it("knows the player made an invalid action", () => {
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE
                )
            })

            it("knows the battleSquaddieId that started moving", () => {
                expect(actualContext.battleSquaddieId).toEqual("PLAYER")
            })

            it("knows where the player selected the other squaddie", () => {
                expect(actualContext.mouseClick).toEqual(
                    MouseClickService.new({
                        button: MouseButton.ACCEPT,
                        x,
                        y,
                    })
                )
            })

            it("sends a message indicating the user will make an invalid move", () => {
                const actualContext = PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE,
                    battleSquaddieId: "PLAYER",
                    mouseClick: MouseClickService.new({
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
                    type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                    gameEngineState,
                    reason: "PLAYER is out of range",
                    selectionLocation: { x, y },
                }

                expect(
                    gameEngineState.messageBoard.sendMessage
                ).toHaveBeenCalledWith(expectedMessage)
                expect(actualChanges.messageSent).toEqual(expectedMessage)
            })
        })
    })

    describe("user selects an action that requires a target", () => {
        let meleeActionId: string = "melee"
        let actualContext: PlayerSelectionContext

        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            missionMap = createMap()
            gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
                objectRepository,
                missionMap,
            })
            clickOnMapCoordinate({
                q: 0,
                r: 0,
                gameEngineState,
            })
        })

        const playerActsImmediately = () => {
            gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
                BattleActionDecisionStepService.new()

            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                battleSquaddieId: "PLAYER",
            })

            actualContext = PlayerSelectionService.calculateContext({
                gameEngineState,
                actionTemplateId: meleeActionId,
                mouseClick: MouseClickService.new({
                    x: 0,
                    y: 0,
                    button: MouseButton.ACCEPT,
                }),
            })
        }

        const playerIsPartwayThroughTheirTurn = () => {
            const decidedActionMovementEffect =
                DecidedActionMovementEffectService.new({
                    destination: { q: 0, r: 1 },
                    template: ActionEffectMovementTemplateService.new({}),
                })
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                ActionsThisRoundService.new({
                    battleSquaddieId: "PLAYER",
                    startingLocation: { q: 0, r: 0 },
                    previewedActionTemplateId: undefined,
                    processedActions: [
                        ProcessedActionService.new({
                            decidedAction: DecidedActionService.new({
                                actionPointCost: 1,
                                battleSquaddieId: "PLAYER",
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
            actualContext = PlayerSelectionService.calculateContext({
                gameEngineState,
                actionTemplateId: meleeActionId,
                mouseClick: MouseClickService.new({
                    x: 0,
                    y: 0,
                    button: MouseButton.ACCEPT,
                }),
            })
        }

        const tests = [
            {
                name: "player acts immediately",
                setup: playerActsImmediately,
            },
            {
                name: "player is partway through their turn",
                setup: playerIsPartwayThroughTheirTurn,
            },
        ]

        it.each(tests)(
            `$name expects the player selected an action`,
            ({ setup }) => {
                setup()
                expect(actualContext.playerIntent).toEqual(
                    PlayerIntent.PLAYER_SELECTS_AN_ACTION
                )

                actualContext = PlayerSelectionService.calculateContext({
                    gameEngineState,
                    actionTemplateId: meleeActionId,
                    mouseClick: MouseClickService.new({
                        x: 0,
                        y: 0,
                        button: MouseButton.ACCEPT,
                    }),
                })
            }
        )

        it.each(tests)(`$name knows which action was selected`, ({ setup }) => {
            setup()

            expect(actualContext.actionTemplateId).toEqual(meleeActionId)

            actualContext = PlayerSelectionService.calculateContext({
                gameEngineState,
                actionTemplateId: meleeActionId,
                mouseClick: MouseClickService.new({
                    x: 0,
                    y: 0,
                    button: MouseButton.ACCEPT,
                }),
            })
        })

        it.each(tests)(`$name knows which squaddie is acting`, ({ setup }) => {
            setup()

            expect(actualContext.battleSquaddieId).toEqual("PLAYER")

            actualContext = PlayerSelectionService.calculateContext({
                gameEngineState,
                actionTemplateId: meleeActionId,
                mouseClick: MouseClickService.new({
                    x: 0,
                    y: 0,
                    button: MouseButton.ACCEPT,
                }),
            })
        })

        describe("apply context", () => {
            let changes: PlayerSelectionChanges
            let expectedMessage: MessageBoardMessage

            beforeEach(() => {
                messageSpy = jest.spyOn(
                    gameEngineState.messageBoard,
                    "sendMessage"
                )

                playerActsImmediately()
                actualContext = PlayerSelectionService.calculateContext({
                    gameEngineState,
                    actionTemplateId: meleeActionId,
                    mouseClick: MouseClickService.new({
                        x: 0,
                        y: 0,
                        button: MouseButton.ACCEPT,
                    }),
                })
                changes = PlayerSelectionService.applyContextToGetChanges({
                    gameEngineState,
                    context: actualContext,
                })
                expectedMessage = {
                    type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET,
                    gameEngineState,
                    actionTemplateId: meleeActionId,
                    battleSquaddieId: "PLAYER",
                    mapStartingLocation: { q: 0, r: 0 },
                    mouseLocation: { x: 0, y: 0 },
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
                q: 0,
                r: 0,
                gameEngineState,
            })
            gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
                BattleActionDecisionStepService.new()

            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                battleSquaddieId: "PLAYER",
            })

            actualContext = PlayerSelectionService.calculateContext({
                gameEngineState,
                endTurnSelected: true,
                mouseClick: MouseClickService.new({
                    x: 0,
                    y: 0,
                    button: MouseButton.ACCEPT,
                }),
            })
        })

        it("expects the player will end their turn", () => {
            expect(actualContext.playerIntent).toEqual(
                PlayerIntent.END_SQUADDIE_TURN
            )
        })

        it("knows which squaddie is ending their turn", () => {
            expect(actualContext.battleSquaddieId).toEqual("PLAYER")
        })

        describe("apply context", () => {
            let changes: PlayerSelectionChanges
            let expectedMessage: MessageBoardMessage

            beforeEach(() => {
                messageSpy = jest.spyOn(
                    gameEngineState.messageBoard,
                    "sendMessage"
                )

                changes = PlayerSelectionService.applyContextToGetChanges({
                    gameEngineState,
                    context: actualContext,
                })
                expectedMessage = {
                    type: MessageBoardMessageType.PLAYER_ENDS_TURN,
                    gameEngineState,
                    battleAction: BattleActionService.new({
                        actor: {
                            battleSquaddieId: "PLAYER",
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
}: {
    objectRepository: ObjectRepository
    squaddieAffiliation: SquaddieAffiliation
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
                actionEffectTemplates: [
                    ActionEffectSquaddieTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.TARGETS_FOE]: true,
                            [Trait.TARGET_ARMOR]: true,
                            [Trait.ATTACK]: true,
                        }),
                        minimumRange: 0,
                        maximumRange: 1,
                        damageDescriptions: {
                            [DamageType.BODY]: 1,
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
                actionEffectTemplates: [
                    ActionEffectSquaddieTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.TARGETS_FOE]: true,
                            [Trait.TARGET_ARMOR]: true,
                            [Trait.ATTACK]: true,
                        }),
                        minimumRange: 1,
                        maximumRange: 3,
                        damageDescriptions: {
                            [DamageType.BODY]: 1,
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
                actionEffectTemplates: [
                    ActionEffectSquaddieTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.TARGETS_SELF]: true,
                            [Trait.TARGETS_ALLY]: true,
                            [Trait.HEALING]: true,
                        }),
                        minimumRange: 0,
                        maximumRange: 1,
                        healingDescriptions: {
                            [HealingType.LOST_HIT_POINTS]: 1,
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

    const { battleSquaddie, squaddieTemplate } =
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            affiliation: squaddieAffiliation,
            battleId: squaddieName,
            templateId: squaddieAffiliation.toString(),
            name: squaddieName,
            objectRepository: objectRepository,
            actionTemplateIds: ["melee", "ranged", "heal"],
        })

    return {
        battleSquaddie,
        squaddieTemplate,
    }
}

const clickOnMapCoordinate = ({
    q,
    r,
    gameEngineState,
}: {
    q: number
    r: number
    gameEngineState: GameEngineState
}): PlayerSelectionContext => {
    const { x, y } =
        ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
            q,
            r,
            camera: gameEngineState.battleOrchestratorState.battleState.camera,
        })

    return PlayerSelectionService.calculateContext({
        gameEngineState,
        mouseClick: MouseClickService.new({
            x,
            y,
            button: MouseButton.ACCEPT,
        }),
    })
}

const hoverOverMapCoordinate = ({
    q,
    r,
    gameEngineState,
}: {
    q: number
    r: number
    gameEngineState: GameEngineState
}): PlayerSelectionContext => {
    const { x, y } =
        ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
            q,
            r,
            camera: gameEngineState.battleOrchestratorState.battleState.camera,
        })

    return PlayerSelectionService.calculateContext({
        gameEngineState,
        mouseMovement: {
            x,
            y,
        },
    })
}

const pressButton = ({
    keyButtonName,
    gameEngineState,
}: {
    keyButtonName: KeyButtonName
    gameEngineState: GameEngineState
}): PlayerSelectionContext => {
    return PlayerSelectionService.calculateContext({
        gameEngineState,
        keyPress: {
            keyButtonName,
        },
    })
}

const createGameEngineStateWith1PlayerAnd1Enemy = ({
    objectRepository,
    missionMap,
    enemyMapLocation,
}: {
    objectRepository: ObjectRepository
    missionMap: MissionMap
    enemyMapLocation?: HexCoordinate
}) => {
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
        location: {
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
        location: enemyMapLocation ?? {
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
    })
}