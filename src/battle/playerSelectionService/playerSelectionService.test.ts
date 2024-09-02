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
                campaign: CampaignService.default({}),
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
        })
        // TODO Make a NEW message when the user clicks on an empty tile before starting their turn
        // TODO Send a message indicating where the user clicked
        // TODO Add a new test to BattleHUDListener to clear the summary HUD (copy tests to there)
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
                campaign: CampaignService.default({}),
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

    describe("At the start of the turn, Player tries to select a squaddie when there are controllable squaddies around", () => {
        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            missionMap = createMap()
            gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
                objectRepository,
                missionMap,
            })

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
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

            it("knows the player wants to select the non playable squaddie", () => {
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
        })
    })

    describe("At the start of the turn, Player peeks on a squaddie", () => {
        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            missionMap = createMap()
            gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
                objectRepository,
                missionMap,
            })

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
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
                campaign: CampaignService.default({}),
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
            expect(actualContext.buttonPress).toEqual(
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
            objectRepository = ObjectRepositoryService.new()
            missionMap = createMap()
            gameEngineState = createGameEngineStateWith1PlayerAnd1Enemy({
                objectRepository,
                missionMap,
            })

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
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

    describe("user tries to command a different squaddie mid turn", () => {
        let x: number
        let y: number
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
                location: {
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
                campaign: CampaignService.default({}),
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
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })

        describe("clicking on another squaddie before the first squaddie's turn is complete", () => {
            let actualContext: PlayerSelectionContext
            beforeEach(() => {
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
                    PlayerIntent.SQUADDIE_SELECTED_SELECTED_DIFFERENT_SQUADDIE_MID_TURN
                )
            })

            it("knows the battleSquaddieId of the other squaddie", () => {
                expect(actualContext.battleSquaddieId).toEqual("PLAYER2")
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
        })

        it("sends a message indicating the user tried to select another squaddie", () => {
            const actualContext = PlayerSelectionContextService.new({
                playerIntent:
                    PlayerIntent.SQUADDIE_SELECTED_SELECTED_DIFFERENT_SQUADDIE_MID_TURN,
                battleSquaddieId: "PLAYER2",
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
                type: MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN,
                gameEngineState,
            }

            expect(
                gameEngineState.messageBoard.sendMessage
            ).toHaveBeenCalledWith(expectedMessage)
            expect(actualChanges.messageSent).toEqual(expectedMessage)
        })
    })
})

// TODO Clicks off map

// TODO I think you're up to feature parity at this point.

// TODO ----------------- BattleHUD needs to absorb player selector's actions
// TODO BattleHUD (or whatever HUD is handling this) now needs to pay attention.
// TODO Now, you can assume the player squaddie has been selected. Make sure the enemy is at (0,2)
// TODO Clicking on the enemy
// TODO Should see if movement is possible
// TODO If it isn't, send a popup
// TODO If it is, create a move command

// TODO BattleHUD needs to handle NEXT SQUADDIE squaddie selection logic

// TODO Make sure the Battle HUD Listener sets the actor

// TODO Add a Squaddie Movement Calculator
// TODO BattleHUD needs to engage with this component

// TODO Selecting an empty spot on the map
// - TODO Movement code should be in BattleHUD, copy it there!
// - TODO Selector's hasCompleted should wait for the action builder to be ready to animate OR waiting for a target

// TODO When cancelling a turn, make sure to only cancel if the squaddie is not mid turn

// TODO Finally delete stuff from battle player squaddie selector - it should just send signals and wait for a new instruction

const createMap = (): MissionMap => {
    return MissionMapService.new({
        terrainTileMap: TerrainTileMapService.new({
            movementCost: ["1 1 1 1 1 ", " 1 1 1 1 1 "],
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
        buttonPress: {
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
        campaign: CampaignService.default({}),
    })
}
