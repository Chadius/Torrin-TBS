import { MessageBoard } from "../../message/messageBoard"
import {
    BattleHUDListener,
    BattleHUDService,
    PopupWindowType,
} from "./battleHUD"
import {
    MessageBoardMessage,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
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
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { OrchestratorUtilities } from "../orchestratorComponents/orchestratorUtils"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
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
import { SummaryHUDStateService, SummaryPopoverType } from "./summaryHUD"
import { BattleHUDStateService } from "./battleHUDState"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"
import {
    BattlePhaseState,
    BattlePhaseStateService,
} from "../orchestratorComponents/battlePhaseController"
import {
    BattleAction,
    BattleActionActionContextService,
    BattleActionQueueService,
    BattleActionService,
} from "../history/battleAction"
import { SquaddieSummaryPopoverPosition } from "./playerActionPanel/squaddieSummaryPopover"
import { TargetingShape } from "../targeting/targetingShapeGenerator"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import {
    DEFAULT_ACTION_POINTS_PER_TURN,
    SquaddieTurnService,
} from "../../squaddie/turn"
import { CreateNewSquaddieMovementWithTraits } from "../../squaddie/movement"
import {
    DamageType,
    GetHitPoints,
    GetNumberOfActionPoints,
} from "../../squaddie/squaddieService"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { BattleEvent, BattleEventService } from "../history/battleEvent"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { BattleActionSquaddieChangeService } from "../history/battleActionSquaddieChange"
import { SquaddieSquaddieResultsService } from "../history/squaddieSquaddieResults"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../hexMap/mapGraphicsLayer"
import {
    HighlightPulseBlueColor,
    HighlightPulseRedColor,
} from "../../hexMap/hexDrawingUtils"
import { MouseButton, MouseClickService } from "../../utils/mouseConfig"
import { MovementCalculatorService } from "../calculator/movement/movementCalculator"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"

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
                terrainTileMap: TerrainTileMapService.new({
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
                        [Trait.ATTACK]: true,
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
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Player Soldier",
                templateId: "player_soldier",
                battleId: "player_soldier_0",
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository: repository,
                actionTemplateIds: [longswordAction.id],
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
                battleHUD: BattleHUDService.new({}),
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
            campaign: CampaignService.default(),
        })
        ObjectRepositoryService.addActionTemplate(
            gameEngineState.repository,
            longswordAction
        )

        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
            BattleActionDecisionStepService.new()

        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
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
            fileAccessHUD = FileAccessHUDService.new()
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
            MissionMapService.addSquaddie({
                missionMap,
                squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                location: {
                    q: 0,
                    r: 0,
                },
            })

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
            MissionMapService.addSquaddie({
                missionMap,
                squaddieTemplateId: battleSquaddie.squaddieTemplateId,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                location: {
                    q: 0,
                    r: 0,
                },
            })

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
                campaign: CampaignService.default(),
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
                    mouseClick: MouseClickService.new({
                        x: 0,
                        y: 0,
                        button: MouseButton.ACCEPT,
                    }),
                },
            })
        })

        it("will begin to construct an action decision step using the selected squaddie", () => {
            expect(
                BattleActionDecisionStepService.isActorSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeTruthy()
            expect(
                BattleActionDecisionStepService.getActor(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                ).battleSquaddieId
            ).toEqual(battleSquaddie.battleSquaddieId)
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
            expect(playerCommandState.selectedActionTemplateId).toBeUndefined()
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
                        mouseClick: MouseClickService.new({
                            x: 0,
                            y: 0,
                            button: MouseButton.ACCEPT,
                        }),
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
                    mouseMovement: { x: 0, y: 0 },
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
                    mouseMovement: { x: 0, y: 0 },
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
                    mouseMovement: { x: 0, y: 0 },
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
                    mouseMovement: { x: 0, y: 0 },
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
                    mouseClick: MouseClickService.new({
                        x: 0,
                        y: 0,
                        button: MouseButton.ACCEPT,
                    }),
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
                    mouseMovement: { x: 0, y: 0 },
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
                    mouseClick: MouseClickService.new({
                        x: 0,
                        y: 0,
                        button: MouseButton.ACCEPT,
                    }),
                },
            })
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouseMovement: { x: 0, y: 0 },
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

        it("highlights the map with the squaddie's range", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouseMovement: { x: 0, y: 0 },
                },
                squaddieSummaryPopoverPosition:
                    SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap.terrainTileMap,
                    id: battleSquaddie.battleSquaddieId,
                })
            ).not.toBeUndefined()
        })
    })
    describe("Player cancels target selection they were considering", () => {
        let gameEngineState: GameEngineState
        let battleHUDListener: BattleHUDListener
        let battleSquaddie: BattleSquaddie
        let longswordAction: ActionTemplate
        let addGraphicsLayerSpy: jest.SpyInstance

        beforeEach(() => {
            ;({
                gameEngineState,
                playerSoldierBattleSquaddie: battleSquaddie,
                longswordAction,
            } = createGameEngineState({
                battleSquaddieLocation: { q: 1, r: 1 },
            }))

            addGraphicsLayerSpy = jest.spyOn(
                DrawSquaddieUtilities,
                "highlightSquaddieRange"
            )

            battleHUDListener = new BattleHUDListener("battleHUDListener")
        })

        afterEach(() => {
            addGraphicsLayerSpy.mockRestore()
        })

        const addActionsThisRoundThenCancelTargetSelection = (
            actionsThisRound: ActionsThisRound
        ) => {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                actionsThisRound

            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                actionTemplate: longswordAction,
            })

            addGraphicsLayerSpy = jest.spyOn(
                TerrainTileMapService,
                "addGraphicsLayer"
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
                    BattleActionDecisionStepService.getAction(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeUndefined()
            })
            it("highlights the squaddie movement range", () => {
                expect(addGraphicsLayerSpy).toBeCalled()
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
                    BattleActionDecisionStepService.getActor(
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
        let addGraphicsLayerSpy: jest.SpyInstance

        beforeEach(() => {
            ;({
                gameEngineState,
                playerSoldierBattleSquaddie: battleSquaddie,
                longswordAction,
            } = createGameEngineState({
                battleSquaddieLocation: { q: 1, r: 1 },
            }))

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

            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                actionTemplate: longswordAction,
            })
            BattleActionDecisionStepService.setConsideredTarget({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                targetLocation: { q: 0, r: 1 },
            })

            addGraphicsLayerSpy = jest.spyOn(
                TerrainTileMapService,
                "addGraphicsLayer"
            )

            battleHUDListener.receiveMessage({
                type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION,
                gameEngineState,
            })
        })

        afterEach(() => {
            addGraphicsLayerSpy.mockRestore()
        })

        it("keeps the previewed action", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.previewedActionTemplateId
            ).toEqual(longswordAction.id)
        })

        it("highlights the range", () => {
            expect(addGraphicsLayerSpy).toBeCalled()
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

        describe("End turn", () => {
            beforeEach(() => {
                battleHUDListener.receiveMessage({
                    type: MessageBoardMessageType.PLAYER_ENDS_TURN,
                    gameEngineState,
                    battleAction: endTurnBattleAction,
                })
            })

            it("can instruct squaddie to end turn when player clicks on End Turn button", () => {
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
                    gameEngineState.battleOrchestratorState.battleState
                        .recording.history
                expect(history).toHaveLength(1)
                expect(history[0]).toStrictEqual(
                    BattleEventService.new({
                        results: undefined,
                        processedAction,
                    })
                )
                expect(
                    playerSoldierBattleSquaddie.squaddieTurn
                        .remainingActionPoints
                ).toEqual(0)
            })

            it("tells the Action Builder to set end turn", () => {
                expect(
                    BattleActionDecisionStepService.isActionSet(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.getAction(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    ).endTurn
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.isTargetConsidered(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.isTargetConfirmed(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.getTarget(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    ).targetLocation
                ).toEqual({
                    q: 0,
                    r: 0,
                })
            })

            it("adds the Battle Action to the Battle Action Queue", () => {
                expect(
                    BattleActionQueueService.peek(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionQueue
                    )
                ).toEqual(endTurnBattleAction)
            })

            it("will submit an event saying the action is ready", () => {
                const expectedMessage: MessageBoardMessage = {
                    type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
                    gameEngineState,
                    recommendedMode:
                        BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
                }

                expect(messageSpy).toBeCalledWith(expectedMessage)
            })
        })
    })
    describe("Player selects an action", () => {
        let battleHUDListener: BattleHUDListener
        let gameEngineState: GameEngineState
        let playerSoldierBattleSquaddie: BattleSquaddie
        let longswordAction: ActionTemplate
        let messageSpy: jest.SpyInstance

        beforeEach(() => {
            ;({
                gameEngineState,
                playerSoldierBattleSquaddie,
                longswordAction,
            } = createGameEngineState({}))

            const repository = gameEngineState.repository
            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")

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
        })

        describe("Action requires a target", () => {
            beforeEach(() => {
                battleHUDListener = new BattleHUDListener("battleHUDListener")
                gameEngineState.messageBoard.addListener(
                    battleHUDListener,
                    MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET
                )
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET,
                    gameEngineState,
                    actionTemplateId: longswordAction.id,
                    battleSquaddieId:
                        playerSoldierBattleSquaddie.battleSquaddieId,
                    mapStartingLocation: { q: 0, r: 0 },
                    mouseLocation: { x: 0, y: 0 },
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
                    BattleActionDecisionStepService.isActorSet(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.getActor(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    ).battleSquaddieId
                ).toEqual(playerSoldierBattleSquaddie.battleSquaddieId)
            })

            it("updates the action builder action", () => {
                expect(
                    BattleActionDecisionStepService.isActionSet(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.getAction(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    ).actionTemplate.id
                ).toEqual(longswordAction.id)
            })

            it("clears the action builder target", () => {
                expect(
                    BattleActionDecisionStepService.isTargetConsidered(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeFalsy()
            })

            it("will not add to the history", () => {
                const history =
                    gameEngineState.battleOrchestratorState.battleState
                        .recording.history
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

            it("will submit an event saying the action is ready", () => {
                const expectedMessage: MessageBoardMessage = {
                    type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
                    gameEngineState,
                    recommendedMode:
                        BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
                }

                expect(messageSpy).toBeCalledWith(expectedMessage)
            })
        })

        describe("Player does not have enough action points to perform action", () => {
            beforeEach(() => {
                battleHUDListener = new BattleHUDListener("battleHUDListener")
                gameEngineState.messageBoard.addListener(
                    battleHUDListener,
                    MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET
                )
                gameEngineState.repository.actionTemplatesById[
                    longswordAction.id
                ].actionPoints = 3
                SquaddieTurnService.spendActionPoints(
                    playerSoldierBattleSquaddie.squaddieTurn,
                    2
                )

                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET,
                    gameEngineState,
                    actionTemplateId: longswordAction.id,
                    battleSquaddieId:
                        playerSoldierBattleSquaddie.battleSquaddieId,
                    mapStartingLocation: { q: 0, r: 0 },
                    mouseLocation: { x: 0, y: 0 },
                })
            })

            it("sends a message stating the player selection is invalid", () => {
                expect(messageSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                        gameEngineState,
                        reason: "Need 3 action points",
                    })
                )
            })
        })
    })

    describe("Player selects a target", () => {
        let battleHUDListener: BattleHUDListener
        let gameEngineState: GameEngineState

        beforeEach(() => {
            let longswordAction: ActionTemplate
            ;({ gameEngineState, longswordAction } = createGameEngineState({}))

            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
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
                BattleActionDecisionStepService.isTargetConsidered(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeTruthy()
            expect(
                BattleActionDecisionStepService.getTarget(
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
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    name: "Thief",
                    templateId: "Thief",
                    battleId: "Thief 0",
                    affiliation: SquaddieAffiliation.ENEMY,
                    objectRepository: gameEngineState.repository,
                    actionTemplateIds: [longswordAction.id],
                    attributes: {
                        maxHitPoints: 5,
                        movement: CreateNewSquaddieMovementWithTraits({
                            movementPerAction: 2,
                        }),
                        armorClass: 0,
                    },
                }))
            MissionMapService.addSquaddie({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                squaddieTemplateId: thiefBattleSquaddie.squaddieTemplateId,
                battleSquaddieId: thiefBattleSquaddie.battleSquaddieId,
                location: {
                    q: 1,
                    r: 2,
                },
            })

            BattleActionDecisionStepService.setConsideredTarget({
                actionDecisionStep:
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

            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
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
                                results: SquaddieSquaddieResultsService.new({
                                    actingBattleSquaddieId:
                                        playerSoldierBattleSquaddie.battleSquaddieId,
                                    actionContext:
                                        BattleActionActionContextService.new({
                                            actingSquaddieModifiers: [],
                                            actingSquaddieRoll: {
                                                occurred: false,
                                                rolls: [],
                                            },
                                            targetSquaddieModifiers: {
                                                [thiefBattleSquaddie.battleSquaddieId]:
                                                    [],
                                            },
                                        }),
                                    squaddieChanges: [
                                        BattleActionSquaddieChangeService.new({
                                            actorDegreeOfSuccess:
                                                DegreeOfSuccess.SUCCESS,
                                            damageTaken: 2,
                                            healingReceived: 0,
                                            attributesAfter:
                                                InBattleAttributesService.new({
                                                    armyAttributes: {
                                                        armorClass: 0,
                                                        maxHitPoints: 5,
                                                        movement: {
                                                            crossOverPits:
                                                                false,
                                                            movementPerAction: 2,
                                                            passThroughWalls:
                                                                false,
                                                        },
                                                    },
                                                    currentHitPoints: 3,
                                                }),
                                            attributesBefore:
                                                InBattleAttributesService.new({
                                                    armyAttributes: {
                                                        armorClass: 0,
                                                        maxHitPoints: 5,
                                                        movement: {
                                                            crossOverPits:
                                                                false,
                                                            movementPerAction: 2,
                                                            passThroughWalls:
                                                                false,
                                                        },
                                                    },
                                                    currentHitPoints: 5,
                                                }),
                                            battleSquaddieId: "Thief 0",
                                        }),
                                    ],
                                    targetedBattleSquaddieIds: [
                                        thiefBattleSquaddie.battleSquaddieId,
                                    ],
                                }),
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
                BattleActionDecisionStepService.isTargetConfirmed(
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
                    results.squaddieChanges.find(
                        (change) =>
                            change.battleSquaddieId ===
                            thiefBattleSquaddie.battleSquaddieId
                    )
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
                    mostRecentEvent.results.squaddieChanges.find(
                        (change) =>
                            change.battleSquaddieId ===
                            thiefBattleSquaddie.battleSquaddieId
                    )
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
    describe("Popover window has expired", () => {
        let missionMap: MissionMap
        let gameEngineState: GameEngineState
        let playerSoldierBattleSquaddie: BattleSquaddie
        let battleSquaddie2: BattleSquaddie

        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 1 "],
                }),
            })
            ;({
                gameEngineState,
                playerSoldierBattleSquaddie,
                battleSquaddie2,
            } = createGameEngineState({ missionMap }))

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.SUMMARY_POPOVER_EXPIRES
            )

            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: gameEngineState.repository,
                gameEngineState,
                expirationTime: 999,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                battleSquaddieId: battleSquaddie2.battleSquaddieId,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: gameEngineState.repository,
                gameEngineState,
                expirationTime: 1999,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            TerrainTileMapService.addGraphicsLayer(
                missionMap.terrainTileMap,
                MapGraphicsLayerService.new({
                    id: playerSoldierBattleSquaddie.battleSquaddieId,
                    highlightedTileDescriptions: [
                        {
                            tiles: [
                                { q: 0, r: 0 },
                                { q: 0, r: 1 },
                            ],
                            pulseColor: HighlightPulseBlueColor,
                        },
                    ],
                    type: MapGraphicsLayerType.HOVERED_OVER_SQUADDIE,
                })
            )
            TerrainTileMapService.addGraphicsLayer(
                missionMap.terrainTileMap,
                MapGraphicsLayerService.new({
                    id: battleSquaddie2.battleSquaddieId,
                    highlightedTileDescriptions: [
                        {
                            tiles: [
                                { q: 0, r: 2 },
                                { q: 0, r: 3 },
                            ],
                            pulseColor: HighlightPulseRedColor,
                        },
                    ],
                    type: MapGraphicsLayerType.HOVERED_OVER_SQUADDIE,
                })
            )
        })
        it("will close the summary window", () => {
            const summaryHUDState =
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SUMMARY_POPOVER_EXPIRES,
                gameEngineState,
                popoverType: SummaryPopoverType.MAIN,
            })

            expect(
                summaryHUDState.squaddieSummaryPopoversByType.MAIN
            ).toBeUndefined()
            expect(
                summaryHUDState.squaddieSummaryPopoversByType.TARGET
            ).not.toBeUndefined()

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SUMMARY_POPOVER_EXPIRES,
                gameEngineState,
                popoverType: SummaryPopoverType.TARGET,
            })

            expect(
                summaryHUDState.squaddieSummaryPopoversByType.TARGET
            ).toBeUndefined()
        })
        it("will remove the map highlights", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SUMMARY_POPOVER_EXPIRES,
                gameEngineState,
                popoverType: SummaryPopoverType.MAIN,
            })

            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap.terrainTileMap,
                    id: playerSoldierBattleSquaddie.battleSquaddieId,
                })
            ).toBeUndefined()

            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap.terrainTileMap,
                    id: battleSquaddie2.battleSquaddieId,
                })
            ).not.toBeUndefined()

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SUMMARY_POPOVER_EXPIRES,
                gameEngineState,
                popoverType: SummaryPopoverType.TARGET,
            })

            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap.terrainTileMap,
                    id: battleSquaddie2.battleSquaddieId,
                })
            ).toBeUndefined()
        })
    })
    describe("Player wants to select the next squaddie", () => {
        let gameEngineState: GameEngineState
        let battleSquaddie: BattleSquaddie
        let battleSquaddie2: BattleSquaddie
        let battleHUDListener: BattleHUDListener
        let messageSpy: jest.SpyInstance

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
                MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE
            )
            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })

        const getPlayerSelectsAndLocksSquaddieCalls = () => {
            return messageSpy.mock.calls.filter(
                (c) =>
                    c[0].type ===
                    MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )
        }

        it("selects any available squaddie", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })

            expect(messageSpy).toBeCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                })
            )

            const calls = getPlayerSelectsAndLocksSquaddieCalls()
            expect(calls[0][0].battleSquaddieSelectedId).toEqual(
                battleSquaddie.battleSquaddieId
            )

            expect(
                gameEngineState.battleOrchestratorState.battleState.camera.isPanning()
            ).toBeTruthy()

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .nextSquaddieBattleSquaddieIdsToCycleThrough
            ).toContain(battleSquaddie2.battleSquaddieId)
        })

        it("skips any squaddie who took their turn", () => {
            SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })

            expect(messageSpy).toBeCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                })
            )

            const calls = getPlayerSelectsAndLocksSquaddieCalls()
            expect(calls[0][0].battleSquaddieSelectedId).toEqual(
                battleSquaddie2.battleSquaddieId
            )
        })

        it("will reset to the first squaddie if it exhausts other choices", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })

            let calls = getPlayerSelectsAndLocksSquaddieCalls()
            const firstSquaddieId = calls[0][0].battleSquaddieSelectedId

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })

            calls = getPlayerSelectsAndLocksSquaddieCalls()
            const secondSquaddieId = calls[1][0].battleSquaddieSelectedId

            expect(firstSquaddieId).not.toEqual(secondSquaddieId)

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })
            calls = getPlayerSelectsAndLocksSquaddieCalls()
            const thirdSquaddieId = calls[2][0].battleSquaddieSelectedId

            expect(thirdSquaddieId).not.toBeUndefined()
            expect([firstSquaddieId, secondSquaddieId]).toContain(
                thirdSquaddieId
            )
        })
    })
    describe("Player wants to move a squaddie", () => {
        let gameEngineState: GameEngineState
        let battleHUDListener: BattleHUDListener
        let battleSquaddie: BattleSquaddie
        let movementCalculatorSpy: jest.SpyInstance
        let messageSpy: jest.SpyInstance

        beforeEach(() => {
            ;({ gameEngineState, playerSoldierBattleSquaddie: battleSquaddie } =
                createGameEngineState({
                    missionMap: MissionMapService.new({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: ["1 1 1 1 "],
                        }),
                    }),
                }))
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            })

            battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION
            )

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouseClick: MouseClickService.new({
                        x: 0,
                        y: 0,
                        button: MouseButton.ACCEPT,
                    }),
                },
            })

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
        })
        afterEach(() => {
            movementCalculatorSpy.mockRestore()
            messageSpy.mockRestore()
        })

        describe("calculator says the movement is invalid", () => {
            beforeEach(() => {})

            const sendMessageToMove = () => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION,
                    gameEngineState,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    targetLocation: { q: -100, r: 9001 },
                })
            }

            it("sends a message stating the player selection is invalid", () => {
                movementCalculatorSpy = jest
                    .spyOn(MovementCalculatorService, "isMovementPossible")
                    .mockReturnValue(false)

                sendMessageToMove()

                expect(messageSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                        gameEngineState,
                        reason: "out of range",
                    })
                )
            })

            it("does not complete the action", () => {
                movementCalculatorSpy = jest
                    .spyOn(MovementCalculatorService, "isMovementPossible")
                    .mockReturnValue(false)

                sendMessageToMove()

                expect(
                    BattleActionDecisionStepService.isActionRecordReadyToAnimate(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeFalsy()
            })
        })

        describe("calculator returns a valid path", () => {
            beforeEach(() => {
                movementCalculatorSpy = jest
                    .spyOn(MovementCalculatorService, "isMovementPossible")
                    .mockReturnValue(true)

                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION,
                    gameEngineState,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    targetLocation: { q: 0, r: 2 },
                })
            })

            it("sets the actor and is ready to animate", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                ).not.toBeUndefined()
                expect(
                    BattleActionDecisionStepService.isActorSet(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.getActor(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    ).battleSquaddieId
                ).toEqual(battleSquaddie.battleSquaddieId)
                expect(
                    BattleActionDecisionStepService.isActionSet(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.getAction(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    ).movement
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.isTargetConsidered(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.isTargetConfirmed(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.getTarget(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    ).targetLocation
                ).toEqual({
                    q: 0,
                    r: 2,
                })
            })

            it("adds a processed action to the history", () => {
                const decidedActionMovementEffect =
                    DecidedActionMovementEffectService.new({
                        template: ActionEffectMovementTemplateService.new({}),
                        destination: { q: 0, r: 2 },
                    })
                const processedAction = ProcessedActionService.new({
                    decidedAction: DecidedActionService.new({
                        battleSquaddieId: "player_soldier_0",
                        actionPointCost: 1,
                        actionTemplateName: "Move",
                        actionEffects: [decidedActionMovementEffect],
                    }),
                    processedActionEffects: [
                        ProcessedActionMovementEffectService.new({
                            decidedActionEffect: decidedActionMovementEffect,
                        }),
                    ],
                })

                const history =
                    gameEngineState.battleOrchestratorState.battleState
                        .recording.history
                expect(history).toHaveLength(1)
                expect(history[0]).toStrictEqual(
                    BattleEventService.new({
                        results: undefined,
                        processedAction: processedAction,
                    })
                )
            })

            it("consumes the squaddie actions", () => {
                expect(
                    battleSquaddie.squaddieTurn.remainingActionPoints
                ).toEqual(DEFAULT_ACTION_POINTS_PER_TURN - 1)
            })

            it("adds a battle action to move", () => {
                const squaddieBattleAction = BattleActionService.new({
                    actor: {
                        battleSquaddieId: battleSquaddie.battleSquaddieId,
                    },
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startLocation: { q: 0, r: 0 },
                            endLocation: { q: 0, r: 2 },
                        },
                    },
                })

                expect(
                    BattleActionQueueService.peek(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionQueue
                    )
                ).toEqual(squaddieBattleAction)
            })

            it("updates the squaddie location", () => {
                const mapDatum = MissionMapService.getByBattleSquaddieId(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                    battleSquaddie.battleSquaddieId
                )
                expect(mapDatum).not.toBeUndefined()
                expect(mapDatum.mapLocation).toEqual({ q: 0, r: 2 })
            })

            it("will submit an event saying the action is ready", () => {
                const expectedMessage: MessageBoardMessage = {
                    type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
                    gameEngineState,
                    recommendedMode:
                        BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
                }

                expect(messageSpy).toBeCalledWith(expectedMessage)
            })
        })

        describe("add an additional movement action during a turn", () => {
            beforeEach(() => {
                movementCalculatorSpy = jest
                    .spyOn(MovementCalculatorService, "isMovementPossible")
                    .mockReturnValue(true)

                const decidedActionMovementEffect =
                    DecidedActionMovementEffectService.new({
                        template: ActionEffectMovementTemplateService.new({}),
                        destination: { q: 0, r: 1 },
                    })
                const processedAction = ProcessedActionService.new({
                    decidedAction: DecidedActionService.new({
                        battleSquaddieId: "player_soldier_0",
                        actionPointCost: 1,
                        actionTemplateName: "Move",
                        actionEffects: [decidedActionMovementEffect],
                    }),
                    processedActionEffects: [
                        ProcessedActionMovementEffectService.new({
                            decidedActionEffect: decidedActionMovementEffect,
                        }),
                    ],
                })

                gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                    ActionsThisRoundService.new({
                        battleSquaddieId: battleSquaddie.battleSquaddieId,
                        startingLocation: { q: 0, r: 0 },
                        previewedActionTemplateId: undefined,
                        processedActions: [processedAction],
                    })

                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION,
                    gameEngineState,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    targetLocation: { q: 0, r: 2 },
                })
            })

            it("when user clicks on new location, will add movement to existing instruction", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound.processedActions
                ).toHaveLength(2)
                const decidedActionMovementEffect =
                    DecidedActionMovementEffectService.new({
                        template: ActionEffectMovementTemplateService.new({}),
                        destination: { q: 0, r: 2 },
                    })
                const processedAction = ProcessedActionService.new({
                    decidedAction: DecidedActionService.new({
                        actionPointCost: 1,
                        battleSquaddieId: battleSquaddie.battleSquaddieId,
                        actionTemplateName: "Move",
                        actionEffects: [decidedActionMovementEffect],
                    }),
                    processedActionEffects: [
                        ProcessedActionMovementEffectService.new({
                            decidedActionEffect: decidedActionMovementEffect,
                        }),
                    ],
                })
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound.processedActions[1]
                ).toEqual(processedAction)
                ActionsThisRoundService.nextProcessedActionEffectToShow(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                )
                expect(
                    ActionsThisRoundService.getProcessedActionEffectToShow(
                        gameEngineState.battleOrchestratorState.battleState
                            .actionsThisRound
                    )
                ).toEqual(
                    ProcessedActionMovementEffectService.new({
                        decidedActionEffect: decidedActionMovementEffect,
                    })
                )
            })

            it("adds a movement action and confirmed target to the action builder", () => {
                expect(
                    BattleActionDecisionStepService.isActionSet(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.getAction(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    ).movement
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.isTargetConsidered(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.isTargetConfirmed(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.getTarget(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    ).targetLocation
                ).toEqual({
                    q: 0,
                    r: 2,
                })
            })

            it("will update squaddie location to destination and spend action points", () => {
                expect(
                    MissionMapService.getByBattleSquaddieId(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                        battleSquaddie.battleSquaddieId
                    )
                ).toEqual({
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    squaddieTemplateId: battleSquaddie.squaddieTemplateId,
                    mapLocation: { q: 0, r: 2 },
                })
                expect(
                    battleSquaddie.squaddieTurn.remainingActionPoints
                ).toEqual(DEFAULT_ACTION_POINTS_PER_TURN - 1)
                expect(
                    ActionsThisRoundService.getProcessedActionEffectToShow(
                        gameEngineState.battleOrchestratorState.battleState
                            .actionsThisRound
                    ).type
                ).toEqual(ActionEffectType.MOVEMENT)
            })
        })
    })
    describe("player wants to cancel their squaddie selection", () => {
        let gameEngineState: GameEngineState
        let battleHUDListener: BattleHUDListener
        let battleSquaddie: BattleSquaddie

        beforeEach(() => {
            ;({ gameEngineState, playerSoldierBattleSquaddie: battleSquaddie } =
                createGameEngineState({
                    missionMap: MissionMapService.new({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: ["1 1 1 1 "],
                        }),
                    }),
                }))
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
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
            battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_CANCELS_SQUADDIE_SELECTION
            )
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )
        })
        it("closes the HUD", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CANCELS_SQUADDIE_SELECTION,
                gameEngineState,
            })
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()
        })
        it("clears the battle action builder", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CANCELS_SQUADDIE_SELECTION,
                gameEngineState,
            })
            expect(
                BattleActionDecisionStepService.isActorSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeFalsy()
        })

        describe("ignore attempts to cancel if the squaddie has already acted this round", () => {
            beforeEach(() => {
                gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                    ActionsThisRoundService.new({
                        battleSquaddieId: battleSquaddie.battleSquaddieId,
                        startingLocation: { q: 0, r: 0 },
                        processedActions: [
                            ProcessedActionService.new({
                                decidedAction: undefined,
                                processedActionEffects: [
                                    ProcessedActionMovementEffectService.new({
                                        decidedActionEffect:
                                            DecidedActionMovementEffectService.new(
                                                {
                                                    template: undefined,
                                                    destination: { q: 0, r: 1 },
                                                }
                                            ),
                                    }),
                                ],
                            }),
                        ],
                    })
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CANCELS_SQUADDIE_SELECTION,
                    gameEngineState,
                })
            })
            it("keeps the HUD open", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                ).not.toBeUndefined()
            })
            it("maintains the battle action builder", () => {
                expect(
                    BattleActionDecisionStepService.isActorSet(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.getActor(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toEqual({ battleSquaddieId: battleSquaddie.battleSquaddieId })
            })
        })
    })
    describe("player selects an empty tile at the start of the turn", () => {
        let gameEngineState: GameEngineState
        let battleSquaddie: BattleSquaddie
        let battleHUDListener: BattleHUDListener
        beforeEach(() => {
            ;({ gameEngineState, playerSoldierBattleSquaddie: battleSquaddie } =
                createGameEngineState({}))
            battleHUDListener = new BattleHUDListener("battleHUDListener")
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            })

            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_EMPTY_TILE
            )
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouseClick: MouseClickService.new({
                        x: 0,
                        y: 0,
                        button: MouseButton.ACCEPT,
                    }),
                },
            })
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                ActionsThisRoundService.new({
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    startingLocation: { q: 0, r: 0 },
                    previewedActionTemplateId: "consider using this action",
                })

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_EMPTY_TILE,
                gameEngineState,
                location: { q: 1, r: 0 },
            })
        })
        it("closes the HUD", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()
        })
        it("clears the battle action builder", () => {
            expect(
                BattleActionDecisionStepService.isActorSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeFalsy()
        })
        it("clears actionsThisRound", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            ).toBeUndefined()
        })
    })
})
