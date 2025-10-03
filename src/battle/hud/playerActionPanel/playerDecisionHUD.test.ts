import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../battleState/battleState"
import { BattlePhase } from "../../orchestratorComponents/battlePhaseTracker"
import { ObjectRepositoryService } from "../../objectRepository"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import {
    CoordinateSystem,
    HexCoordinate,
} from "../../../hexMap/hexCoordinate/hexCoordinate"
import { PopupWindow, PopupWindowService } from "../popupWindow/popupWindow"
import { LabelService } from "../../../ui/label"
import { RectAreaService } from "../../../ui/rectArea"
import {
    PlayerDecisionHUDListener,
    PlayerDecisionHUDService,
    PopupWindowType,
} from "./playerDecisionHUD"
import * as mocks from "../../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import {
    BattlePhaseState,
    BattlePhaseStateService,
} from "../../orchestratorComponents/battlePhaseController"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import { BattleSquaddie, BattleSquaddieService } from "../../battleSquaddie"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../../battleSquaddieTeam"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { TargetConstraintsService } from "../../../action/targetConstraints"
import { CoordinateGeneratorShape } from "../../targeting/coordinateGenerator"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { Damage, Healing } from "../../../squaddie/squaddieService"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../../squaddie/attribute/attributeModifier"
import { Attribute } from "../../../squaddie/attribute/attribute"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { SquaddieTurnService } from "../../../squaddie/turn"
import { BattleHUDService } from "../battleHUD/battleHUD"
import { BattleCamera } from "../../battleCamera"
import { BattleHUDStateService } from "../battleHUD/battleHUDState"
import { SummaryHUDStateService } from "../summary/summaryHUD"
import { CampaignService } from "../../../campaign/campaign"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { MovementDecision } from "../../playerSelectionService/playerSelectionContext"
import { PlayerConsideredActionsService } from "../../battleState/playerConsideredActions"
import { SquaddieSelectorPanelService } from "./squaddieSelectorPanel/squaddieSelectorPanel"
import { BattleActionRecorderService } from "../../history/battleAction/battleActionRecorder"
import { BattleActionService } from "../../history/battleAction/battleAction"
import { PlayerCommandStateService } from "../playerCommand/playerCommandHUD"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngineState/gameEngineState"

describe("Player Decision HUD", () => {
    const differentSquaddiePopup: PopupWindow = PopupWindowService.new({
        label: LabelService.new({
            area: RectAreaService.new({
                left: 0,
                top: 0,
                width: 200,
                height: 100,
            }),
            text: "It's SQUADDIE_NAME turn",
            fontSize: 10,
            fontColor: [0, 0, 100],
            fillColor: [0, 0, 10],
            textBoxMargin: 8,
        }),
    })

    it("can set a popup window", () => {
        const playerDecisionHUD = PlayerDecisionHUDService.new()

        PlayerDecisionHUDService.setPopupWindow(
            playerDecisionHUD,
            differentSquaddiePopup,
            PopupWindowType.PLAYER_INVALID_SELECTION
        )

        expect(
            playerDecisionHUD.popupWindows[
                PopupWindowType.PLAYER_INVALID_SELECTION
            ]
        ).toEqual(differentSquaddiePopup)
    })
    it("can clear a popup window", () => {
        const playerDecisionHUD = PlayerDecisionHUDService.new()

        PlayerDecisionHUDService.setPopupWindow(
            playerDecisionHUD,
            differentSquaddiePopup,
            PopupWindowType.PLAYER_INVALID_SELECTION
        )

        PlayerDecisionHUDService.clearPopupWindow(
            playerDecisionHUD,
            PopupWindowType.PLAYER_INVALID_SELECTION
        )

        expect(
            playerDecisionHUD.popupWindows[
                PopupWindowType.PLAYER_INVALID_SELECTION
            ]
        ).toBeUndefined()
    })
    it("squaddie does not have enough action points to perform the action", () => {
        const gameEngineState = GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
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

        const playerDecisionHUDListener = new PlayerDecisionHUDListener(
            "playerDecisionHUDListener"
        )
        gameEngineState.messageBoard.addListener(
            playerDecisionHUDListener,
            MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID
        )

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
            playerDecisionHUD:
                gameEngineState.battleOrchestratorState.playerDecisionHUD,
            popupWindow: PopupWindowService.new({
                coordinateSystem: CoordinateSystem.WORLD,
                label: LabelService.new({
                    fontColor: [],
                    textBoxMargin: undefined,
                    fontSize: 10,
                    text: "Need 2 action points",
                    area: RectAreaService.new({
                        left: 0,
                        top: 0,
                        right: 10,
                        bottom: 10,
                    }),
                }),
            }),
        })

        expect(
            gameEngineState.battleOrchestratorState.playerDecisionHUD
                .popupWindows[PopupWindowType.PLAYER_INVALID_SELECTION]
        ).not.toBeUndefined()

        const popup =
            gameEngineState.battleOrchestratorState.playerDecisionHUD
                .popupWindows[PopupWindowType.PLAYER_INVALID_SELECTION]
        expect(
            popup!.label.textBox!.text.includes("Need 2 action points")
        ).toBeTruthy()
    })

    describe("draw", () => {
        let mockGraphicsContext: MockedP5GraphicsBuffer

        beforeEach(() => {
            mockGraphicsContext = new MockedP5GraphicsBuffer()
        })

        it("will draw popup windows if they are defined", () => {
            const drawSpy: MockInstance = vi.spyOn(PopupWindowService, "draw")

            const playerDecisionHUD = PlayerDecisionHUDService.new()

            PlayerDecisionHUDService.setPopupWindow(
                playerDecisionHUD,
                differentSquaddiePopup,
                PopupWindowType.PLAYER_INVALID_SELECTION
            )
            PlayerDecisionHUDService.drawPopupWindows(
                playerDecisionHUD,
                mockGraphicsContext
            )

            expect(drawSpy).toBeCalledTimes(1)
            drawSpy.mockRestore()
        })
        it("will not draw popup windows if they are undefined", () => {
            const drawSpy: MockInstance = vi.spyOn(PopupWindowService, "draw")

            const battleHUD = PlayerDecisionHUDService.new()
            PlayerDecisionHUDService.drawPopupWindows(
                battleHUD,
                mockGraphicsContext
            )

            expect(drawSpy).not.toBeCalled()
            drawSpy.mockRestore()
        })
    })

    const createGameEngineState = ({
        battlePhaseState,
        battleSquaddieCoordinate,
        missionMap,
    }: {
        battlePhaseState?: BattlePhaseState
        battleSquaddieCoordinate?: HexCoordinate
        missionMap?: MissionMap
    }): {
        gameEngineState: GameEngineState
        longswordAction: ActionTemplate
        healSelfAction: ActionTemplate
        playerSoldierBattleSquaddie: BattleSquaddie
        battleSquaddie2: BattleSquaddie
    } => {
        const repository = ObjectRepositoryService.new()
        missionMap =
            missionMap ??
            MissionMapService.new({
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
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 1,
                coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.ATTACK]: true,
                    }),
                    damageDescriptions: {
                        [Damage.BODY]: 2,
                    },
                }),
            ],
        })
        const healSelfAction = ActionTemplateService.new({
            id: "self",
            name: "self",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 0,
                coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        HEALING: true,
                    }),
                    attributeModifiers: [
                        AttributeModifierService.new({
                            type: Attribute.ARMOR,
                            amount: 1,
                            source: AttributeSource.CIRCUMSTANCE,
                        }),
                    ],
                    healingDescriptions: {
                        [Healing.LOST_HIT_POINTS]: 1,
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
                actionTemplateIds: [longswordAction.id, healSelfAction.id],
            })
        BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
            "player_soldier_0",
        ])

        MissionMapService.addSquaddie({
            missionMap: missionMap,
            squaddieTemplateId: "player_soldier",
            battleSquaddieId: "player_soldier_0",
            originMapCoordinate: battleSquaddieCoordinate ?? { q: 0, r: 0 },
        })

        const battleSquaddie2 = BattleSquaddieService.newBattleSquaddie({
            squaddieTemplateId: "player_soldier",
            battleSquaddieId: "player_soldier_1",
            squaddieTurn: SquaddieTurnService.new(),
        })
        ObjectRepositoryService.addBattleSquaddie(repository, battleSquaddie2)
        BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
            "player_soldier_1",
        ])

        MissionMapService.addSquaddie({
            missionMap: missionMap,
            squaddieTemplateId: "player_soldier",
            battleSquaddieId: "player_soldier_1",
            originMapCoordinate: { q: 0, r: 1 },
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
                }),
                battleHUDState: BattleHUDStateService.new({
                    summaryHUDState: SummaryHUDStateService.new(),
                }),
            }),
            repository,
            campaign: CampaignService.default(),
        })
        ObjectRepositoryService.addActionTemplate(
            gameEngineState.repository!,
            longswordAction
        )
        ObjectRepositoryService.addActionTemplate(
            gameEngineState.repository!,
            healSelfAction
        )

        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()

        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
        })

        return {
            gameEngineState,
            longswordAction,
            healSelfAction,
            playerSoldierBattleSquaddie,
            battleSquaddie2,
        }
    }

    describe("Player Considers an Action", () => {
        let mockP5GraphicsContext: MockedP5GraphicsBuffer
        let playerDecisionHUDListener: PlayerDecisionHUDListener
        let gameEngineState: GameEngineState
        let longswordAction: ActionTemplate
        let playerSoldierBattleSquaddie: BattleSquaddie

        beforeEach(() => {
            mockP5GraphicsContext = new MockedP5GraphicsBuffer()
            mockP5GraphicsContext.textWidth = vi.fn().mockReturnValue(1)
        })

        beforeEach(() => {
            ;({
                gameEngineState,
                longswordAction,
                playerSoldierBattleSquaddie,
            } = createGameEngineState({}))

            const repository = gameEngineState.repository!

            SummaryHUDStateService.createActorTiles({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                objectRepository: repository,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                campaignResources: gameEngineState.campaign.resources,
            })
            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler!,
                graphicsBuffer: mockP5GraphicsContext,
            })
            playerDecisionHUDListener = new PlayerDecisionHUDListener(
                "PlayerDecisionHUDListener"
            )
            gameEngineState.messageBoard.addListener(
                playerDecisionHUDListener,
                MessageBoardMessageType.PLAYER_CONSIDERS_ACTION
            )
            gameEngineState.messageBoard.addListener(
                playerDecisionHUDListener,
                MessageBoardMessageType.PLAYER_CONSIDERS_MOVEMENT
            )
            gameEngineState.messageBoard.addListener(
                playerDecisionHUDListener,
                MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS
            )
        })

        describe("considers a valid action", () => {
            beforeEach(() => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
                    playerConsideredActions:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerConsideredActions,
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState!,
                    playerDecisionHUD:
                        gameEngineState.battleOrchestratorState
                            .playerDecisionHUD,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    objectRepository: gameEngineState.repository!,
                    glossary: gameEngineState.battleOrchestratorState.glossary,
                    useAction: {
                        actionTemplateId: longswordAction.id,
                        isEndTurn: false,
                    },
                })
            })

            it("notes which action was considered", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions!.actionTemplateId
                ).toEqual(longswordAction.id)
            })
            it("creates a tile with the action", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!.actionSelectedTile
                ).not.toBeUndefined()
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!.actionSelectedTile!.actionName
                ).toEqual(longswordAction.name)
            })
        })
        it("clears the invalid selection popup window when a valid action is considered", () => {
            PlayerDecisionHUDService.createPlayerInvalidSelectionPopup({
                playerDecisionHUD:
                    gameEngineState.battleOrchestratorState.playerDecisionHUD,
                message: {
                    type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                    playerDecisionHUD:
                        gameEngineState.battleOrchestratorState
                            .playerDecisionHUD,
                    popupWindow: PopupWindowService.new({}),
                },
                popupWindow: PopupWindowService.new({}),
            })
            expect(
                gameEngineState.battleOrchestratorState.playerDecisionHUD
                    .popupWindows[PopupWindowType.PLAYER_INVALID_SELECTION]
            ).not.toBeUndefined()

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                playerDecisionHUD:
                    gameEngineState.battleOrchestratorState.playerDecisionHUD,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository!,
                glossary: gameEngineState.battleOrchestratorState.glossary,
                useAction: {
                    actionTemplateId: longswordAction.id,
                    isEndTurn: false,
                },
            })

            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler!,
                graphicsBuffer: mockP5GraphicsContext,
            })

            expect(
                gameEngineState.battleOrchestratorState.playerDecisionHUD
                    .popupWindows[PopupWindowType.PLAYER_INVALID_SELECTION]
            ).toBeUndefined()
        })

        describe("considers ending the turn", () => {
            beforeEach(() => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
                    playerConsideredActions:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerConsideredActions,
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState!,
                    playerDecisionHUD:
                        gameEngineState.battleOrchestratorState
                            .playerDecisionHUD,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    objectRepository: gameEngineState.repository!,
                    glossary: gameEngineState.battleOrchestratorState.glossary,
                    useAction: {
                        actionTemplateId: undefined,
                        isEndTurn: true,
                    },
                })
            })

            it("notes which action was considered", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions!.endTurn
                ).toEqual(true)
            })
        })
        describe("cancels consideration", () => {
            beforeEach(() => {
                gameEngineState.battleOrchestratorState.battleState.playerConsideredActions!.actionTemplateId =
                    longswordAction.id

                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                    playerCommandState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState!.playerCommandState,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    playerConsideredActions:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerConsideredActions,
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState!,
                    playerDecisionHUD:
                        gameEngineState.battleOrchestratorState
                            .playerDecisionHUD,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    objectRepository: gameEngineState.repository!,
                })
            })

            it("clears which action was considered", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions!.actionTemplateId
                ).toBeUndefined()
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions!.endTurn
                ).toBeFalsy()
            })
        })
        describe("considers moving squaddie", () => {
            let movementDecision: MovementDecision
            beforeEach(() => {
                movementDecision = {
                    actionPointCost: 2,
                    coordinates: [
                        { q: 0, r: 0 },
                        { q: 1, r: 0 },
                    ],
                    destination: { q: 1, r: 0 },
                }
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CONSIDERS_MOVEMENT,
                    playerConsideredActions:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerConsideredActions,
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState!,
                    playerDecisionHUD:
                        gameEngineState.battleOrchestratorState
                            .playerDecisionHUD,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    objectRepository: gameEngineState.repository!,
                    movementDecision,
                })
            })

            it("previews the movement points", () => {
                expect(
                    SquaddieTurnService.getMovementActionPointsPreviewedByPlayer(
                        playerSoldierBattleSquaddie.squaddieTurn
                    )
                ).toBe(2)
            })

            it("can cancel consideration and refund points", () => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                    playerCommandState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState!.playerCommandState,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    playerConsideredActions:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerConsideredActions,
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState!,
                    playerDecisionHUD:
                        gameEngineState.battleOrchestratorState
                            .playerDecisionHUD,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    objectRepository: gameEngineState.repository!,
                })

                expect(
                    SquaddieTurnService.getMovementActionPointsSpentAndCannotBeRefunded(
                        playerSoldierBattleSquaddie.squaddieTurn
                    )
                ).toBe(0)
            })
        })
    })

    describe("Player Cancels Considered Actions", () => {
        let gameEngineState: GameEngineState
        let playerDecisionHUDListener: PlayerDecisionHUDListener
        let mockP5GraphicsContext: MockedP5GraphicsBuffer
        let battleSquaddie: BattleSquaddie

        beforeEach(() => {
            mockP5GraphicsContext = new MockedP5GraphicsBuffer()
            ;({ gameEngineState, playerSoldierBattleSquaddie: battleSquaddie } =
                createGameEngineState({
                    missionMap: MissionMapService.new({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: ["1 1 1 1 "],
                        }),
                    }),
                }))

            playerDecisionHUDListener = new PlayerDecisionHUDListener(
                "PlayerDecisionHUDListener"
            )
            gameEngineState.messageBoard.addListener(
                playerDecisionHUDListener,
                MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS
            )
            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler!,
                graphicsBuffer: mockP5GraphicsContext,
            })

            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: "longsword",
            })

            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState!.playerCommandState =
                PlayerCommandStateService.new()
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState!.playerCommandState.battleSquaddieId =
                battleSquaddie.battleSquaddieId
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState!.playerCommandState.squaddieAffiliationHue = 10
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState!.playerCommandState.selectedActionTemplateId =
                "longsword"
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState!.playerCommandState.playerSelectedSquaddieAction = true
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
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
                playerCommandState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!.playerCommandState,
                objectRepository: gameEngineState.repository!,
            })
        })

        it("resets the player command state", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!.playerCommandState
            ).toEqual(
                expect.objectContaining({
                    consideredActionTemplateId: undefined,
                    playerSelectedSquaddieAction: false,
                    selectedActionTemplateId: undefined,
                    playerSelectedEndTurn: false,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    squaddieAffiliationHue: 10,
                })
            )
        })
        it("removes the action and targets from the battle action decision", () => {
            expect(
                BattleActionDecisionStepService.isActionSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )
            ).toBeFalsy()
            expect(
                BattleActionDecisionStepService.isTargetConsidered(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )
            ).toBeFalsy()
        })
    })

    describe("Player wants to select the next squaddie", () => {
        let gameEngineState: GameEngineState
        let playerDecisionHUDListener: PlayerDecisionHUDListener
        let mockP5GraphicsContext: MockedP5GraphicsBuffer
        let messageSpy: MockInstance

        beforeEach(() => {
            mockP5GraphicsContext = new MockedP5GraphicsBuffer()
            const repository = ObjectRepositoryService.new()
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 "],
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
            ;["playerSquaddie0", "playerSquaddie1", "playerSquaddie2"].forEach(
                (battleSquaddieId, index) => {
                    SquaddieRepositoryService.createNewSquaddieAndAddToRepository(
                        {
                            name: battleSquaddieId,
                            templateId: "player_soldier",
                            battleId: battleSquaddieId,
                            affiliation: SquaddieAffiliation.PLAYER,
                            objectRepository: repository,
                            actionTemplateIds: [],
                        }
                    )
                    BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
                        battleSquaddieId,
                    ])
                    MissionMapService.addSquaddie({
                        missionMap: missionMap,
                        squaddieTemplateId: "player_soldier",
                        battleSquaddieId: battleSquaddieId,
                        originMapCoordinate: { q: 0, r: index },
                    })
                }
            )

            gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.new({
                        teams,
                        battlePhaseState: {
                            turnCount: 0,
                            currentAffiliation: BattlePhase.PLAYER,
                        },
                        missionId: "missionId",
                        campaignId: "campaignId",
                        missionMap,
                        battleActionDecisionStep:
                            BattleActionDecisionStepService.new(),
                    }),
                    battleHUDState: BattleHUDStateService.new({
                        summaryHUDState: SummaryHUDStateService.new(),
                    }),
                }),
                repository,
                campaign: CampaignService.default(),
            })

            playerDecisionHUDListener = new PlayerDecisionHUDListener(
                "PlayerDecisionHUDListener"
            )

            gameEngineState.messageBoard.addListener(
                playerDecisionHUDListener,
                MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE
            )
            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")

            SummaryHUDStateService.createActorTiles({
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                campaignResources: gameEngineState.campaign.resources,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                objectRepository: repository,
            })

            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler!,
                graphicsBuffer: mockP5GraphicsContext,
            })
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

        it("selects the first squaddie in the team and pan the camera towards them", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })

            expect(messageSpy).toBeCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                })
            )

            const calls = getPlayerSelectsAndLocksSquaddieCalls()
            expect(calls[0][0].battleSquaddieSelectedId).toEqual(
                "playerSquaddie0"
            )

            expect(
                gameEngineState.battleOrchestratorState.battleState.camera.isPanning()
            ).toBeTruthy()
        })

        it("shows the squaddie selector panel with the first squaddie already selected", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })
            expect(
                SquaddieSelectorPanelService.getSelectedBattleSquaddieId(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .squaddieSelectorPanel!
                )
            ).toBe("playerSquaddie0")
        })

        it("rotates through the squaddies if you keep pressing next", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })
            expect(
                SquaddieSelectorPanelService.getSelectedBattleSquaddieId(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .squaddieSelectorPanel!
                )
            ).toBe("playerSquaddie1")

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })
            expect(
                SquaddieSelectorPanelService.getSelectedBattleSquaddieId(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .squaddieSelectorPanel!
                )
            ).toBe("playerSquaddie2")

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })
            expect(
                SquaddieSelectorPanelService.getSelectedBattleSquaddieId(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .squaddieSelectorPanel!
                )
            ).toBe("playerSquaddie0")

            const calls = getPlayerSelectsAndLocksSquaddieCalls()
            expect(calls).toHaveLength(4)
            expect(calls[1][0].battleSquaddieSelectedId).toEqual(
                "playerSquaddie1"
            )
            expect(calls[2][0].battleSquaddieSelectedId).toEqual(
                "playerSquaddie2"
            )
            expect(calls[3][0].battleSquaddieSelectedId).toEqual(
                "playerSquaddie0"
            )
        })

        it("clears player considerations", () => {
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions =
                PlayerConsideredActionsService.new()
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions!.movement =
                {
                    destination: { q: 1, r: 0 },
                    coordinates: [],
                    actionPointCost: 1,
                }

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .playerConsideredActions!.movement
            ).toBeUndefined()
        })

        it("if a squaddie is taking a turn, they are always next", () => {
            const { battleSquaddie } =
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository!,
                    "playerSquaddie2"
                )

            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId: battleSquaddie.battleSquaddieId,
                    },
                    action: {
                        isMovement: true,
                    },
                    effect: {
                        movement: {
                            startCoordinate: { q: 0, r: 0 },
                            endCoordinate: { q: 0, r: 0 },
                        },
                    },
                })
            )
            BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )
            messageSpy.mockClear()
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                gameEngineState,
            })

            expect(messageSpy).not.toBeCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    battleSquaddieSelectedId: "playerSquaddie0",
                })
            )
            expect(messageSpy).toBeCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    battleSquaddieSelectedId: "playerSquaddie2",
                })
            )

            expect(
                gameEngineState.battleOrchestratorState.battleState.camera.isPanning()
            ).toBeTruthy()
        })
    })
})
