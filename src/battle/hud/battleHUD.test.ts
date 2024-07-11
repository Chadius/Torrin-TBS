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
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
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
import { DamageType } from "../../squaddie/squaddieService"
import { CreateNewSquaddieAndAddToRepository } from "../../utils/test/squaddie"
import { BattleSquaddieSelectedHUD } from "./BattleSquaddieSelectedHUD"
import { CampaignService } from "../../campaign/campaign"
import { ProcessedActionSquaddieEffectService } from "../../action/processed/processedActionSquaddieEffect"
import { DecidedActionSquaddieEffectService } from "../../action/decided/decidedActionSquaddieEffect"
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
import { BattlePhaseStateService } from "../orchestratorComponents/battlePhaseController"

describe("Battle HUD", () => {
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

        const createSquaddieAndAddToRepositoryAndMap = ({
            affiliation,
            repository,
            missionMap,
        }: {
            affiliation: SquaddieAffiliation
            repository: ObjectRepository
            missionMap: MissionMap
        }): {
            battleSquaddie: BattleSquaddie
        } => {
            const squaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    name: "squaddie template",
                    affiliation,
                    templateId: "templateId",
                }),
            })
            battleSquaddie = BattleSquaddieService.new({
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
            return {
                battleSquaddie,
            }
        }

        const createGameEngineState = ({
            repository,
            missionMap,
            teamAffiliation,
            battlePhase,
            battleSquaddieId,
        }: {
            missionMap: MissionMap
            teamAffiliation: SquaddieAffiliation
            battlePhase: BattlePhase
            repository: ObjectRepository
            battleSquaddieId: string
        }): GameEngineState => {
            const team = BattleSquaddieTeamService.new({
                id: "team",
                name: "team",
                affiliation: teamAffiliation,
                battleSquaddieIds: [battleSquaddieId],
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
                MessageBoardMessageType.PLAYER_SELECTS_SQUADDIE
            )

            return gameEngineState
        }

        beforeEach(() => {
            const repository = ObjectRepositoryService.new()
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 "],
                }),
            })
            const { battleSquaddie } = createSquaddieAndAddToRepositoryAndMap({
                affiliation: SquaddieAffiliation.PLAYER,
                repository,
                missionMap,
            })

            gameEngineState = createGameEngineState({
                teamAffiliation: SquaddieAffiliation.PLAYER,
                battlePhase: BattlePhase.PLAYER,
                missionMap,
                repository,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            })

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_SQUADDIE,
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

        it("will show the summary window on the left side", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.summaryPanelLeft.battleSquaddieId
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
                ;({ battleSquaddie: enemyBattleSquaddie } =
                    createSquaddieAndAddToRepositoryAndMap({
                        affiliation: SquaddieAffiliation.ENEMY,
                        repository,
                        missionMap,
                    }))

                gameEngineState = createGameEngineState({
                    teamAffiliation: SquaddieAffiliation.ENEMY,
                    battlePhase: BattlePhase.ENEMY,
                    missionMap,
                    repository,
                    battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                })

                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_SELECTS_SQUADDIE,
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
                        .summaryHUDState.summaryPanelRight.battleSquaddieId
                ).toEqual(enemyBattleSquaddie.battleSquaddieId)
            })
        })
    })
    describe("Player cancels target selection they were considering", () => {
        let gameEngineState: GameEngineState
        let battleHUDListener: BattleHUDListener
        let squaddieTemplate: SquaddieTemplate
        let battleSquaddie: BattleSquaddie
        let longswordAction: ActionTemplate
        let repository: ObjectRepository
        let battleMap: MissionMap
        let highlightRangeSpy: jest.SpyInstance

        beforeEach(() => {
            repository = ObjectRepositoryService.new()
            battleMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
                }),
            })
            highlightRangeSpy = jest.spyOn(
                DrawSquaddieUtilities,
                "highlightSquaddieRange"
            )

            longswordAction = ActionTemplateService.new({
                name: "longsword",
                id: "longswordActionId",
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
                            [DamageType.BODY]: 2,
                        },
                    }),
                ],
            })
            ;({
                squaddieTemplate: squaddieTemplate,
                battleSquaddie: battleSquaddie,
            } = CreateNewSquaddieAndAddToRepository({
                name: "PlayerSquaddie",
                templateId: "squaddieTemplateId",
                battleId: "battleSquaddieId",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository: repository,
                actionTemplates: [longswordAction],
            }))
            battleMap.addSquaddie(
                squaddieTemplate.squaddieId.templateId,
                battleSquaddie.battleSquaddieId,
                { q: 1, r: 1 }
            )
            battleHUDListener = new BattleHUDListener("battleHUDListener")
        })

        afterEach(() => {
            highlightRangeSpy.mockRestore()
        })

        const addActionsThisRoundThenCancelTargetSelection = (
            actionsThisRound: ActionsThisRound
        ) => {
            gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
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
                repository,
                campaign: CampaignService.default({}),
            })

            gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
                PlayerBattleActionBuilderStateService.new({})
            PlayerBattleActionBuilderStateService.setActor({
                actionBuilderState:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            })
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
        let squaddieTemplate: SquaddieTemplate
        let battleSquaddie: BattleSquaddie
        let longswordAction: ActionTemplate
        let repository: ObjectRepository
        let battleMap: MissionMap
        let highlightRangeSpy: jest.SpyInstance

        beforeEach(() => {
            repository = ObjectRepositoryService.new()
            battleMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
                }),
            })
            highlightRangeSpy = jest.spyOn(
                DrawSquaddieUtilities,
                "highlightSquaddieRange"
            )

            longswordAction = ActionTemplateService.new({
                name: "longsword",
                id: "longswordActionId",
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
                            [DamageType.BODY]: 2,
                        },
                    }),
                ],
            })
            ;({
                squaddieTemplate: squaddieTemplate,
                battleSquaddie: battleSquaddie,
            } = CreateNewSquaddieAndAddToRepository({
                name: "PlayerSquaddie",
                templateId: "squaddieTemplateId",
                battleId: "battleSquaddieId",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository: repository,
                actionTemplates: [longswordAction],
            }))
            battleMap.addSquaddie(
                squaddieTemplate.squaddieId.templateId,
                battleSquaddie.battleSquaddieId,
                { q: 1, r: 1 }
            )
            battleHUDListener = new BattleHUDListener("battleHUDListener")

            const actionsThisRound = ActionsThisRoundService.new({
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
            gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
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
                repository,
                campaign: CampaignService.default({}),
            })

            gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
                PlayerBattleActionBuilderStateService.new({})
            PlayerBattleActionBuilderStateService.setActor({
                actionBuilderState:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
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
        let missionMap: MissionMap
        let repository: ObjectRepository
        let playerSoldierBattleSquaddie: BattleSquaddie

        beforeEach(() => {
            repository = ObjectRepositoryService.new()
            missionMap = new MissionMap({
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
            teams.push(playerTeam)
            ;({ battleSquaddie: playerSoldierBattleSquaddie } =
                CreateNewSquaddieAndAddToRepository({
                    name: "Player Soldier",
                    templateId: "player_soldier",
                    battleId: "player_soldier_0",
                    affiliation: SquaddieAffiliation.PLAYER,
                    squaddieRepository: repository,
                }))
            BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
                "player_soldier_0",
            ])

            missionMap.addSquaddie("player_soldier", "player_soldier_0", {
                q: 0,
                r: 0,
            })

            const battlePhaseState = {
                currentAffiliation: BattlePhase.PLAYER,
                turnCount: 1,
            }

            const camera: BattleCamera = new BattleCamera()

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mocks.mockResourceHandler(
                    new MockedP5GraphicsBuffer()
                ),
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({
                        battleSquaddieSelectedHUD:
                            new BattleSquaddieSelectedHUD(),
                    }),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap,
                        camera,
                        battlePhaseState,
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

            SummaryHUDStateService.setLeftSummaryPanel({
                battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: repository,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
            })

            battleHUDListener = new BattleHUDListener("battleHUDListener")
        })

        it("can instruct squaddie to end turn when player clicks on End Turn button", () => {
            battleHUDListener.receiveMessage({
                type: MessageBoardMessageType.PLAYER_ENDS_TURN,
                gameEngineState,
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
    })
})
