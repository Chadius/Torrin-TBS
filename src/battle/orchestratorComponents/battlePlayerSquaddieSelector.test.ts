import { BattlePlayerSquaddieSelector } from "./battlePlayerSquaddieSelector"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattlePhase } from "./battlePhaseTracker"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { OrchestratorComponentMouseEventType } from "../orchestrator/battleOrchestratorComponent"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleCamera } from "../battleCamera"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { BattleStateService } from "../battleState/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { CampaignService } from "../../campaign/campaign"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { BattlePhaseState } from "./battlePhaseController"
import { BattleHUDService } from "../hud/battleHUD/battleHUD"
import { MouseButton, MouseClickService } from "../../utils/mouseConfig"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { RectAreaService } from "../../ui/rectArea"
import {
    END_TURN_NAME,
    PlayerCommandSelection,
    PlayerCommandStateService,
} from "../hud/playerCommand/playerCommandHUD"
import { BattleActionService } from "../history/battleAction/battleAction"
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
import { PlayerInputTestService } from "../../utils/test/playerInput"
import { PlayerInputAction } from "../../ui/playerInput/playerInputState"
import { BattleHUDListener } from "../hud/battleHUD/battleHUDListener"
import { CoordinateGeneratorShape } from "../targeting/coordinateGenerator"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../squaddie/attribute/attributeModifier"
import { AttributeType } from "../../squaddie/attribute/attributeType"
import { ActionButtonService } from "../hud/playerActionPanel/actionButton/actionButton"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieTurnService } from "../../squaddie/turn"
import { BattleSquaddieService } from "../battleSquaddie"
import { FileAccessHUDService } from "../hud/fileAccess/fileAccessHUD"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"

describe("BattleSquaddieSelector", () => {
    let selector: BattlePlayerSquaddieSelector =
        new BattlePlayerSquaddieSelector()
    let objectRepository: ObjectRepository
    let missionMap: MissionMap
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let teams: BattleSquaddieTeam[]
    let messageSpy: MockInstance
    let calculateContextSpy: MockInstance
    let applyContextSpy: MockInstance

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        selector = new BattlePlayerSquaddieSelector()
        objectRepository = ObjectRepositoryService.new()
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 "],
            }),
        })
        teams = []
        calculateContextSpy = vi.spyOn(
            PlayerSelectionService,
            "calculateContext"
        )
        applyContextSpy = vi.spyOn(
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
    }): boolean => {
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
        return true
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
                    targetConstraints: TargetConstraintsService.new({
                        minimumRange: 0,
                        maximumRange: 1,
                    }),
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.ATTACK]: true,
                                }
                            ),
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
            !ObjectRepositoryService.hasActionTemplateId(
                objectRepository,
                "self"
            )
        ) {
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                ActionTemplateService.new({
                    id: "self",
                    name: "self",
                    targetConstraints: TargetConstraintsService.new({
                        minimumRange: 0,
                        maximumRange: 0,
                        coordinateGeneratorShape:
                            CoordinateGeneratorShape.BLOOM,
                    }),
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                    true,
                            },
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    HEALING: true,
                                }
                            ),
                            attributeModifiers: [
                                AttributeModifierService.new({
                                    type: AttributeType.ARMOR,
                                    amount: 1,
                                    source: AttributeSource.CIRCUMSTANCE,
                                }),
                            ],
                            healingDescriptions: {
                                [HealingType.LOST_HIT_POINTS]: 1,
                            },
                        }),
                    ],
                })
            )
        }

        if (
            !ObjectRepositoryService.hasActionTemplateId(
                objectRepository,
                "ranged"
            )
        ) {
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                ActionTemplateService.new({
                    name: "ranged",
                    id: "ranged",
                    targetConstraints: TargetConstraintsService.new({
                        minimumRange: 0,
                        maximumRange: 2,
                        coordinateGeneratorShape:
                            CoordinateGeneratorShape.BLOOM,
                    }),
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_FOE]:
                                    true,
                            },
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.ALWAYS_SUCCEEDS]: true,
                                    [Trait.ATTACK]: true,
                                }
                            ),
                            damageDescriptions: {
                                [DamageType.BODY]: 2,
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
            actionTemplateIds: ["melee", "ranged", "self"],
        })
        BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
            "battleSquaddieId",
        ])

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: "player_soldier",
            battleSquaddieId: "battleSquaddieId",
            coordinate: { q: 0, r: 0 },
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
                }),
            }),
            repository: objectRepository,
            campaign: CampaignService.default(),
        })
    }

    describe("automatically select the first playable controllable squaddie", () => {
        let gameEngineState: GameEngineState
        beforeEach(() => {
            const missionMap: MissionMap = MissionMapService.new({
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
            FileAccessHUDService.draw(
                gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
                mockedP5GraphicsContext
            )
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
        })

        it("if no squaddie is selected, select the first squaddie by default", () => {
            selector.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })

            expect(messageSpy).toBeCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    battleSquaddieSelectedId: "battleSquaddieId",
                })
            )
        })

        it("if the first squaddie turn ends, select the next squaddie", () => {
            const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    "battleSquaddieId"
                )
            )
            SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            ObjectRepositoryService.addBattleSquaddie(
                gameEngineState.repository,
                BattleSquaddieService.new({
                    squaddieTemplate,
                    battleSquaddieId: "battleSquaddieId2",
                })
            )
            BattleSquaddieTeamService.addBattleSquaddieIds(
                gameEngineState.battleOrchestratorState.battleState.teams[0],
                ["battleSquaddieId2"]
            )

            selector.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })

            expect(messageSpy).toBeCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    battleSquaddieSelectedId: "battleSquaddieId2",
                })
            )
        })

        describe("do not select a squaddie", () => {
            const tests = [
                {
                    name: "camera is panning",
                    setup: () => {
                        gameEngineState.battleOrchestratorState.battleState.camera.pan(
                            {
                                xDestination: 0,
                                yDestination: 0,
                                timeToPan: 500,
                                respectConstraints: false,
                            }
                        )
                    },
                },
                {
                    name: "squaddie is already selected",
                    setup: () => {
                        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                            SummaryHUDStateService.new()
                        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.showAllPlayerActions =
                            true
                    },
                },
                {
                    name: "no squaddies can act",
                    setup: () => {
                        const { battleSquaddie } = getResultOrThrowError(
                            ObjectRepositoryService.getSquaddieByBattleId(
                                gameEngineState.repository,
                                "battleSquaddieId"
                            )
                        )
                        SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
                    },
                },
                {
                    name: "squaddie is considering an action",
                    setup: () => {
                        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                            BattleActionDecisionStepService.new()
                        BattleActionDecisionStepService.setActor({
                            actionDecisionStep:
                                gameEngineState.battleOrchestratorState
                                    .battleState.battleActionDecisionStep,
                            battleSquaddieId: "battleSquaddieId",
                        })
                        BattleActionDecisionStepService.addAction({
                            actionDecisionStep:
                                gameEngineState.battleOrchestratorState
                                    .battleState.battleActionDecisionStep,
                            actionTemplateId: "actionTemplateId",
                        })
                    },
                },
            ]

            it.each(tests)(`$name`, ({ setup }) => {
                setup()
                selector.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler,
                })

                expect(messageSpy).not.toBeCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    })
                )
            })
        })
    })

    describe("player hovers over a squaddie", () => {
        let gameEngineState: GameEngineState
        let battleSquaddieScreenPositionX: number
        let battleSquaddieScreenPositionY: number

        beforeEach(() => {
            const missionMap: MissionMap = MissionMapService.new({
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
            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
            ;({
                x: battleSquaddieScreenPositionX,
                y: battleSquaddieScreenPositionY,
            } = ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: { q: 0, r: 0 },
                cameraLocation:
                    gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
            }))

            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.LOCATION,
                mouseLocation: {
                    x: battleSquaddieScreenPositionX,
                    y: battleSquaddieScreenPositionY,
                },
            })
        })

        it("will use the player selection service to make the needed changes", () => {
            expect(
                expectContextSpiesWereCalled({
                    expectedPlayerSelectionContextCalculationArgs:
                        PlayerSelectionContextCalculationArgsService.new({
                            gameEngineState,
                            mouseMovement: {
                                x: battleSquaddieScreenPositionX,
                                y: battleSquaddieScreenPositionY,
                            },
                            playerInputActions: [],
                        }),
                    expectedPlayerSelectionContext:
                        PlayerSelectionContextService.new({
                            playerIntent: PlayerIntent.PEEK_AT_SQUADDIE,
                            mouseMovement: {
                                x: battleSquaddieScreenPositionX,
                                y: battleSquaddieScreenPositionY,
                            },
                            actorBattleSquaddieId: "battleSquaddieId",
                        }),
                })
            ).toBeTruthy()
        })

        it("will generate a message to indicate player hovered over the squaddie", () => {
            expect(messageSpy).toBeCalledWith({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: "battleSquaddieId",
                selectionMethod: {
                    mouse: {
                        x: battleSquaddieScreenPositionX,
                        y: battleSquaddieScreenPositionY,
                    },
                },
            })
        })
    })

    describe("can make a movement action by clicking on the field", () => {
        let gameEngineState: GameEngineState
        let x: number
        let y: number
        beforeEach(() => {
            const missionMap: MissionMap = MissionMapService.new({
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
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()

            BattleHUDService.playerSelectsSquaddie(
                gameEngineState.battleOrchestratorState.battleHUD,
                {
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: "battleSquaddieId",
                }
            )
            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
        })

        describe("user clicks on destination to start movement", () => {
            beforeEach(() => {
                ;({ x, y } =
                    ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                        {
                            mapCoordinate: { q: 0, r: 1 },
                            cameraLocation:
                                gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
                        }
                    ))

                clickOnMapCoordinate({
                    selector,
                    gameEngineState: gameEngineState,
                    mapCoordinate: {
                        q: 0,
                        r: 1,
                    },
                    camera: new BattleCamera(),
                })
            })

            it("will use the player selection service to make the needed changes", () => {
                expect(
                    expectContextSpiesWereCalled({
                        expectedPlayerSelectionContextCalculationArgs:
                            PlayerSelectionContextCalculationArgsService.new({
                                gameEngineState,
                                mouseClick: {
                                    x: x,
                                    y: y,
                                    button: MouseButton.ACCEPT,
                                },
                                playerInputActions: [],
                            }),
                        expectedPlayerSelectionContext:
                            PlayerSelectionContextService.new({
                                playerIntent:
                                    PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_COORDINATE,
                                mouseClick: {
                                    x: x,
                                    y: y,
                                    button: MouseButton.ACCEPT,
                                },
                                actorBattleSquaddieId: "battleSquaddieId",
                            }),
                        expectedPlayerSelectionChanges:
                            PlayerSelectionChangesService.new({
                                messageSent: {
                                    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE,
                                    battleSquaddieId: "battleSquaddieId",
                                    targetCoordinate: { q: 0, r: 1 },
                                    gameEngineState,
                                },
                            }),
                    })
                ).toBeTruthy()
            })

            it("will generate a message to indicate player wants to move the squaddie", () => {
                expect(messageSpy).toBeCalledWith({
                    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE,
                    targetCoordinate: { q: 0, r: 1 },
                    gameEngineState,
                    battleSquaddieId: "battleSquaddieId",
                })
            })
        })

        it("Does not make a movement action if you click on the player command HUD", () => {
            const playerCommandSpy = vi
                .spyOn(PlayerCommandStateService, "mouseReleased")
                .mockReturnValue(
                    PlayerCommandSelection.PLAYER_COMMAND_SELECTION_MOVE
                )

            clickOnMapCoordinate({
                selector,
                gameEngineState: gameEngineState,
                mapCoordinate: {
                    q: 0,
                    r: 1,
                },
                camera: new BattleCamera(),
            })

            expect(playerCommandSpy).toBeCalled()
            expect(
                BattleActionRecorderService.isAnimationQueueEmpty(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toBeTruthy()

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
                }
            )

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
            ;({ x, y } = selectActionButton({
                actionTemplateId: END_TURN_NAME,
                gameEngineState,
                selector,
            }))
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("knows the player intends to end the turn", () => {
            expect(
                expectContextSpiesWereCalled({
                    expectedPlayerSelectionContextCalculationArgs:
                        PlayerSelectionContextCalculationArgsService.new({
                            gameEngineState,
                            mouseClick: {
                                x: x,
                                y: y,
                                button: MouseButton.ACCEPT,
                            },
                            playerInputActions: [],
                            endTurnSelected: true,
                        }),
                    expectedPlayerSelectionContext:
                        PlayerSelectionContextService.new({
                            playerIntent: PlayerIntent.END_SQUADDIE_TURN,
                            actorBattleSquaddieId: "battleSquaddieId",
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
                                        actorBattleSquaddieId:
                                            "battleSquaddieId",
                                    },
                                    action: { isEndTurn: true },
                                    effect: { endTurn: true },
                                }),
                            },
                        }),
                })
            ).toBeTruthy()
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
                        actorBattleSquaddieId: "battleSquaddieId",
                    },
                    effect: {
                        endTurn: true,
                    },
                }),
            })
        })
    })

    describe("an action is selected that does not require a target", () => {
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
                }
            )

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("knows the player wants to use the self action", () => {
            ;({ x, y } = selectActionButton({
                actionTemplateId: "self",
                gameEngineState,
                selector,
            }))
            expect(
                expectContextSpiesWereCalled({
                    expectedPlayerSelectionContextCalculationArgs:
                        PlayerSelectionContextCalculationArgsService.new({
                            gameEngineState,
                            mouseClick: MouseClickService.new({
                                x: x,
                                y: y,
                                button: MouseButton.ACCEPT,
                            }),
                            playerInputActions: [],
                            actionTemplateId: "self",
                        }),
                    expectedPlayerSelectionContext:
                        PlayerSelectionContextService.new({
                            playerIntent: PlayerIntent.PLAYER_SELECTS_AN_ACTION,
                            actorBattleSquaddieId: "battleSquaddieId",
                            actionTemplateId: "self",
                            mouseClick: MouseClickService.new({
                                x: x,
                                y: y,
                                button: MouseButton.ACCEPT,
                            }),
                            targetBattleSquaddieIds: ["battleSquaddieId"],
                        }),
                    expectedPlayerSelectionChanges:
                        PlayerSelectionChangesService.new({
                            battleOrchestratorMode:
                                BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
                            messageSent: {
                                type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_WITH_KNOWN_TARGETS,
                                gameEngineState,
                                actorBattleSquaddieId: "battleSquaddieId",
                                actionTemplateId: "self",
                                mapStartingCoordinate: { q: 0, r: 0 },
                                targetBattleSquaddieIds: ["battleSquaddieId"],
                            },
                        }),
                })
            ).toBeTruthy()
        })

        it("sends a message to target", () => {
            selectActionButton({
                actionTemplateId: "self",
                gameEngineState,
                selector,
            })
            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_WITH_KNOWN_TARGETS,
                gameEngineState,
                actorBattleSquaddieId: "battleSquaddieId",
                targetBattleSquaddieIds: ["battleSquaddieId"],
                actionTemplateId: "self",
                mapStartingCoordinate: { q: 0, r: 0 },
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
                }
            )

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
            ;({ x, y } = selectActionButton({
                actionTemplateId: "melee",
                gameEngineState,
                selector,
            }))
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("knows the player wants to use the action", () => {
            expect(
                expectContextSpiesWereCalled({
                    expectedPlayerSelectionContextCalculationArgs:
                        PlayerSelectionContextCalculationArgsService.new({
                            gameEngineState,
                            mouseClick: MouseClickService.new({
                                x: x,
                                y: y,
                                button: MouseButton.ACCEPT,
                            }),
                            playerInputActions: [],
                            actionTemplateId: "melee",
                        }),
                    expectedPlayerSelectionContext:
                        PlayerSelectionContextService.new({
                            playerIntent: PlayerIntent.PLAYER_SELECTS_AN_ACTION,
                            actorBattleSquaddieId: "battleSquaddieId",
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
                                mapStartingCoordinate: { q: 0, r: 0 },
                                mouseLocation: { x, y },
                            },
                        }),
                })
            ).toBeTruthy()
        })

        it("sends a message to target", () => {
            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET,
                gameEngineState,
                battleSquaddieId: "battleSquaddieId",
                actionTemplateId: "melee",
                mapStartingCoordinate: { q: 0, r: 0 },
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
                }
            )

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")

            selector.keyEventHappened(
                gameEngineState,
                PlayerInputTestService.pressNextKey()
            )
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("knows the player wants to switch to the next squaddie", () => {
            expect(
                expectContextSpiesWereCalled({
                    expectedPlayerSelectionContextCalculationArgs:
                        PlayerSelectionContextCalculationArgsService.new({
                            gameEngineState,
                            playerInputActions: [PlayerInputAction.NEXT],
                        }),
                    expectedPlayerSelectionContext:
                        PlayerSelectionContextService.new({
                            playerIntent:
                                PlayerIntent.START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE,
                            playerInputActions: [PlayerInputAction.NEXT],
                        }),
                    expectedPlayerSelectionChanges:
                        PlayerSelectionChangesService.new({
                            messageSent: {
                                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                                gameEngineState,
                            },
                        }),
                })
            ).toBeTruthy()
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
    mapCoordinate,
    camera,
}: {
    selector: BattlePlayerSquaddieSelector
    gameEngineState: GameEngineState
    mapCoordinate: HexCoordinate
    camera: BattleCamera
}) => {
    let { x: destinationScreenX, y: destinationScreenY } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate,
            cameraLocation: camera.getWorldLocation(),
        })
    selector.mouseEventHappened(gameEngineState, {
        eventType: OrchestratorComponentMouseEventType.LOCATION,
        mouseLocation: {
            x: destinationScreenX,
            y: destinationScreenY,
        },
    })

    selector.mouseEventHappened(gameEngineState, {
        eventType: OrchestratorComponentMouseEventType.RELEASE,
        mouseRelease: {
            x: destinationScreenX,
            y: destinationScreenY,
            button: MouseButton.ACCEPT,
        },
    })
}

const selectActionButton = ({
    actionTemplateId,
    gameEngineState,
    selector,
}: {
    actionTemplateId: string
    gameEngineState: GameEngineState
    selector: BattlePlayerSquaddieSelector
}): { x: number; y: number } => {
    const graphicsBuffer = new MockedP5GraphicsBuffer()
    SummaryHUDStateService.draw({
        summaryHUDState:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState,
        gameEngineState,
        graphicsBuffer,
        resourceHandler: mocks.mockResourceHandler(graphicsBuffer),
    })

    const actionButton =
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
            (button) =>
                ActionButtonService.getActionTemplateId(button) ===
                actionTemplateId
        )

    let x = RectAreaService.centerX(actionButton.uiObjects.buttonIcon.drawArea)
    let y = RectAreaService.centerY(actionButton.uiObjects.buttonIcon.drawArea)
    selector.mousePressed({
        mousePress: {
            x,
            y,
            button: MouseButton.ACCEPT,
        },
        gameEngineState,
    })
    selector.mouseReleased({
        mouseRelease: {
            x,
            y,
            button: MouseButton.ACCEPT,
        },
        gameEngineState,
    })
    return { x, y }
}
