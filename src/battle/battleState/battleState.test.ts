import {
    BattleState,
    BattleStateListener,
    BattleStateService,
    BattleStateValidityMissingComponent,
} from "./battleState"
import { TeamStrategyType } from "../teamStrategy/teamStrategy"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { MissionObjectiveHelper } from "../missionResult/missionObjective"
import { MissionRewardType } from "../missionResult/missionReward"
import { MissionConditionType } from "../missionResult/missionCondition"
import { MissionStatisticsService } from "../missionStatistics/missionStatistics"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import { NullMissionMap } from "../../utils/test/battleOrchestratorState"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../squaddie/id"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { SquaddieMovementService } from "../../squaddie/movement"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../history/battleAction/battleActionRecorder"
import { BattleActionsDuringTurnService } from "../history/battleAction/battleActionsDuringTurn"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { CampaignService } from "../../campaign/campaign"
import { ArmyAttributesService } from "../../squaddie/armyAttributes"
import { SquaddieStatusTileService } from "../hud/playerActionPanel/tile/squaddieStatusTile/squaddieStatusTile"
import { ActionTilePosition } from "../hud/playerActionPanel/tile/actionTilePosition"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { MapSearchTestUtils } from "../../hexMap/pathfinder/pathGeneration/mapSearchTests/mapSearchTestUtils"
import { MissionMapService } from "../../missionMap/missionMap"
import { SearchResultsCacheService } from "../../hexMap/pathfinder/searchResults/searchResultsCache"
import { SearchLimitService } from "../../hexMap/pathfinder/pathGeneration/searchLimit"

describe("Battle State", () => {
    it("overrides team strategy for non-player teams", () => {
        const state: BattleState = BattleStateService.newBattleState({
            campaignId: "test campaign",
            missionId: "test mission",
            teams: [
                {
                    id: "enemy team strategy",
                    name: "bad guys",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                    iconResourceKey: "icon_enemy_team",
                },
            ],
            teamStrategiesById: {
                "enemy team strategy": [
                    {
                        type: TeamStrategyType.END_TURN,
                        options: {},
                    },
                ],
            },
        })

        expect(
            BattleStateService.getTeamsAndStrategiesByAffiliation({
                battleState: state,
                affiliation: SquaddieAffiliation.PLAYER,
            })
        ).toBeUndefined()
        expect(
            BattleStateService.getTeamsAndStrategiesByAffiliation({
                battleState: state,
                affiliation: SquaddieAffiliation.ENEMY,
            })
        ).toEqual({
            teams: [
                {
                    id: "enemy team strategy",
                    name: "bad guys",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                    iconResourceKey: "icon_enemy_team",
                },
            ],
            strategies: {
                "enemy team strategy": [
                    {
                        type: TeamStrategyType.END_TURN,
                        options: {},
                    },
                ],
            },
        })
        expect(
            BattleStateService.getTeamsAndStrategiesByAffiliation({
                battleState: state,
                affiliation: SquaddieAffiliation.ALLY,
            })
        ).toEqual({
            teams: [],
            strategies: {},
        })
        expect(
            BattleStateService.getTeamsAndStrategiesByAffiliation({
                battleState: state,
                affiliation: SquaddieAffiliation.NONE,
            })
        ).toEqual({
            teams: [],
            strategies: {},
        })
    })

    it("will indicate if it is ready for battle", () => {
        const validityCheck = (
            args: any,
            isValid: boolean,
            isReadyToContinueMission: boolean,
            reasons: BattleStateValidityMissingComponent[]
        ) => {
            const state: BattleState = BattleStateService.newBattleState(args)
            expect(BattleStateService.isValid(state)).toBe(isValid)
            expect(BattleStateService.isReadyToContinueMission(state)).toBe(
                isReadyToContinueMission
            )
            expect(BattleStateService.missingComponents(state)).toEqual(
                expect.arrayContaining(reasons)
            )
        }

        let args = {}
        validityCheck(args, false, false, [
            BattleStateValidityMissingComponent.MISSION_MAP,
            BattleStateValidityMissingComponent.TEAMS,
            BattleStateValidityMissingComponent.MISSION_OBJECTIVE,
        ])

        args = {
            ...args,
            missionMap: NullMissionMap(),
        }
        validityCheck(args, false, false, [
            BattleStateValidityMissingComponent.TEAMS,
            BattleStateValidityMissingComponent.MISSION_OBJECTIVE,
        ])

        args = {
            ...args,
            teams: [
                {
                    id: "playerTeam",
                    name: "Players",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleSquaddieIds: [],
                },
                {
                    id: "enemyTeam",
                    name: "Baddies",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                },
            ],
        }
        validityCheck(args, true, false, [
            BattleStateValidityMissingComponent.MISSION_OBJECTIVE,
        ])

        args = {
            ...args,
            objectives: [
                MissionObjectiveHelper.validateMissionObjective({
                    id: "mission objective id",
                    reward: { rewardType: MissionRewardType.VICTORY },
                    hasGivenReward: false,
                    conditions: [
                        {
                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                            id: "defeat all enemies",
                        },
                    ],
                    numberOfRequiredConditionsToComplete: 1,
                }),
            ],
        }
        validityCheck(args, true, true, [])
    })

    const generateBattleState = () =>
        BattleStateService.newBattleState({
            campaignId: "test campaign",
            missionId: "test mission",
            missionMap: NullMissionMap(),
            teams: [
                {
                    id: "playerTeamId",
                    name: "Players",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleSquaddieIds: [],
                    iconResourceKey: "icon_player_team",
                },
                {
                    id: "enemyTeamId",
                    name: "Baddies",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                    iconResourceKey: "icon_enemy_team",
                },
            ],
            teamStrategiesById: {
                "enemy team strategy": [
                    {
                        type: TeamStrategyType.END_TURN,
                        options: {},
                    },
                ],
            },
            objectives: [
                MissionObjectiveHelper.validateMissionObjective({
                    id: "mission objective id",
                    reward: { rewardType: MissionRewardType.VICTORY },
                    hasGivenReward: false,
                    conditions: [
                        {
                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                            id: "defeat all enemies",
                        },
                    ],
                    numberOfRequiredConditionsToComplete: 1,
                }),
            ],
            missionCompletionStatus: {},
            missionStatistics: MissionStatisticsService.new({}),
            cutsceneTriggers: [],
            battlePhaseState: {
                turnCount: 20,
                currentAffiliation: BattlePhase.ENEMY,
            },
        })
    it("can clone existing objects", () => {
        let originalBattleState: BattleState = generateBattleState()

        expect(BattleStateService.isValid(originalBattleState)).toBeTruthy()

        const cloned: BattleState =
            BattleStateService.clone(originalBattleState)

        expect(BattleStateService.isValid(cloned)).toBeTruthy()
        expect(cloned).toEqual(originalBattleState)
    })

    it("can change itself to match other objects", () => {
        let originalBattleState: BattleState = generateBattleState()

        expect(BattleStateService.isValid(originalBattleState)).toBeTruthy()

        const cloned: BattleState = BattleStateService.newBattleState({
            campaignId: "test campaign",
            missionId: "test mission",
        })
        BattleStateService.update(cloned, originalBattleState)

        expect(BattleStateService.isValid(cloned)).toBeTruthy()
        expect(cloned).toEqual(originalBattleState)
    })

    describe("getCurrentTeam", () => {
        let playerTeam0: BattleSquaddieTeam
        let playerTeam1: BattleSquaddieTeam
        let enemyTeam0: BattleSquaddieTeam
        let battleState: BattleState
        let objectRepository: ObjectRepository
        let getImageUISpy: MockInstance

        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            getImageUISpy = vi
                .spyOn(ObjectRepositoryService, "getImageUIByBattleSquaddieId")
                .mockReturnValue(undefined)
            const playerTemplate: SquaddieTemplate =
                SquaddieTemplateService.new({
                    squaddieId: SquaddieIdService.new({
                        squaddieTemplateId: "player template",
                        name: "player template",
                        affiliation: SquaddieAffiliation.PLAYER,
                    }),
                })
            ObjectRepositoryService.addSquaddieTemplate(
                objectRepository,
                playerTemplate
            )
            ObjectRepositoryService.addBattleSquaddie(
                objectRepository,
                BattleSquaddieService.newBattleSquaddie({
                    battleSquaddieId: "player 0",
                    squaddieTemplate: playerTemplate,
                })
            )
            ObjectRepositoryService.addBattleSquaddie(
                objectRepository,
                BattleSquaddieService.newBattleSquaddie({
                    battleSquaddieId: "player 0 1",
                    squaddieTemplate: playerTemplate,
                })
            )
            ObjectRepositoryService.addBattleSquaddie(
                objectRepository,
                BattleSquaddieService.newBattleSquaddie({
                    battleSquaddieId: "player 1",
                    squaddieTemplate: playerTemplate,
                })
            )

            playerTeam0 = {
                id: "player team 0",
                name: "player team 0",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: ["player 0", "player 0 1"],
                iconResourceKey: "icon_player_team",
            }

            playerTeam1 = {
                id: "player team 1",
                name: "player team 1",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: ["player 1"],
                iconResourceKey: "icon_player_team",
            }

            const enemyTemplate: SquaddieTemplate = SquaddieTemplateService.new(
                {
                    squaddieId: SquaddieIdService.new({
                        squaddieTemplateId: "enemy template",
                        name: "enemy template",
                        affiliation: SquaddieAffiliation.ENEMY,
                    }),
                }
            )
            ObjectRepositoryService.addSquaddieTemplate(
                objectRepository,
                enemyTemplate
            )
            ObjectRepositoryService.addBattleSquaddie(
                objectRepository,
                BattleSquaddieService.newBattleSquaddie({
                    battleSquaddieId: "enemy 0",
                    squaddieTemplate: enemyTemplate,
                })
            )

            enemyTeam0 = {
                id: "enemy team 0",
                name: "enemy team 0",
                affiliation: SquaddieAffiliation.ENEMY,
                battleSquaddieIds: ["enemy 0"],
                iconResourceKey: "icon_enemy_team",
            }

            battleState = BattleStateService.new({
                campaignId: "test campaign",
                missionId: "mission",
                battlePhaseState: {
                    currentAffiliation: BattlePhase.UNKNOWN,
                    turnCount: 0,
                },
                teams: [playerTeam0, playerTeam1, enemyTeam0],
            })
        })
        afterEach(() => {
            getImageUISpy.mockRestore()
        })
        it("reports no teams when there are no teams with the current affiliation", () => {
            battleState.battlePhaseState.currentAffiliation =
                BattlePhase.UNKNOWN
            expect(
                BattleStateService.getCurrentTeam(battleState, objectRepository)
            ).toBeUndefined()
        })
        it("reports the first added team of a given affiliation when all teams are ready", () => {
            battleState.battlePhaseState.currentAffiliation = BattlePhase.PLAYER
            expect(
                BattleStateService.getCurrentTeam(battleState, objectRepository)
            ).toBe(playerTeam0)
        })
        it("reports the second added team of a given affiliation if the first team cannot act", () => {
            BattleSquaddieTeamService.endTurn(playerTeam0, objectRepository)
            battleState.battlePhaseState.currentAffiliation = BattlePhase.PLAYER
            expect(
                BattleStateService.getCurrentTeam(battleState, objectRepository)
            ).toBe(playerTeam1)
            expect(getImageUISpy).toHaveBeenCalled()
        })
        it("reports no teams when all of the teams of a given affiliation cannot act", () => {
            BattleSquaddieTeamService.endTurn(playerTeam0, objectRepository)
            BattleSquaddieTeamService.endTurn(playerTeam1, objectRepository)
            battleState.battlePhaseState.currentAffiliation = BattlePhase.PLAYER
            expect(
                BattleStateService.getCurrentTeam(battleState, objectRepository)
            ).toBeUndefined()
            expect(getImageUISpy).toHaveBeenCalled()
        })
    })

    describe("finishes battle action animation", () => {
        let gameEngineState: GameEngineState
        let moveAction: BattleAction
        let objectRepository: ObjectRepository
        let battleSquaddie: BattleSquaddie
        let messageSpy: MockInstance
        let drawReachSpy: MockInstance
        let tintSquaddieSpy: MockInstance

        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            ;({ battleSquaddie } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    affiliation: SquaddieAffiliation.PLAYER,
                    attributes: ArmyAttributesService.new({
                        maxHitPoints: 5,
                        movement: SquaddieMovementService.new({
                            movementPerAction: 2,
                        }),
                    }),
                    battleId: "battleSquaddieId",
                    name: "actor",
                    objectRepository: objectRepository,
                    templateId: "actor",
                    actionTemplateIds: [],
                }))

            gameEngineState = GameEngineStateService.new({
                repository: objectRepository,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionMap:
                            MapSearchTestUtils.create1row5columnsAllFlatTerrain(),
                        missionId: "test mission",
                        campaignId: "test campaign",
                    }),
                }),
                campaign: CampaignService.default(),
            })

            MissionMapService.addSquaddie({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                squaddieTemplateId: battleSquaddie.squaddieTemplateId,
                originMapCoordinate: { q: 0, r: 0 },
            })

            moveAction = BattleActionService.new({
                actor: { actorBattleSquaddieId: "battleSquaddieId" },
                action: { isMovement: true },
                effect: {
                    movement: {
                        startCoordinate: { q: 0, r: 0 },
                        endCoordinate: { q: 0, r: 1 },
                    },
                },
            })
            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                moveAction
            )

            const battleStateListener: BattleStateListener =
                new BattleStateListener("battleStateListener")
            gameEngineState.messageBoard.addListener(
                battleStateListener,
                MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION
            )

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")

            drawReachSpy = vi
                .spyOn(
                    DrawSquaddieIconOnMapUtilities,
                    "highlightPlayableSquaddieReachIfTheyCanAct"
                )
                .mockReturnValue()
            tintSquaddieSpy = vi
                .spyOn(
                    DrawSquaddieIconOnMapUtilities,
                    "tintSquaddieMapIconIfTheyCannotAct"
                )
                .mockReturnValue()
        })

        afterEach(() => {
            messageSpy.mockRestore()
            drawReachSpy.mockRestore()
            tintSquaddieSpy.mockRestore()
        })

        it("marks the battle action as animated and moves it into the already animated queue", () => {
            expect(
                BattleActionRecorderService.isAnimationQueueEmpty(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toBeFalsy()

            const battleAction =
                BattleActionRecorderService.peekAtAnimationQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            expect(
                BattleActionService.isAnimationComplete(battleAction)
            ).toBeFalsy()

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                gameEngineState,
                graphicsContext: new MockedP5GraphicsBuffer(),
                resourceHandler: gameEngineState.resourceHandler,
            })

            expect(
                BattleActionService.isAnimationComplete(battleAction)
            ).toBeTruthy()

            expect(
                BattleActionRecorderService.isAnimationQueueEmpty(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toBeTruthy()

            expect(
                BattleActionRecorderService.peekAtAlreadyAnimatedQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toEqual(battleAction)
        })

        describe("Removing movement actions", () => {
            let moveToOriginCoordinateAction: BattleAction
            let actionTemplateAction: BattleAction

            beforeEach(() => {
                moveToOriginCoordinateAction = BattleActionService.new({
                    actor: { actorBattleSquaddieId: "battleSquaddieId" },
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startCoordinate: { q: 0, r: 1 },
                            endCoordinate: { q: 0, r: 0 },
                        },
                    },
                })

                actionTemplateAction = BattleActionService.new({
                    actor: { actorBattleSquaddieId: "battleSquaddieId" },
                    action: { actionTemplateId: "actionTemplateId" },
                    effect: {
                        squaddie: [],
                    },
                })
            })

            describe("squaddie immediately moves to its original location", () => {
                beforeEach(() => {
                    gameEngineState.messageBoard.sendMessage({
                        type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                        gameEngineState,
                        graphicsContext: new MockedP5GraphicsBuffer(),
                        resourceHandler: gameEngineState.resourceHandler,
                    })
                    moveToOriginCoordinateAction = BattleActionService.new({
                        actor: { actorBattleSquaddieId: "battleSquaddieId" },
                        action: { isMovement: true },
                        effect: {
                            movement: {
                                startCoordinate: { q: 0, r: 1 },
                                endCoordinate: { q: 0, r: 0 },
                            },
                        },
                    })
                    BattleActionRecorderService.addReadyToAnimateBattleAction(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                        moveToOriginCoordinateAction
                    )
                    gameEngineState.messageBoard.sendMessage({
                        type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                        gameEngineState,
                        graphicsContext: new MockedP5GraphicsBuffer(),
                        resourceHandler: gameEngineState.resourceHandler,
                    })
                })
                it("removes all new movement actions from the already animated queue", () => {
                    expect(
                        BattleActionRecorderService.peekAtAlreadyAnimatedQueue(
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionRecorder
                        )
                    ).toBeUndefined()
                })
                it("removes movement actions from the already animated queue", () => {
                    const alreadyAnimatedActions =
                        BattleActionsDuringTurnService.getAll(
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionRecorder
                                .actionsAlreadyAnimatedThisTurn
                        )

                    expect(alreadyAnimatedActions).toHaveLength(0)
                })
            })
            describe("squaddie acts then moves to its original location", () => {
                beforeEach(() => {
                    gameEngineState.messageBoard.sendMessage({
                        type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                        gameEngineState,
                        graphicsContext: new MockedP5GraphicsBuffer(),
                        resourceHandler: gameEngineState.resourceHandler,
                    })

                    BattleActionRecorderService.addReadyToAnimateBattleAction(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                        actionTemplateAction
                    )
                    gameEngineState.messageBoard.sendMessage({
                        type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                        gameEngineState,
                        graphicsContext: new MockedP5GraphicsBuffer(),
                        resourceHandler: gameEngineState.resourceHandler,
                    })
                    MissionMapService.updateBattleSquaddieCoordinate({
                        missionMap:
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap,
                        battleSquaddieId: battleSquaddie.battleSquaddieId,
                        coordinate: { q: 0, r: 1 },
                    })
                    MissionMapService.setOriginMapCoordinateToCurrentMapCoordinate(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                        battleSquaddie.battleSquaddieId
                    )

                    BattleActionRecorderService.addReadyToAnimateBattleAction(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                        moveToOriginCoordinateAction
                    )
                    gameEngineState.messageBoard.sendMessage({
                        type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                        gameEngineState,
                        graphicsContext: new MockedP5GraphicsBuffer(),
                        resourceHandler: gameEngineState.resourceHandler,
                    })
                })
                it("keeps all new movement actions from the already animated queue", () => {
                    const alreadyAnimatedActions =
                        BattleActionsDuringTurnService.getAll(
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionRecorder
                                .actionsAlreadyAnimatedThisTurn
                        )

                    expect(alreadyAnimatedActions).toHaveLength(3)
                    expect(alreadyAnimatedActions).toEqual(
                        expect.arrayContaining([
                            moveAction,
                            actionTemplateAction,
                            moveToOriginCoordinateAction,
                        ])
                    )
                })
            })
        })

        it("tries to update the inBattleAttributes for the summary window", () => {
            const updateTileUsingSquaddieSpy: MockInstance = vi
                .spyOn(SquaddieStatusTileService, "updateTileUsingSquaddie")
                .mockImplementation(() => {})

            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                SummaryHUDStateService.new()
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.squaddieStatusTiles =
                {}
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.squaddieStatusTiles[
                ActionTilePosition.ACTOR_STATUS
            ] = SquaddieStatusTileService.new({
                gameEngineState,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                horizontalPosition: ActionTilePosition.ACTOR_STATUS,
            })

            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.squaddieStatusTiles[
                ActionTilePosition.TARGET_STATUS
            ] = SquaddieStatusTileService.new({
                gameEngineState,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                horizontalPosition: ActionTilePosition.TARGET_STATUS,
            })

            const graphicsContext = new MockedP5GraphicsBuffer()
            graphicsContext.textWidth = vi.fn().mockReturnValue(10)

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                gameEngineState,
                graphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })

            expect(updateTileUsingSquaddieSpy).toBeCalledWith(
                expect.objectContaining({
                    tile: gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.squaddieStatusTiles[
                        ActionTilePosition.ACTOR_STATUS
                    ],
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                })
            )
            expect(updateTileUsingSquaddieSpy).toBeCalledWith(
                expect.objectContaining({
                    tile: gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.squaddieStatusTiles[
                        ActionTilePosition.TARGET_STATUS
                    ],
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                })
            )

            updateTileUsingSquaddieSpy.mockRestore()
        })

        it("will invalidate the movement cache for this squaddie", () => {
            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache:
                    gameEngineState.battleOrchestratorState.cache
                        .searchResultsCache,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                originMapCoordinate: { q: 0, r: 0 },
                currentMapCoordinate: { q: 0, r: 0 },
                searchLimit: SearchLimitService.landBasedMovement(),
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository,
            })

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                gameEngineState,
                graphicsContext: new MockedP5GraphicsBuffer(),
                resourceHandler: gameEngineState.resourceHandler,
            })

            expect(
                SearchResultsCacheService.hasSquaddieAllMovement({
                    searchResultsCache:
                        gameEngineState.battleOrchestratorState.cache
                            .searchResultsCache,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                })
            ).toBeFalsy()
        })

        describe("Squaddie still has a turn after finishing the action", () => {
            beforeEach(() => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                    gameEngineState,
                    graphicsContext: new MockedP5GraphicsBuffer(),
                    resourceHandler: gameEngineState.resourceHandler,
                })
            })

            it("If the squaddie still has a turn, makes the decision to select the squaddie", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                ).not.toBeUndefined()
                expect(
                    BattleActionDecisionStepService.getActor(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    ).battleSquaddieId
                ).toEqual("battleSquaddieId")
            })

            it("Tries to draw the squaddie reach and tint the squaddie", () => {
                expect(drawReachSpy).toBeCalled()
                expect(tintSquaddieSpy).toBeCalled()
            })
        })

        describe("When the squaddie ends their turn", () => {
            beforeEach(() => {
                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                    gameEngineState,
                    graphicsContext: new MockedP5GraphicsBuffer(),
                    resourceHandler: gameEngineState.resourceHandler,
                })
            })

            it("If the squaddie turn is over, do not make the decision to select the squaddie", () => {
                expect(
                    BattleActionDecisionStepService.getActor(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )
                ).toBeUndefined()
            })

            it("will send a message indicating the squaddie turn is over when they cannot act", () => {
                expect(messageSpy).toBeCalledWith({
                    type: MessageBoardMessageType.SQUADDIE_TURN_ENDS,
                    gameEngineState,
                })
            })
        })
    })

    describe("squaddie turn ends because they are out of actions", () => {
        let gameEngineState: GameEngineState
        let objectRepository: ObjectRepository
        let battleSquaddieId = "battleSquaddieId"

        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()

            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                affiliation: SquaddieAffiliation.PLAYER,
                attributes: ArmyAttributesService.new({
                    maxHitPoints: 5,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                }),
                battleId: battleSquaddieId,
                name: "actor",
                objectRepository: objectRepository,
                templateId: "actor",
                actionTemplateIds: [],
            })

            gameEngineState = GameEngineStateService.new({
                repository: objectRepository,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap:
                            MapSearchTestUtils.create1row5columnsAllFlatTerrain(),
                    }),
                }),
            })

            const battleStateListener: BattleStateListener =
                new BattleStateListener("battleStateListener")
            gameEngineState.messageBoard.addListener(
                battleStateListener,
                MessageBoardMessageType.SQUADDIE_TURN_ENDS
            )
        })

        const setupBattleActionRecorder = () => {
            const moveBattleAction: BattleAction = BattleActionService.new({
                actor: { actorBattleSquaddieId: "actor" },
                action: { isMovement: true },
                effect: {
                    movement: {
                        startCoordinate: { q: 0, r: 0 },
                        endCoordinate: { q: 0, r: 1 },
                    },
                },
                animation: { completed: true },
            })
            const endTurnAction: BattleAction = BattleActionService.new({
                actor: { actorBattleSquaddieId: "actor" },
                action: { isEndTurn: true },
                effect: {
                    endTurn: true,
                },
                animation: { completed: true },
            })

            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                moveBattleAction
            )
            BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )
            BattleActionRecorderService.turnComplete(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                endTurnAction
            )
            BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

            return {
                moveBattleAction,
                endTurnAction,
            }
        }

        it("Records the current turn into the turn history", () => {
            const { moveBattleAction, endTurnAction } =
                setupBattleActionRecorder()

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SQUADDIE_TURN_ENDS,
                gameEngineState,
            })

            const battleActionRecorder: BattleActionRecorder =
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder

            const previousTurns =
                BattleActionRecorderService.getPreviousBattleActionTurns(
                    battleActionRecorder
                )
            expect(previousTurns).toHaveLength(2)

            expect(
                BattleActionsDuringTurnService.getAll(previousTurns[0])
            ).toEqual([moveBattleAction])
            expect(
                BattleActionsDuringTurnService.getAll(previousTurns[1])
            ).toEqual([endTurnAction])
        })

        it("clears the current turn", () => {
            setupBattleActionRecorder()

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SQUADDIE_TURN_ENDS,
                gameEngineState,
            })

            const battleActionRecorder: BattleActionRecorder =
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder

            expect(
                BattleActionRecorderService.isAnimationQueueEmpty(
                    battleActionRecorder
                )
            ).toBeTruthy()
            expect(
                BattleActionRecorderService.isAlreadyAnimatedQueueEmpty(
                    battleActionRecorder
                )
            ).toBeTruthy()
        })

        it("the summary HUD is no longer drawn", () => {
            setupBattleActionRecorder()

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SQUADDIE_TURN_ENDS,
                gameEngineState,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()
        })

        it("the player is not considering any actions once the turn ends", () => {
            setupBattleActionRecorder()

            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions =
                {
                    actionTemplateId: "actionTemplateId",
                    movement: {
                        actionPointCost: 3,
                        coordinates: [
                            { q: 0, r: 0 },
                            { q: 0, r: 1 },
                        ],
                        destination: { q: 0, r: 1 },
                    },
                    endTurn: true,
                }

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SQUADDIE_TURN_ENDS,
                gameEngineState,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .playerConsideredActions
            ).toEqual({})
        })

        it("will invalidate the movement cache for this squaddie", () => {
            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache:
                    gameEngineState.battleOrchestratorState.cache
                        .searchResultsCache,
                battleSquaddieId,
                originMapCoordinate: { q: 0, r: 0 },
                currentMapCoordinate: { q: 0, r: 0 },
                searchLimit: SearchLimitService.landBasedMovement(),
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository,
            })

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SQUADDIE_TURN_ENDS,
                gameEngineState,
            })

            expect(
                SearchResultsCacheService.hasSquaddieAllMovement({
                    searchResultsCache:
                        gameEngineState.battleOrchestratorState.cache
                            .searchResultsCache,
                    battleSquaddieId,
                })
            ).toBeFalsy()
        })
    })
})
