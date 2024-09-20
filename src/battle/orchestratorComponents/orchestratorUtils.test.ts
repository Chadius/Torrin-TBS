import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleCamera } from "../battleCamera"
import { convertMapCoordinatesToScreenCoordinates } from "../../hexMap/convertCoordinates"
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
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import {
    DecidedActionMovementEffect,
    DecidedActionMovementEffectService,
} from "../../action/decided/decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import {
    ProcessedAction,
    ProcessedActionService,
} from "../../action/processed/processedAction"
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
import { MapGraphicsLayer } from "../../hexMap/mapGraphicsLayer"

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
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            0,
            2,
            ...camera.getCoordinates()
        )

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
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            0,
            0,
            ...camera.getCoordinates()
        )

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
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            0,
            0,
            ...camera.getCoordinates()
        )

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
        let movementProcessedAction: ProcessedAction

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

            movementProcessedAction = ProcessedActionService.new({
                actionPointCost: 1,
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
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                undefined
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    gameEngineState
                )
            ).toBeFalsy()
        })

        it("is if the squaddie is previewing a decision", () => {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                ActionsThisRoundService.new({
                    battleSquaddieId: "battle",
                    startingLocation: { q: 0, r: 0 },
                    processedActions: [],
                    previewedActionTemplateId: "maybe use this action?",
                })
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    gameEngineState
                )
            ).toBeTruthy()
        })

        it("is if the squaddie already made a decision that does not end the turn", () => {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                ActionsThisRoundService.new({
                    battleSquaddieId: "battle",
                    startingLocation: { q: 0, r: 0 },
                    processedActions: [movementProcessedAction],
                    previewedActionTemplateId: undefined,
                })
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    gameEngineState
                )
            ).toBeTruthy()
        })

        it("is not taking a turn if there is no battle squaddie Id", () => {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                ActionsThisRoundService.new({
                    battleSquaddieId: "",
                    startingLocation: { q: 0, r: 0 },
                    processedActions: [],
                    previewedActionTemplateId:
                        "forgot to set the battle squaddie id",
                })

            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    gameEngineState
                )
            ).toBeFalsy()
        })
    })

    describe("can the actionsThisRound squaddie act", () => {
        let repository: ObjectRepository
        let battleSquaddie: BattleSquaddie
        let squaddieTemplate: SquaddieTemplate
        let decidedActionMovementEffect: DecidedActionMovementEffect
        let gameEngineState: GameEngineState
        let actionsThisRound: ActionsThisRound

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

            decidedActionMovementEffect =
                DecidedActionMovementEffectService.new({
                    template: ActionEffectMovementTemplateService.new({}),
                    destination: { q: 0, r: 0 },
                })

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

            actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                startingLocation: { q: 0, r: 0 },
                processedActions: [
                    ProcessedActionService.new({
                        actionPointCost: 0,
                        processedActionEffects: [
                            ProcessedActionMovementEffectService.newFromDecidedActionEffect(
                                {
                                    decidedActionEffect:
                                        decidedActionMovementEffect,
                                }
                            ),
                        ],
                    }),
                ],
            })
        })

        describe("clearActionsThisRoundIfSquaddieCannotAct", () => {
            it("will not throw an error if there is no ActionsThisRound", () => {
                gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                    undefined

                expect(() =>
                    OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(
                        gameEngineState
                    )
                ).not.toThrow()
            })
            it("will not clear if the squaddie has not acted yet", () => {
                gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                    actionsThisRound

                OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(
                    gameEngineState
                )
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                ).toEqual(actionsThisRound)
            })
            it("will not clear if the squaddie has acted and has actions remaining", () => {
                gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                    actionsThisRound
                ActionsThisRoundService.nextProcessedActionEffectToShow(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                )
                expect(
                    ActionsThisRoundService.getProcessedActionEffectToShow(
                        gameEngineState.battleOrchestratorState.battleState
                            .actionsThisRound
                    )
                ).toBeUndefined()

                OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(
                    gameEngineState
                )
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                ).toEqual(actionsThisRound)
            })
            it("will clear if the squaddie has no actions remaining", () => {
                gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                    actionsThisRound
                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)

                OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(
                    gameEngineState
                )
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                ).toBeUndefined()
            })
            it("will clear if the squaddie is dead", () => {
                gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                    actionsThisRound
                InBattleAttributesService.takeDamage(
                    battleSquaddie.inBattleAttributes,
                    battleSquaddie.inBattleAttributes.currentHitPoints,
                    DamageType.UNKNOWN
                )
                const { isDead } = SquaddieService.canSquaddieActRightNow({
                    squaddieTemplate: squaddieTemplate,
                    battleSquaddie: battleSquaddie,
                })
                expect(isDead).toBeTruthy()

                OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(
                    gameEngineState
                )
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                ).toBeUndefined()
            })
        })

        describe("canTheCurrentSquaddieAct", () => {
            it("will return true if the squaddie has not acted yet", () => {
                gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                    actionsThisRound
                expect(
                    OrchestratorUtilities.canTheCurrentSquaddieAct(
                        gameEngineState
                    )
                ).toBeTruthy()
            })
            it("will return true if the squaddie has acted and has actions remaining", () => {
                gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                    actionsThisRound
                ActionsThisRoundService.nextProcessedActionEffectToShow(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                )
                expect(
                    ActionsThisRoundService.getProcessedActionEffectToShow(
                        gameEngineState.battleOrchestratorState.battleState
                            .actionsThisRound
                    )
                ).toBeUndefined()
                expect(
                    OrchestratorUtilities.canTheCurrentSquaddieAct(
                        gameEngineState
                    )
                ).toBeTruthy()
            })
            it("will return false if the squaddie has no actions remaining", () => {
                gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                    actionsThisRound
                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
                expect(
                    OrchestratorUtilities.canTheCurrentSquaddieAct(
                        gameEngineState
                    )
                ).toBeFalsy()
            })
            it("will return false if the squaddie is dead", () => {
                gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                    actionsThisRound
                InBattleAttributesService.takeDamage(
                    battleSquaddie.inBattleAttributes,
                    battleSquaddie.inBattleAttributes.currentHitPoints,
                    DamageType.UNKNOWN
                )
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

            const movementProcessedAction = ProcessedActionService.new({
                actionPointCost: 1,
            })
            SquaddieTurnService.spendActionPoints(
                getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        repository,
                        playerSquaddieIds[0]
                    )
                ).battleSquaddie.squaddieTurn,
                1
            )
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                ActionsThisRoundService.new({
                    battleSquaddieId: playerSquaddieIds[0],
                    startingLocation: { q: 0, r: 0 },
                    processedActions: [movementProcessedAction],
                    previewedActionTemplateId: undefined,
                })

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
            const addGraphicsLayerSpyArgs = addGraphicsLayerSpy.mock.calls[0][1]
            expect(addGraphicsLayerSpyArgs.highlights).toHaveLength(1)
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

            const addGraphicsLayerSpyLayer: MapGraphicsLayer =
                addGraphicsLayerSpy.mock.calls[0][1]
            expect(addGraphicsLayerSpyLayer.highlights).toHaveLength(4)
        })
    })
})
