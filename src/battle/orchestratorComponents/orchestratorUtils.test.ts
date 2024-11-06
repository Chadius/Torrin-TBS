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
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattlePhaseStateService } from "./battlePhaseController"
import { BattlePhase } from "./battlePhaseTracker"
import { SquaddieTurnService } from "../../squaddie/turn"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { DamageType, SquaddieService } from "../../squaddie/squaddieService"
import { BattleHUDService } from "../hud/battleHUD"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { CampaignService } from "../../campaign/campaign"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    MapGraphicsLayer,
    MapGraphicsLayerType,
} from "../../hexMap/mapGraphicsLayer"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { SummaryHUDStateService } from "../hud/summaryHUD"

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

        map = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })
        map.addSquaddie(
            knightSquaddieTemplate.squaddieId.templateId,
            knightBattleSquaddie.battleSquaddieId,
            { q: 0, r: 2 }
        )

        camera = new BattleCamera()
    })

    it("can return the squaddie and information at a given location on the screen", () => {
        const { screenX: mouseX, screenY: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q: 0,
                r: 2,
                ...camera.getCoordinates(),
            })

        const { squaddieTemplate, battleSquaddie, squaddieMapLocation } =
            OrchestratorUtilities.getSquaddieAtScreenLocation({
                mouseX,
                mouseY,
                camera,
                map,
                squaddieRepository,
            })

        expect(squaddieTemplate).toStrictEqual(knightSquaddieTemplate)
        expect(battleSquaddie).toStrictEqual(knightBattleSquaddie)
        expect(squaddieMapLocation).toStrictEqual({ q: 0, r: 2 })
    })

    it("can return the squaddie and information at a given map location", () => {
        const { squaddieTemplate, battleSquaddie, squaddieMapLocation } =
            OrchestratorUtilities.getSquaddieAtMapLocation({
                mapLocation: { q: 0, r: 2 },
                map,
                squaddieRepository,
            })

        expect(squaddieTemplate).toStrictEqual(knightSquaddieTemplate)
        expect(battleSquaddie).toStrictEqual(knightBattleSquaddie)
        expect(squaddieMapLocation).toStrictEqual({ q: 0, r: 2 })
    })

    it("returns undefined information if there is no squaddie at the location", () => {
        const { screenX: mouseX, screenY: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q: 0,
                r: 0,
                ...camera.getCoordinates(),
            })

        const { squaddieTemplate, battleSquaddie, squaddieMapLocation } =
            OrchestratorUtilities.getSquaddieAtScreenLocation({
                mouseX,
                mouseY,
                camera,
                map,
                squaddieRepository,
            })

        expect(squaddieTemplate).toBeUndefined()
        expect(battleSquaddie).toBeUndefined()
        expect(squaddieMapLocation).toBeUndefined()
    })

    it("throws an error if squaddie repository does not have squaddie", () => {
        map.addSquaddie("static does not exist", "dynamic does not exist", {
            q: 0,
            r: 0,
        })
        const { screenX: mouseX, screenY: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q: 0,
                r: 0,
                ...camera.getCoordinates(),
            })

        const shouldThrowError = () => {
            OrchestratorUtilities.getSquaddieAtScreenLocation({
                mouseX,
                mouseY,
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

        it("is not if there is no gameEngineState or battle gameEngineState", () => {
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(undefined)
            ).toBeFalsy()
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    GameEngineStateService.new({
                        battleOrchestratorState: new BattleOrchestratorState({
                            battleState: undefined,
                            battleHUD: BattleHUDService.new({}),
                            numberGenerator: undefined,
                        }),
                        resourceHandler: undefined,
                        repository: squaddieRepository,
                    })
                )
            ).toBeFalsy()
        })

        it("is not if there is no squaddie is currently acting", () => {
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    gameEngineState
                )
            ).toBeFalsy()
        })

        it("is if the squaddie is previewing a decision", () => {
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
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    gameEngineState
                )
            ).toBeTruthy()
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
                            startLocation: { q: 0, r: 0 },
                            endLocation: { q: 0, r: 0 },
                        },
                    },
                })
            )
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    gameEngineState
                )
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
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    gameEngineState
                )
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
                        startLocation: { q: 0, r: 0 },
                        endLocation: { q: 0, r: 0 },
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
                BattleActionRecorderService.battleActionFinishedAnimating(
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
                BattleActionRecorderService.battleActionFinishedAnimating(
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
                BattleActionRecorderService.battleActionFinishedAnimating(
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
        let messageBoardSpy: jest.SpyInstance
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

                missionMap.addSquaddie(
                    playerSquaddieTemplate.squaddieId.templateId,
                    battleSquaddieId,
                    { q: 0, r: i }
                )
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

                missionMap.addSquaddie(
                    playerSquaddieTemplate.squaddieId.templateId,
                    battleSquaddieId,
                    { q: 0, r: playerCount + i }
                )
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
            messageBoardSpy = jest.spyOn(
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

            SquaddieTurnService.spendActionPoints(
                getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        repository,
                        playerSquaddieIds[0]
                    )
                ).battleSquaddie.squaddieTurn,
                1
            )

            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                BattleActionService.new({
                    actor: { actorBattleSquaddieId: playerSquaddieIds[0] },
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startLocation: { q: 0, r: 0 },
                            endLocation: { q: 0, r: 0 },
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
            MissionMapService.updateBattleSquaddieLocation(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                playerSquaddieIds[1],
                undefined
            )

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
        let addGraphicsLayerSpy: jest.SpyInstance

        beforeEach(() => {
            addGraphicsLayerSpy = jest.spyOn(
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
        })
        afterEach(() => {
            addGraphicsLayerSpy.mockRestore()
        })
        it("highlights the range for a player controlled squaddie using their current actions", () => {
            knightSquaddieTemplate.attributes.movement.movementPerAction = 1
            SquaddieTurnService.endTurn(knightBattleSquaddie.squaddieTurn)

            map = new MissionMap({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 1 "],
                }),
            })
            map.addSquaddie(
                knightSquaddieTemplate.squaddieId.templateId,
                knightBattleSquaddie.battleSquaddieId,
                { q: 0, r: 3 }
            )
            gameEngineState.battleOrchestratorState.battleState.missionMap = map
            addGraphicsLayerSpy = jest.spyOn(
                TerrainTileMapService,
                "addGraphicsLayer"
            )

            OrchestratorUtilities.highlightSquaddieRange(
                gameEngineState,
                knightBattleSquaddie.battleSquaddieId
            )
            const addedMapGraphicsLayer = addGraphicsLayerSpy.mock.calls[0][1]
            expect(addedMapGraphicsLayer.type).toEqual(
                MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE
            )
            expect(addedMapGraphicsLayer.highlights).toHaveLength(1)
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

            map = new MissionMap({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 1 "],
                }),
            })
            map.addSquaddie(
                enemySquaddieTemplate.squaddieId.templateId,
                enemyBattleSquaddie.battleSquaddieId,
                { q: 0, r: 3 }
            )
            gameEngineState.battleOrchestratorState.battleState.missionMap = map
            addGraphicsLayerSpy = jest.spyOn(
                TerrainTileMapService,
                "addGraphicsLayer"
            )

            OrchestratorUtilities.highlightSquaddieRange(
                gameEngineState,
                enemyBattleSquaddie.battleSquaddieId
            )

            const addedMapGraphicsLayer: MapGraphicsLayer =
                addGraphicsLayerSpy.mock.calls[0][1]
            expect(addedMapGraphicsLayer.type).toEqual(
                MapGraphicsLayerType.CLICKED_ON_NORMALLY_UNCONTROLLABLE_SQUADDIE
            )
            expect(addedMapGraphicsLayer.highlights).toHaveLength(4)
        })
    })

    describe("drawPlayableSquaddieReach", () => {
        let gameEngineState: GameEngineState
        let thiefBattleSquaddie: BattleSquaddie
        let messageSpy: jest.SpyInstance
        beforeEach(() => {
            ;({ battleSquaddie: thiefBattleSquaddie } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    name: "thief",
                    templateId: "thiefSquaddieTemplate",
                    battleId: "thiefBattleSquaddie",
                    affiliation: SquaddieAffiliation.ENEMY,
                    objectRepository: squaddieRepository,
                    actionTemplateIds: [],
                }))

            map.addSquaddie(
                thiefBattleSquaddie.squaddieTemplateId,
                thiefBattleSquaddie.battleSquaddieId,
                { q: 0, r: 0 }
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

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
        })
        it("sends message if the squaddie is playable and previewing", () => {
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: "actionTemplateId",
            })

            OrchestratorUtilities.drawPlayableSquaddieReach(gameEngineState)

            expect(messageSpy).toBeCalledWith({
                type: MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION,
                gameEngineState,
            })
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

            OrchestratorUtilities.drawPlayableSquaddieReach(gameEngineState)

            expect(messageSpy).not.toBeCalled()
        })
    })

    describe("drawOrResetHUDBasedOnSquaddieTurnAndAffiliation", () => {
        let missionMap: MissionMap
        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 "],
                }),
            })
        })
        it("should send a message that the player selected a squaddie if the player turn is still in progress", () => {
            missionMap.addSquaddie(
                knightSquaddieTemplate.squaddieId.templateId,
                knightBattleSquaddie.battleSquaddieId,
                { q: 0, r: 2 }
            )
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
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startLocation: { q: 0, r: 0 },
                            endLocation: { q: 0, r: 0 },
                        },
                    },
                })
            )
            BattleActionRecorderService.battleActionFinishedAnimating(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

            const messageSpy: jest.SpyInstance = jest.spyOn(
                gameEngineState.messageBoard,
                "sendMessage"
            )

            OrchestratorUtilities.drawOrResetHUDBasedOnSquaddieTurnAndAffiliation(
                gameEngineState
            )

            expect(messageSpy).toBeCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                })
            )

            messageSpy.mockRestore()
        })
        it("should close the summary HUD if the player turn is completed", () => {
            missionMap.addSquaddie(
                knightSquaddieTemplate.squaddieId.templateId,
                knightBattleSquaddie.battleSquaddieId,
                { q: 0, r: 2 }
            )
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
            BattleActionRecorderService.battleActionFinishedAnimating(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )
            SquaddieTurnService.endTurn(knightBattleSquaddie.squaddieTurn)
            BattleActionRecorderService.turnComplete(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                SummaryHUDStateService.new({
                    mouseSelectionLocation: {
                        x: 0,
                        y: 0,
                    },
                })

            OrchestratorUtilities.drawOrResetHUDBasedOnSquaddieTurnAndAffiliation(
                gameEngineState
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

            missionMap.addSquaddie(
                knightSquaddieTemplate.squaddieId.templateId,
                enemyBattleSquaddie.battleSquaddieId,
                { q: 0, r: 2 }
            )
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
                            enemyBattleSquaddie.battleSquaddieId,
                    },
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startLocation: { q: 0, r: 0 },
                            endLocation: { q: 0, r: 0 },
                        },
                    },
                })
            )
            BattleActionRecorderService.battleActionFinishedAnimating(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

            const messageSpy: jest.SpyInstance = jest.spyOn(
                gameEngineState.messageBoard,
                "sendMessage"
            )

            OrchestratorUtilities.drawOrResetHUDBasedOnSquaddieTurnAndAffiliation(
                gameEngineState
            )

            expect(messageSpy).not.toBeCalled()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()

            messageSpy.mockRestore()
        })
    })
})
