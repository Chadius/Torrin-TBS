import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleCamera } from "../battleCamera"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { OrchestratorUtilities } from "./orchestratorUtils"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { ArmyAttributesService } from "../../squaddie/armyAttributes"
import { SquaddieIdService } from "../../squaddie/id"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battleState/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattlePhaseStateService } from "./battlePhaseController"
import { BattlePhase } from "./battlePhaseTracker"
import {
    DEFAULT_ACTION_POINTS_PER_TURN,
    SquaddieTurnService,
} from "../../squaddie/turn"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { DamageType, SquaddieService } from "../../squaddie/squaddieService"
import { BattleHUDService } from "../hud/battleHUD/battleHUD"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { CampaignService } from "../../campaign/campaign"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    MapGraphicsLayer,
    MapGraphicsLayerHighlight,
    MapGraphicsLayerType,
} from "../../hexMap/mapLayer/mapGraphicsLayer"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { SearchResultsCacheService } from "../../hexMap/pathfinder/searchResults/searchResultsCache"
import { PlayerCommandStateService } from "../hud/playerCommand/playerCommandHUD"

describe("Orchestration Utils", () => {
    let knightSquaddieTemplate: SquaddieTemplate
    let knightBattleSquaddie: BattleSquaddie
    let squaddieRepository: ObjectRepository
    let map: MissionMap
    let camera: BattleCamera

    beforeEach(() => {
        squaddieRepository = ObjectRepositoryService.new()
        ;({
            squaddieTemplate: knightSquaddieTemplate,
            battleSquaddie: knightBattleSquaddie,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "knight",
            templateId: "knight_static",
            battleId: "knight_dynamic",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: squaddieRepository,
            actionTemplateIds: [],
        }))

        map = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })
        MissionMapService.addSquaddie({
            missionMap: map,
            squaddieTemplateId: knightBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            originMapCoordinate: { q: 0, r: 2 },
        })

        camera = new BattleCamera()
    })

    it("can return the squaddie and information at a given location on the screen", () => {
        const screenLocation =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: { q: 0, r: 2 },
                cameraLocation: camera.getWorldLocation(),
            })

        const { squaddieTemplate, battleSquaddie, squaddieMapCoordinate } =
            OrchestratorUtilities.getSquaddieAtScreenLocation({
                screenLocation,
                camera,
                map,
                squaddieRepository,
            })

        expect(squaddieTemplate).toStrictEqual(knightSquaddieTemplate)
        expect(battleSquaddie).toStrictEqual(knightBattleSquaddie)
        expect(squaddieMapCoordinate).toStrictEqual({ q: 0, r: 2 })
    })

    it("can return the squaddie and information at a given map coordinate", () => {
        const { squaddieTemplate, battleSquaddie, squaddieMapCoordinate } =
            OrchestratorUtilities.getSquaddieAtMapCoordinate({
                mapCoordinate: { q: 0, r: 2 },
                map,
                squaddieRepository,
            })

        expect(squaddieTemplate).toStrictEqual(knightSquaddieTemplate)
        expect(battleSquaddie).toStrictEqual(knightBattleSquaddie)
        expect(squaddieMapCoordinate).toStrictEqual({ q: 0, r: 2 })
    })

    it("returns undefined information if there is no squaddie at the screen location", () => {
        const screenLocation =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: { q: 0, r: 0 },
                cameraLocation: camera.getWorldLocation(),
            })

        const { squaddieTemplate, battleSquaddie, squaddieMapCoordinate } =
            OrchestratorUtilities.getSquaddieAtScreenLocation({
                screenLocation,
                camera,
                map,
                squaddieRepository,
            })

        expect(squaddieTemplate).toBeUndefined()
        expect(battleSquaddie).toBeUndefined()
        expect(squaddieMapCoordinate).toBeUndefined()
    })

    it("throws an error if squaddie repository does not have squaddie", () => {
        MissionMapService.addSquaddie({
            missionMap: map,
            squaddieTemplateId: "does not exist",
            battleSquaddieId: "does not exist",
            originMapCoordinate: { q: 0, r: 0 },
        })
        const screenLocation =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: { q: 0, r: 0 },
                cameraLocation: camera.getWorldLocation(),
            })

        const shouldThrowError = () => {
            OrchestratorUtilities.getSquaddieAtScreenLocation({
                screenLocation,
                camera,
                map,
                squaddieRepository,
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
    })

    describe("isSquaddieCurrentlyTakingATurn", () => {
        let repository: ObjectRepository
        let gameEngineState: GameEngineState

        beforeEach(() => {
            repository = ObjectRepositoryService.new()
            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                SquaddieTemplateService.new({
                    attributes: ArmyAttributesService.default(),
                    squaddieId: SquaddieIdService.new({
                        templateId: "templateId",
                        name: "name",
                        affiliation: SquaddieAffiliation.PLAYER,
                    }),
                })
            )
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                BattleSquaddieService.new({
                    squaddieTemplateId: "templateId",
                    battleSquaddieId: "battle",
                })
            )

            gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: new BattleOrchestratorState({
                    battleState: BattleStateService.defaultBattleState({
                        missionId: "missionId",
                        campaignId: "test campaign",
                    }),
                    battleHUD: BattleHUDService.new({}),
                    numberGenerator: undefined,
                }),
                resourceHandler: undefined,
                repository: repository,
            })
        })

        it("is not if there is no squaddie is currently acting", () => {
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn({
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                })
            ).toBeFalsy()
        })

        it("is not if the squaddie has not targeted something", () => {
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()

            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: "battle",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: "maybe use this action",
            })

            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn({
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                })
            ).toBeFalsy()
        })

        it("is if the squaddie already made a decision that does not end the turn", () => {
            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                BattleActionService.new({
                    actor: { actorBattleSquaddieId: "battle" },
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startCoordinate: { q: 0, r: 0 },
                            endCoordinate: { q: 0, r: 0 },
                        },
                    },
                })
            )
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn({
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                })
            ).toBeTruthy()
        })

        it("is not taking a turn if there is no battle squaddie Id", () => {
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: "forgot to set the battle squaddie id",
            })

            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn({
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                })
            ).toBeFalsy()
        })
    })

    describe("can the acting squaddie act", () => {
        let repository: ObjectRepository
        let battleSquaddie: BattleSquaddie
        let squaddieTemplate: SquaddieTemplate
        let gameEngineState: GameEngineState
        let movementBattleAction: BattleAction

        beforeEach(() => {
            repository = ObjectRepositoryService.new()
            squaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "squaddieTemplate",
                    name: "Squaddie Template",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
            })
            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                squaddieTemplate
            )

            battleSquaddie = BattleSquaddieService.new({
                squaddieTemplate,
                battleSquaddieId: "battleSquaddieId",
            })
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                battleSquaddie
            )

            gameEngineState = GameEngineStateService.new({
                repository,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.new({
                        battlePhaseState: BattlePhaseStateService.new({
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        }),
                        missionId: "mission",
                        campaignId: "test campaign",
                    }),
                }),
            })

            movementBattleAction = BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: battleSquaddie.battleSquaddieId,
                },
                action: { isMovement: true },
                effect: {
                    movement: {
                        startCoordinate: { q: 0, r: 0 },
                        endCoordinate: { q: 0, r: 0 },
                    },
                },
            })
        })

        describe("canTheCurrentSquaddieAct", () => {
            it("will return true if the squaddie has not acted yet", () => {
                BattleActionRecorderService.addReadyToAnimateBattleAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                    movementBattleAction
                )
                expect(
                    OrchestratorUtilities.canTheCurrentSquaddieAct(
                        gameEngineState
                    )
                ).toBeTruthy()
            })
            it("will return true if the squaddie has finished acting but has not animated yet", () => {
                BattleActionRecorderService.addReadyToAnimateBattleAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                    movementBattleAction
                )
                expect(
                    OrchestratorUtilities.canTheCurrentSquaddieAct(
                        gameEngineState
                    )
                ).toBeTruthy()
            })
            it("will return true if the squaddie has acted and has actions remaining", () => {
                BattleActionRecorderService.addReadyToAnimateBattleAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                    movementBattleAction
                )
                BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )

                expect(
                    OrchestratorUtilities.canTheCurrentSquaddieAct(
                        gameEngineState
                    )
                ).toBeTruthy()
            })
            it("will return false if the squaddie has no actions remaining", () => {
                BattleActionRecorderService.addReadyToAnimateBattleAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                    movementBattleAction
                )
                BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
                expect(
                    OrchestratorUtilities.canTheCurrentSquaddieAct(
                        gameEngineState
                    )
                ).toBeFalsy()
            })
            it("will return false if the squaddie is dead", () => {
                BattleActionRecorderService.addReadyToAnimateBattleAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                    movementBattleAction
                )
                BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
                InBattleAttributesService.takeDamage({
                    inBattleAttributes: battleSquaddie.inBattleAttributes,
                    damageToTake:
                        battleSquaddie.inBattleAttributes.currentHitPoints,
                    damageType: DamageType.UNKNOWN,
                })
                const { isDead } = SquaddieService.canSquaddieActRightNow({
                    squaddieTemplate: squaddieTemplate,
                    battleSquaddie: battleSquaddie,
                })
                expect(isDead).toBeTruthy()
                expect(
                    OrchestratorUtilities.canTheCurrentSquaddieAct(
                        gameEngineState
                    )
                ).toBeFalsy()
            })
        })
    })

    describe("generateMessagesIfThePlayerCanActWithANewSquaddie", () => {
        let messageBoardSpy: MockInstance
        let repository: ObjectRepository
        let gameEngineState: GameEngineState

        beforeEach(() => {
            repository = ObjectRepositoryService.new()
        })

        afterEach(() => {
            messageBoardSpy.mockRestore()
        })

        const makeGameEngineState = (
            currentAffiliation: BattlePhase,
            playerCount: number,
            enemyCount: number
        ): {
            gameEngineState: GameEngineState
            playerSquaddieIds: string[]
            enemySquaddieIds: string[]
        } => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 1 "],
                }),
            })

            const playerSquaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "playerSquaddieTemplate",
                    name: "Player Squaddie Template",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
            })
            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                playerSquaddieTemplate
            )

            const playerSquaddieIds: string[] = []
            for (let i = 0; i < playerCount; i++) {
                const battleSquaddieId = `playerSquaddie${i}`
                ObjectRepositoryService.addBattleSquaddie(
                    repository,
                    BattleSquaddieService.new({
                        squaddieTemplate: playerSquaddieTemplate,
                        battleSquaddieId,
                    })
                )
                playerSquaddieIds.push(battleSquaddieId)

                MissionMapService.addSquaddie({
                    missionMap: missionMap,
                    squaddieTemplateId:
                        playerSquaddieTemplate.squaddieId.templateId,
                    battleSquaddieId,
                    originMapCoordinate: { q: 0, r: i },
                })
            }

            const enemySquaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "enemySquaddieTemplate",
                    name: "Enemy Squaddie Template",
                    affiliation: SquaddieAffiliation.ENEMY,
                }),
            })
            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                enemySquaddieTemplate
            )

            const enemySquaddieIds: string[] = []
            for (let i = 0; i < enemyCount; i++) {
                const battleSquaddieId = `enemySquaddie${i}`
                ObjectRepositoryService.addBattleSquaddie(
                    repository,
                    BattleSquaddieService.new({
                        squaddieTemplate: enemySquaddieTemplate,
                        battleSquaddieId,
                    })
                )
                enemySquaddieIds.push(battleSquaddieId)

                MissionMapService.addSquaddie({
                    missionMap: missionMap,
                    squaddieTemplateId:
                        playerSquaddieTemplate.squaddieId.templateId,
                    battleSquaddieId,
                    originMapCoordinate: { q: 0, r: playerCount + i },
                })
            }

            gameEngineState = GameEngineStateService.new({
                repository,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.new({
                        battlePhaseState: BattlePhaseStateService.new({
                            currentAffiliation,
                            turnCount: 0,
                        }),
                        missionId: "mission",
                        campaignId: "test campaign",
                        missionMap,
                    }),
                }),
            })
            messageBoardSpy = vi.spyOn(
                gameEngineState.messageBoard,
                "sendMessage"
            )
            return {
                gameEngineState,
                playerSquaddieIds,
                enemySquaddieIds,
            }
        }

        it("should generate a message if one player squaddie ends their turn and another player controllable squaddie can act", () => {
            const { playerSquaddieIds, gameEngineState } = makeGameEngineState(
                BattlePhase.PLAYER,
                2,
                0
            )

            SquaddieTurnService.endTurn(
                getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        repository,
                        playerSquaddieIds[0]
                    )
                ).battleSquaddie.squaddieTurn
            )
            OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
                gameEngineState
            )

            expect(messageBoardSpy).toBeCalledWith({
                type: MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE,
                gameEngineState,
            })
        })

        it("should not generate a message if one player squaddie still has actions remaining and another player controllable squaddie can act", () => {
            const { playerSquaddieIds, gameEngineState } = makeGameEngineState(
                BattlePhase.PLAYER,
                2,
                0
            )

            SquaddieTurnService.setMovementActionPointsPreviewedByPlayer({
                squaddieTurn: getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        repository,
                        playerSquaddieIds[0]
                    )
                ).battleSquaddie.squaddieTurn,
                actionPoints: 1,
            })

            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                BattleActionService.new({
                    actor: { actorBattleSquaddieId: playerSquaddieIds[0] },
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startCoordinate: { q: 0, r: 0 },
                            endCoordinate: { q: 0, r: 0 },
                        },
                    },
                })
            )
            OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
                gameEngineState
            )

            expect(messageBoardSpy).not.toBeCalled()
        })

        it("should not generate a message if only player squaddie on the map ends their turn", () => {
            const { playerSquaddieIds, gameEngineState } = makeGameEngineState(
                BattlePhase.PLAYER,
                2,
                0
            )
            SquaddieTurnService.endTurn(
                getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        repository,
                        playerSquaddieIds[0]
                    )
                ).battleSquaddie.squaddieTurn
            )
            MissionMapService.updateBattleSquaddieCoordinate({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleSquaddieId: playerSquaddieIds[1],
                coordinate: undefined,
            })

            OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
                gameEngineState
            )

            expect(messageBoardSpy).not.toBeCalled()
        })

        it("should not generate a message if one enemy squaddie ends their turn and another enemy controllable squaddie can act", () => {
            const { enemySquaddieIds, gameEngineState } = makeGameEngineState(
                BattlePhase.ENEMY,
                0,
                2
            )
            SquaddieTurnService.endTurn(
                getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        repository,
                        enemySquaddieIds[0]
                    )
                ).battleSquaddie.squaddieTurn
            )

            OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
                gameEngineState
            )

            expect(messageBoardSpy).not.toBeCalled()
        })
    })

    describe("highlightSquaddieRange", () => {
        let gameEngineState: GameEngineState
        let addGraphicsLayerSpy: MockInstance

        beforeEach(() => {
            addGraphicsLayerSpy = vi.spyOn(
                TerrainTileMapService,
                "addGraphicsLayer"
            )
            gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.new({
                        missionMap: map,
                        campaignId: "campaign",
                        missionId: "mission",
                    }),
                }),
                repository: squaddieRepository,
                campaign: CampaignService.default(),
            })

            gameEngineState.battleOrchestratorState.cache.searchResultsCache =
                SearchResultsCacheService.new({
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    objectRepository: gameEngineState.repository,
                })
        })
        afterEach(() => {
            addGraphicsLayerSpy.mockRestore()
        })

        describe("highlight movement range for a player controlled squaddie", () => {
            beforeEach(() => {
                knightSquaddieTemplate.attributes.movement.movementPerAction = 1
                map = MissionMapService.new({
                    terrainTileMap: TerrainTileMapService.new({
                        movementCost: ["1 1 1 1 1 1 1 1 1 1 "],
                    }),
                })
                gameEngineState.battleOrchestratorState.battleState.missionMap =
                    map
                addGraphicsLayerSpy = vi.spyOn(
                    TerrainTileMapService,
                    "addGraphicsLayer"
                )
                gameEngineState.battleOrchestratorState.cache.searchResultsCache =
                    SearchResultsCacheService.new({
                        missionMap:
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap,
                        objectRepository: gameEngineState.repository,
                    })
            })

            const highlightPlayerControlledSquaddieRangeAndReturnHighlightedCoordinates =
                () => {
                    OrchestratorUtilities.highlightSquaddieRange({
                        battleSquaddieToHighlightId:
                            knightBattleSquaddie.battleSquaddieId,
                        missionMap:
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap,
                        objectRepository: gameEngineState.repository,
                        campaignResources: gameEngineState.campaign.resources,
                        squaddieAllMovementCache:
                            gameEngineState.battleOrchestratorState.cache
                                .searchResultsCache,
                    })
                    const addedMapGraphicsLayer =
                        addGraphicsLayerSpy.mock.calls[0][1]
                    expect(addedMapGraphicsLayer.type).toEqual(
                        MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE
                    )
                    return addedMapGraphicsLayer.highlights.map(
                        (h: MapGraphicsLayerHighlight) => h.coordinate
                    )
                }

            it("highlight all of the locations from the origin coordinate", () => {
                MissionMapService.addSquaddie({
                    missionMap: map,
                    squaddieTemplateId: knightBattleSquaddie.squaddieTemplateId,
                    battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                    originMapCoordinate: { q: 0, r: 3 },
                })

                const highlightedCoordinates =
                    highlightPlayerControlledSquaddieRangeAndReturnHighlightedCoordinates()

                expect(highlightedCoordinates).toHaveLength(7)
                expect(highlightedCoordinates).toEqual(
                    expect.arrayContaining([
                        { q: 0, r: 0 },
                        { q: 0, r: 1 },
                        { q: 0, r: 2 },
                        { q: 0, r: 3 },
                        { q: 0, r: 4 },
                        { q: 0, r: 5 },
                        { q: 0, r: 6 },
                    ])
                )
            })
            it("highlight all of the locations from the origin coordinate if it has actions remaining", () => {
                MissionMapService.addSquaddie({
                    missionMap: map,
                    squaddieTemplateId: knightBattleSquaddie.squaddieTemplateId,
                    battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                    originMapCoordinate: { q: 0, r: 3 },
                })
                MissionMapService.updateBattleSquaddieCoordinate({
                    missionMap: map,
                    battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                    coordinate: { q: 0, r: 5 },
                })
                SquaddieTurnService.setMovementActionPointsPreviewedByPlayer({
                    squaddieTurn: knightBattleSquaddie.squaddieTurn,
                    actionPoints: 2,
                })
                expect(
                    SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                        knightBattleSquaddie.squaddieTurn
                    )
                ).toEqual(DEFAULT_ACTION_POINTS_PER_TURN)

                const highlightedCoordinates =
                    highlightPlayerControlledSquaddieRangeAndReturnHighlightedCoordinates()

                expect(highlightedCoordinates).toHaveLength(7)
                expect(highlightedCoordinates).toEqual(
                    expect.arrayContaining([
                        { q: 0, r: 0 },
                        { q: 0, r: 1 },
                        { q: 0, r: 2 },
                        { q: 0, r: 3 },
                        { q: 0, r: 4 },
                        { q: 0, r: 5 },
                        { q: 0, r: 6 },
                    ])
                )
            })
            it("if the player controlled squaddie is out of actions, only show their current location", () => {
                SquaddieTurnService.endTurn(knightBattleSquaddie.squaddieTurn)

                MissionMapService.addSquaddie({
                    missionMap: map,
                    squaddieTemplateId: knightBattleSquaddie.squaddieTemplateId,
                    battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                    originMapCoordinate: { q: 0, r: 3 },
                })

                const highlightedCoordinates =
                    highlightPlayerControlledSquaddieRangeAndReturnHighlightedCoordinates()

                expect(highlightedCoordinates).toEqual([{ q: 0, r: 3 }])
            })
        })

        it("highlights the range for a non player controlled squaddie using a standard turn even if they are out of actions", () => {
            const {
                battleSquaddie: enemyBattleSquaddie,
                squaddieTemplate: enemySquaddieTemplate,
            } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                objectRepository: squaddieRepository,
                templateId: "enemy",
                name: "enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                battleId: "enemy",
                actionTemplateIds: [],
            })
            enemySquaddieTemplate.attributes.movement.movementPerAction = 1
            SquaddieTurnService.endTurn(enemyBattleSquaddie.squaddieTurn)

            map = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 1 "],
                }),
            })
            MissionMapService.addSquaddie({
                missionMap: map,
                squaddieTemplateId: enemyBattleSquaddie.squaddieTemplateId,
                battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                originMapCoordinate: { q: 0, r: 3 },
            })
            gameEngineState.battleOrchestratorState.battleState.missionMap = map
            gameEngineState.battleOrchestratorState.cache.searchResultsCache =
                SearchResultsCacheService.new({
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    objectRepository: gameEngineState.repository,
                })

            addGraphicsLayerSpy = vi.spyOn(
                TerrainTileMapService,
                "addGraphicsLayer"
            )

            OrchestratorUtilities.highlightSquaddieRange({
                battleSquaddieToHighlightId:
                    enemyBattleSquaddie.battleSquaddieId,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository,
                campaignResources: gameEngineState.campaign.resources,
                squaddieAllMovementCache:
                    gameEngineState.battleOrchestratorState.cache
                        .searchResultsCache,
            })

            const addedMapGraphicsLayer: MapGraphicsLayer =
                addGraphicsLayerSpy.mock.calls[0][1]
            expect(addedMapGraphicsLayer.type).toEqual(
                MapGraphicsLayerType.CLICKED_ON_NORMALLY_UNCONTROLLABLE_SQUADDIE
            )
            expect(addedMapGraphicsLayer.highlights).toHaveLength(4)
        })
    })

    describe("messageAndHighlightPlayableSquaddieTakingATurn", () => {
        let gameEngineState: GameEngineState
        let thiefBattleSquaddie: BattleSquaddie
        let missionMap: MissionMap
        let messageSpy: MockInstance
        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 "],
                }),
            })
            ;({ battleSquaddie: thiefBattleSquaddie } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    name: "thief",
                    templateId: "thiefSquaddieTemplate",
                    battleId: "thiefBattleSquaddie",
                    affiliation: SquaddieAffiliation.ENEMY,
                    objectRepository: squaddieRepository,
                    actionTemplateIds: [],
                }))

            MissionMapService.addSquaddie({
                missionMap: map,
                squaddieTemplateId: thiefBattleSquaddie.squaddieTemplateId,
                battleSquaddieId: thiefBattleSquaddie.battleSquaddieId,
                originMapCoordinate: { q: 0, r: 0 },
            })

            gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.new({
                        missionMap: missionMap,
                        campaignId: "campaign",
                        missionId: "mission",
                    }),
                }),
                repository: squaddieRepository,
                campaign: CampaignService.default(),
            })

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
        })
        afterEach(() => {
            messageSpy.mockRestore()
        })
        it("should send a message that the player selected a squaddie if the player turn is still in progress", () => {
            MissionMapService.addSquaddie({
                missionMap: missionMap,
                squaddieTemplateId: knightBattleSquaddie.squaddieTemplateId,
                battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                originMapCoordinate: { q: 0, r: 2 },
            })
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            })
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                SummaryHUDStateService.new()
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState =
                PlayerCommandStateService.new()
            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId:
                            knightBattleSquaddie.battleSquaddieId,
                    },
                    action: { isMovement: true },
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

            OrchestratorUtilities.messageAndHighlightPlayableSquaddieTakingATurn(
                {
                    gameEngineState,
                }
            )

            expect(messageSpy).toBeCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                })
            )
        })
        it("should close the summary HUD if the player turn is completed", () => {
            MissionMapService.addSquaddie({
                missionMap: missionMap,
                squaddieTemplateId: knightBattleSquaddie.squaddieTemplateId,
                battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                originMapCoordinate: { q: 0, r: 2 },
            })
            const gameEngineState = GameEngineStateService.new({
                repository: squaddieRepository,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.new({
                        missionMap,
                        campaignId: "campaignId",
                        missionId: "missionId",
                    }),
                }),
            })
            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId:
                            knightBattleSquaddie.battleSquaddieId,
                    },
                    action: { isEndTurn: true },
                    effect: {
                        endTurn: true,
                    },
                })
            )
            BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )
            SquaddieTurnService.endTurn(knightBattleSquaddie.squaddieTurn)
            BattleActionRecorderService.turnComplete(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                SummaryHUDStateService.new()

            OrchestratorUtilities.messageAndHighlightPlayableSquaddieTakingATurn(
                {
                    gameEngineState,
                }
            )

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()
        })
        it("should not change the summary HUD if the enemy turn is still in progress", () => {
            const { battleSquaddie: enemyBattleSquaddie } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    name: "enemy",
                    templateId: "enemySquaddieTemplateId",
                    battleId: "enemyBattleSquaddieId",
                    affiliation: SquaddieAffiliation.ENEMY,
                    objectRepository: squaddieRepository,
                    actionTemplateIds: [],
                })

            MissionMapService.addSquaddie({
                missionMap: missionMap,
                squaddieTemplateId: knightBattleSquaddie.squaddieTemplateId,
                battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                originMapCoordinate: { q: 0, r: 2 },
            })
            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId:
                            enemyBattleSquaddie.battleSquaddieId,
                    },
                    action: { isMovement: true },
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

            OrchestratorUtilities.messageAndHighlightPlayableSquaddieTakingATurn(
                {
                    gameEngineState,
                }
            )

            expect(messageSpy).not.toBeCalled()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()

            messageSpy.mockRestore()
        })
        it("does not send message if the squaddie is not playable", () => {
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: thiefBattleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: "actionTemplateId",
            })

            OrchestratorUtilities.messageAndHighlightPlayableSquaddieTakingATurn(
                {
                    gameEngineState,
                }
            )

            expect(messageSpy).not.toBeCalled()
        })
    })
})
