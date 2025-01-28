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

describe("Player Selection Service", () => {
    let gameEngineState: GameEngineState
    let objectRepository: ObjectRepository
    let missionMap: MissionMap
    let messageSpy: MockInstance

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

            const { screenX, screenY } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    q: 0,
                    r: 1,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                })

            expect(actualContext.mouseClick).toEqual(
                MouseClickService.new({
                    x: screenX,
                    y: screenY,
                    button: MouseButton.ACCEPT,
                })
            )
        })
        describe("Apply Context", () => {
            let actualContext: PlayerSelectionContext
            let messageSpy: MockInstance
            let changes: PlayerSelectionChanges
            let expectedMessage: MessageBoardMessagePlayerSelectsEmptyTile
            beforeEach(() => {
                actualContext = clickOnMapCoordinate({
                    q: 0,
                    r: 1,
                    gameEngineState,
                })
                messageSpy = vi.spyOn(
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
                    coordinate: {
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
                coordinate: {
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
                    q: 0,
                    r: 1,
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
                const { screenX, screenY } =
                    ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                        {
                            q: 0,
                            r: 1,
                            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                        }
                    )

                expect(actualContext.mouseClick).toEqual(
                    MouseClickService.new({
                        x: screenX,
                        y: screenY,
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
                expect(actualContext.actorBattleSquaddieId).toEqual("PLAYER")
            })

            it("knows where the player clicked", () => {
                const { screenX, screenY } =
                    ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                        {
                            q: 0,
                            r: 0,
                            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                        }
                    )

                expect(actualContext.mouseClick).toEqual(
                    MouseClickService.new({
                        x: screenX,
                        y: screenY,
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
                        objectRepository: gameEngineState.repository,
                        squaddieAffiliation: SquaddieAffiliation.PLAYER,
                    }))
                    MissionMapService.addSquaddie({
                        battleSquaddieId: battleSquaddie2.battleSquaddieId,
                        squaddieTemplateId: battleSquaddie2.squaddieTemplateId,
                        missionMap:
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap,
                        coordinate: { q: 0, r: 2 },
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
                        q: 0,
                        r: 2,
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
            const { screenX, screenY } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    q: 0,
                    r: 0,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                })

            expect(actualContext.mouseMovement).toEqual({
                x: screenX,
                y: screenY,
            })
            expect(actualContext.actorBattleSquaddieId).toEqual("PLAYER")
        })

        it("sends a message after applying the context", () => {
            const actualContext: PlayerSelectionContext =
                hoverOverMapCoordinate({ q: 0, r: 0, gameEngineState })
            const actualChanges =
                PlayerSelectionService.applyContextToGetChanges({
                    context: actualContext,
                    gameEngineState,
                })

            const { screenX, screenY } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    q: 0,
                    r: 0,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                })

            const expectedMessage = {
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: "PLAYER",
                selectionMethod: {
                    mouse: {
                        x: screenX,
                        y: screenY,
                    },
                },
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
                coordinate: {
                    q: 0,
                    r: 0,
                },
            })
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: playerBattleSquaddie2.battleSquaddieId,
                squaddieTemplateId: playerBattleSquaddie2.squaddieTemplateId,
                coordinate: { q: 0, r: 1 },
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
            ;({ screenX: x, screenY: y } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    q: 0,
                    r: 1,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
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
                    q: 0,
                    r: 1,
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
                    MouseClickService.new({
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

    describe("user selects an action", () => {
        const setActorSetMessageSpyAndGetOnScreenCoordinate = (
            enemyMapCoordinate: HexCoordinate
        ): { screenX: number; screenY: number } => {
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()

            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: "PLAYER",
            })

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")

            return ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                {
                    ...enemyMapCoordinate,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                }
            )
        }

        it("sends a message indicating the squaddie wants to use the ranged attack", () => {
            const enemyMapCoordinate: HexCoordinate = { q: 0, r: 3 }
            let x: number
            let y: number
            objectRepository = ObjectRepositoryService.new()
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 - 1 "],
                }),
            })
            gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
                objectRepository,
                missionMap,
                enemyMapCoordinate,
                playerBattleSquaddie: createSquaddie({
                    objectRepository,
                    squaddieAffiliation: SquaddieAffiliation.PLAYER,
                    actionTemplateIds: ["ranged", "melee", "heal"],
                }).battleSquaddie,
            })
            ;({ screenX: x, screenY: y } =
                setActorSetMessageSpyAndGetOnScreenCoordinate(
                    enemyMapCoordinate
                ))
            const { actualChanges, expectedMessage } =
                clickOnScreenAndCalculateChangesAndMessage({
                    x,
                    y,
                    gameEngineState,
                    targetCoordinate: { q: 0, r: 3 },
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_COORDINATE,
                })

            expect(
                gameEngineState.messageBoard.sendMessage
            ).toHaveBeenCalledWith(expectedMessage)
            expect(actualChanges.messageSent).toEqual(expectedMessage)

            messageSpy.mockRestore()
        })
    })
    describe("After selecting a squaddie, the user clicks off map", () => {
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
            mouseClick: MouseClickService.new({
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
        BattleActionRecorderService.battleActionFinishedAnimating(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )

        return PlayerSelectionService.calculateContext({
            gameEngineState,
            actionTemplateId: actionTemplateId,
            mouseClick: MouseClickService.new({
                x: 0,
                y: 0,
                button: MouseButton.ACCEPT,
            }),
            playerInputActions: [],
        })
    }

    describe("user selects an action that requires a target", () => {
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
                coordinate: { q: 1, r: 0 },
            })

            clickOnMapCoordinate({
                q: 0,
                r: 0,
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

            beforeEach(() => {
                messageSpy = vi.spyOn(
                    gameEngineState.messageBoard,
                    "sendMessage"
                )

                playerActsImmediately({
                    gameEngineState,
                    actionTemplateId: meleeActionId,
                })
                actualContext = PlayerSelectionService.calculateContext({
                    gameEngineState,
                    actionTemplateId: meleeActionId,
                    mouseClick: MouseClickService.new({
                        x: 0,
                        y: 0,
                        button: MouseButton.ACCEPT,
                    }),
                    playerInputActions: [],
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
                    mapStartingCoordinate: { q: 0, r: 0 },
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
    describe("user selects an action that can only target self", () => {
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

        const tests = [
            {
                name: "player acts immediately",
                setup: () =>
                    playerActsImmediately({
                        gameEngineState,
                        actionTemplateId: "self",
                    }),
            },
            {
                name: "player is partway through their turn",
                setup: () =>
                    playerIsPartwayThroughTheirTurn({
                        gameEngineState,
                        actionTemplateId: "self",
                    }),
            },
        ]

        it.each(tests)(
            `$name expects the player targets themself automatically`,
            ({ setup }) => {
                let actualContext: PlayerSelectionContext = setup()
                expect(actualContext.targetBattleSquaddieIds).toEqual([
                    "PLAYER",
                ])
            }
        )

        describe("apply context", () => {
            let changes: PlayerSelectionChanges
            let expectedMessage: MessageBoardMessage
            let actualContext: PlayerSelectionContext

            beforeEach(() => {
                messageSpy = vi.spyOn(
                    gameEngineState.messageBoard,
                    "sendMessage"
                )

                playerActsImmediately({
                    gameEngineState,
                    actionTemplateId: "self",
                })
                actualContext = PlayerSelectionService.calculateContext({
                    gameEngineState,
                    actionTemplateId: "self",
                    mouseClick: MouseClickService.new({
                        x: 0,
                        y: 0,
                        button: MouseButton.ACCEPT,
                    }),
                    playerInputActions: [],
                })
                changes = PlayerSelectionService.applyContextToGetChanges({
                    gameEngineState,
                    context: actualContext,
                })
                expectedMessage = {
                    type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_WITH_KNOWN_TARGETS,
                    gameEngineState,
                    actionTemplateId: "self",
                    actorBattleSquaddieId: "PLAYER",
                    mapStartingCoordinate: { q: 0, r: 0 },
                    targetBattleSquaddieIds: ["PLAYER"],
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

            it("sends a message that an action was selected and the target is known", () => {
                expect(messageSpy).toBeCalledWith(expectedMessage)
            })
        })
    })
    describe("user selects an action that only has 1 target", () => {
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

        const tests = [
            {
                name: "player acts immediately",
                setup: () =>
                    playerActsImmediately({
                        gameEngineState,
                        actionTemplateId: "melee",
                    }),
            },
            {
                name: "player is partway through their turn",
                setup: () =>
                    playerIsPartwayThroughTheirTurn({
                        gameEngineState,
                        actionTemplateId: "melee",
                    }),
            },
        ]

        it.each(tests)(
            `$name expects the player targets the enemy automatically`,
            ({ setup }) => {
                let actualContext: PlayerSelectionContext = setup()
                expect(actualContext.targetBattleSquaddieIds).toEqual(["ENEMY"])
            }
        )
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
                mouseClick: MouseClickService.new({
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
                    gameEngineState,
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
    squaddieAffiliation: SquaddieAffiliation
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
                            [TargetBySquaddieAffiliationRelation.TARGET_FOE]:
                                true,
                        },
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
                            [TargetBySquaddieAffiliationRelation.TARGET_FOE]:
                                true,
                        },
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
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                true,
                            [TargetBySquaddieAffiliationRelation.TARGET_ALLY]:
                                true,
                        },
                        healingDescriptions: {
                            [HealingType.LOST_HIT_POINTS]: 1,
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
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                true,
                        },
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
    q,
    r,
    gameEngineState,
}: {
    q: number
    r: number
    gameEngineState: GameEngineState
}): PlayerSelectionContext => {
    const { screenX, screenY } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            q,
            r,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
        })

    return PlayerSelectionService.calculateContext({
        gameEngineState,
        mouseClick: MouseClickService.new({
            x: screenX,
            y: screenY,
            button: MouseButton.ACCEPT,
        }),
        playerInputActions: [],
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
    const { screenX, screenY } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            q,
            r,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
        })

    return PlayerSelectionService.calculateContext({
        gameEngineState,
        mouseMovement: {
            x: screenX,
            y: screenY,
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
        coordinate: {
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
        coordinate: enemyMapCoordinate ?? {
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
    playerIntent: PlayerIntent
}) => {
    const actualContext = PlayerSelectionContextService.new({
        playerIntent,
        actorBattleSquaddieId: "PLAYER",
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
        type: MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE,
        battleSquaddieId: "PLAYER",
        targetCoordinate: targetCoordinate,
        gameEngineState,
    }
    return { actualChanges, expectedMessage }
}
