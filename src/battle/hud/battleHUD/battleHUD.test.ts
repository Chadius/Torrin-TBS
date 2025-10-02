import { MessageBoard } from "../../../message/messageBoard"
import { BattleHUDService } from "./battleHUD"
import {
    MessageBoardMessage,
    MessageBoardMessagePlayerControlledSquaddieNeedsNextAction,
    MessageBoardMessageType,
} from "../../../message/messageBoardMessage"
import {
    BattlePhase,
    TBattlePhase,
} from "../../orchestratorComponents/battlePhaseTracker"
import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../battleState/battleState"
import {
    FileAccessHUD,
    FileAccessHUDService,
} from "../fileAccess/fileAccessHUD"
import * as mocks from "../../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../squaddie/id"
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../../squaddie/squaddieAffiliation"
import { BattleSquaddie, BattleSquaddieService } from "../../battleSquaddie"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../actionDecision/battleActionDecisionStep"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { CampaignService } from "../../../campaign/campaign"
import { BattleCamera } from "../../battleCamera"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../../battleSquaddieTeam"
import { SummaryHUDStateService } from "../summary/summaryHUD"
import { BattleHUDState, BattleHUDStateService } from "./battleHUDState"
import {
    BattlePhaseState,
    BattlePhaseStateService,
} from "../../orchestratorComponents/battlePhaseController"
import {
    BattleAction,
    BattleActionService,
} from "../../history/battleAction/battleAction"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../../hexMap/hexCoordinate/hexCoordinate"
import {
    DEFAULT_ACTION_POINTS_PER_TURN,
    SquaddieTurnService,
} from "../../../squaddie/turn"
import { SquaddieMovementService } from "../../../squaddie/movement"
import {
    Damage,
    Healing,
    SquaddieService,
} from "../../../squaddie/squaddieService"
import { DegreeOfSuccess } from "../../calculator/actionCalculator/degreeOfSuccess"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../../history/battleAction/battleActionSquaddieChange"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import {
    MapGraphicsLayer,
    MapGraphicsLayerType,
} from "../../../hexMap/mapLayer/mapGraphicsLayer"
import { MovementCalculatorService } from "../../calculator/movement/movementCalculator"
import { BattleOrchestratorMode } from "../../orchestrator/battleOrchestrator"
import { BattleActionRecorderService } from "../../history/battleAction/battleActionRecorder"
import { BattleActionActorContextService } from "../../history/battleAction/battleActionActorContext"
import { BattleActionQueueService } from "../../history/battleAction/battleActionQueue"
import { TargetConstraintsService } from "../../../action/targetConstraints"
import { ArmyAttributesService } from "../../../squaddie/armyAttributes"
import { RollResultService } from "../../calculator/actionCalculator/rollResult"
import { ActionTilePosition } from "../playerActionPanel/tile/actionTilePosition"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { CoordinateGeneratorShape } from "../../targeting/coordinateGenerator"
import { BattleHUDListener } from "./battleHUDListener"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../../squaddie/attribute/attributeModifier"
import { Attribute } from "../../../squaddie/attribute/attribute"
import { SquaddieSelectorPanelService } from "../playerActionPanel/squaddieSelectorPanel/squaddieSelectorPanel"
import { PlayerConsideredActionsService } from "../../battleState/playerConsideredActions"
import { ButtonStatus } from "../../../ui/button/buttonStatus"
import { CampaignResourcesService } from "../../../campaign/campaignResources"
import { PlayerCommandStateService } from "../playerCommand/playerCommandHUD"
import { ActionValidityByIdCacheService } from "../../actionValidity/cache/actionValidityByIdCache"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngineState/gameEngineState"

describe("Battle HUD", () => {
    let mockP5GraphicsContext: MockedP5GraphicsBuffer

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
        playerSoldierSquaddieTemplate: SquaddieTemplate
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
        const {
            battleSquaddie: playerSoldierBattleSquaddie,
            squaddieTemplate: playerSoldierSquaddieTemplate,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
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
            playerSoldierSquaddieTemplate,
            battleSquaddie2,
        }
    }

    describe("enable buttons as a reaction", () => {
        let fileAccessHUDSpy: MockInstance
        let fileAccessHUD: FileAccessHUD
        let battleHUDListener: BattleHUDListener
        let listenerSpy: MockInstance
        let messageBoard: MessageBoard
        let gameEngineStateWithPlayerPhase: GameEngineState

        beforeEach(() => {
            fileAccessHUDSpy = vi.spyOn(FileAccessHUDService, "enableButtons")
            fileAccessHUD = FileAccessHUDService.new()
            FileAccessHUDService.draw(fileAccessHUD, mockP5GraphicsContext)
            fileAccessHUD.data
                .getUIObjects()
                .loadButton!.changeStatus({ newStatus: ButtonStatus.DISABLED })
            fileAccessHUD.data
                .getUIObjects()
                .saveButton!.changeStatus({ newStatus: ButtonStatus.DISABLED })

            battleHUDListener = new BattleHUDListener("battleHUDListener")
            listenerSpy = vi.spyOn(battleHUDListener, "receiveMessage")
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
            expect(
                fileAccessHUD.data.getUIObjects().loadButton!.getStatus()
            ).toEqual(ButtonStatus.READY)
            expect(
                fileAccessHUD.data.getUIObjects().saveButton!.getStatus()
            ).toEqual(ButtonStatus.READY)
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

            expect(
                fileAccessHUD.data.getUIObjects().loadButton!.getStatus()
            ).toEqual(ButtonStatus.READY)
            expect(
                fileAccessHUD.data.getUIObjects().saveButton!.getStatus()
            ).toEqual(ButtonStatus.READY)

            expect(fileAccessHUDSpy).toBeCalled()
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
            teamAffiliation: TSquaddieAffiliation
            battlePhase: TBattlePhase
            repository: ObjectRepository
        }): {
            gameEngineState: GameEngineState
            battleSquaddie: BattleSquaddie
        } => {
            const squaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    name: "squaddie template",
                    affiliation: teamAffiliation,
                    squaddieTemplateId: "templateId",
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
                originMapCoordinate: {
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
                resourceHandler: mocks.mockResourceHandler(
                    mockP5GraphicsContext
                ),
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
        })

        const sendMessageViaMouseClick = () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
            })

            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!!,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler!,
                graphicsBuffer: mockP5GraphicsContext,
            })
        }

        it("will begin to construct an action decision step using the selected squaddie", () => {
            sendMessageViaMouseClick()
            expect(
                BattleActionDecisionStepService.isActorSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )
            ).toBeTruthy()
            expect(
                BattleActionDecisionStepService.getActor(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )?.battleSquaddieId
            ).toEqual(battleSquaddie.battleSquaddieId)
        })

        it("will set up the squaddie selector panel to point at the selected squaddie", () => {
            sendMessageViaMouseClick()
            expect(
                SquaddieSelectorPanelService.getSelectedBattleSquaddieId(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .squaddieSelectorPanel!
                )
            ).toBe(battleSquaddie.battleSquaddieId)
        })

        it("knows after selecting the player the hud has not selected actions", () => {
            sendMessageViaMouseClick()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!!.playerCommandState
                    .playerSelectedSquaddieAction
            ).toBeFalsy()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!!.playerCommandState.playerSelectedEndTurn
            ).toBeFalsy()
        })

        it("will show the actor tile", () => {
            sendMessageViaMouseClick()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!!.squaddieNameTiles["ACTOR_NAME"]!
                    .battleSquaddieId
            ).toEqual(battleSquaddie.battleSquaddieId)
        })

        it("knows after selecting the player the hud has not selected actions", () => {
            sendMessageViaMouseClick()
            let playerCommandState =
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!!.playerCommandState
            expect(playerCommandState.playerSelectedSquaddieAction).toBeFalsy()
            expect(playerCommandState.playerSelectedEndTurn).toBeFalsy()
            expect(playerCommandState.selectedActionTemplateId).toBeUndefined()
        })

        it("begin creating a turn when a squaddie is selected", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
            })
            expect(
                BattleActionDecisionStepService.isActorSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )
            ).toBeTruthy()
            expect(
                BattleActionDecisionStepService.getActor(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )?.battleSquaddieId
            ).toEqual(battleSquaddie.battleSquaddieId)
        })

        it("will clear player considerations", () => {
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions =
                PlayerConsideredActionsService.new()
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.actionTemplateId =
                "WOW COOL ACTION ID"
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.markedActionPoints = 2
            sendMessageViaMouseClick()
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .playerConsideredActions
            ).toEqual(PlayerConsideredActionsService.new())
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
                })

                SummaryHUDStateService.draw({
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState!!,
                    gameEngineState,
                    resourceHandler: gameEngineState.resourceHandler!,
                    graphicsBuffer: mockP5GraphicsContext,
                })
            })

            it("will show the summary window on the right side", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!!.squaddieNameTiles[
                        ActionTilePosition.PEEK_RIGHT_NAME
                    ]?.battleSquaddieId
                ).toEqual(enemyBattleSquaddie.battleSquaddieId)
            })

            it("the right side will not expire", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!!.squaddieToPeekAt?.expirationTime
                ).toBeUndefined()
            })
        })
    })
    describe("Player peeks at a squaddie", () => {
        let gameEngineState: GameEngineState
        let battleSquaddie: BattleSquaddie
        let battleHUDListener: BattleHUDListener

        beforeEach(() => {
            ;({ gameEngineState, playerSoldierBattleSquaddie: battleSquaddie } =
                createGameEngineState({
                    missionMap: MissionMapService.new({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: ["1 1 1 "],
                        }),
                    }),
                }))

            battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE
            )
        })

        describe("tells the summary hud it peeked at a squaddie", () => {
            const selectionMethods = [
                {
                    name: "mouse click",
                    selectionMethod: {
                        mouse: { x: 0, y: 0 },
                    },
                },
                {
                    name: "directly selecting the squaddie coordinate",
                    selectionMethod: {
                        mapCoordinate: { q: 0, r: 0 },
                    },
                },
            ]

            it.each(selectionMethods)(`$name`, ({ selectionMethod }) => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                    battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                    selectionMethod,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState!,
                    objectRepository: gameEngineState.repository!,
                    campaignResources: CampaignResourcesService.default(),
                    squaddieAllMovementCache:
                        gameEngineState.battleOrchestratorState.cache
                            .searchResultsCache,
                })

                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!?.squaddieToPeekAt
                ).toEqual({
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    actionPanelPositions: {
                        nameAndPortrait: ActionTilePosition.PEEK_PLAYABLE_NAME,
                        status: ActionTilePosition.PEEK_PLAYABLE_STATUS,
                    },
                    expirationTime: expect.any(Number),
                })
            })
        })

        it("will call the Summary HUD to open a new main window", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                objectRepository: gameEngineState.repository!,
                campaignResources: CampaignResourcesService.default(),
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
                squaddieAllMovementCache:
                    gameEngineState.battleOrchestratorState.cache
                        .searchResultsCache,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!?.squaddieToPeekAt?.battleSquaddieId
            ).toEqual(battleSquaddie.battleSquaddieId)
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!?.squaddieToPeekAt?.expirationTime
            ).not.toBeUndefined()
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
            })
            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!!,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler!,
                graphicsBuffer: mockP5GraphicsContext,
            })
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                objectRepository: gameEngineState.repository!,
                campaignResources: CampaignResourcesService.default(),
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
                squaddieAllMovementCache:
                    gameEngineState.battleOrchestratorState.cache
                        .searchResultsCache,
            })
            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!!,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler!,
                graphicsBuffer: mockP5GraphicsContext,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!.squaddieNameTiles["ACTOR_NAME"]
            ).not.toBeUndefined()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!.squaddieNameTiles["PEEK_PLAYABLE_NAME"]
            ).toBeUndefined()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!.squaddieNameTiles["PEEK_RIGHT_NAME"]
            ).toBeUndefined()
        })

        it("does not highlight range for normally controllable squaddies", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                objectRepository: gameEngineState.repository!,
                campaignResources: CampaignResourcesService.default(),
                battleSquaddieSelectedId: "player_soldier_0",
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
                squaddieAllMovementCache:
                    gameEngineState.battleOrchestratorState.cache
                        .searchResultsCache,
            })

            const graphicsLayer = TerrainTileMapService.getGraphicsLayer({
                terrainTileMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap.terrainTileMap,
                id: battleSquaddie.battleSquaddieId,
            })
            expect(graphicsLayer).toBeUndefined()
        })

        it("highlights ranges for normally uncontrollable squaddies", () => {
            ObjectRepositoryService.addSquaddie({
                repo: gameEngineState.repository!,
                squaddieTemplate: SquaddieTemplateService.new({
                    squaddieId: SquaddieIdService.new({
                        squaddieTemplateId: "enemy",
                        name: "enemy",
                        affiliation: SquaddieAffiliation.ENEMY,
                    }),
                }),
                battleSquaddie: BattleSquaddieService.new({
                    battleSquaddieId: "enemy",
                    squaddieTemplateId: "enemy",
                }),
            })

            MissionMapService.addSquaddie({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                squaddieTemplateId: "enemy",
                battleSquaddieId: "enemy",
                originMapCoordinate: { q: 0, r: 2 },
            })

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                objectRepository: gameEngineState.repository!,
                campaignResources: CampaignResourcesService.default(),
                battleSquaddieSelectedId: "enemy",
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
                squaddieAllMovementCache:
                    gameEngineState.battleOrchestratorState.cache
                        .searchResultsCache,
            })

            const graphicsLayer = TerrainTileMapService.getGraphicsLayer({
                terrainTileMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap.terrainTileMap,
                id: "enemy",
            })
            expect(graphicsLayer?.type).toEqual(
                MapGraphicsLayerType.HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE
            )
        })
    })
    describe("Player cancels target confirmation", () => {
        let gameEngineState: GameEngineState
        let battleHUDListener: BattleHUDListener
        let battleSquaddie: BattleSquaddie
        let longswordAction: ActionTemplate
        let addGraphicsLayerSpy: MockInstance

        beforeEach(() => {
            ;({
                gameEngineState,
                playerSoldierBattleSquaddie: battleSquaddie,
                longswordAction,
            } = createGameEngineState({
                battleSquaddieCoordinate: { q: 1, r: 1 },
            }))

            battleHUDListener = new BattleHUDListener("battleHUDListener")

            const actionStep: BattleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionStep,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionStep,
                actionTemplateId: longswordAction.id,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionStep,
                targetCoordinate: { q: 0, r: 1 },
            })

            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: longswordAction.id,
            })
            BattleActionDecisionStepService.setConsideredTarget({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                targetCoordinate: { q: 0, r: 1 },
            })

            addGraphicsLayerSpy = vi.spyOn(
                TerrainTileMapService,
                "addGraphicsLayer"
            )

            battleHUDListener.receiveMessage({
                type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository!,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
            })
        })

        afterEach(() => {
            addGraphicsLayerSpy.mockRestore()
        })

        it("keeps the previewed action", () => {
            expect(
                BattleActionDecisionStepService.getAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )?.actionTemplateId
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
        let messageSpy: MockInstance
        let endTurnBattleAction: BattleAction

        beforeEach(() => {
            ;({ gameEngineState, playerSoldierBattleSquaddie } =
                createGameEngineState({}))

            battleHUDListener = new BattleHUDListener("battleHUDListener")

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")

            endTurnBattleAction = BattleActionService.new({
                actor: {
                    actorBattleSquaddieId:
                        playerSoldierBattleSquaddie.battleSquaddieId,
                },
                action: { isEndTurn: true },
                effect: { endTurn: true },
            })
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("will update the origin map coordinate to match the current", () => {
            MissionMapService.updateBattleSquaddieCoordinate({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleSquaddieId:
                    endTurnBattleAction.actor.actorBattleSquaddieId,
                coordinate: {
                    q: 0,
                    r: 2,
                },
            })

            battleHUDListener.receiveMessage({
                type: MessageBoardMessageType.PLAYER_ENDS_TURN,
                gameEngineState,
                battleAction: endTurnBattleAction,
            })

            const mapInfo = MissionMapService.getByBattleSquaddieId(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                endTurnBattleAction.actor.actorBattleSquaddieId
            )
            expect(
                HexCoordinateService.areEqual(mapInfo.originMapCoordinate, {
                    q: 0,
                    r: 2,
                })
            ).toBeTruthy()
            expect(
                HexCoordinateService.areEqual(
                    mapInfo.originMapCoordinate,
                    mapInfo.currentMapCoordinate
                )
            ).toBeTruthy()
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
                expect(
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                ).toEqual(endTurnBattleAction)
                expect(
                    SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                        playerSoldierBattleSquaddie.squaddieTurn
                    )
                ).toEqual(0)
            })

            it("tells the Action Builder to set end turn", () => {
                expect(
                    BattleActionDecisionStepService.isActionSet(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.getAction(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )?.endTurn
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.isTargetConsidered(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.isTargetConfirmed(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.getTarget(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )?.targetCoordinate
                ).toEqual({
                    q: 0,
                    r: 0,
                })
            })

            it("adds the Battle Action to the Battle Action Queue", () => {
                expect(
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                ).toEqual(endTurnBattleAction)
            })

            it("will submit an event saying the action is ready", () => {
                const expectedMessage: MessageBoardMessage = {
                    type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
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
        let messageSpy: MockInstance

        beforeEach(() => {
            ;({
                gameEngineState,
                playerSoldierBattleSquaddie,
                longswordAction,
            } = createGameEngineState({}))

            const repository = gameEngineState.repository
            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")

            SummaryHUDStateService.createActorTiles({
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                campaignResources: gameEngineState.campaign.resources,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                objectRepository: repository!,
            })

            battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_ACTION_TEMPLATE
            )
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_TEMPLATE,
                objectRepository: gameEngineState.repository!,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                messageBoard: gameEngineState.messageBoard,
                actionTemplateId: longswordAction.id,
                battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                glossary: gameEngineState.battleOrchestratorState.glossary,
                mapStartingCoordinate: { q: 0, r: 0 },
            })
        })

        it("updates the action builder actor", () => {
            expect(
                BattleActionDecisionStepService.isActorSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )
            ).toBeTruthy()
            expect(
                BattleActionDecisionStepService.getActor(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )?.battleSquaddieId
            ).toEqual(playerSoldierBattleSquaddie.battleSquaddieId)
        })

        it("updates the action builder action", () => {
            expect(
                BattleActionDecisionStepService.isActionSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )
            ).toBeTruthy()
            expect(
                BattleActionDecisionStepService.getAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )?.actionTemplateId
            ).toEqual(longswordAction.id)
        })

        it("clears the action builder target", () => {
            expect(
                BattleActionDecisionStepService.isTargetConsidered(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )
            ).toBeFalsy()
        })

        it("will not add to the recorder", () => {
            expect(
                BattleActionRecorderService.isAnimationQueueEmpty(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toBeTruthy()
            expect(
                BattleActionRecorderService.isAlreadyAnimatedQueueEmpty(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toBeTruthy()
        })

        it("will add a new tile to the HUD", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!.actionSelectedTile!.actionName
            ).toBe(longswordAction.name)
        })

        it("will submit an event saying the action is ready", () => {
            const expectedMessage: MessageBoardMessage = {
                type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
                recommendedMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            }

            expect(messageSpy).toBeCalledWith(expectedMessage)
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
                        .battleActionDecisionStep,
                actionTemplateId: longswordAction.id,
            })

            battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE
            )
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                objectRepository: gameEngineState.repository!,
                targetCoordinate: { q: 0, r: 1 },
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                numberGenerator:
                    gameEngineState.battleOrchestratorState.numberGenerator,
            })
        })

        it("sets the target coordinate", () => {
            expect(
                BattleActionDecisionStepService.isTargetConsidered(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )
            ).toBeTruthy()
            expect(
                BattleActionDecisionStepService.getTarget(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )
            ).toEqual({
                targetCoordinate: { q: 0, r: 1 },
                confirmed: false,
            })
        })

        it("shows a summary window for the target", () => {
            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler!,
                graphicsBuffer: mockP5GraphicsContext,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!.squaddieNameTiles["TARGET_NAME"]!
                    .battleSquaddieId
            ).toEqual("player_soldier_1")
        })

        it("will add an action preview tile to the HUD", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState!.actionPreviewTile
            ).not.toBeUndefined()
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
                    objectRepository: gameEngineState.repository!,
                    actionTemplateIds: [longswordAction.id],
                    attributes: ArmyAttributesService.new({
                        maxHitPoints: 5,
                        movement: SquaddieMovementService.new({
                            movementPerAction: 2,
                        }),
                    }),
                }))
            MissionMapService.addSquaddie({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                squaddieTemplateId: thiefBattleSquaddie.squaddieTemplateId,
                battleSquaddieId: thiefBattleSquaddie.battleSquaddieId,
                originMapCoordinate: {
                    q: 1,
                    r: 2,
                },
            })

            BattleActionDecisionStepService.setConsideredTarget({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                targetCoordinate: { q: 1, r: 2 },
            })

            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: longswordAction.id,
            })

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_CONFIRMS_ACTION
            )
        })

        it("will update the origin map coordinate to match the current", () => {
            MissionMapService.updateBattleSquaddieCoordinate({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleSquaddieId: BattleActionDecisionStepService.getActor(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )?.battleSquaddieId!,
                coordinate: {
                    q: 1,
                    r: 1,
                },
            })

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository!,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                numberGenerator:
                    gameEngineState.battleOrchestratorState.numberGenerator,
                missionStatistics:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionStatistics,
                challengeModifierSetting:
                    gameEngineState.battleOrchestratorState.battleState
                        .challengeModifierSetting,
            })

            const mapInfo = MissionMapService.getByBattleSquaddieId(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                BattleActionDecisionStepService.getActor(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )?.battleSquaddieId!
            )
            expect(
                HexCoordinateService.areEqual(mapInfo.originMapCoordinate, {
                    q: 1,
                    r: 1,
                })
            ).toBeTruthy()
            expect(
                HexCoordinateService.areEqual(
                    mapInfo.originMapCoordinate,
                    mapInfo.currentMapCoordinate
                )
            ).toBeTruthy()
        })

        it("should create a confirmed action in the action builder", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository!,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                numberGenerator:
                    gameEngineState.battleOrchestratorState.numberGenerator,
                missionStatistics:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionStatistics,
                challengeModifierSetting:
                    gameEngineState.battleOrchestratorState.battleState
                        .challengeModifierSetting,
            })
            expect(
                BattleActionDecisionStepService.isTargetConfirmed(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )
            ).toBeTruthy()
        })

        it("should apply the cooldown", () => {
            longswordAction.resourceCost!.cooldownTurns = 3
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository!,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                numberGenerator:
                    gameEngineState.battleOrchestratorState.numberGenerator,
                missionStatistics:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionStatistics,
                challengeModifierSetting:
                    gameEngineState.battleOrchestratorState.battleState
                        .challengeModifierSetting,
            })

            expect(
                InBattleAttributesService.getActionTurnsOfCooldown({
                    inBattleAttributes:
                        playerSoldierBattleSquaddie.inBattleAttributes,
                    actionTemplateId: longswordAction.id,
                })
            ).toBe(3)
        })

        it("should add an action to the action builder with an expected context", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository!,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                numberGenerator:
                    gameEngineState.battleOrchestratorState.numberGenerator,
                missionStatistics:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionStatistics,
                challengeModifierSetting:
                    gameEngineState.battleOrchestratorState.battleState
                        .challengeModifierSetting,
            })
            expect(
                BattleActionRecorderService.peekAtAnimationQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toEqual(
                BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId:
                            playerSoldierBattleSquaddie.battleSquaddieId,
                        actorContext: BattleActionActorContextService.new({
                            actingSquaddieModifiers: [],
                            actingSquaddieRoll: RollResultService.new({
                                occurred: false,
                                rolls: [],
                            }),
                            targetSquaddieModifiers: {
                                [thiefBattleSquaddie.battleSquaddieId]: [],
                            },
                        }),
                    },
                    action: { actionTemplateId: longswordAction.id },
                    effect: {
                        squaddie: [
                            BattleActionSquaddieChangeService.new({
                                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                                attributesAfter: {
                                    ...InBattleAttributesService.new({}),
                                    currentHitPoints: 3,
                                },
                                attributesBefore: InBattleAttributesService.new(
                                    {}
                                ),
                                battleSquaddieId: "Thief 0",
                                damageExplanation: DamageExplanationService.new(
                                    {
                                        raw: 2,
                                        net: 2,
                                    }
                                ),
                                healingReceived: 0,
                            }),
                        ],
                    },
                    animation: {
                        completed: false,
                    },
                })
            )
        })

        it("should add one action per action template", () => {
            const attackTwiceWithLongsword = ActionTemplateService.new({
                name: "attackTwiceWithLongsword",
                id: "attackTwiceWithLongsword",
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 1,
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
                            [Damage.BODY]: 1,
                        },
                    }),
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
            ObjectRepositoryService.addActionTemplate(
                gameEngineState.repository!,
                attackTwiceWithLongsword
            )

            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: attackTwiceWithLongsword.id,
            })

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository!,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                numberGenerator:
                    gameEngineState.battleOrchestratorState.numberGenerator,
                missionStatistics:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionStatistics,
                challengeModifierSetting:
                    gameEngineState.battleOrchestratorState.battleState
                        .challengeModifierSetting,
            })

            expect(
                BattleActionRecorderService.isAnimationQueueEmpty(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toBeFalsy()

            expect(
                BattleActionQueueService.length(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder.readyToAnimateQueue
                )
            ).toEqual(2)

            expect(
                BattleActionRecorderService.peekAtAnimationQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toEqual(
                BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId:
                            playerSoldierBattleSquaddie.battleSquaddieId,
                        actorContext: BattleActionActorContextService.new({
                            actingSquaddieModifiers: [],
                            actingSquaddieRoll: RollResultService.new({
                                occurred: false,
                                rolls: [],
                            }),
                            targetSquaddieModifiers: {
                                [thiefBattleSquaddie.battleSquaddieId]: [],
                            },
                        }),
                    },
                    action: { actionTemplateId: attackTwiceWithLongsword.id },
                    effect: {
                        squaddie: [
                            BattleActionSquaddieChangeService.new({
                                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                                attributesAfter: {
                                    ...InBattleAttributesService.new({}),
                                    currentHitPoints: 4,
                                },
                                attributesBefore: InBattleAttributesService.new(
                                    {}
                                ),
                                battleSquaddieId: "Thief 0",
                                damageExplanation: DamageExplanationService.new(
                                    {
                                        raw: 1,
                                        net: 1,
                                    }
                                ),
                                healingReceived: 0,
                            }),
                        ],
                    },
                    animation: {
                        completed: false,
                    },
                })
            )

            BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

            expect(
                BattleActionRecorderService.peekAtAnimationQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toEqual(
                BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId:
                            playerSoldierBattleSquaddie.battleSquaddieId,
                        actorContext: BattleActionActorContextService.new({
                            actingSquaddieModifiers: [],
                            actingSquaddieRoll: RollResultService.new({
                                occurred: false,
                                rolls: [],
                            }),
                            targetSquaddieModifiers: {
                                [thiefBattleSquaddie.battleSquaddieId]: [],
                            },
                        }),
                    },
                    action: { actionTemplateId: attackTwiceWithLongsword.id },
                    effect: {
                        squaddie: [
                            BattleActionSquaddieChangeService.new({
                                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                                attributesAfter: {
                                    ...InBattleAttributesService.new({}),
                                    currentHitPoints: 2,
                                },
                                attributesBefore: InBattleAttributesService.new(
                                    {
                                        ...InBattleAttributesService.new({}),
                                        currentHitPoints: 4,
                                    }
                                ),
                                battleSquaddieId: "Thief 0",
                                damageExplanation: DamageExplanationService.new(
                                    {
                                        raw: 2,
                                        net: 2,
                                    }
                                ),
                                healingReceived: 0,
                            }),
                        ],
                    },
                    animation: {
                        completed: false,
                    },
                })
            )
        })

        describe("confirming an action mid turn", () => {
            beforeEach(() => {
                BattleActionRecorderService.addReadyToAnimateBattleAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                    BattleActionService.new({
                        actor: {
                            actorBattleSquaddieId:
                                playerSoldierBattleSquaddie.battleSquaddieId,
                        },
                        action: { actionTemplateId: longswordAction.id },
                        effect: {
                            squaddie: [],
                        },
                    })
                )
                BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            })

            it("should add the results to the history", () => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    objectRepository: gameEngineState.repository!,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    numberGenerator:
                        gameEngineState.battleOrchestratorState.numberGenerator,
                    missionStatistics:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionStatistics,
                    challengeModifierSetting:
                        gameEngineState.battleOrchestratorState.battleState
                            .challengeModifierSetting,
                })
                const mostRecentAction =
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                expect(mostRecentAction!.action.actionTemplateId).toEqual(
                    longswordAction.id
                )

                const results = mostRecentAction!.effect.squaddie
                expect(results).toHaveLength(1)
                expect(results![0]!.battleSquaddieId).toBe(
                    thiefBattleSquaddie.battleSquaddieId
                )
            })

            it("should store the calculated results", () => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    objectRepository: gameEngineState.repository!,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    numberGenerator:
                        gameEngineState.battleOrchestratorState.numberGenerator,
                    missionStatistics:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionStatistics,
                    challengeModifierSetting:
                        gameEngineState.battleOrchestratorState.battleState
                            .challengeModifierSetting,
                })
                const mostRecentAction =
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                const knightUsesLongswordOnThiefResults =
                    mostRecentAction!.effect!.squaddie!.find(
                        (change) =>
                            change.battleSquaddieId ===
                            thiefBattleSquaddie.battleSquaddieId
                    )!
                const longswordActionDamage =
                    longswordAction.actionEffectTemplates[0]!.damageDescriptions
                        .BODY
                expect(longswordActionDamage).not.toBeUndefined()
                expect(knightUsesLongswordOnThiefResults.damage.net).toBe(
                    longswordActionDamage
                )

                const { squaddieTemplate } =
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository!,
                        thiefBattleSquaddie.battleSquaddieId
                    )

                const { maxHitPoints, currentHitPoints } =
                    SquaddieService.getHitPoints({
                        squaddieTemplate: squaddieTemplate,
                        battleSquaddie: thiefBattleSquaddie,
                    })
                if (longswordActionDamage != undefined) {
                    expect(currentHitPoints).toBe(
                        maxHitPoints - longswordActionDamage
                    )
                }
            })
        })
    })
    describe("Player wants to move a squaddie", () => {
        let gameEngineState: GameEngineState
        let battleHUDListener: BattleHUDListener
        let battleSquaddie: BattleSquaddie
        let isMovementPossibleSpy: MockInstance
        let messageSpy: MockInstance

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
                        .battleActionDecisionStep,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            })

            battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE
            )

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
            })

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
        })
        afterEach(() => {
            if (isMovementPossibleSpy) isMovementPossibleSpy.mockRestore()
            messageSpy.mockRestore()
        })
        it("do not create an action if player selects starting location", () => {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository!,
                messageBoard: gameEngineState.messageBoard,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                campaignResources: gameEngineState.campaign.resources,
                battleState:
                    gameEngineState.battleOrchestratorState.battleState,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                targetCoordinate: { q: 0, r: 0 },
                squaddieAllMovementCache:
                    gameEngineState.battleOrchestratorState.cache
                        .searchResultsCache,
            })

            expect(
                BattleActionRecorderService.isAnimationQueueEmpty(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toBeTruthy()
        })

        it("does not complete the action if the movement is invalid", () => {
            isMovementPossibleSpy = vi
                .spyOn(MovementCalculatorService, "isMovementPossible")
                .mockReturnValue(false)

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository!,
                messageBoard: gameEngineState.messageBoard,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                campaignResources: gameEngineState.campaign.resources,
                battleState:
                    gameEngineState.battleOrchestratorState.battleState,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                targetCoordinate: { q: -100, r: 9001 },
                squaddieAllMovementCache:
                    gameEngineState.battleOrchestratorState.cache
                        .searchResultsCache,
            })

            expect(
                BattleActionRecorderService.isAnimationQueueEmpty(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toBeTruthy()
        })

        describe("movement is valid", () => {
            beforeEach(() => {
                isMovementPossibleSpy = vi
                    .spyOn(MovementCalculatorService, "isMovementPossible")
                    .mockReturnValue(true)

                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    objectRepository: gameEngineState.repository!,
                    messageBoard: gameEngineState.messageBoard,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    campaignResources: gameEngineState.campaign.resources,
                    battleState:
                        gameEngineState.battleOrchestratorState.battleState,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    targetCoordinate: { q: 0, r: 2 },
                    squaddieAllMovementCache:
                        gameEngineState.battleOrchestratorState.cache
                            .searchResultsCache,
                })
            })

            it("sets the actor and is ready to animate", () => {
                expect(
                    expectSquaddieIsMovingToGivenLocation(
                        gameEngineState,
                        battleSquaddie,
                        { q: 0, r: 2 }
                    )
                ).toBeTruthy()
            })

            it("adds a battle action to the animation queue", () => {
                const battleAction =
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                expect(battleAction).toEqual(
                    BattleActionService.new({
                        actor: {
                            actorBattleSquaddieId:
                                battleSquaddie.battleSquaddieId,
                        },
                        action: { isMovement: true },
                        effect: {
                            movement: {
                                startCoordinate: { q: 0, r: 0 },
                                endCoordinate: { q: 0, r: 2 },
                            },
                        },
                    })
                )
            })

            it("spends refundable movement action points", () => {
                expect(
                    SquaddieTurnService.getMovementActionPointsSpentButCanBeRefunded(
                        battleSquaddie.squaddieTurn
                    )
                ).toBe(1)
                expect(
                    SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                        battleSquaddie.squaddieTurn
                    )
                ).toEqual(DEFAULT_ACTION_POINTS_PER_TURN)

                const { unSpentActionPoints, movementActionPoints } =
                    SquaddieService.getActionPointSpend({
                        battleSquaddie,
                    })
                expect(unSpentActionPoints).toBe(
                    DEFAULT_ACTION_POINTS_PER_TURN - 1
                )
                expect(movementActionPoints.previewedByPlayer).toBe(0)
                expect(movementActionPoints.spentButCanBeRefunded).toBe(1)
            })

            it("updates the squaddie coordinate", () => {
                const mapDatum = MissionMapService.getByBattleSquaddieId(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                    battleSquaddie.battleSquaddieId
                )
                expect(mapDatum).not.toBeUndefined()
                expect(mapDatum.currentMapCoordinate).toEqual({ q: 0, r: 2 })
            })

            it("will submit an event saying the action is ready", () => {
                const expectedMessage: MessageBoardMessage = {
                    type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
                    recommendedMode:
                        BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
                }

                expect(messageSpy).toBeCalledWith(expectedMessage)
            })
        })

        describe("add an additional movement action during a turn", () => {
            beforeEach(() => {
                isMovementPossibleSpy = vi
                    .spyOn(MovementCalculatorService, "isMovementPossible")
                    .mockReturnValue(true)

                BattleActionRecorderService.addReadyToAnimateBattleAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                    BattleActionService.new({
                        actor: {
                            actorBattleSquaddieId:
                                battleSquaddie.battleSquaddieId,
                        },
                        action: { isMovement: true },
                        effect: {
                            movement: {
                                startCoordinate: { q: 0, r: 0 },
                                endCoordinate: { q: 0, r: 1 },
                            },
                        },
                    })
                )
                BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )

                SquaddieTurnService.setMovementActionPointsSpentAndCannotBeRefunded(
                    {
                        squaddieTurn: battleSquaddie.squaddieTurn,
                        actionPoints: 1,
                    }
                )

                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    objectRepository: gameEngineState.repository!,
                    messageBoard: gameEngineState.messageBoard,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    campaignResources: gameEngineState.campaign.resources,
                    battleState:
                        gameEngineState.battleOrchestratorState.battleState,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    targetCoordinate: { q: 0, r: 2 },
                    squaddieAllMovementCache:
                        gameEngineState.battleOrchestratorState.cache
                            .searchResultsCache,
                })
            })

            it("adds a movement decision step and confirmed target to the action builder", () => {
                expect(
                    expectSquaddieIsMovingToGivenLocation(
                        gameEngineState,
                        battleSquaddie,
                        { q: 0, r: 2 }
                    )
                ).toBeTruthy()
            })

            it("will update squaddie coordinate to destination spend refundable action points", () => {
                expect(
                    MissionMapService.getByBattleSquaddieId(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                        battleSquaddie.battleSquaddieId
                    )
                ).toEqual({
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    squaddieTemplateId: battleSquaddie.squaddieTemplateId,
                    originMapCoordinate: { q: 0, r: 0 },
                    currentMapCoordinate: { q: 0, r: 2 },
                })
                expect(
                    SquaddieTurnService.getMovementActionPointsSpentAndCannotBeRefunded(
                        battleSquaddie.squaddieTurn
                    )
                ).toEqual(1)
                expect(
                    SquaddieTurnService.getMovementActionPointsSpentButCanBeRefunded(
                        battleSquaddie.squaddieTurn
                    )
                ).toEqual(1)
                expect(
                    SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                        battleSquaddie.squaddieTurn
                    )
                ).toEqual(DEFAULT_ACTION_POINTS_PER_TURN - 1)
                expect(
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )!.action.isMovement
                ).toBeTruthy()
            })

            it("adds one movement action to the animation queue", () => {
                expect(
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                ).toEqual(
                    BattleActionService.new({
                        actor: {
                            actorBattleSquaddieId:
                                battleSquaddie.battleSquaddieId,
                        },
                        action: { isMovement: true },
                        effect: {
                            movement: {
                                startCoordinate: { q: 0, r: 0 },
                                endCoordinate: { q: 0, r: 2 },
                            },
                        },
                    })
                )
                expect(
                    BattleActionQueueService.length(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder.readyToAnimateQueue
                    )
                ).toEqual(1)
            })
        })
    })

    describe("player squaddie finishes an action, still has actions remaining", () => {
        let gameEngineState: GameEngineState
        let battleSquaddie: BattleSquaddie
        let battleHUDListener: BattleHUDListener
        let addGraphicsSpy: MockInstance
        beforeEach(() => {
            ;({ gameEngineState, playerSoldierBattleSquaddie: battleSquaddie } =
                createGameEngineState({}))
            battleHUDListener = new BattleHUDListener("battleHUDListener")
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
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
                actionTemplateId: "consider using this action",
            })

            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION
            )

            addGraphicsSpy = vi.spyOn(TerrainTileMapService, "addGraphicsLayer")

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION,
                objectRepository: gameEngineState.repository!,
                battleSquaddieId: BattleActionDecisionStepService.getActor(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )?.battleSquaddieId,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerCommandState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState!.playerCommandState,
                campaignResources: gameEngineState.campaign.resources,
                squaddieAllMovementCache:
                    gameEngineState.battleOrchestratorState.cache
                        .searchResultsCache,
            })
        })
        afterEach(() => {
            addGraphicsSpy.mockRestore()
        })
        it("adds a map layer based on the squaddie", () => {
            expect(addGraphicsSpy).toBeCalled()
            const mapGraphicsLayer: MapGraphicsLayer =
                addGraphicsSpy.mock.calls[0][1]
            expect(mapGraphicsLayer.id).toEqual(battleSquaddie.battleSquaddieId)
            expect(mapGraphicsLayer.type).toEqual(
                MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE
            )
        })
        it("invalidates the playerCommandState's player action validity", () => {
            const battleHUDState: BattleHUDState = BattleHUDStateService.new({})
            battleHUDState.summaryHUDState! = SummaryHUDStateService.new()
            battleHUDState.summaryHUDState!.playerCommandState =
                PlayerCommandStateService.new()
            gameEngineState.battleOrchestratorState.battleHUDState =
                battleHUDState
            gameEngineState.battleOrchestratorState.cache.actionValidity =
                ActionValidityByIdCacheService.new()
            gameEngineState.battleOrchestratorState.cache.actionValidity.byActionTemplateId =
                {
                    actionId: {
                        isValid: true,
                        warning: false,
                        messages: ["here is a message"],
                    },
                }

            const message: MessageBoardMessagePlayerControlledSquaddieNeedsNextAction =
                {
                    type: MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION,
                    objectRepository: gameEngineState.repository!,
                    battleSquaddieId: BattleActionDecisionStepService.getActor(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )!.battleSquaddieId,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    playerCommandState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState!.playerCommandState,
                    campaignResources: gameEngineState.campaign.resources,
                    squaddieAllMovementCache:
                        gameEngineState.battleOrchestratorState.cache
                            .searchResultsCache,
                }

            gameEngineState.messageBoard.sendMessage(message)
            expect(
                gameEngineState.battleOrchestratorState.cache.actionValidity.key
            ).toBeUndefined()
        })
    })
})

const expectSquaddieIsMovingToGivenLocation = (
    gameEngineState: GameEngineState,
    battleSquaddie: BattleSquaddie,
    destination: HexCoordinate
) => {
    expect(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    ).not.toBeUndefined()
    expect(
        BattleActionDecisionStepService.isActorSet(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
    ).toBeTruthy()
    expect(
        BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )?.battleSquaddieId
    ).toEqual(battleSquaddie.battleSquaddieId)
    expect(
        BattleActionDecisionStepService.isActionSet(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
    ).toBeTruthy()
    expect(
        BattleActionDecisionStepService.getAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )?.movement
    ).toBeTruthy()
    expect(
        BattleActionDecisionStepService.isTargetConsidered(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
    ).toBeTruthy()
    expect(
        BattleActionDecisionStepService.isTargetConfirmed(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
    ).toBeTruthy()
    expect(
        HexCoordinateService.areEqual(
            BattleActionDecisionStepService.getTarget(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )?.targetCoordinate,
            destination
        )
    ).toBeTruthy()
    return true
}
