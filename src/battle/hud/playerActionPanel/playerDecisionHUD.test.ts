import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../orchestrator/battleState"
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
import { beforeEach, describe, expect, it, MockInstance, vi } from "vitest"
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
import { DamageType, HealingType } from "../../../squaddie/squaddieService"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../../squaddie/attribute/attributeModifier"
import { AttributeType } from "../../../squaddie/attribute/attributeType"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { SquaddieTurnService } from "../../../squaddie/turn"
import { BattleHUDService } from "../battleHUD/battleHUD"
import { BattleCamera } from "../../battleCamera"
import { BattleHUDStateService } from "../battleHUD/battleHUDState"
import { SummaryHUDStateService } from "../summary/summaryHUD"
import { CampaignService } from "../../../campaign/campaign"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { MovementDecision } from "../../playerSelectionService/playerSelectionContext"

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
            gameEngineState,
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
            popup.label.textBox.text.includes("Need 2 action points")
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
            PlayerDecisionHUDService.draw(
                playerDecisionHUD,
                mockGraphicsContext
            )

            expect(drawSpy).toBeCalledTimes(1)
            drawSpy.mockRestore()
        })
        it("will not draw popup windows if they are undefined", () => {
            const drawSpy: MockInstance = vi.spyOn(PopupWindowService, "draw")

            const battleHUD = PlayerDecisionHUDService.new()
            PlayerDecisionHUDService.draw(battleHUD, mockGraphicsContext)

            expect(drawSpy).not.toBeCalled()
            drawSpy.mockRestore()
        })
    })

    describe("Player Considers an Action", () => {
        let mockP5GraphicsContext: MockedP5GraphicsBuffer
        let playerDecisionHUDListener: PlayerDecisionHUDListener
        let gameEngineState: GameEngineState
        let longswordAction: ActionTemplate

        beforeEach(() => {
            mockP5GraphicsContext = new MockedP5GraphicsBuffer()
            mockP5GraphicsContext.textWidth = vi.fn().mockReturnValue(1)
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
                            [DamageType.BODY]: 2,
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
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                true,
                        },
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            HEALING: true,
                        }),
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
                coordinate: battleSquaddieCoordinate ?? { q: 0, r: 0 },
            })

            const battleSquaddie2 = BattleSquaddieService.newBattleSquaddie({
                squaddieTemplateId: "player_soldier",
                battleSquaddieId: "player_soldier_1",
                squaddieTurn: SquaddieTurnService.new(),
            })
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                battleSquaddie2
            )
            BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
                "player_soldier_1",
            ])

            MissionMapService.addSquaddie({
                missionMap: missionMap,
                squaddieTemplateId: "player_soldier",
                battleSquaddieId: "player_soldier_1",
                coordinate: { q: 0, r: 1 },
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
                gameEngineState.repository,
                longswordAction
            )
            ObjectRepositoryService.addActionTemplate(
                gameEngineState.repository,
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

        beforeEach(() => {
            ;({ gameEngineState, longswordAction } = createGameEngineState({}))

            const repository = gameEngineState.repository

            SummaryHUDStateService.createActorTiles({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                objectRepository: repository,
                gameEngineState,
            })
            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler,
                graphicsBuffer: mockP5GraphicsContext,
            })
            playerDecisionHUDListener = new PlayerDecisionHUDListener(
                "PlayerDecisionHUDListener"
            )
            gameEngineState.messageBoard.addListener(
                playerDecisionHUDListener,
                MessageBoardMessageType.PLAYER_CONSIDERS_ACTION
            )
        })

        describe("considers a valid action", () => {
            beforeEach(() => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
                    gameEngineState,
                    useAction: {
                        actionTemplateId: longswordAction.id,
                        isEndTurn: false,
                    },
                })
            })

            it("notes which action was considered", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions.actionTemplateId
                ).toEqual(longswordAction.id)
            })
        })
        it("clears the invalid selection popup window when a valid action is considered", () => {
            PlayerDecisionHUDService.createPlayerInvalidSelectionPopup({
                playerDecisionHUD:
                    gameEngineState.battleOrchestratorState.playerDecisionHUD,
                message: {
                    type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                    gameEngineState,
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
                gameEngineState,
                useAction: {
                    actionTemplateId: longswordAction.id,
                    isEndTurn: false,
                },
            })

            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler,
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
                    gameEngineState,
                    useAction: {
                        actionTemplateId: undefined,
                        isEndTurn: true,
                    },
                })
            })

            it("notes which action was considered", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions.endTurn
                ).toEqual(true)
            })
        })
        describe("cancels consideration", () => {
            beforeEach(() => {
                gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.actionTemplateId =
                    longswordAction.id

                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
                    gameEngineState,
                    useAction: {
                        actionTemplateId: undefined,
                        isEndTurn: false,
                    },
                    cancelAction: {
                        actionTemplate: true,
                    },
                })
            })

            it("clears which action was considered", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions.actionTemplateId
                ).toBeUndefined()
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions.endTurn
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
                    type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
                    gameEngineState,
                    useAction: {
                        actionTemplateId: undefined,
                        isEndTurn: false,
                        movement: movementDecision,
                    },
                })
            })

            it("marks which path was considered", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions.movement
                ).toEqual(movementDecision)
            })

            it("can cancel consideration", () => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
                    gameEngineState,
                    useAction: {
                        actionTemplateId: undefined,
                        isEndTurn: false,
                        movement: undefined,
                    },
                    cancelAction: { movement: true },
                })

                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions.movement
                ).toBeUndefined()
            })
        })
    })
})
