import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattlePhase, BattlePhaseService } from "./battlePhaseTracker"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    BANNER_ANIMATION_TIME,
    BattlePhaseController,
} from "./battlePhaseController"
import { getResultOrThrowError } from "../../utils/resultOrError"
import { ResourceHandler } from "../../resource/resourceHandler"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import { DefaultArmyAttributes } from "../../squaddie/armyAttributes"
import { BattleStateService } from "../battleState/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { ImageUI, ImageUILoadingBehavior } from "../../ui/imageUI/imageUI"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { beforeEach, describe, expect, it, vi, MockInstance } from "vitest"

describe("BattlePhaseController", () => {
    let objectRepository: ObjectRepository
    let battlePhaseController: BattlePhaseController
    let playerSquaddieTeam: BattleSquaddieTeam
    let enemySquaddieTeam: BattleSquaddieTeam
    let resourceHandler: ResourceHandler
    let diffTime: number
    let gameEngineState: GameEngineState
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let teams: BattleSquaddieTeam[]
    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        objectRepository = ObjectRepositoryService.new()

        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: {
                templateId: "player_squaddie",
                name: "Player",
                resources: {
                    mapIconResourceKey: "",
                    actionSpritesByEmotion: {},
                },
                traits: TraitStatusStorageService.newUsingTraitValues(),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            attributes: DefaultArmyAttributes(),
        })
        playerBattleSquaddie = BattleSquaddieService.newBattleSquaddie({
            battleSquaddieId: "player_squaddie_0",
            squaddieTemplateId: "player_squaddie",
            squaddieTurn: SquaddieTurnService.new(),
        })

        ObjectRepositoryService.addSquaddieTemplate(
            objectRepository,
            playerSquaddieTemplate
        )
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            playerBattleSquaddie
        )

        ObjectRepositoryService.addSquaddieTemplate(
            objectRepository,
            SquaddieTemplateService.new({
                squaddieId: {
                    templateId: "enemy_squaddie",
                    name: "Enemy",
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                    affiliation: SquaddieAffiliation.ENEMY,
                },
                attributes: DefaultArmyAttributes(),
            })
        )
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "enemy_squaddie_0",
                squaddieTemplateId: "enemy_squaddie",
                squaddieTurn: SquaddieTurnService.new(),
            })
        )

        playerSquaddieTeam = {
            id: "playerTeamId",
            name: "Player Team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: ["player_squaddie_0"],
            iconResourceKey: "icon_player_team",
        }
        enemySquaddieTeam = {
            id: "enemyTeamId",
            name: "Enemy Team",
            affiliation: SquaddieAffiliation.ENEMY,
            battleSquaddieIds: ["enemy_squaddie_0"],
            iconResourceKey: "icon_enemy_team",
        }

        teams = [playerSquaddieTeam, enemySquaddieTeam]

        diffTime = 100

        resourceHandler = mocks.mockResourceHandler(
            new MockedP5GraphicsBuffer()
        )
        resourceHandler.getResource = vi
            .fn()
            .mockReturnValue({ width: 32, height: 32 })

        gameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                    battlePhaseState: {
                        currentAffiliation: BattlePhase.UNKNOWN,
                        turnCount: 0,
                    },
                    teams,
                    missionMap: MissionMapService.new({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: ["1 "],
                        }),
                    }),
                }),
            }),
        })

        battlePhaseController = new BattlePhaseController()
        battlePhaseController.draw = vi.fn()
    })

    it("does nothing and finishes immediately if team has not finished their turn", () => {
        gameEngineState.battleOrchestratorState.battleState.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }
        BattlePhaseService.AdvanceToNextPhase(
            gameEngineState.battleOrchestratorState.battleState
                .battlePhaseState,
            teams
        )
        expect(
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation
        ).toBe(BattlePhase.PLAYER)

        battlePhaseController.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler,
        })
        expect(battlePhaseController.hasCompleted(gameEngineState)).toBeTruthy()
        expect(battlePhaseController.draw).not.toBeCalled()
        expect(
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation
        ).toBe(BattlePhase.PLAYER)
    })

    it("starts showing the player phase banner by default", () => {
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    teams,
                    missionMap: MissionMapService.new({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: ["1 1 1 "],
                        }),
                    }),
                }),
            }),
        })
        battlePhaseController = new BattlePhaseController()
        const startTime = 0
        vi.spyOn(Date, "now").mockImplementation(() => startTime)

        gameEngineState.battleOrchestratorState.battleState.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }

        battlePhaseController.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler,
        })
        expect(battlePhaseController.hasCompleted(gameEngineState)).toBeFalsy()
        expect(
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation
        ).toBe(BattlePhase.PLAYER)
        expect(
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .turnCount
        ).toBe(1)
        expect(battlePhaseController.bannerDisplayAnimationStartTime).toBe(
            startTime
        )

        battlePhaseController.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler,
        })
        vi.spyOn(Date, "now").mockImplementation(
            () => startTime + BANNER_ANIMATION_TIME + diffTime
        )
        expect(battlePhaseController.hasCompleted(gameEngineState)).toBeTruthy()
        expect(
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation
        ).toBe(BattlePhase.PLAYER)
    })

    it("stops the camera when it displays the banner if it is not the player phase", () => {
        const state: GameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    teams,
                    missionMap: MissionMapService.new({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: ["1 1 1 "],
                        }),
                    }),
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            }),
        })
        battlePhaseController = new BattlePhaseController()
        const startTime = 0
        vi.spyOn(Date, "now").mockImplementation(() => startTime)

        battlePhaseController.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler,
        })
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy()

        expect(
            state.battleOrchestratorState.battleState.camera.getVelocity()
        ).toEqual({ xVelocity: 0, yVelocity: 0 })
    })

    describe("phase ends and the player phase begins", () => {
        let messageSpy: MockInstance
        let playerBattleSquaddie2: BattleSquaddie

        beforeEach(() => {
            playerBattleSquaddie2 = BattleSquaddieService.new({
                battleSquaddieId: "playerBattleSquaddie2",
                squaddieTemplate: playerSquaddieTemplate,
            })
            ObjectRepositoryService.addBattleSquaddie(
                objectRepository,
                playerBattleSquaddie2
            )
            BattleSquaddieTeamService.addBattleSquaddieIds(playerSquaddieTeam, [
                playerBattleSquaddie2.battleSquaddieId,
            ])

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")

            gameEngineState.battleOrchestratorState.battleState.battlePhaseState =
                {
                    currentAffiliation: BattlePhase.ENEMY,
                    turnCount: 1,
                }
            ;[enemySquaddieTeam].forEach((team) =>
                team.battleSquaddieIds.forEach((battleSquaddieId) => {
                    const { battleSquaddie } = getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            objectRepository,
                            battleSquaddieId
                        )
                    )
                    SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
                })
            )
        })

        it("should select the first player squaddie", () => {
            battlePhaseController.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler,
            })

            expect(messageSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    battleSquaddieSelectedId:
                        playerSquaddieTeam.battleSquaddieIds[0],
                })
            )
        })

        it("should not select a player squaddie who cannot act", () => {
            const { battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    playerSquaddieTeam.battleSquaddieIds[0]
                )
            )
            battleSquaddie.inBattleAttributes.currentHitPoints = 0

            battlePhaseController.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler,
            })

            expect(messageSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    battleSquaddieSelectedId:
                        playerSquaddieTeam.battleSquaddieIds[1],
                })
            )
        })
    })

    it("sends a message when the phase changes", () => {
        const messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")

        gameEngineState.battleOrchestratorState.battleState.battlePhaseState = {
            currentAffiliation: BattlePhase.PLAYER,
            turnCount: 1,
        }
        ;[playerSquaddieTeam].forEach((team) =>
            team.battleSquaddieIds.forEach((battleSquaddieId) => {
                const { battleSquaddie } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        battleSquaddieId
                    )
                )
                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            })
        )
        battlePhaseController.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler,
        })

        expect(messageSpy).toHaveBeenCalledWith({
            type: MessageBoardMessageType.SQUADDIE_PHASE_ENDS,
            phase: BattlePhase.PLAYER,
            gameEngineState,
        })

        expect(messageSpy).toHaveBeenCalledWith({
            type: MessageBoardMessageType.SQUADDIE_PHASE_STARTS,
            phase: BattlePhase.ENEMY,
            gameEngineState,
        })
    })

    describe("player team completes their turn", () => {
        const startTime = 100

        beforeEach(() => {
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState =
                {
                    currentAffiliation: BattlePhase.UNKNOWN,
                    turnCount: 0,
                }

            BattlePhaseService.AdvanceToNextPhase(
                gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState,
                teams
            )
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState.currentAffiliation
            ).toBe(BattlePhase.PLAYER)

            const { battleSquaddie: battleSquaddie0 } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    "player_squaddie_0"
                )
            )
            BattleSquaddieService.endTurn(battleSquaddie0)

            vi.spyOn(Date, "now").mockImplementation(() => startTime)
            battlePhaseController.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler,
            })
            expect(
                battlePhaseController.hasCompleted(gameEngineState)
            ).toBeFalsy()
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState.currentAffiliation
            ).toBe(BattlePhase.ENEMY)
        })

        it("starts the animation and completes if team has finished their turns", () => {
            vi.spyOn(Date, "now").mockImplementation(
                () => startTime + BANNER_ANIMATION_TIME + diffTime
            )
            battlePhaseController.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler,
            })
            expect(
                battlePhaseController.hasCompleted(gameEngineState)
            ).toBeTruthy()
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState.currentAffiliation
            ).toBe(BattlePhase.ENEMY)
        })
    })

    it("only draws the banner while the timer is going", () => {
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    teams,
                    missionMap: MissionMapService.new({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: ["1 1 1 "],
                        }),
                    }),
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            }),
        })
        battlePhaseController = new BattlePhaseController()
        battlePhaseController.draw = vi.fn()

        const startTime = 0
        vi.spyOn(Date, "now").mockImplementation(() => startTime)

        battlePhaseController.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler,
        })
        expect(battlePhaseController.draw).not.toBeCalled()
        expect(battlePhaseController.bannerDisplayAnimationStartTime).toBe(
            startTime
        )

        vi.spyOn(Date, "now").mockImplementation(
            () => startTime + BANNER_ANIMATION_TIME * 0.5
        )
        battlePhaseController.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler,
        })
        expect(battlePhaseController.draw).toBeCalledTimes(1)

        vi.spyOn(Date, "now").mockImplementation(
            () => startTime + BANNER_ANIMATION_TIME * 0.75
        )
        battlePhaseController.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler,
        })
        expect(battlePhaseController.draw).toBeCalledTimes(2)
    })

    it("resets internal variables once completed", () => {
        battlePhaseController = new BattlePhaseController()

        const emptyImage = mockedP5GraphicsContext.createImage(1, 1)
        emptyImage.loadPixels()

        battlePhaseController.affiliationImageUI = new ImageUI({
            area: RectAreaService.new({
                left: 0,
                top: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                width: emptyImage.width,
                height: emptyImage.height,
            }),
            graphic: emptyImage,
            imageLoadingBehavior: {
                loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
                resourceKey: undefined,
            },
        })

        expect(battlePhaseController.affiliationImageUI).toBeTruthy()
        battlePhaseController.reset(
            GameEngineStateService.new({
                repository: undefined,
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                    }),
                }),
            })
        )
        expect(battlePhaseController.affiliationImageUI).toBeFalsy()
    })

    describe("multiple teams of the same affiliation", () => {
        let playerTeam2: BattleSquaddieTeam
        let playerBattleSquaddie2: BattleSquaddie
        let gameEngineState: GameEngineState

        beforeEach(() => {
            playerBattleSquaddie2 = BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "player_squaddie_1",
                squaddieTemplateId: "player_squaddie",
                squaddieTurn: SquaddieTurnService.new(),
            })

            ObjectRepositoryService.addBattleSquaddie(
                objectRepository,
                playerBattleSquaddie2
            )

            playerTeam2 = {
                id: "playerTeamId",
                name: "Player Team",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: ["player_squaddie_1"],
                iconResourceKey: "icon_player_team",
            }

            teams.push(playerTeam2)

            gameEngineState = GameEngineStateService.new({
                repository: objectRepository,
                resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        teams,
                        missionMap: MissionMapService.new({
                            terrainTileMap: TerrainTileMapService.new({
                                movementCost: ["1 1 1 "],
                            }),
                        }),
                        battlePhaseState: {
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        },
                    }),
                }),
            })
        })

        it("will stay with the current affiliation if the current team is done", () => {
            playerSquaddieTeam.battleSquaddieIds.forEach((battleSquaddieId) => {
                const { battleSquaddie } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        battleSquaddieId
                    )
                )
                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            })

            battlePhaseController = new BattlePhaseController()
            battlePhaseController.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler,
            })
            expect(
                battlePhaseController.hasCompleted(gameEngineState)
            ).toBeTruthy()
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState.currentAffiliation
            ).toBe(BattlePhase.PLAYER)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState.turnCount
            ).toBe(0)
        })
        it("will move on to the next phase when all teams of the current affiliation are done", () => {
            ;[playerSquaddieTeam, playerTeam2].forEach((team) =>
                team.battleSquaddieIds.forEach((battleSquaddieId) => {
                    const { battleSquaddie } = getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            objectRepository,
                            battleSquaddieId
                        )
                    )
                    SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
                })
            )

            battlePhaseController = new BattlePhaseController()
            battlePhaseController.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler,
            })
            expect(
                battlePhaseController.hasCompleted(gameEngineState)
            ).toBeFalsy()
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState.currentAffiliation
            ).toBe(BattlePhase.ENEMY)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState.turnCount
            ).toBe(0)
        })
    })
})
