import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../orchestrator/battleOrchestratorState"
import { AdvanceToNextPhase, BattlePhase } from "./battlePhaseTracker"
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
    BattlePhaseState,
} from "./battlePhaseController"
import { getResultOrThrowError, makeResult } from "../../utils/ResultOrError"
import { ResourceHandler } from "../../resource/resourceHandler"
import { BattleCamera } from "../battleCamera"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { convertMapCoordinatesToWorldCoordinates } from "../../hexMap/convertCoordinates"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { MissionMap } from "../../missionMap/missionMap"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import { DefaultArmyAttributes } from "../../squaddie/armyAttributes"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { FileAccessHUDService } from "../hud/fileAccessHUD"
import { BattleHUDListener } from "../hud/battleHUD"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { ButtonStatus } from "../../ui/button"

describe("BattlePhaseController", () => {
    let squaddieRepo: ObjectRepository
    let battlePhaseController: BattlePhaseController
    let playerSquaddieTeam: BattleSquaddieTeam
    let enemySquaddieTeam: BattleSquaddieTeam
    let resourceHandler: ResourceHandler
    let diffTime: number
    let state: GameEngineState
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let teams: BattleSquaddieTeam[]
    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        squaddieRepo = ObjectRepositoryService.new()

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
            squaddieRepo,
            playerSquaddieTemplate
        )
        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            playerBattleSquaddie
        )

        ObjectRepositoryService.addSquaddieTemplate(
            squaddieRepo,
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
            squaddieRepo,
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

        resourceHandler = new (<new (options: any) => ResourceHandler>(
            ResourceHandler
        ))({}) as jest.Mocked<ResourceHandler>
        resourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult("Hi"))

        state = GameEngineStateService.new({
            repository: squaddieRepo,
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
                    missionMap: new MissionMap({
                        terrainTileMap: new TerrainTileMap({
                            movementCost: ["1 "],
                        }),
                    }),
                }),
            }),
        })

        battlePhaseController = new BattlePhaseController()
        battlePhaseController.draw = jest.fn()
    })

    it("does nothing and finishes immediately if team has not finished their turn", () => {
        state.battleOrchestratorState.battleState.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }
        AdvanceToNextPhase(
            state.battleOrchestratorState.battleState.battlePhaseState,
            teams
        )
        expect(
            state.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation
        ).toBe(BattlePhase.PLAYER)

        battlePhaseController.update(state, mockedP5GraphicsContext)
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy()
        expect(battlePhaseController.draw).not.toBeCalled()
        expect(
            state.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation
        ).toBe(BattlePhase.PLAYER)
    })

    it("starts showing the player phase banner by default", () => {
        const state: GameEngineState = GameEngineStateService.new({
            repository: squaddieRepo,
            resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    teams,
                    missionMap: new MissionMap({
                        terrainTileMap: new TerrainTileMap({
                            movementCost: ["1 1 1 "],
                        }),
                    }),
                }),
            }),
        })
        battlePhaseController = new BattlePhaseController()
        const startTime = 0
        jest.spyOn(Date, "now").mockImplementation(() => startTime)

        state.battleOrchestratorState.battleState.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }

        battlePhaseController.update(state, mockedP5GraphicsContext)
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy()
        expect(
            state.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation
        ).toBe(BattlePhase.PLAYER)
        expect(
            state.battleOrchestratorState.battleState.battlePhaseState.turnCount
        ).toBe(1)
        expect(battlePhaseController.bannerDisplayAnimationStartTime).toBe(
            startTime
        )

        battlePhaseController.update(state, mockedP5GraphicsContext)
        jest.spyOn(Date, "now").mockImplementation(
            () => startTime + BANNER_ANIMATION_TIME + diffTime
        )
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy()
        expect(
            state.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation
        ).toBe(BattlePhase.PLAYER)
    })

    it("stops the camera when it displays the banner if it is not the player phase", () => {
        const state: GameEngineState = GameEngineStateService.new({
            repository: squaddieRepo,
            resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    teams,
                    missionMap: new MissionMap({
                        terrainTileMap: new TerrainTileMap({
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
        jest.spyOn(Date, "now").mockImplementation(() => startTime)

        battlePhaseController.update(state, mockedP5GraphicsContext)
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy()

        expect(
            state.battleOrchestratorState.battleState.camera.getVelocity()
        ).toStrictEqual([0, 0])
    })

    describe("The start of Player Phase", () => {
        let missionMap: MissionMap

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "],
                }),
            })
        })

        const initializeState = ({
            squaddieTemplateIdToAdd,
            battleSquaddieIdToAdd,
            camera,
        }: {
            squaddieTemplateIdToAdd: string
            battleSquaddieIdToAdd: string
            camera: BattleCamera
        }): GameEngineState => {
            missionMap.addSquaddie(
                squaddieTemplateIdToAdd,
                battleSquaddieIdToAdd,
                { q: 0, r: 0 }
            )
            const state: BattleOrchestratorState =
                BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        teams,
                        missionMap,
                        camera,
                    }),
                })

            state.battleState.battlePhaseState = {
                currentAffiliation: BattlePhase.UNKNOWN,
                turnCount: 0,
            }

            battlePhaseController = new BattlePhaseController()
            return GameEngineStateService.new({
                battleOrchestratorState: state,
                repository: squaddieRepo,
                resourceHandler,
            })
        }

        it("pans the camera to the first player when it is the player phase and the player is not near the middle of the screen", () => {
            const state = initializeState({
                squaddieTemplateIdToAdd:
                    playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieIdToAdd: playerBattleSquaddie.battleSquaddieId,
                camera: new BattleCamera(
                    ScreenDimensions.SCREEN_WIDTH * 10,
                    ScreenDimensions.SCREEN_HEIGHT * 10
                ),
            })

            battlePhaseController.update(state, mockedP5GraphicsContext)
            expect(
                state.battleOrchestratorState.battleState.camera.isPanning()
            ).toBeTruthy()

            const datum =
                state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                    playerSquaddieTeam.battleSquaddieIds[0]
                )
            const playerSquaddieLocation =
                convertMapCoordinatesToWorldCoordinates(
                    datum.mapLocation.q,
                    datum.mapLocation.r
                )
            expect(
                state.battleOrchestratorState.battleState.camera
                    .panningInformation.xDestination
            ).toBe(playerSquaddieLocation[0])
            expect(
                state.battleOrchestratorState.battleState.camera
                    .panningInformation.yDestination
            ).toBe(playerSquaddieLocation[1])
        })

        it("enables and shows the HUD at the start of the player phase", () => {
            const gameEngineState = initializeState({
                squaddieTemplateIdToAdd:
                    playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieIdToAdd: playerBattleSquaddie.battleSquaddieId,
                camera: new BattleCamera(
                    ScreenDimensions.SCREEN_WIDTH * 10,
                    ScreenDimensions.SCREEN_HEIGHT * 10
                ),
            })
            const battleHUDListener: BattleHUDListener = new BattleHUDListener(
                "battleHUDListener"
            )
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.STARTED_PLAYER_PHASE
            )

            const messageSpy: jest.SpyInstance = jest.spyOn(
                gameEngineState.messageBoard,
                "sendMessage"
            )

            battlePhaseController.update(
                gameEngineState,
                mockedP5GraphicsContext
            )
            expect(
                gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD.loadButton.getStatus()
            ).toBe(ButtonStatus.READY)
            expect(
                gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD.saveButton.getStatus()
            ).toBe(ButtonStatus.READY)
            expect(messageSpy).toBeCalled()
            messageSpy.mockRestore()
        })

        it("does not pan the camera to the first player when it is the player phase and the player is near the center of the screen", () => {
            const state = initializeState({
                squaddieTemplateIdToAdd:
                    playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieIdToAdd: playerBattleSquaddie.battleSquaddieId,
                camera: new BattleCamera(
                    ...convertMapCoordinatesToWorldCoordinates(0, 0)
                ),
            })

            const datum =
                state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                    playerSquaddieTeam.battleSquaddieIds[0]
                )
            const playerSquaddieLocation =
                convertMapCoordinatesToWorldCoordinates(
                    datum.mapLocation.q,
                    datum.mapLocation.r
                )
            state.battleOrchestratorState.battleState.camera.xCoord =
                playerSquaddieLocation[0]
            state.battleOrchestratorState.battleState.camera.yCoord =
                playerSquaddieLocation[1]

            battlePhaseController = new BattlePhaseController()
            const startTime = 0
            jest.spyOn(Date, "now").mockImplementation(() => startTime)

            battlePhaseController.update(state, mockedP5GraphicsContext)
            expect(
                state.battleOrchestratorState.battleState.camera.isPanning()
            ).toBeFalsy()
        })
    })

    describe("player team completes their turn", () => {
        const startTime = 100

        beforeEach(() => {
            state.battleOrchestratorState.battleState.battlePhaseState = {
                currentAffiliation: BattlePhase.UNKNOWN,
                turnCount: 0,
            }

            AdvanceToNextPhase(
                state.battleOrchestratorState.battleState.battlePhaseState,
                teams
            )
            expect(
                state.battleOrchestratorState.battleState.battlePhaseState
                    .currentAffiliation
            ).toBe(BattlePhase.PLAYER)

            const { battleSquaddie: battleSquaddie0 } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    squaddieRepo,
                    "player_squaddie_0"
                )
            )
            BattleSquaddieService.endTurn(battleSquaddie0)

            jest.spyOn(Date, "now").mockImplementation(() => startTime)
            battlePhaseController.update(state, mockedP5GraphicsContext)
            expect(battlePhaseController.hasCompleted(state)).toBeFalsy()
            expect(
                state.battleOrchestratorState.battleState.battlePhaseState
                    .currentAffiliation
            ).toBe(BattlePhase.ENEMY)
        })

        it("starts the animation and completes if team has finished their turns", () => {
            jest.spyOn(Date, "now").mockImplementation(
                () => startTime + BANNER_ANIMATION_TIME + diffTime
            )
            battlePhaseController.update(state, mockedP5GraphicsContext)
            expect(battlePhaseController.hasCompleted(state)).toBeTruthy()
            expect(
                state.battleOrchestratorState.battleState.battlePhaseState
                    .currentAffiliation
            ).toBe(BattlePhase.ENEMY)
        })

        it("does not enable the HUD at the start of the phase", () => {
            const fileAccessHUDSpy = jest.spyOn(
                FileAccessHUDService,
                "enableButtons"
            )
            jest.spyOn(Date, "now").mockImplementation(
                () => startTime + BANNER_ANIMATION_TIME + diffTime
            )
            battlePhaseController.update(state, mockedP5GraphicsContext)
            expect(
                state.battleOrchestratorState.battleState.battlePhaseState
                    .currentAffiliation
            ).not.toBe(BattlePhase.PLAYER)
            battlePhaseController.update(state, mockedP5GraphicsContext)
            expect(fileAccessHUDSpy).not.toBeCalled()
            fileAccessHUDSpy.mockRestore()
        })
    })

    it("only draws the banner while the timer is going", () => {
        const state: GameEngineState = GameEngineStateService.new({
            repository: squaddieRepo,
            resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    teams,
                    missionMap: new MissionMap({
                        terrainTileMap: new TerrainTileMap({
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
        battlePhaseController.draw = jest.fn()

        const startTime = 0
        jest.spyOn(Date, "now").mockImplementation(() => startTime)

        battlePhaseController.update(state, mockedP5GraphicsContext)
        expect(battlePhaseController.draw).not.toBeCalled()
        expect(battlePhaseController.bannerDisplayAnimationStartTime).toBe(
            startTime
        )

        jest.spyOn(Date, "now").mockImplementation(
            () => startTime + BANNER_ANIMATION_TIME * 0.5
        )
        battlePhaseController.update(state, mockedP5GraphicsContext)
        expect(battlePhaseController.draw).toBeCalledTimes(1)

        jest.spyOn(Date, "now").mockImplementation(
            () => startTime + BANNER_ANIMATION_TIME * 0.75
        )
        battlePhaseController.update(state, mockedP5GraphicsContext)
        expect(battlePhaseController.draw).toBeCalledTimes(2)
    })

    it("resets internal variables once completed", () => {
        battlePhaseController = new BattlePhaseController()
        battlePhaseController.affiliationImageUI = mocks.mockImageUI()

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

    it("restores team squaddie turns once the banner appears starts", () => {
        const { battleSquaddie: battleSquaddie0 } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                squaddieRepo,
                "player_squaddie_0"
            )
        )
        BattleSquaddieService.endTurn(battleSquaddie0)
        expect(
            BattleSquaddieService.canStillActThisRound(battleSquaddie0)
        ).toBeFalsy()

        const phase: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }

        const state: GameEngineState = GameEngineStateService.new({
            repository: squaddieRepo,
            resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    battlePhaseState: phase,
                    teams,
                    missionMap: new MissionMap({
                        terrainTileMap: new TerrainTileMap({
                            movementCost: ["1 "],
                        }),
                    }),
                }),
            }),
        })
        battlePhaseController = new BattlePhaseController()
        const startTime = 0

        jest.spyOn(Date, "now").mockImplementation(() => startTime)
        battlePhaseController.update(state, mockedP5GraphicsContext)

        expect(battlePhaseController.hasCompleted(state)).toBeFalsy()
        expect(phase.currentAffiliation).toBe(BattlePhase.PLAYER)
        expect(
            BattleSquaddieService.canStillActThisRound(battleSquaddie0)
        ).toBeTruthy()
    })

    describe("multiple teams of the same affiliation", () => {
        let playerTeam2: BattleSquaddieTeam
        let playerBattleSquaddie2: BattleSquaddie

        beforeEach(() => {
            playerBattleSquaddie2 = BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "player_squaddie_1",
                squaddieTemplateId: "player_squaddie",
                squaddieTurn: SquaddieTurnService.new(),
            })

            ObjectRepositoryService.addBattleSquaddie(
                squaddieRepo,
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
        })

        it("will stay with the current affiliation if the current team is done", () => {
            playerSquaddieTeam.battleSquaddieIds.forEach((battleSquaddieId) => {
                const { battleSquaddie } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        squaddieRepo,
                        battleSquaddieId
                    )
                )
                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            })

            const state: GameEngineState = GameEngineStateService.new({
                repository: squaddieRepo,
                resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        teams,
                        missionMap: new MissionMap({
                            terrainTileMap: new TerrainTileMap({
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
            battlePhaseController = new BattlePhaseController()
            battlePhaseController.update(state, mockedP5GraphicsContext)
            expect(battlePhaseController.hasCompleted(state)).toBeTruthy()
            expect(
                state.battleOrchestratorState.battleState.battlePhaseState
                    .currentAffiliation
            ).toBe(BattlePhase.PLAYER)
            expect(
                state.battleOrchestratorState.battleState.battlePhaseState
                    .turnCount
            ).toBe(0)
        })
        it("will move on to the next phase when all teams of the current affiliation are done", () => {
            ;[playerSquaddieTeam, playerTeam2].forEach((team) =>
                team.battleSquaddieIds.forEach((battleSquaddieId) => {
                    const { battleSquaddie } = getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            squaddieRepo,
                            battleSquaddieId
                        )
                    )
                    SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
                })
            )

            const state: GameEngineState = GameEngineStateService.new({
                repository: squaddieRepo,
                resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        teams,
                        missionMap: new MissionMap({
                            terrainTileMap: new TerrainTileMap({
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
            battlePhaseController = new BattlePhaseController()
            battlePhaseController.update(state, mockedP5GraphicsContext)
            expect(battlePhaseController.hasCompleted(state)).toBeFalsy()
            expect(
                state.battleOrchestratorState.battleState.battlePhaseState
                    .currentAffiliation
            ).toBe(BattlePhase.ENEMY)
            expect(
                state.battleOrchestratorState.battleState.battlePhaseState
                    .turnCount
            ).toBe(0)

            expect(
                BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(
                    playerSquaddieTeam,
                    squaddieRepo
                )
            ).toEqual(
                expect.arrayContaining(playerSquaddieTeam.battleSquaddieIds)
            )
            expect(
                BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(
                    playerTeam2,
                    squaddieRepo
                )
            ).toEqual(expect.arrayContaining(playerTeam2.battleSquaddieIds))
        })
    })
})
