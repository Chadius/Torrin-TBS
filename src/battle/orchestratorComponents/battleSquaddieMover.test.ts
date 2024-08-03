import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddie } from "../battleSquaddie"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../orchestrator/battleOrchestratorState"
import { BattleSquaddieMover } from "./battleSquaddieMover"
import { MissionMap } from "../../missionMap/missionMap"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import { SearchPath } from "../../hexMap/pathfinder/searchPath"
import { SearchParametersHelper } from "../../hexMap/pathfinder/searchParams"
import { getResultOrThrowError, makeResult } from "../../utils/ResultOrError"
import { TIME_TO_MOVE } from "../animation/squaddieMoveAnimationUtils"
import {
    GetTargetingShapeGenerator,
    TargetingShape,
} from "../targeting/targetingShapeGenerator"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { CreateNewSquaddieAndAddToRepository } from "../../utils/test/squaddie"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderHelper } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { DecidedActionService } from "../../action/decided/decidedAction"
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { CampaignService } from "../../campaign/campaign"
import { BattleHUDListener, BattleHUDService } from "../hud/battleHUD"
import { BattlePhase } from "./battlePhaseTracker"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"

describe("BattleSquaddieMover", () => {
    let squaddieRepo: ObjectRepository
    let player1Static: SquaddieTemplate
    let player1BattleSquaddie: BattleSquaddie
    let enemy1Static: SquaddieTemplate
    let enemy1Dynamic: BattleSquaddie
    let map: MissionMap
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        squaddieRepo = ObjectRepositoryService.new()
        map = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 ", " 1 1 "],
            }),
        })
        ;({
            squaddieTemplate: player1Static,
            battleSquaddie: player1BattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Player1",
            templateId: "player_1",
            battleId: "player_1",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
        }))
        ;({ squaddieTemplate: enemy1Static, battleSquaddie: enemy1Dynamic } =
            CreateNewSquaddieAndAddToRepository({
                name: "Enemy1",
                templateId: "enemy_1",
                battleId: "enemy_1",
                affiliation: SquaddieAffiliation.ENEMY,
                squaddieRepository: squaddieRepo,
            }))
    })

    it("is complete once enough time passes and the squaddie finishes moving", () => {
        map.addSquaddie("player_1", "player_1", { q: 0, r: 0 })

        const searchResults: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                canStopOnSquaddies: true,
                movementPerAction: 99,
                shapeGenerator: getResultOrThrowError(
                    GetTargetingShapeGenerator(TargetingShape.SNAKE)
                ),
                maximumDistanceMoved: undefined,
                minimumDistanceMoved: undefined,
                ignoreTerrainCost: false,
                canPassOverPits: false,
                canPassThroughWalls: false,
                stopLocations: [{ q: 1, r: 1 }],
                numberOfActions: 1,
            }),
            missionMap: map,
            repository: squaddieRepo,
        })

        const movePath: SearchPath =
            SearchResultsService.getShortestPathToLocation(searchResults, 1, 1)

        const decidedActionMovementEffect =
            DecidedActionMovementEffectService.new({
                destination: { q: 0, r: 3 },
                template: ActionEffectMovementTemplateService.new({}),
            })
        const processedAction = ProcessedActionService.new({
            decidedAction: DecidedActionService.new({
                battleSquaddieId: "player_1",
                actionPointCost: 3,
                actionTemplateName: "Move",
                actionEffects: [decidedActionMovementEffect],
            }),
            processedActionEffects: [
                ProcessedActionMovementEffectService.new({
                    decidedActionEffect: decidedActionMovementEffect,
                }),
            ],
        })
        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: "player_1",
            startingLocation: { q: 0, r: 0 },
            processedActions: [processedAction],
        })

        const state: GameEngineState = GameEngineStateService.new({
            repository: squaddieRepo,
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                    missionMap: map,
                    searchPath: movePath,
                    actionsThisRound,
                }),
            }),
            campaign: CampaignService.default({}),
        })
        const mover: BattleSquaddieMover = new BattleSquaddieMover()
        jest.spyOn(Date, "now").mockImplementation(() => 1)
        mover.update(state, mockedP5GraphicsContext)
        expect(mover.hasCompleted(state)).toBeFalsy()

        jest.spyOn(Date, "now").mockImplementation(() => 1 + TIME_TO_MOVE)
        mover.update(state, mockedP5GraphicsContext)
        expect(mover.hasCompleted(state)).toBeTruthy()
        mover.reset(state)
        expect(mover.animationStartTime).toBeUndefined()
    })

    it("sends a message once the squaddie finishes moving", () => {
        map.addSquaddie("player_1", "player_1", { q: 0, r: 0 })

        const searchResults: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                canStopOnSquaddies: true,
                movementPerAction: 99,
                shapeGenerator: getResultOrThrowError(
                    GetTargetingShapeGenerator(TargetingShape.SNAKE)
                ),
                maximumDistanceMoved: undefined,
                minimumDistanceMoved: undefined,
                ignoreTerrainCost: false,
                canPassOverPits: false,
                canPassThroughWalls: false,
                stopLocations: [{ q: 1, r: 1 }],
                numberOfActions: 1,
            }),
            missionMap: map,
            repository: squaddieRepo,
        })

        const movePath: SearchPath =
            SearchResultsService.getShortestPathToLocation(searchResults, 1, 1)

        const decidedActionMovementEffect =
            DecidedActionMovementEffectService.new({
                destination: { q: 0, r: 3 },
                template: ActionEffectMovementTemplateService.new({}),
            })
        const processedAction = ProcessedActionService.new({
            decidedAction: DecidedActionService.new({
                battleSquaddieId: "player_1",
                actionPointCost: 3,
                actionTemplateName: "Move",
                actionEffects: [decidedActionMovementEffect],
            }),
            processedActionEffects: [
                ProcessedActionMovementEffectService.new({
                    decidedActionEffect: decidedActionMovementEffect,
                }),
            ],
        })
        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: "player_1",
            startingLocation: { q: 0, r: 0 },
            processedActions: [processedAction],
        })

        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: squaddieRepo,
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                    missionMap: map,
                    searchPath: movePath,
                    actionsThisRound,
                }),
            }),
            campaign: CampaignService.default({}),
        })
        const messageSpy: jest.SpyInstance = jest.spyOn(
            gameEngineState.messageBoard,
            "sendMessage"
        )

        const mover: BattleSquaddieMover = new BattleSquaddieMover()
        jest.spyOn(Date, "now").mockImplementation(() => 1)
        mover.update(gameEngineState, mockedP5GraphicsContext)

        jest.spyOn(Date, "now").mockImplementation(() => 1 + TIME_TO_MOVE)
        mover.update(gameEngineState, mockedP5GraphicsContext)
        mover.reset(gameEngineState)

        expect(messageSpy).toBeCalledWith({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            gameEngineState,
        })
    })

    describe("reset actions based on squaddie", () => {
        const setupSquaddie = ({
            squaddieAffiliation,
            actionsThisRound,
        }: {
            squaddieAffiliation: SquaddieAffiliation
            actionsThisRound?: ActionsThisRound
        }): BattleOrchestratorState => {
            const searchResults: SearchResult = PathfinderHelper.search({
                searchParameters: SearchParametersHelper.new({
                    startLocations: [{ q: 0, r: 0 }],
                    squaddieAffiliation: squaddieAffiliation,
                    canStopOnSquaddies: true,
                    movementPerAction: 999,
                    shapeGenerator: getResultOrThrowError(
                        GetTargetingShapeGenerator(TargetingShape.SNAKE)
                    ),
                    maximumDistanceMoved: undefined,
                    minimumDistanceMoved: 0,
                    ignoreTerrainCost: false,
                    canPassOverPits: false,
                    canPassThroughWalls: false,
                    stopLocations: [{ q: 1, r: 1 }],
                    numberOfActions: 1,
                }),
                missionMap: map,
                repository: squaddieRepo,
            })

            const movePath: SearchPath =
                SearchResultsService.getShortestPathToLocation(
                    searchResults,
                    1,
                    1
                )

            return BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: map,
                    searchPath: movePath,
                    actionsThisRound,
                    battlePhaseState: {
                        currentAffiliation: BattlePhase.PLAYER,
                        turnCount: 0,
                    },
                }),
            })
        }

        describe("when the squaddie currently acting runs out of actions and finishes moving", () => {
            let mover: BattleSquaddieMover
            let gameEngineState: GameEngineState
            let clearActionsSpy: jest.SpyInstance

            beforeEach(() => {
                map.addSquaddie("player_1", "player_1", { q: 0, r: 0 })

                const decidedActionMovementEffect =
                    DecidedActionMovementEffectService.new({
                        destination: { q: 1, r: 1 },
                        template: ActionEffectMovementTemplateService.new({}),
                    })
                const processedAction = ProcessedActionService.new({
                    decidedAction: DecidedActionService.new({
                        battleSquaddieId: "player_1",
                        actionPointCost: 3,
                        actionTemplateName: "Move",
                        actionEffects: [decidedActionMovementEffect],
                    }),
                    processedActionEffects: [
                        ProcessedActionMovementEffectService.new({
                            decidedActionEffect: decidedActionMovementEffect,
                        }),
                    ],
                })
                const actionsThisRound = ActionsThisRoundService.new({
                    battleSquaddieId: "player_1",
                    startingLocation: { q: 0, r: 0 },
                    processedActions: [processedAction],
                })

                let mockResourceHandler = mocks.mockResourceHandler(
                    mockedP5GraphicsContext
                )
                mockResourceHandler.getResource = jest
                    .fn()
                    .mockReturnValue(makeResult(null))

                gameEngineState = GameEngineStateService.new({
                    battleOrchestratorState: setupSquaddie({
                        squaddieAffiliation: SquaddieAffiliation.PLAYER,
                        actionsThisRound,
                    }),
                    repository: squaddieRepo,
                    resourceHandler: mockResourceHandler,
                })
                player1BattleSquaddie.squaddieTurn.remainingActionPoints = 0

                mover = new BattleSquaddieMover()
                clearActionsSpy = jest.spyOn(
                    OrchestratorUtilities,
                    "clearActionsThisRoundIfSquaddieCannotAct"
                )

                jest.spyOn(Date, "now").mockImplementation(() => 1)
                mover.update(gameEngineState, mockedP5GraphicsContext)
                jest.spyOn(Date, "now").mockImplementation(
                    () => 1 + TIME_TO_MOVE
                )
                mover.update(gameEngineState, mockedP5GraphicsContext)
            })

            afterEach(() => {
                clearActionsSpy.mockRestore()
            })

            it("hides the HUD", () => {
                mover.reset(gameEngineState)
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState
                ).toBeUndefined()
            })

            it("clear the expected actions", () => {
                mover.reset(gameEngineState)
                mover.recommendStateChanges(gameEngineState)
                expect(clearActionsSpy).toBeCalledWith(gameEngineState)
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                ).toBeUndefined()
            })
        })

        describe("squaddie has action points remaining after moving", () => {
            let mover: BattleSquaddieMover
            let gameEngineState: GameEngineState
            let dateSpy: jest.SpyInstance

            beforeEach(() => {
                map.addSquaddie("player_1", "player_1", { q: 0, r: 0 })

                const decidedActionMovementEffect =
                    DecidedActionMovementEffectService.new({
                        destination: { q: 1, r: 1 },
                        template: ActionEffectMovementTemplateService.new({}),
                    })
                const processedAction = ProcessedActionService.new({
                    decidedAction: DecidedActionService.new({
                        battleSquaddieId: "player_1",
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
                const actionsThisRound = ActionsThisRoundService.new({
                    battleSquaddieId: "player_1",
                    startingLocation: { q: 0, r: 0 },
                    processedActions: [processedAction],
                })

                let mockResourceHandler = mocks.mockResourceHandler(
                    mockedP5GraphicsContext
                )
                mockResourceHandler.getResource = jest
                    .fn()
                    .mockReturnValue(makeResult(null))
                gameEngineState = GameEngineStateService.new({
                    battleOrchestratorState: setupSquaddie({
                        squaddieAffiliation: SquaddieAffiliation.PLAYER,
                        actionsThisRound,
                    }),
                    resourceHandler: mockResourceHandler,
                    repository: squaddieRepo,
                    campaign: CampaignService.default({}),
                })
                gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
                    BattleActionDecisionStepService.new()
                BattleActionDecisionStepService.setActor({
                    actionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState,
                    battleSquaddieId: "player_1",
                })
                BattleActionDecisionStepService.addAction({
                    actionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState,
                    movement: true,
                })
                BattleActionDecisionStepService.setConfirmedTarget({
                    actionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState,
                    targetLocation: { q: 0, r: 0 },
                })

                const battleHUDListener = new BattleHUDListener(
                    "battleHUDListener"
                )
                battleHUDListener.receiveMessage({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: "player_1",
                    selectionMethod: {
                        mouse: { x: 0, y: 0 },
                    },
                })

                mover = new BattleSquaddieMover()
                dateSpy = jest.spyOn(Date, "now").mockImplementation(() => 1)
                mover.update(gameEngineState, mockedP5GraphicsContext)
                dateSpy = jest
                    .spyOn(Date, "now")
                    .mockImplementation(() => 1 + TIME_TO_MOVE)
                mover.update(gameEngineState, mockedP5GraphicsContext)
            })

            afterEach(() => {
                dateSpy.mockRestore()
            })

            it("should open the HUD if the squaddie turn has actions remaining", () => {
                mover.reset(gameEngineState)
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.showSummaryHUD
                ).toBeTruthy()
            })

            it("should tell the action builder the animation is complete and check if it needs to be reset", () => {
                expect(
                    BattleActionDecisionStepService.isAnimationComplete(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeTruthy()
                const actionBuilderSpy = jest.spyOn(
                    OrchestratorUtilities,
                    "resetActionBuilderIfActionIsComplete"
                )

                mover.reset(gameEngineState)

                expect(actionBuilderSpy).toBeCalledWith(gameEngineState)
                expect(
                    BattleActionDecisionStepService.isActionRecordComplete(
                        gameEngineState.battleOrchestratorState.battleState
                            .playerBattleActionBuilderState
                    )
                ).toBeFalsy()
                actionBuilderSpy.mockRestore()
            })
        })
    })
})
