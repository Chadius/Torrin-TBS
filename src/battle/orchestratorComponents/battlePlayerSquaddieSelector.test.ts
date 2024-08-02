import { BattlePlayerSquaddieSelector } from "./battlePlayerSquaddieSelector"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattlePhase } from "./battlePhaseTracker"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import {
    DEFAULT_ACTION_POINTS_PER_TURN,
    SquaddieTurnService,
} from "../../squaddie/turn"
import {
    BattleOrchestratorChanges,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleCamera } from "../battleCamera"
import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates,
} from "../../hexMap/convertCoordinates"
import { makeResult } from "../../utils/ResultOrError"
import { BattleSquaddieSelectedHUD } from "../hud/BattleSquaddieSelectedHUD"
import { TargetingShape } from "../targeting/targetingShapeGenerator"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { CreateNewSquaddieAndAddToRepository } from "../../utils/test/squaddie"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { CampaignService } from "../../campaign/campaign"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import { DamageType } from "../../squaddie/squaddieService"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { DecidedActionService } from "../../action/decided/decidedAction"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { BattlePhaseState } from "./battlePhaseController"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { BattleHUDListener, BattleHUDService } from "../hud/battleHUD"
import { MouseButton } from "../../utils/mouseConfig"
import { PlayerBattleActionBuilderStateService } from "../actionBuilder/playerBattleActionBuilderState"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { RectAreaService } from "../../ui/rectArea"
import {
    PlayerCommandSelection,
    PlayerCommandStateService,
} from "../hud/playerCommandHUD"
import {
    BattleActionQueueService,
    BattleActionService,
} from "../history/battleAction"
import { SquaddieSummaryPopoverPosition } from "../hud/playerActionPanel/squaddieSummaryPopover"

describe("BattleSquaddieSelector", () => {
    let selector: BattlePlayerSquaddieSelector =
        new BattlePlayerSquaddieSelector()
    let squaddieRepo: ObjectRepository = ObjectRepositoryService.new()
    let missionMap: MissionMap
    let enemySquaddieTemplate: SquaddieTemplate
    let enemyBattleSquaddie: BattleSquaddie
    let demonBiteAction: ActionTemplate
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let teams: BattleSquaddieTeam[]
    let playerSoldierBattleSquaddie: BattleSquaddie

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        selector = new BattlePlayerSquaddieSelector()
        squaddieRepo = ObjectRepositoryService.new()
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "],
            }),
        })
        teams = []
    })

    const makeBattlePhaseTrackerWithEnemyTeam = (missionMap: MissionMap) => {
        const enemyTeam: BattleSquaddieTeam = {
            id: "teamId",
            name: "enemies cannot be controlled by the player",
            affiliation: SquaddieAffiliation.ENEMY,
            battleSquaddieIds: [],
            iconResourceKey: "icon_enemy_team",
        }
        demonBiteAction = ActionTemplateService.new({
            name: "demon bite",
            id: "demon_bite",
            actionPoints: 2,
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
            battleSquaddie: enemyBattleSquaddie,
            squaddieTemplate: enemySquaddieTemplate,
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "enemy_demon",
            name: "Slither Demon",
            affiliation: SquaddieAffiliation.ENEMY,
            battleId: "enemy_demon_0",
            squaddieRepository: squaddieRepo,
            actionTemplates: [demonBiteAction],
        }))

        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "enemy_demon_1",
                squaddieTemplateId: "enemy_demon",
                squaddieTurn: SquaddieTurnService.new(),
            })
        )

        BattleSquaddieTeamService.addBattleSquaddieIds(enemyTeam, [
            "enemy_demon_0",
            "enemy_demon_1",
        ])

        teams.push(enemyTeam)

        missionMap.addSquaddie(
            enemySquaddieTemplate.squaddieId.templateId,
            enemyBattleSquaddie.battleSquaddieId,
            { q: 0, r: 0 }
        )
        missionMap.addSquaddie(
            enemySquaddieTemplate.squaddieId.templateId,
            enemyBattleSquaddie.battleSquaddieId,
            { q: 0, r: 1 }
        )
        return {
            currentAffiliation: BattlePhase.ENEMY,
            turnCount: 1,
        }
    }

    const makeBattlePhaseTrackerWithPlayerTeam = (
        missionMap: MissionMap
    ): BattlePhaseState => {
        const playerTeam: BattleSquaddieTeam = {
            id: "playerTeamId",
            name: "player controlled team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
            iconResourceKey: "icon_player_team",
        }
        teams.push(playerTeam)
        ;({ battleSquaddie: playerSoldierBattleSquaddie } =
            CreateNewSquaddieAndAddToRepository({
                name: "Player Soldier",
                templateId: "player_soldier",
                battleId: "player_soldier_0",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository: squaddieRepo,
            }))
        BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
            "player_soldier_0",
        ])

        missionMap.addSquaddie("player_soldier", "player_soldier_0", {
            q: 0,
            r: 0,
        })

        return {
            currentAffiliation: BattlePhase.PLAYER,
            turnCount: 1,
        }
    }

    it("recommends computer squaddie selector if the player cannot control the squaddies", () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "],
            }),
        })
        const battlePhaseState = makeBattlePhaseTrackerWithEnemyTeam(missionMap)

        const camera: BattleCamera = new BattleCamera(
            ...convertMapCoordinatesToWorldCoordinates(0, 0)
        )
        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    battlePhaseState,
                    teams,
                    camera,
                    missionMap,
                }),
            }),
            repository: squaddieRepo,
        })

        selector.update(state, mockedP5GraphicsContext)

        expect(selector.hasCompleted(state)).toBeTruthy()
        const recommendation: BattleOrchestratorChanges =
            selector.recommendStateChanges(state)
        expect(recommendation.nextMode).toBe(
            BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR
        )
    })

    describe("player hovers over a squaddie", () => {
        let gameEngineState: GameEngineState
        let messageSpy: jest.SpyInstance
        let battleSquaddieScreenPositionX: number
        let battleSquaddieScreenPositionY: number

        beforeEach(() => {
            const missionMap: MissionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "],
                }),
            })
            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mocks.mockResourceHandler(
                    mockedP5GraphicsContext
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
                        camera: new BattleCamera(),
                        battlePhaseState,
                        teams,
                        recording: { history: [] },
                    }),
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
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

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE
            )
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )
        })

        it("will generate a message", () => {
            expect(messageSpy).toBeCalledWith({
                type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: "player_soldier_0",
                selectionMethod: {
                    mouse: {
                        x: battleSquaddieScreenPositionX,
                        y: battleSquaddieScreenPositionY,
                    },
                },
                squaddieSummaryPopoverPosition:
                    SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
        })

        it("can still select squaddies afterward", () => {
            BattleHUDService.playerPeeksAtSquaddie(
                gameEngineState.battleOrchestratorState.battleHUD,
                {
                    type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: "player_soldier_0",
                    selectionMethod: {
                        mouse: { x: 0, y: 0 },
                    },
                    squaddieSummaryPopoverPosition:
                        SquaddieSummaryPopoverPosition.SELECT_MAIN,
                }
            )
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .expirationTime
            ).not.toBeUndefined()
            ;[battleSquaddieScreenPositionX, battleSquaddieScreenPositionY] =
                convertMapCoordinatesToScreenCoordinates(
                    0,
                    0,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
                )

            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: battleSquaddieScreenPositionX,
                mouseY: battleSquaddieScreenPositionY,
                mouseButton: MouseButton.ACCEPT,
            })
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .expirationTime
            ).toBeUndefined()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState
            ).not.toBeUndefined()
        })
    })

    describe("player selects a squaddie and then clicks off the map", () => {
        let gameEngineState: GameEngineState

        beforeEach(() => {
            const missionMap: MissionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "],
                }),
            })
            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mocks.mockResourceHandler(
                    mockedP5GraphicsContext
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
                        camera: new BattleCamera(),
                        battlePhaseState,
                        teams,
                        recording: { history: [] },
                    }),
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            })

            PlayerBattleActionBuilderStateService.setActor({
                actionBuilderState:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState,
                battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
            })

            BattleHUDService.playerSelectsSquaddie(
                gameEngineState.battleOrchestratorState.battleHUD,
                {
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: "player_soldier_0",
                    selectionMethod: {
                        mouse: { x: 0, y: 0 },
                    },
                }
            )

            clickOnMapCoordinate({
                selector,
                gameEngineState: gameEngineState,
                q: 999,
                r: 999,
                camera: new BattleCamera(),
            })
        })

        it("closes the HUD", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()
        })

        it("clears the actor", () => {
            expect(
                PlayerBattleActionBuilderStateService.isActorSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeFalsy()
        })

        it("clears the actionsThisRound", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            ).toBeUndefined()
        })
    })

    describe("can make a movement action by clicking on the field", () => {
        let gameEngineState: GameEngineState
        beforeEach(() => {
            const missionMap: MissionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "],
                }),
            })

            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)

            let mockHud = mocks.battleSquaddieSelectedHUD()

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mocks.mockResourceHandler(
                    mockedP5GraphicsContext
                ),
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({
                        battleSquaddieSelectedHUD: mockHud,
                    }),
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
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            })

            BattleHUDService.playerSelectsSquaddie(
                gameEngineState.battleOrchestratorState.battleHUD,
                {
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: "player_soldier_0",
                    selectionMethod: {
                        mouse: { x: 0, y: 0 },
                    },
                }
            )
        })

        describe("user clicks on destination to start movement", () => {
            beforeEach(() => {
                clickOnMapCoordinate({
                    selector,
                    gameEngineState: gameEngineState,
                    q: 0,
                    r: 1,
                    camera: new BattleCamera(),
                })
            })

            it("sets the actor", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                ).not.toBeUndefined()
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

            it("set the selector to complete", () => {
                expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
            })

            it("Recommends the Player HUD controller component next", () => {
                const recommendation: BattleOrchestratorChanges =
                    selector.recommendStateChanges(gameEngineState)
                expect(recommendation.nextMode).toBe(
                    BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                )
            })

            it("adds a processed action to the history", () => {
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

                const history =
                    gameEngineState.battleOrchestratorState.battleState
                        .recording.history
                expect(history).toHaveLength(1)
                expect(history[0]).toStrictEqual({
                    results: undefined,
                    processedAction: processedAction,
                })
            })

            it("consumes the squaddie actions", () => {
                expect(
                    playerSoldierBattleSquaddie.squaddieTurn
                        .remainingActionPoints
                ).toEqual(DEFAULT_ACTION_POINTS_PER_TURN - 1)
            })

            it("adds a movement action and confirmed target to the action builder", () => {
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
                    ).movement
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
                    r: 1,
                })
            })

            it("adds a battle action to move", () => {
                const squaddieBattleAction = BattleActionService.new({
                    actor: {
                        battleSquaddieId:
                            playerSoldierBattleSquaddie.battleSquaddieId,
                    },
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startLocation: { q: 0, r: 0 },
                            endLocation: { q: 0, r: 1 },
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
                PlayerBattleActionBuilderStateService.isActorSet(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeFalsy()

            playerCommandSpy.mockRestore()
        })
    })

    describe("adding movement mid turn instruction", () => {
        let camera: BattleCamera
        let missionMap: MissionMap
        let gameEngineState: GameEngineState
        let actionsThisRound: ActionsThisRound

        beforeEach(() => {
            camera = new BattleCamera()

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

            actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "player_soldier_0",
                startingLocation: { q: 0, r: 0 },
                previewedActionTemplateId: undefined,
                processedActions: [processedAction],
            })

            missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "],
                }),
            })
        })

        const setUpGameEngineState = (
            missionMap: MissionMap,
            battlePhaseState: BattlePhaseState
        ) => {
            let mockResourceHandler = mocks.mockResourceHandler(
                mockedP5GraphicsContext
            )
            mockResourceHandler.getResource = jest
                .fn()
                .mockReturnValue(makeResult(null))

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mockResourceHandler,
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
                        actionsThisRound,
                        recording: { history: [] },
                    }),
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            })

            return gameEngineState
        }

        it("will not open the HUD if the character is not controllable", () => {
            const battlePhaseState =
                makeBattlePhaseTrackerWithEnemyTeam(missionMap)
            setUpGameEngineState(missionMap, battlePhaseState)

            selector.update(gameEngineState, mockedP5GraphicsContext)
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()
        })
        describe("when user clicks on new location", () => {
            beforeEach(() => {
                const battlePhaseState =
                    makeBattlePhaseTrackerWithPlayerTeam(missionMap)
                setUpGameEngineState(missionMap, battlePhaseState)
                BattleHUDService.playerSelectsSquaddie(
                    gameEngineState.battleOrchestratorState.battleHUD,
                    {
                        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                        gameEngineState,
                        battleSquaddieSelectedId: "player_soldier_0",
                        selectionMethod: {
                            mouse: { x: 0, y: 0 },
                        },
                    }
                )

                clickOnMapCoordinate({
                    selector,
                    gameEngineState,
                    q: 0,
                    r: 2,
                    camera,
                })
            })

            it("when user clicks on new location, will add movement to existing instruction", () => {
                expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
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
                        battleSquaddieId:
                            playerSoldierBattleSquaddie.battleSquaddieId,
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
                    PlayerBattleActionBuilderStateService.isActionSet(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                expect(
                    PlayerBattleActionBuilderStateService.getAction(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    ).movement
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
                    r: 2,
                })
            })

            it("will update squaddie location to destination and spend action points", () => {
                expect(
                    MissionMapService.getByBattleSquaddieId(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                        playerSoldierBattleSquaddie.battleSquaddieId
                    )
                ).toEqual({
                    battleSquaddieId:
                        playerSoldierBattleSquaddie.battleSquaddieId,
                    squaddieTemplateId:
                        playerSoldierBattleSquaddie.squaddieTemplateId,
                    mapLocation: { q: 0, r: 2 },
                })
                expect(
                    playerSoldierBattleSquaddie.squaddieTurn
                        .remainingActionPoints
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

    describe("player ends the squaddie turn", () => {
        let gameEngineState: GameEngineState
        let messageSpy: jest.SpyInstance

        beforeEach(() => {
            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)

            const camera: BattleCamera = new BattleCamera()

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mocks.mockResourceHandler(
                    mockedP5GraphicsContext
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
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            })

            BattleHUDService.playerSelectsSquaddie(
                gameEngineState.battleOrchestratorState.battleHUD,
                {
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: "player_soldier_0",
                    selectionMethod: {
                        mouse: { x: 0, y: 0 },
                    },
                }
            )

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")

            selector.mouseClicked({
                mouseX: RectAreaService.centerX(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.playerCommandState.endTurnButton
                        .buttonArea
                ),
                mouseY: RectAreaService.centerY(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.playerCommandState.endTurnButton
                        .buttonArea
                ),
                mouseButton: MouseButton.ACCEPT,
                gameEngineState,
            })
        })

        afterEach(() => {
            messageSpy.mockRestore()
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
                        battleSquaddieId: "player_soldier_0",
                    },
                    effect: {
                        endTurn: true,
                    },
                }),
            })
        })

        it("marks this component as complete", () => {
            selector.update(gameEngineState, mockedP5GraphicsContext)
            expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
        })
    })

    describe("an action is selected that requires a target", () => {
        let gameEngineState: GameEngineState
        let longswordAction: ActionTemplate
        let messageSpy: jest.SpyInstance

        beforeEach(() => {
            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)

            const camera: BattleCamera = new BattleCamera()

            longswordAction = ActionTemplateService.new({
                name: "longsword",
                id: "longsword",
                actionEffectTemplates: [
                    ActionEffectSquaddieTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues(),
                        minimumRange: 0,
                        maximumRange: 1,
                        targetingShape: TargetingShape.SNAKE,
                    }),
                ],
            })

            CreateNewSquaddieAndAddToRepository({
                name: "Player Soldier with a Longsword Action",
                templateId: "player_soldier_longsword",
                battleId: "player_soldier_1",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository: squaddieRepo,
                actionTemplates: [longswordAction],
            })

            missionMap.addSquaddie("player_soldier", "player_soldier_1", {
                q: 0,
                r: 1,
            })

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mocks.mockResourceHandler(
                    mockedP5GraphicsContext
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
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            })
            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")

            BattleSquaddieTeamService.addBattleSquaddieIds(
                gameEngineState.battleOrchestratorState.battleState.teams[0],
                ["player_soldier_1"]
            )
            clickOnMapCoordinate({
                selector,
                gameEngineState: gameEngineState,
                q: 0,
                r: 1,
                camera,
            })

            clickOnMapCoordinate({
                selector,
                gameEngineState: gameEngineState,
                q: 0,
                r: 1,
                camera,
            })
            const longswordButton =
                gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
                    (button) => button.actionTemplate.id === longswordAction.id
                )
            selector.mouseClicked({
                mouseX: RectAreaService.centerX(longswordButton.buttonArea),
                mouseY: RectAreaService.centerY(longswordButton.buttonArea),
                mouseButton: MouseButton.ACCEPT,
                gameEngineState,
            })
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("will complete the selector", () => {
            expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
        })
        it("will recommend player HUD controller as the next phase", () => {
            const recommendation: BattleOrchestratorChanges =
                selector.recommendStateChanges(gameEngineState)
            expect(recommendation.nextMode).toBe(
                BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
            )
        })
        it("sends a message that an action was selected that needs a target", () => {
            expect(messageSpy).toBeCalledWith({
                type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET,
                gameEngineState,
                actionTemplate: longswordAction,
                battleSquaddieId: "player_soldier_1",
                mapStartingLocation: { q: 0, r: 1 },
            })
        })
    })

    describe("squaddie must complete their turn before moving other squaddies", () => {
        let missionMap: MissionMap
        let interruptSquaddieStatic: SquaddieTemplate
        let interruptBattleSquaddie: BattleSquaddie
        let actionsThisRound: ActionsThisRound
        let mockHud: BattleSquaddieSelectedHUD
        let camera: BattleCamera
        let gameEngineState: GameEngineState
        let startingMouseX: number
        let startingMouseY: number
        let messageSpy: jest.SpyInstance

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 1 "],
                }),
            })
            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)
            ;({
                squaddieTemplate: interruptSquaddieStatic,
                battleSquaddie: interruptBattleSquaddie,
            } = CreateNewSquaddieAndAddToRepository({
                name: "interrupting squaddie",
                templateId: "interrupting squaddie",
                battleId: "interrupting squaddie",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository: squaddieRepo,
            }))

            missionMap.addSquaddie(
                interruptSquaddieStatic.squaddieId.templateId,
                interruptBattleSquaddie.battleSquaddieId,
                { q: 0, r: 1 }
            )

            const soldierSquaddieInfo =
                missionMap.getSquaddieByBattleId("player_soldier_0")

            const decidedActionMovementEffect =
                DecidedActionMovementEffectService.new({
                    template: ActionEffectMovementTemplateService.new({}),
                    destination: { q: 0, r: 2 },
                })
            actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: soldierSquaddieInfo.battleSquaddieId,
                startingLocation: soldierSquaddieInfo.mapLocation,
                previewedActionTemplateId: undefined,
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            actionPointCost: 1,
                            battleSquaddieId:
                                soldierSquaddieInfo.battleSquaddieId,
                            actionTemplateName: "Move",
                            actionEffects: [decidedActionMovementEffect],
                        }),
                        processedActionEffects: [
                            ProcessedActionMovementEffectService.new({
                                decidedActionEffect:
                                    decidedActionMovementEffect,
                            }),
                        ],
                    }),
                ],
            })

            let mockResourceHandler = mocks.mockResourceHandler(
                mockedP5GraphicsContext
            )
            mockResourceHandler.getResource = jest
                .fn()
                .mockReturnValue(makeResult(null))

            mockHud = new BattleSquaddieSelectedHUD()

            camera = new BattleCamera()

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mockResourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({
                        battleSquaddieSelectedHUD: mockHud,
                    }),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap,
                        camera,
                        battlePhaseState,
                        teams,
                        recording: { history: [] },
                        actionsThisRound,
                    }),
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            })
            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            BattleHUDService.playerSelectsSquaddie(
                gameEngineState.battleOrchestratorState.battleHUD,
                {
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: "player_soldier_0",
                    selectionMethod: {
                        mouse: { x: 0, y: 0 },
                    },
                }
            )

            const interruptSquaddieOnMap = missionMap.getSquaddieByBattleId(
                "interrupting squaddie"
            )
            ;[startingMouseX, startingMouseY] =
                convertMapCoordinatesToScreenCoordinates(
                    interruptSquaddieOnMap.mapLocation.q,
                    interruptSquaddieOnMap.mapLocation.r,
                    ...camera.getCoordinates()
                )
            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: startingMouseX,
                mouseY: startingMouseY,
                mouseButton: MouseButton.ACCEPT,
            })

            expect(messageSpy).toBeCalledWith({
                gameEngineState,
                type: MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN,
            })
        })

        it("ignores movement commands issued to other squaddies", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.battleSquaddieId
            ).toEqual(actionsThisRound.battleSquaddieId)

            const location =
                gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                    interruptBattleSquaddie.battleSquaddieId
                )
            clickOnMapCoordinate({
                selector,
                gameEngineState: gameEngineState,
                q: location.mapLocation.q,
                r: location.mapLocation.r,
                camera,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            ).toEqual(actionsThisRound)
            expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
        })

        it("ignores action commands issued to other squaddies", () => {
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    gameEngineState
                )
            ).toBeTruthy()

            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: 0,
                mouseY: 0,
                mouseButton: MouseButton.ACCEPT,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.battleSquaddieId
            ).toEqual(actionsThisRound.battleSquaddieId)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.previewedActionTemplateId
            ).toBeUndefined()
            expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
        })

        it("sends a message indicating which squaddie is still acting", () => {
            const location =
                gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                    interruptBattleSquaddie.battleSquaddieId
                )
            clickOnMapCoordinate({
                selector,
                gameEngineState: gameEngineState,
                q: location.mapLocation.q,
                r: location.mapLocation.r,
                camera,
            })

            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN,
                gameEngineState,
            })
        })
    })

    it("will send key pressed events to the HUD", () => {
        const battlePhaseState =
            makeBattlePhaseTrackerWithPlayerTeam(missionMap)

        const camera: BattleCamera = new BattleCamera()

        let mockHud = mocks.battleSquaddieSelectedHUD()
        const keySpy = jest.spyOn(mockHud, "keyPressed")

        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({
                    battleSquaddieSelectedHUD: mockHud,
                }),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                }),
            }),
            repository: squaddieRepo,
        })

        selector.keyEventHappened(state, {
            eventType: OrchestratorComponentKeyEventType.PRESSED,
            keyCode: 0,
        })

        expect(keySpy).toHaveBeenCalled()
        keySpy.mockRestore()
    })

    it("will accept commands even after canceling", () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "],
            }),
        })
        const battlePhaseState: BattlePhaseState =
            makeBattlePhaseTrackerWithPlayerTeam(missionMap)
        const decidedActionMovementEffect =
            DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
                destination: { q: 0, r: 1 },
            })
        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
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
                    processedActionEffects: [
                        ProcessedActionMovementEffectService.new({
                            decidedActionEffect: decidedActionMovementEffect,
                        }),
                    ],
                }),
            ],
        })

        const camera: BattleCamera = new BattleCamera()

        const gameEngineState: GameEngineState = GameEngineStateService.new({
            resourceHandler: mocks.mockResourceHandler(mockedP5GraphicsContext),
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                }),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                    actionsThisRound,
                    recording: { history: [] },
                }),
            }),
            repository: squaddieRepo,
            campaign: CampaignService.default({}),
        })

        BattleHUDService.playerSelectsSquaddie(
            gameEngineState.battleOrchestratorState.battleHUD,
            {
                type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: "player_soldier_0",
                selectionMethod: {
                    mouse: { x: 0, y: 0 },
                },
            }
        )

        clickOnMapCoordinate({
            selector,
            gameEngineState: gameEngineState,
            q: 0,
            r: 1,
            camera,
        })

        expect(
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .processedActions
        ).toHaveLength(2)
        expect(
            ActionsThisRoundService.getProcessedActionEffectToShow(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            ).type
        ).toEqual(ActionEffectType.MOVEMENT)
    })

    describe("selecting a different squaddie before and during a turn", () => {
        let missionMap: MissionMap
        let gameEngineState: GameEngineState
        let camera: BattleCamera
        let messageSpy: jest.SpyInstance

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "],
                }),
            })

            const battlePhaseState =
                makeBattlePhaseTrackerWithPlayerTeam(missionMap)
            const playerTeam = teams.find((t) => t.id === "playerTeamId")

            const anotherPlayerSoldierBattleSquaddie =
                BattleSquaddieService.new({
                    squaddieTemplateId: "player_soldier",
                    battleSquaddieId: "player_soldier_1",
                })

            ObjectRepositoryService.addBattleSquaddie(
                squaddieRepo,
                anotherPlayerSoldierBattleSquaddie
            )
            BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
                "player_soldier_1",
            ])
            MissionMapService.addSquaddie(
                missionMap,
                "player_soldier",
                "player_soldier_1",
                { q: 0, r: 2 }
            )

            let mockResourceHandler = mocks.mockResourceHandler(
                mockedP5GraphicsContext
            )
            mockResourceHandler.getResource = jest
                .fn()
                .mockReturnValue(makeResult(null))
            camera = new BattleCamera()

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mockResourceHandler,
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
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            })
            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            const { mapLocation: firstBattleSquaddieMapLocation } =
                missionMap.getSquaddieByBattleId("player_soldier_0")
            clickOnMapCoordinate({
                selector,
                gameEngineState,
                q: firstBattleSquaddieMapLocation.q,
                r: firstBattleSquaddieMapLocation.r,
                camera,
            })
        })

        it("opens the HUD for the first squaddie", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.showSummaryHUD
            ).toBeTruthy()

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId
            ).toEqual("player_soldier_0")
        })

        describe("first squaddie has not acted before clicking on another", () => {
            beforeEach(() => {
                const { mapLocation: anotherBattleSquaddieMapLocation } =
                    missionMap.getSquaddieByBattleId("player_soldier_1")
                clickOnMapCoordinate({
                    selector,
                    gameEngineState,
                    q: anotherBattleSquaddieMapLocation.q,
                    r: anotherBattleSquaddieMapLocation.r,
                    camera,
                })
            })

            it("sends a message to open the main window", () => {
                expect(messageSpy).toBeCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                        battleSquaddieSelectedId: "player_soldier_1",
                    })
                )
            })

            it("selects a different squaddie if the first squaddie has not started their turn", () => {
                clickOnMapCoordinate({
                    selector,
                    gameEngineState,
                    q: 0,
                    r: 1,
                    camera,
                })
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound.battleSquaddieId
                ).toEqual("player_soldier_1")
            })
            it("changes the actor for the actor builder", () => {
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
                ).toEqual("player_soldier_1")
            })
            it("clears the target side since it is the same", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.squaddieSummaryPopoversByType.TARGET
                ).toBeUndefined()
            })
        })

        describe("first squaddie is mid turn when clicking on another", () => {
            beforeEach(() => {
                const { mapLocation: firstBattleSquaddieMapLocation } =
                    missionMap.getSquaddieByBattleId("player_soldier_0")
                clickOnMapCoordinate({
                    selector,
                    gameEngineState,
                    q: firstBattleSquaddieMapLocation.q,
                    r: firstBattleSquaddieMapLocation.r,
                    camera,
                })

                clickOnMapCoordinate({
                    selector,
                    gameEngineState,
                    q: firstBattleSquaddieMapLocation.q,
                    r: firstBattleSquaddieMapLocation.r + 1,
                    camera,
                })

                const { mapLocation: anotherBattleSquaddieMapLocation } =
                    missionMap.getSquaddieByBattleId("player_soldier_1")
                clickOnMapCoordinate({
                    selector,
                    gameEngineState,
                    q: anotherBattleSquaddieMapLocation.q,
                    r: anotherBattleSquaddieMapLocation.r,
                    camera,
                })
            })

            it("does not select a different squaddie if the first squaddie starts their turn", () => {
                expect(messageSpy).not.toBeCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                        battleSquaddieSelectedId: "player_soldier_1",
                    })
                )
            })

            it("does not change the actor in the actor builder if the first squaddie starts their turn", () => {
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
        })
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
