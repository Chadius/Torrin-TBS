import { BattlePlayerSquaddieSelector } from "./battlePlayerSquaddieSelector"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattlePhase } from "./battlePhaseTracker"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { MissionMap } from "../../missionMap/missionMap"
import { BattleCamera } from "../battleCamera"
import {
    ConvertCoordinateService,
    convertMapCoordinatesToScreenCoordinates,
} from "../../hexMap/convertCoordinates"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { CampaignService } from "../../campaign/campaign"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { BattlePhaseState } from "./battlePhaseController"
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
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { DamageType } from "../../squaddie/squaddieService"
import { KeyButtonName } from "../../utils/keyboardConfig"

describe("BattleSquaddieSelector", () => {
    let selector: BattlePlayerSquaddieSelector =
        new BattlePlayerSquaddieSelector()
    let objectRepository: ObjectRepository
    let missionMap: MissionMap
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let teams: BattleSquaddieTeam[]
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
        if (messageSpy) {
            messageSpy.mockRestore()
        }
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
        if (
            !ObjectRepositoryService.hasActionTemplateId(
                objectRepository,
                "melee"
            )
        ) {
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                ActionTemplateService.new({
                    id: "melee",
                    name: "melee",
                    actionEffectTemplates: [
                        ActionEffectSquaddieTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.TARGETS_FOE]: true,
                                    [Trait.TARGET_ARMOR]: true,
                                    [Trait.ATTACK]: true,
                                }
                            ),
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

        const playerTeam: BattleSquaddieTeam = {
            id: "playerTeamId",
            name: "player controlled team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
            iconResourceKey: "icon_player_team",
        }
        teams.push(playerTeam)
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "Player Soldier",
            templateId: "player_soldier",
            battleId: "battleSquaddieId",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: objectRepository,
            actionTemplateIds: ["melee"],
        })
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
            campaign: CampaignService.default(),
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

    describe("player ends the squaddie turn", () => {
        let gameEngineState: GameEngineState
        let x: number
        let y: number

        beforeEach(() => {
            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)

            gameEngineState = createGameEngineState({
                battlePhaseState,
                missionMap,
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

            x = RectAreaService.centerX(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState.endTurnButton.buttonArea
            )
            y = RectAreaService.centerY(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState.endTurnButton.buttonArea
            )
            selector.mouseClicked({
                mouseX: x,
                mouseY: y,
                mouseButton: MouseButton.ACCEPT,
                gameEngineState,
            })
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("knows the player intends to end the turn", () => {
            expectContextSpiesWereCalled({
                expectedPlayerSelectionContextCalculationArgs:
                    PlayerSelectionContextCalculationArgsService.new({
                        gameEngineState,
                        mouseClick: {
                            x: x,
                            y: y,
                            button: MouseButton.ACCEPT,
                        },
                        endTurnSelected: true,
                    }),
                expectedPlayerSelectionContext:
                    PlayerSelectionContextService.new({
                        playerIntent: PlayerIntent.END_SQUADDIE_TURN,
                        battleSquaddieId: "battleSquaddieId",
                    }),
                expectedPlayerSelectionChanges:
                    PlayerSelectionChangesService.new({
                        battleOrchestratorMode:
                            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
                        messageSent: {
                            type: MessageBoardMessageType.PLAYER_ENDS_TURN,
                            gameEngineState,
                            battleAction: BattleActionService.new({
                                actor: {
                                    battleSquaddieId: "battleSquaddieId",
                                },
                                action: { isEndTurn: true },
                                effect: { endTurn: true },
                            }),
                        },
                    }),
            })
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

    describe("an action is selected that requires a target", () => {
        let gameEngineState: GameEngineState
        let x: number
        let y: number

        beforeEach(() => {
            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)

            gameEngineState = createGameEngineState({
                battlePhaseState,
                missionMap,
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

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")

            const meleeButton =
                gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
                    (button) => button.actionTemplateId === "melee"
                )

            x = RectAreaService.centerX(meleeButton.buttonArea)
            y = RectAreaService.centerY(meleeButton.buttonArea)
            selector.mouseClicked({
                mouseX: x,
                mouseY: y,
                mouseButton: MouseButton.ACCEPT,
                gameEngineState,
            })
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("knows the player wants to use the action", () => {
            expectContextSpiesWereCalled({
                expectedPlayerSelectionContextCalculationArgs:
                    PlayerSelectionContextCalculationArgsService.new({
                        gameEngineState,
                        mouseClick: MouseClickService.new({
                            x: x,
                            y: y,
                            button: MouseButton.ACCEPT,
                        }),
                        actionTemplateId: "melee",
                    }),
                expectedPlayerSelectionContext:
                    PlayerSelectionContextService.new({
                        playerIntent: PlayerIntent.PLAYER_SELECTS_AN_ACTION,
                        battleSquaddieId: "battleSquaddieId",
                        actionTemplateId: "melee",
                        mouseClick: MouseClickService.new({
                            x: x,
                            y: y,
                            button: MouseButton.ACCEPT,
                        }),
                    }),
                expectedPlayerSelectionChanges:
                    PlayerSelectionChangesService.new({
                        battleOrchestratorMode:
                            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
                        messageSent: {
                            type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET,
                            gameEngineState,
                            battleSquaddieId: "battleSquaddieId",
                            actionTemplateId: "melee",
                            mapStartingLocation: { q: 0, r: 0 },
                            mouseLocation: { x, y },
                        },
                    }),
            })
        })

        it("sends a message to target", () => {
            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET,
                gameEngineState,
                battleSquaddieId: "battleSquaddieId",
                actionTemplateId: "melee",
                mapStartingLocation: { q: 0, r: 0 },
                mouseLocation: { x, y },
            })
        })
    })

    describe("Next Squaddie button", () => {
        let gameEngineState: GameEngineState

        beforeEach(() => {
            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)

            gameEngineState = createGameEngineState({
                battlePhaseState,
                missionMap,
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

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")

            selector.keyEventHappened(gameEngineState, {
                eventType: OrchestratorComponentKeyEventType.PRESSED,
                keyCode: JSON.parse(
                    process.env.KEYBOARD_SHORTCUTS_BINDINGS_NEXT_SQUADDIE
                )[0],
            })
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("knows the player wants to switch to the next squaddie", () => {
            expectContextSpiesWereCalled({
                expectedPlayerSelectionContextCalculationArgs:
                    PlayerSelectionContextCalculationArgsService.new({
                        gameEngineState,
                        keyPress: {
                            keyButtonName: KeyButtonName.NEXT_SQUADDIE,
                        },
                    }),
                expectedPlayerSelectionContext:
                    PlayerSelectionContextService.new({
                        playerIntent:
                            PlayerIntent.START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE,
                        keyPress: {
                            keyButtonName: KeyButtonName.NEXT_SQUADDIE,
                        },
                    }),
                expectedPlayerSelectionChanges:
                    PlayerSelectionChangesService.new({
                        messageSent: {
                            type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                            gameEngineState,
                        },
                    }),
            })
        })

        it("sends a message to target", () => {
            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })
        })
    })

    it("will mark the component complete and recommend the message", () => {
        let gameEngineState: GameEngineState

        const battlePhaseState =
            makeBattlePhaseTrackerWithPlayerTeam(missionMap)

        gameEngineState = createGameEngineState({
            battlePhaseState,
            missionMap,
        })

        gameEngineState.messageBoard.addListener(
            selector,
            MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
        )

        expect(selector.hasCompleted(gameEngineState)).toBeFalsy()

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
            gameEngineState,
            recommendedMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
        })

        expect(selector.hasCompleted(gameEngineState)).toBeTruthy()

        const stateChanges = selector.recommendStateChanges(gameEngineState)
        expect(stateChanges.nextMode).toEqual(
            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        )
    })
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
