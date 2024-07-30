import { MessageBoard } from "../../message/messageBoard"
import {
    BattleHUDListener,
    BattleHUDService,
    PopupWindowType,
} from "./battleHUD"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../orchestrator/battleState"
import { FileAccessHUD, FileAccessHUDService } from "./fileAccessHUD"
import { ButtonStatus } from "../../ui/button"
import { PopupWindow, PopupWindowService } from "./popupWindow"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { LabelService } from "../../ui/label"
import { RectAreaService } from "../../ui/rectArea"
import { SquaddieTemplateService } from "../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../squaddie/id"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import {
    TerrainTileMap,
    TerrainTileMapService,
} from "../../hexMap/terrainTileMap"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { OrchestratorUtilities } from "../orchestratorComponents/orchestratorUtils"
import { PlayerBattleActionBuilderStateService } from "../actionBuilder/playerBattleActionBuilderState"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../action/template/actionEffectSquaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { CreateNewSquaddieAndAddToRepository } from "../../utils/test/squaddie"
import { BattleSquaddieSelectedHUD } from "./BattleSquaddieSelectedHUD"
import { CampaignService } from "../../campaign/campaign"
import { ProcessedActionSquaddieEffectService } from "../../action/processed/processedActionSquaddieEffect"
import {
    DecidedActionSquaddieEffect,
    DecidedActionSquaddieEffectService,
} from "../../action/decided/decidedActionSquaddieEffect"
import { DrawSquaddieUtilities } from "../animation/drawSquaddie"
import { DecidedActionEndTurnEffectService } from "../../action/decided/decidedActionEndTurnEffect"
import { ActionEffectEndTurnTemplateService } from "../../action/template/actionEffectEndTurnTemplate"
import { DecidedActionService } from "../../action/decided/decidedAction"
import { ProcessedActionEndTurnEffectService } from "../../action/processed/processedActionEndTurnEffect"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { BattleCamera } from "../battleCamera"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { SummaryHUDStateService } from "./summaryHUD"
import { BattleHUDStateService } from "./battleHUDState"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"
import {
    BattlePhaseState,
    BattlePhaseStateService,
} from "../orchestratorComponents/battlePhaseController"
import {
    BattleAction,
    BattleActionQueueService,
    BattleActionService,
} from "../history/battleAction"
import { SquaddieSummaryPopoverPosition } from "./playerActionPanel/squaddieSummaryPopover"
import { TargetingShape } from "../targeting/targetingShapeGenerator"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieTurnService } from "../../squaddie/turn"
import { CreateNewSquaddieMovementWithTraits } from "../../squaddie/movement"
import {
    DamageType,
    GetHitPoints,
    GetNumberOfActionPoints,
} from "../../squaddie/squaddieService"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { BattleEvent } from "../history/battleEvent"
import { DegreeOfSuccess } from "../actionCalculator/degreeOfSuccess"

describe("Battle HUD", () => {
    const createGameEngineState = ({
        battlePhaseState,
        battleSquaddieLocation,
        missionMap,
    }: {
        battlePhaseState?: BattlePhaseState
        battleSquaddieLocation?: HexCoordinate
        missionMap?: MissionMap
    }): {
        gameEngineState: GameEngineState
        longswordAction: ActionTemplate
        playerSoldierBattleSquaddie: BattleSquaddie
        battleSquaddie2: BattleSquaddie
    } => {
        const repository = ObjectRepositoryService.new()
        missionMap =
            missionMap ??
            new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
                }),
            })

        const playerTeam: BattleSquaddieTeam = {
            id: "playerTeamId",
            name: "player controlled team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
            iconResourceKey: "icon_player_team",
        }
        let teams: BattleSquaddieTeam[] = []
        const longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ALWAYS_SUCCEEDS]: true,
                    }),
                    minimumRange: 0,
                    maximumRange: 1,
                    targetingShape: TargetingShape.SNAKE,
                    damageDescriptions: {
                        [DamageType.BODY]: 2,
                    },
                }),
            ],
        })
        teams.push(playerTeam)
        const { battleSquaddie: playerSoldierBattleSquaddie } =
            CreateNewSquaddieAndAddToRepository({
                name: "Player Soldier",
                templateId: "player_soldier",
                battleId: "player_soldier_0",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository: repository,
                actionTemplates: [longswordAction],
            })
        BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
            "player_soldier_0",
        ])

        missionMap.addSquaddie(
            "player_soldier",
            "player_soldier_0",
            battleSquaddieLocation ?? {
                q: 0,
                r: 0,
            }
        )

        const battleSquaddie2 = BattleSquaddieService.newBattleSquaddie({
            squaddieTemplateId: "player_soldier",
            battleSquaddieId: "player_soldier_1",
            squaddieTurn: SquaddieTurnService.new(),
        })
        ObjectRepositoryService.addBattleSquaddie(repository, battleSquaddie2)
        BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
            "player_soldier_1",
        ])

        missionMap.addSquaddie("player_soldier", "player_soldier_1", {
            q: 0,
            r: 1,
        })

        const gameEngineState = GameEngineStateService.new({
            resourceHandler: mocks.mockResourceHandler(
                new MockedP5GraphicsBuffer()
            ),
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                }),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap,
                    camera: new BattleCamera(),
                    battlePhaseState:
                        battlePhaseState ??
                        BattlePhaseStateService.new({
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 1,
                        }),
                    teams,
                    recording: { history: [] },
                }),
                battleHUDState: BattleHUDStateService.new({
                    summaryHUDState: SummaryHUDStateService.new({
                        mouseSelectionLocation: { x: 0, y: 0 },
                    }),
                }),
            }),
            repository,
            campaign: CampaignService.default({}),
        })

        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
            PlayerBattleActionBuilderStateService.new({})

        PlayerBattleActionBuilderStateService.setActor({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
        })

        return {
            gameEngineState,
            longswordAction,
            playerSoldierBattleSquaddie,
            battleSquaddie2,
        }
    }

    describe("enable buttons as a reaction", () => {
        let fileAccessHUDSpy: jest.SpyInstance
        let fileAccessHUD: FileAccessHUD
        let battleHUDListener: BattleHUDListener
        let listenerSpy: jest.SpyInstance
        let messageBoard: MessageBoard
        let gameEngineStateWithPlayerPhase: GameEngineState

        beforeEach(() => {
            fileAccessHUDSpy = jest.spyOn(FileAccessHUDService, "enableButtons")
            fileAccessHUD = FileAccessHUDService.new({})
            fileAccessHUD.loadButton.setStatus(ButtonStatus.DISABLED)
            fileAccessHUD.saveButton.setStatus(ButtonStatus.DISABLED)
            battleHUDListener = new BattleHUDListener("battleHUDListener")
            listenerSpy = jest.spyOn(battleHUDListener, "receiveMessage")
            messageBoard = new MessageBoard()
            gameEngineStateWithPlayerPhase = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({
                        fileAccessHUD,
                    }),
                    battleState: BattleStateService.new({
                        battlePhaseState: {
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        },
                        missionId: "missionId",
                        campaignId: "test campaign",
                    }),
                }),
            })
        })
        afterEach(() => {
            listenerSpy.mockRestore()
            fileAccessHUDSpy.mockRestore()
        })

        it("will enable file access buttons when it receives a player phase started message", () => {
            messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.STARTED_PLAYER_PHASE
            )
            messageBoard.sendMessage({
                type: MessageBoardMessageType.STARTED_PLAYER_PHASE,
                gameEngineState: gameEngineStateWithPlayerPhase,
            })

            expect(listenerSpy).toBeCalled()
            expect(fileAccessHUD.loadButton.getStatus()).toEqual(
                ButtonStatus.READY
            )
            expect(fileAccessHUD.saveButton.getStatus()).toEqual(
                ButtonStatus.READY
            )
            expect(fileAccessHUDSpy).toBeCalled()
        })

        it("will enable file access buttons when it receives a player can begin a turn message", () => {
            messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE
            )
            messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE,
                gameEngineState: gameEngineStateWithPlayerPhase,
            })

            expect(listenerSpy).toBeCalled()
            expect(fileAccessHUD.loadButton.getStatus()).toEqual(
                ButtonStatus.READY
            )
            expect(fileAccessHUD.saveButton.getStatus()).toEqual(
                ButtonStatus.READY
            )
            expect(fileAccessHUDSpy).toBeCalled()
        })
    })

    const differentSquaddiePopup: PopupWindow = PopupWindowService.new({
        label: LabelService.new({
            area: RectAreaService.new({
                left: 0,
                top: 0,
                width: 200,
                height: 100,
            }),
            text: "It's SQUADDIE_NAME turn",
            textSize: 10,
            fontColor: [0, 0, 100],
            fillColor: [0, 0, 10],
            textBoxMargin: 8,
        }),
    })

    describe("draw", () => {
        let mockGraphicsContext: MockedP5GraphicsBuffer

        beforeEach(() => {
            mockGraphicsContext = new MockedP5GraphicsBuffer()
        })

        it("will draw popup windows if they are defined", () => {
            const drawSpy: jest.SpyInstance = jest.spyOn(
                PopupWindowService,
                "draw"
            )

            const battleHUD = BattleHUDService.new({})

            BattleHUDService.setPopupWindow(
                battleHUD,
                differentSquaddiePopup,
                PopupWindowType.DIFFERENT_SQUADDIE_TURN
            )
            BattleHUDService.draw(battleHUD, mockGraphicsContext)

            expect(drawSpy).toBeCalledTimes(1)
            drawSpy.mockRestore()
        })
        it("will not draw popup windows if they are undefined", () => {
            const drawSpy: jest.SpyInstance = jest.spyOn(
                PopupWindowService,
                "draw"
            )

            const battleHUD = BattleHUDService.new({})
            BattleHUDService.draw(battleHUD, mockGraphicsContext)

            expect(drawSpy).not.toBeCalled()
            drawSpy.mockRestore()
        })
    })
    describe("Popup Windows", () => {
        it("can set a popup window", () => {
            const battleHUD = BattleHUDService.new({})

            BattleHUDService.setPopupWindow(
                battleHUD,
                differentSquaddiePopup,
                PopupWindowType.DIFFERENT_SQUADDIE_TURN
            )

            expect(
                battleHUD.popupWindows[PopupWindowType.DIFFERENT_SQUADDIE_TURN]
            ).toEqual(differentSquaddiePopup)
        })
        it("will create a popup window if it gets a message that the player selected a different squaddie", () => {
            const squaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    name: "squaddie template",
                    affiliation: SquaddieAffiliation.PLAYER,
                    templateId: "templateId",
                }),
            })
            const battleSquaddie = BattleSquaddieService.new({
                squaddieTemplate: squaddieTemplate,
                battleSquaddieId: "battleSquaddie",
            })
            const repository = ObjectRepositoryService.new()
            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                squaddieTemplate
            )
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                battleSquaddie
            )
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 "],
                }),
            })
            MissionMapService.addSquaddie(
                missionMap,
                squaddieTemplate.squaddieId.templateId,
                battleSquaddie.battleSquaddieId,
                {
                    q: 0,
                    r: 0,
                }
            )

            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                startingLocation: { q: 0, r: 0 },
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: undefined,
                        processedActionEffects: [
                            ProcessedActionMovementEffectService.new({
                                decidedActionEffect:
                                    DecidedActionMovementEffectService.new({
                                        template: undefined,
                                        destination: { q: 0, r: 1 },
                                    }),
                            }),
                        ],
                    }),
                ],
            })

            const gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.new({
                        battlePhaseState: {
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        },
                        missionId: "missionId",
                        campaignId: "test campaign",
                        missionMap,
                        actionsThisRound,
                    }),
                }),
                repository,
            })

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN
            )

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN,
                gameEngineState,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUD.popupWindows[
                    PopupWindowType.DIFFERENT_SQUADDIE_TURN
                ]
            ).not.toBeUndefined()

            const popup =
                gameEngineState.battleOrchestratorState.battleHUD.popupWindows[
                    PopupWindowType.DIFFERENT_SQUADDIE_TURN
                ]
            expect(
                popup.label.textBox.text.includes(
                    `${squaddieTemplate.squaddieId.name}\n is not done yet`
                )
            ).toBeTruthy()
        })
        it("squaddie does not have enough action points to perform the action", () => {
            const gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.new({
                        battlePhaseState: {
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        },
                        missionId: "missionId",
                        campaignId: "test campaign",
                    }),
                }),
                repository: ObjectRepositoryService.new(),
            })

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID
            )

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                gameEngineState,
                reason: "Need 2 action points",
                selectionLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH,
                    y: ScreenDimensions.SCREEN_HEIGHT,
                },
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUD.popupWindows[
                    PopupWindowType.PLAYER_INVALID_SELECTION
                ]
            ).not.toBeUndefined()

            const popup =
                gameEngineState.battleOrchestratorState.battleHUD.popupWindows[
                    PopupWindowType.PLAYER_INVALID_SELECTION
                ]
            expect(
                popup.label.textBox.text.includes("Need 2 action points")
            ).toBeTruthy()
        })
    })
    describe("Player selects a squaddie", () => {
        let gameEngineState: GameEngineState
        let battleSquaddie: BattleSquaddie

        const createGameEngineStateWithAffiliation = ({
            repository,
            missionMap,
            teamAffiliation,
            battlePhase,
        }: {
            missionMap: MissionMap
            teamAffiliation: SquaddieAffiliation
            battlePhase: BattlePhase
            repository: ObjectRepository
        }): {
            gameEngineState: GameEngineState
            battleSquaddie: BattleSquaddie
        } => {
            const squaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    name: "squaddie template",
                    affiliation: teamAffiliation,
                    templateId: "templateId",
                }),
            })
            const battleSquaddie = BattleSquaddieService.new({
                squaddieTemplate: squaddieTemplate,
                battleSquaddieId: "battleSquaddie",
            })
            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                squaddieTemplate
            )
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                battleSquaddie
            )
            MissionMapService.addSquaddie(
                missionMap,
                battleSquaddie.squaddieTemplateId,
                battleSquaddie.battleSquaddieId,
                {
                    q: 0,
                    r: 0,
                }
            )

            const team = BattleSquaddieTeamService.new({
                id: "team",
                name: "team",
                affiliation: teamAffiliation,
                battleSquaddieIds: [battleSquaddie.battleSquaddieId],
            })

            gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                        teams: [team],
                        battlePhaseState: BattlePhaseStateService.new({
                            currentAffiliation: battlePhase,
                        }),
                    }),
                }),
                campaign: CampaignService.default({}),
                repository,
            })

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            return { gameEngineState, battleSquaddie }
        }

        beforeEach(() => {
            const repository = ObjectRepositoryService.new()
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 "],
                }),
            })

            ;({ gameEngineState, battleSquaddie } =
                createGameEngineStateWithAffiliation({
                    teamAffiliation: SquaddieAffiliation.PLAYER,
                    battlePhase: BattlePhase.PLAYER,
                    missionMap,
                    repository,
                }))

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
            })
        })

        it("knows after selecting the player the hud has not selected actions", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState
                    .playerSelectedSquaddieAction
            ).toBeFalsy()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState.playerSelectedEndTurn
            ).toBeFalsy()
        })

        it("will show the main summary popover", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId
            ).toEqual(battleSquaddie.battleSquaddieId)
        })

        it("knows after selecting the player the hud has not selected actions", () => {
            let playerCommandState =
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState
            expect(playerCommandState.playerSelectedSquaddieAction).toBeFalsy()
            expect(playerCommandState.playerSelectedEndTurn).toBeFalsy()
            expect(playerCommandState.selectedActionTemplate).toBeUndefined()
        })

        describe("Player selects squaddie they cannot control because it is an enemy", () => {
            let gameEngineState: GameEngineState
            let enemyBattleSquaddie: BattleSquaddie

            beforeEach(() => {
                const repository = ObjectRepositoryService.new()
                const missionMap = MissionMapService.new({
                    terrainTileMap: TerrainTileMapService.new({
                        movementCost: ["1 1 "],
                    }),
                })

                ;({ gameEngineState, battleSquaddie: enemyBattleSquaddie } =
                    createGameEngineStateWithAffiliation({
                        teamAffiliation: SquaddieAffiliation.ENEMY,
                        battlePhase: BattlePhase.ENEMY,
                        missionMap,
                        repository,
                    }))

                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId:
                        enemyBattleSquaddie.battleSquaddieId,
                    selectionMethod: {
                        mouse: { x: 0, y: 0 },
                    },
                })
            })

            it("will not show the player command window for uncontrollable enemy squaddies", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.showPlayerCommand
                ).toBeFalsy()
            })

            it("will show the summary window on the right side", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.squaddieSummaryPopoversByType.TARGET
                        .battleSquaddieId
                ).toEqual(enemyBattleSquaddie.battleSquaddieId)
            })
        })
    })
    describe("Player peeks at a squaddie", () => {
        let gameEngineState: GameEngineState
        let battleSquaddie: BattleSquaddie
        let battleSquaddie2: BattleSquaddie
        let battleHUDListener: BattleHUDListener

        beforeEach(() => {
            ;({
                gameEngineState,
                playerSoldierBattleSquaddie: battleSquaddie,
                battleSquaddie2,
            } = createGameEngineState({
                missionMap: MissionMapService.new({
                    terrainTileMap: TerrainTileMapService.new({
                        movementCost: ["1 1 "],
                    }),
                }),
            }))

            battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE
            )
        })

        it("will call the Summary HUD to open a new main window", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
                squaddieSummaryPopoverPosition:
                    SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId
            ).toEqual(battleSquaddie.battleSquaddieId)
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .expirationTime
            ).not.toBeUndefined()
        })
        it("will call the Summary HUD to open a new target window if the main window is open and does not expire", () => {
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                SummaryHUDStateService.new({
                    mouseSelectionLocation: { x: 0, y: 0 },
                })
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                gameEngineState,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: gameEngineState.repository,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie2.battleSquaddieId,
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
                squaddieSummaryPopoverPosition:
                    SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.TARGET
                    .battleSquaddieId
            ).toEqual(battleSquaddie2.battleSquaddieId)
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.TARGET
                    .expirationTime
            ).not.toBeUndefined()
        })
        it("will call the Summary HUD to replace the main target window if the main window is open and will expire", () => {
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                SummaryHUDStateService.new({
                    mouseSelectionLocation: { x: 0, y: 0 },
                })
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                gameEngineState,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: gameEngineState.repository,
                expirationTime: 1000,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie2.battleSquaddieId,
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
                squaddieSummaryPopoverPosition:
                    SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId
            ).toEqual(battleSquaddie2.battleSquaddieId)
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.TARGET
            ).toBeUndefined()
        })

        it("selects a squaddie after peeking at it, popover should lose expiration time", () => {
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
                squaddieSummaryPopoverPosition:
                    SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .expirationTime
            ).not.toBeUndefined()
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
            })
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .expirationTime
            ).toBeUndefined()
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
                squaddieSummaryPopoverPosition:
                    SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .expirationTime
            ).toBeUndefined()
        })

        it("selects a squaddie and peeks the same one it should not make another one", () => {
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
            })
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
                squaddieSummaryPopoverPosition:
                    SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
            ).not.toBeUndefined()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN.position
            ).toEqual(SquaddieSummaryPopoverPosition.SELECT_MAIN)
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.TARGET
            ).toBeUndefined()
        })
    })
    describe("Player cancels target selection they were considering", () => {
        let gameEngineState: GameEngineState
        let battleHUDListener: BattleHUDListener
        let battleSquaddie: BattleSquaddie
        let longswordAction: ActionTemplate
        let highlightRangeSpy: jest.SpyInstance

        beforeEach(() => {
            ;({
                gameEngineState,
                playerSoldierBattleSquaddie: battleSquaddie,
                longswordAction,
            } = createGameEngineState({
                battleSquaddieLocation: { q: 1, r: 1 },
            }))

            highlightRangeSpy = jest.spyOn(
                DrawSquaddieUtilities,
                "highlightSquaddieRange"
            )

            battleHUDListener = new BattleHUDListener("battleHUDListener")
        })

        afterEach(() => {
            highlightRangeSpy.mockRestore()
        })

        const addActionsThisRoundThenCancelTargetSelection = (
            actionsThisRound: ActionsThisRound
        ) => {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                actionsThisRound

            PlayerBattleActionBuilderStateService.addAction({
                actionBuilderState:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                actionTemplate: longswordAction,
            })

            highlightRangeSpy = jest.spyOn(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
                "highlightTiles"
            )

            battleHUDListener.receiveMessage({
                type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                gameEngineState,
            })
        }

        describe("Cancel targeting the first action", () => {
            beforeEach(() => {
                addActionsThisRoundThenCancelTargetSelection(
                    ActionsThisRoundService.new({
                        battleSquaddieId: battleSquaddie.battleSquaddieId,
                        startingLocation: { q: 1, r: 1 },
                        previewedActionTemplateId: longswordAction.id,
                    })
                )
            })
            it("it clear the actions this round to undefined ", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                ).toBeUndefined()
            })
            it("it knows the squaddie is not taking their turn", () => {
                expect(
                    OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                        gameEngineState
                    )
                ).toBeFalsy()
            })
            it("it does not have an action set in the player battle action builder", () => {
                expect(
                    PlayerBattleActionBuilderStateService.getAction(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeUndefined()
            })
            it("highlights the squaddie movement range", () => {
                expect(highlightRangeSpy).toBeCalled()
            })
        })
        describe("Cancel targeting on the second action", () => {
            beforeEach(() => {
                addActionsThisRoundThenCancelTargetSelection(
                    ActionsThisRoundService.new({
                        battleSquaddieId: battleSquaddie.battleSquaddieId,
                        startingLocation: { q: 0, r: 0 },
                        previewedActionTemplateId: longswordAction.id,
                        processedActions: [
                            ProcessedActionService.new({
                                decidedAction: undefined,
                                processedActionEffects: [
                                    ProcessedActionSquaddieEffectService.new({
                                        decidedActionEffect:
                                            DecidedActionSquaddieEffectService.new(
                                                {
                                                    template: longswordAction
                                                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                                    target: { q: 0, r: 1 },
                                                }
                                            ),
                                        results: undefined,
                                    }),
                                ],
                            }),
                        ],
                    })
                )
            })
            it("it keeps the existing battle squaddie in the actions this round ", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound.battleSquaddieId
                ).toEqual(battleSquaddie.battleSquaddieId)
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound.processedActions
                ).toHaveLength(1)
            })
            it("it knows the squaddie is still taking their turn", () => {
                expect(
                    OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                        gameEngineState
                    )
                ).toBeTruthy()
            })
            it("it has an actor in the player battle action builder", () => {
                expect(
                    PlayerBattleActionBuilderStateService.getActor(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    ).battleSquaddieId
                ).toEqual(battleSquaddie.battleSquaddieId)
            })
        })
    })
    describe("Player cancels target confirmation", () => {
        let gameEngineState: GameEngineState
        let battleHUDListener: BattleHUDListener
        let battleSquaddie: BattleSquaddie
        let longswordAction: ActionTemplate
        let highlightRangeSpy: jest.SpyInstance

        beforeEach(() => {
            ;({
                gameEngineState,
                playerSoldierBattleSquaddie: battleSquaddie,
                longswordAction,
            } = createGameEngineState({
                battleSquaddieLocation: { q: 1, r: 1 },
            }))

            highlightRangeSpy = jest.spyOn(
                DrawSquaddieUtilities,
                "highlightSquaddieRange"
            )

            battleHUDListener = new BattleHUDListener("battleHUDListener")

            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                ActionsThisRoundService.new({
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    startingLocation: { q: 0, r: 0 },
                    previewedActionTemplateId: longswordAction.id,
                    processedActions: [
                        ProcessedActionService.new({
                            decidedAction: undefined,
                            processedActionEffects: [
                                ProcessedActionSquaddieEffectService.new({
                                    decidedActionEffect:
                                        DecidedActionSquaddieEffectService.new({
                                            template: longswordAction
                                                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                            target: { q: 0, r: 1 },
                                        }),
                                    results: undefined,
                                }),
                            ],
                        }),
                    ],
                })

            PlayerBattleActionBuilderStateService.addAction({
                actionBuilderState:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                actionTemplate: longswordAction,
            })
            PlayerBattleActionBuilderStateService.setConsideredTarget({
                actionBuilderState:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                targetLocation: { q: 0, r: 1 },
            })

            highlightRangeSpy = jest.spyOn(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
                "highlightTiles"
            )

            battleHUDListener.receiveMessage({
                type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION,
                gameEngineState,
            })
        })

        afterEach(() => {
            highlightRangeSpy.mockRestore()
        })

        it("keeps the previewed action", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.previewedActionTemplateId
            ).toEqual(longswordAction.id)
        })

        it("highlights the range", () => {
            expect(highlightRangeSpy).toBeCalled()
        })
    })
    describe("Player ends their turn", () => {
        let battleHUDListener: BattleHUDListener
        let gameEngineState: GameEngineState
        let playerSoldierBattleSquaddie: BattleSquaddie
        let messageSpy: jest.SpyInstance
        let endTurnBattleAction: BattleAction

        beforeEach(() => {
            ;({ gameEngineState, playerSoldierBattleSquaddie } =
                createGameEngineState({}))

            SummaryHUDStateService.setMainSummaryPopover({
                battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: gameEngineState.repository,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            battleHUDListener = new BattleHUDListener("battleHUDListener")

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")

            endTurnBattleAction = BattleActionService.new({
                actor: {
                    battleSquaddieId:
                        playerSoldierBattleSquaddie.battleSquaddieId,
                },
                action: { isEndTurn: true },
                effect: { endTurn: true },
            })
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("can instruct squaddie to end turn when player clicks on End Turn button", () => {
            battleHUDListener.receiveMessage({
                type: MessageBoardMessageType.PLAYER_ENDS_TURN,
                gameEngineState,
                battleAction: endTurnBattleAction,
            })

            const decidedActionEndTurnEffect =
                DecidedActionEndTurnEffectService.new({
                    template: ActionEffectEndTurnTemplateService.new({}),
                })
            const processedAction = ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    actionPointCost: 1,
                    battleSquaddieId: "player_soldier_0",
                    actionTemplateName: "End Turn",
                    actionEffects: [decidedActionEndTurnEffect],
                }),
                processedActionEffects: [
                    ProcessedActionEndTurnEffectService.new({
                        decidedActionEffect: decidedActionEndTurnEffect,
                    }),
                ],
            })

            expect(
                ActionsThisRoundService.getProcessedActionToShow(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                ).processedActionEffects[0].type
            ).toEqual(ActionEffectType.END_TURN)

            const history =
                gameEngineState.battleOrchestratorState.battleState.recording
                    .history
            expect(history).toHaveLength(1)
            expect(history[0]).toStrictEqual({
                results: undefined,
                processedAction,
            })
            expect(
                playerSoldierBattleSquaddie.squaddieTurn.remainingActionPoints
            ).toEqual(0)
        })

        it("will add end turn to existing instruction", () => {
            const decidedActionMovementEffect =
                DecidedActionMovementEffectService.new({
                    template: ActionEffectMovementTemplateService.new({}),
                    destination: { q: 0, r: 1 },
                })
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                ActionsThisRoundService.new({
                    battleSquaddieId:
                        playerSoldierBattleSquaddie.battleSquaddieId,
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
                            processedActionEffects: [],
                        }),
                    ],
                })

            battleHUDListener.receiveMessage({
                type: MessageBoardMessageType.PLAYER_ENDS_TURN,
                gameEngineState,
                battleAction: endTurnBattleAction,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.processedActions
            ).toHaveLength(2)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.processedActions[1].processedActionEffects
            ).toHaveLength(1)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.processedActions[1]
                    .processedActionEffects[0].type
            ).toEqual(ActionEffectType.END_TURN)
            expect(
                ActionsThisRoundService.getProcessedActionEffectToShow(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                ).type
            ).toEqual(ActionEffectType.END_TURN)
        })

        it("tells the Action Builder to set end turn", () => {
            battleHUDListener.receiveMessage({
                type: MessageBoardMessageType.PLAYER_ENDS_TURN,
                gameEngineState,
                battleAction: endTurnBattleAction,
            })

            expect(
                PlayerBattleActionBuilderStateService.isActionSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeTruthy()
            expect(
                PlayerBattleActionBuilderStateService.getAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                ).endTurn
            ).toBeTruthy()
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
            expect(
                PlayerBattleActionBuilderStateService.getTarget(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                ).targetLocation
            ).toEqual({
                q: 0,
                r: 0,
            })
        })

        it("adds the Battle Action to the Battle Action Queue", () => {
            battleHUDListener.receiveMessage({
                type: MessageBoardMessageType.PLAYER_ENDS_TURN,
                gameEngineState,
                battleAction: endTurnBattleAction,
            })

            expect(
                BattleActionQueueService.peek(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionQueue
                )
            ).toEqual(endTurnBattleAction)
        })
    })
    describe("Player selects an action", () => {
        let battleHUDListener: BattleHUDListener
        let gameEngineState: GameEngineState
        let playerSoldierBattleSquaddie: BattleSquaddie
        let longswordAction: ActionTemplate

        beforeEach(() => {
            ;({
                gameEngineState,
                playerSoldierBattleSquaddie,
                longswordAction,
            } = createGameEngineState({}))

            const repository = gameEngineState.repository

            SummaryHUDStateService.setMainSummaryPopover({
                battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: repository,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            SummaryHUDStateService.createCommandWindow({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                objectRepository: repository,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler,
            })

            battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET
            )
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET,
                gameEngineState,
                actionTemplate: longswordAction,
                battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                mapStartingLocation: { q: 0, r: 0 },
            })
        })

        it("hides the command window", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.showPlayerCommand
            ).toBeFalsy()
        })

        it("updates the action builder actor", () => {
            expect(
                PlayerBattleActionBuilderStateService.isActorSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeTruthy()
            expect(
                PlayerBattleActionBuilderStateService.getActor(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                ).battleSquaddieId
            ).toEqual(playerSoldierBattleSquaddie.battleSquaddieId)
        })

        it("updates the action builder action", () => {
            expect(
                PlayerBattleActionBuilderStateService.isActionSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeTruthy()
            expect(
                PlayerBattleActionBuilderStateService.getAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                ).actionTemplate.id
            ).toEqual(longswordAction.id)
        })

        it("clears the action builder target", () => {
            expect(
                PlayerBattleActionBuilderStateService.isTargetConsidered(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeFalsy()
        })

        it("will not add to the history", () => {
            const history =
                gameEngineState.battleOrchestratorState.battleState.recording
                    .history
            expect(history).toHaveLength(0)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.previewedActionTemplateId
            ).toEqual(longswordAction.id)
        })

        it("will set the actions this round to the squaddie and its location", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.battleSquaddieId
            ).toEqual(playerSoldierBattleSquaddie.battleSquaddieId)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.startingLocation
            ).toEqual({
                q: 0,
                r: 0,
            })
        })
    })
    describe("Player selects a target", () => {
        let battleHUDListener: BattleHUDListener
        let gameEngineState: GameEngineState

        beforeEach(() => {
            let longswordAction: ActionTemplate
            ;({ gameEngineState, longswordAction } = createGameEngineState({}))

            PlayerBattleActionBuilderStateService.addAction({
                actionBuilderState:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                actionTemplate: longswordAction,
            })

            battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_TARGET_LOCATION
            )
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_LOCATION,
                gameEngineState,
                targetLocation: { q: 0, r: 1 },
            })
        })

        it("sets the target location", () => {
            expect(
                PlayerBattleActionBuilderStateService.isTargetConsidered(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeTruthy()
            expect(
                PlayerBattleActionBuilderStateService.getTarget(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toEqual({
                targetLocation: { q: 0, r: 1 },
                confirmed: false,
            })
        })

        it("shows the popover window for the target", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.TARGET
                    .battleSquaddieId
            ).toEqual("player_soldier_1")
        })
    })
    describe("Player confirms their action", () => {
        let gameEngineState: GameEngineState
        let longswordAction: ActionTemplate
        let thiefBattleSquaddie: BattleSquaddie
        let playerSoldierBattleSquaddie: BattleSquaddie

        beforeEach(() => {
            ;({
                gameEngineState,
                longswordAction,
                playerSoldierBattleSquaddie,
            } = createGameEngineState({}))
            ;({ battleSquaddie: thiefBattleSquaddie } =
                CreateNewSquaddieAndAddToRepository({
                    name: "Thief",
                    templateId: "Thief",
                    battleId: "Thief 0",
                    affiliation: SquaddieAffiliation.ENEMY,
                    squaddieRepository: gameEngineState.repository,
                    actionTemplates: [longswordAction],
                    attributes: {
                        maxHitPoints: 5,
                        movement: CreateNewSquaddieMovementWithTraits({
                            movementPerAction: 2,
                        }),
                        armorClass: 0,
                    },
                }))
            MissionMapService.addSquaddie(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                thiefBattleSquaddie.squaddieTemplateId,
                thiefBattleSquaddie.battleSquaddieId,
                { q: 1, r: 2 }
            )

            PlayerBattleActionBuilderStateService.setConsideredTarget({
                actionBuilderState:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                targetLocation: { q: 1, r: 2 },
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

            PlayerBattleActionBuilderStateService.addAction({
                actionBuilderState:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                actionTemplate: longswordAction,
            })

            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                ActionsThisRoundService.new({
                    battleSquaddieId:
                        playerSoldierBattleSquaddie.battleSquaddieId,
                    startingLocation: { q: 1, r: 1 },
                    previewedActionTemplateId: longswordAction.id,
                })

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_CONFIRMS_ACTION
            )
        })

        it("should create ActionsThisRound", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                gameEngineState,
            })

            const decidedActionSquaddieEffect =
                DecidedActionSquaddieEffectService.new({
                    template: longswordAction
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                    target: { q: 1, r: 2 },
                })
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                startingLocation: { q: 1, r: 1 },
                previewedActionTemplateId: undefined,
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            actionPointCost: 1,
                            battleSquaddieId:
                                playerSoldierBattleSquaddie.battleSquaddieId,
                            actionTemplateName: longswordAction.name,
                            actionTemplateId: longswordAction.id,
                            actionEffects: [decidedActionSquaddieEffect],
                        }),
                        processedActionEffects: [
                            ProcessedActionSquaddieEffectService.new({
                                decidedActionEffect:
                                    decidedActionSquaddieEffect,
                                results: {
                                    actingBattleSquaddieId:
                                        playerSoldierBattleSquaddie.battleSquaddieId,
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
                                    targetedBattleSquaddieIds: [
                                        thiefBattleSquaddie.battleSquaddieId,
                                    ],
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

        it("should create a confirmed action in the action builder", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                gameEngineState,
            })
            expect(
                PlayerBattleActionBuilderStateService.isTargetConfirmed(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeTruthy()
        })

        it("should consume the squaddie action points", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                gameEngineState,
            })
            const { squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    playerSoldierBattleSquaddie.battleSquaddieId
                )
            )

            const { actionPointsRemaining } = GetNumberOfActionPoints({
                squaddieTemplate,
                battleSquaddie: playerSoldierBattleSquaddie,
            })
            expect(actionPointsRemaining).toBe(3 - longswordAction.actionPoints)
        })

        describe("confirming an action mid turn", () => {
            beforeEach(() => {
                gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                    ActionsThisRoundService.new({
                        battleSquaddieId:
                            playerSoldierBattleSquaddie.battleSquaddieId,
                        startingLocation: { q: 1, r: 1 },
                        previewedActionTemplateId: longswordAction.id,
                        processedActions: [
                            ProcessedActionService.new({
                                decidedAction: DecidedActionService.new({
                                    battleSquaddieId:
                                        playerSoldierBattleSquaddie.battleSquaddieId,
                                    actionPointCost:
                                        longswordAction.actionPoints,
                                    actionTemplateName: longswordAction.name,
                                    actionTemplateId: longswordAction.id,
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
            })

            it("should add to existing instruction when confirmed mid turn", () => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                    gameEngineState,
                })
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound.processedActions
                ).toHaveLength(2)
                const newProcessedAction =
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound.processedActions[1]
                expect(
                    newProcessedAction.decidedAction.actionTemplateId
                ).toEqual(longswordAction.id)
                expect(
                    newProcessedAction.decidedAction.actionTemplateName
                ).toEqual(longswordAction.name)
                expect(
                    newProcessedAction.decidedAction.battleSquaddieId
                ).toEqual(playerSoldierBattleSquaddie.battleSquaddieId)

                expect(
                    newProcessedAction.decidedAction.actionEffects
                ).toHaveLength(1)
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

            it("should add the results to the history", () => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                    gameEngineState,
                })
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .recording.history
                ).toHaveLength(1)
                const mostRecentEvent: BattleEvent =
                    gameEngineState.battleOrchestratorState.battleState
                        .recording.history[0]
                expect(
                    mostRecentEvent.processedAction.processedActionEffects
                ).toHaveLength(1)
                expect(
                    mostRecentEvent.processedAction.processedActionEffects[0]
                        .decidedActionEffect.type
                ).toEqual(ActionEffectType.SQUADDIE)

                expect(
                    (
                        mostRecentEvent.processedAction
                            .processedActionEffects[0]
                            .decidedActionEffect as DecidedActionSquaddieEffect
                    ).template
                ).toEqual(
                    longswordAction
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate
                )

                const results = mostRecentEvent.results
                expect(results.actingBattleSquaddieId).toBe(
                    playerSoldierBattleSquaddie.battleSquaddieId
                )
                expect(results.targetedBattleSquaddieIds).toHaveLength(1)
                expect(results.targetedBattleSquaddieIds[0]).toBe(
                    thiefBattleSquaddie.battleSquaddieId
                )
                expect(
                    results.resultPerTarget[
                        thiefBattleSquaddie.battleSquaddieId
                    ]
                ).toBeTruthy()
            })

            it("should store the calculated results", () => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                    gameEngineState,
                })
                const mostRecentEvent: BattleEvent =
                    gameEngineState.battleOrchestratorState.battleState
                        .recording.history[0]
                const knightUsesLongswordOnThiefResults =
                    mostRecentEvent.results.resultPerTarget[
                        thiefBattleSquaddie.battleSquaddieId
                    ]
                const longswordActionDamage = (
                    longswordAction
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate
                ).damageDescriptions.BODY
                expect(knightUsesLongswordOnThiefResults.damageTaken).toBe(
                    longswordActionDamage
                )

                const { squaddieTemplate } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository,
                        thiefBattleSquaddie.battleSquaddieId
                    )
                )

                const { maxHitPoints, currentHitPoints } = GetHitPoints({
                    squaddieTemplate: squaddieTemplate,
                    battleSquaddie: thiefBattleSquaddie,
                })
                expect(currentHitPoints).toBe(
                    maxHitPoints - longswordActionDamage
                )
            })
        })
    })
})
