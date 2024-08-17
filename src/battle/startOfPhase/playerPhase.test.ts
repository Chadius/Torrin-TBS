import { BattleHUDService } from "../hud/battleHUD"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../orchestrator/battleState"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddiePhaseListener } from "./squaddiePhaseListener"
import { MissionMap } from "../../missionMap/missionMap"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import { BattleCamera } from "../battleCamera"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"

describe("player phase listener", () => {
    let squaddiePhaseListener: SquaddiePhaseListener
    let gameEngineState: GameEngineState
    let repository: ObjectRepository

    let playerTemplate: SquaddieTemplate
    let player1: BattleSquaddie
    let player2: BattleSquaddie

    let playerTeam: BattleSquaddieTeam

    beforeEach(() => {
        squaddiePhaseListener = new SquaddiePhaseListener(
            "squaddiePhaseListener"
        )

        repository = ObjectRepositoryService.new()
        ;({ battleSquaddie: player1, squaddieTemplate: playerTemplate } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player template",
                objectRepository: repository,
                battleId: "player 1",
                actionTemplateIds: [],
            }))

        ObjectRepositoryService.addBattleSquaddie(
            repository,
            BattleSquaddieService.newBattleSquaddie({
                squaddieTemplate: playerTemplate,
                battleSquaddieId: "player 2",
            })
        )
        ;({ battleSquaddie: player2 } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                "player 2"
            )
        ))

        playerTeam = BattleSquaddieTeamService.new({
            id: "player team",
            name: "player team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [
                player1.battleSquaddieId,
                player2.battleSquaddieId,
            ],
        })

        gameEngineState = GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.new({
                    battlePhaseState: {
                        currentAffiliation: BattlePhase.PLAYER,
                        turnCount: 0,
                    },
                    teams: [playerTeam],
                    missionId: "missionId",
                    campaignId: "test campaign",
                }),
            }),
            repository,
        })

        gameEngineState.messageBoard.addListener(
            squaddiePhaseListener,
            MessageBoardMessageType.STARTED_PLAYER_PHASE
        )
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
            const battleOrchestratorState: BattleOrchestratorState =
                BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        teams: [playerTeam],
                        missionMap,
                        camera,
                    }),
                })

            battleOrchestratorState.battleState.battlePhaseState = {
                currentAffiliation: BattlePhase.UNKNOWN,
                turnCount: 0,
            }

            return GameEngineStateService.new({
                battleOrchestratorState: battleOrchestratorState,
                repository,
            })
        }

        it("pans the camera to the first player when it is the player phase and the player is not near the middle of the screen", () => {
            const gameEngineState = initializeState({
                squaddieTemplateIdToAdd: playerTemplate.squaddieId.templateId,
                battleSquaddieIdToAdd: player1.battleSquaddieId,
                camera: new BattleCamera(
                    ScreenDimensions.SCREEN_WIDTH * 10,
                    ScreenDimensions.SCREEN_HEIGHT * 10
                ),
            })
            gameEngineState.messageBoard.addListener(
                squaddiePhaseListener,
                MessageBoardMessageType.STARTED_PLAYER_PHASE
            )

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.STARTED_PLAYER_PHASE,
                gameEngineState: gameEngineState,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleState.camera.isPanning()
            ).toBeTruthy()

            const datum =
                gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                    playerTeam.battleSquaddieIds[0]
                )
            const playerSquaddieLocation =
                ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                    datum.mapLocation.q,
                    datum.mapLocation.r
                )
            expect(
                gameEngineState.battleOrchestratorState.battleState.camera
                    .panningInformation.xDestination
            ).toBe(playerSquaddieLocation[0])
            expect(
                gameEngineState.battleOrchestratorState.battleState.camera
                    .panningInformation.yDestination
            ).toBe(playerSquaddieLocation[1])
        })

        it("does not pan the camera to the first player when it is the player phase and the player is near the center of the screen", () => {
            const gameEngineState = initializeState({
                squaddieTemplateIdToAdd: playerTemplate.squaddieId.templateId,
                battleSquaddieIdToAdd: player1.battleSquaddieId,
                camera: new BattleCamera(
                    ...ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                        0,
                        0
                    )
                ),
            })

            const datum =
                gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                    playerTeam.battleSquaddieIds[0]
                )
            const playerSquaddieLocation =
                ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                    datum.mapLocation.q,
                    datum.mapLocation.r
                )
            gameEngineState.battleOrchestratorState.battleState.camera.xCoord =
                playerSquaddieLocation[0]
            gameEngineState.battleOrchestratorState.battleState.camera.yCoord =
                playerSquaddieLocation[1]

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.STARTED_PLAYER_PHASE,
                gameEngineState: gameEngineState,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleState.camera.isPanning()
            ).toBeFalsy()
        })
    })
})
