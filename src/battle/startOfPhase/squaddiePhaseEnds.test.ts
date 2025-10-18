import { BattleHUDService } from "../hud/battleHUD/battleHUD"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battleState/battleState"
import {
    BattlePhase,
    BattlePhaseService,
    TBattlePhase,
} from "../orchestratorComponents/battlePhaseTracker"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { TSquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddieService } from "../battleSquaddie"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { SquaddieTurnService } from "../../squaddie/turn"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { SquaddiePhaseListener } from "./squaddiePhaseListener"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngineState/gameEngineState"

describe("squaddie phase ends", () => {
    let squaddiePhaseListener: SquaddiePhaseListener
    let gameEngineState: GameEngineState
    let repository: ObjectRepository
    let drawUtilitiesSpy: MockInstance
    let getImageUISpy: MockInstance

    const addListenerToGameState = (gameEngineState: GameEngineState) => {
        squaddiePhaseListener = new SquaddiePhaseListener(
            "squaddiePhaseListener"
        )
        gameEngineState.messageBoard.addListener(
            squaddiePhaseListener,
            MessageBoardMessageType.SQUADDIE_PHASE_ENDS
        )
    }

    const createTeamOfTwo = (
        affiliation: TSquaddieAffiliation
    ): BattleSquaddieTeam => {
        const { squaddieTemplate } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: affiliation,
                affiliation: affiliation,
                templateId: `${affiliation} template`,
                objectRepository: repository,
                battleId: `${affiliation} 1`,
                actionTemplateIds: [],
            })

        ObjectRepositoryService.addBattleSquaddie(
            repository,
            BattleSquaddieService.newBattleSquaddie({
                squaddieTemplate: squaddieTemplate,
                battleSquaddieId: `${affiliation} 2`,
            })
        )

        return BattleSquaddieTeamService.new({
            id: `${affiliation} team`,
            name: `${affiliation} team`,
            affiliation: affiliation,
            battleSquaddieIds: [`${affiliation} 1`, `${affiliation} 2`],
        })
    }

    const createGameEngineStateWithTeamsAndPhase = (
        teams: BattleSquaddieTeam[],
        startingBattlePhase: TBattlePhase
    ): GameEngineState => {
        return GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.new({
                    battlePhaseState: {
                        battlePhase: startingBattlePhase,
                        turnCount: 0,
                    },
                    teams: teams,
                    missionId: "missionId",
                    campaignId: "test campaign",
                    missionMap: MissionMapService.new({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: ["1 1 1 "],
                        }),
                    }),
                }),
            }),
            repository,
        })
    }

    beforeEach(() => {
        repository = ObjectRepositoryService.new()
        drawUtilitiesSpy = vi.spyOn(
            DrawSquaddieIconOnMapUtilities,
            "unTintSquaddieMapIcon"
        )
        getImageUISpy = vi
            .spyOn(ObjectRepositoryService, "getImageUIByBattleSquaddieId")
            .mockReturnValue(undefined)
    })

    afterEach(() => {
        getImageUISpy.mockRestore()
        drawUtilitiesSpy.mockRestore()
    })

    describe("untint icons for each squaddie of the starting team", () => {
        const tests = [
            BattlePhase.PLAYER,
            BattlePhase.ENEMY,
            BattlePhase.ALLY,
            BattlePhase.NONE,
        ]

        it.each(tests)(`phase`, (phase) => {
            const affiliation =
                BattlePhaseService.ConvertBattlePhaseToSquaddieAffiliation(
                    phase
                )
            const team = createTeamOfTwo(affiliation)

            gameEngineState = createGameEngineStateWithTeamsAndPhase(
                [team],
                phase
            )
            addListenerToGameState(gameEngineState)

            team.battleSquaddieIds.forEach((battleSquaddieId) => {
                const { battleSquaddie } =
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository!,
                        battleSquaddieId
                    )
                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            })

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SQUADDIE_PHASE_ENDS,
                repository: gameEngineState.repository,
                teams: gameEngineState.battleOrchestratorState.battleState
                    .teams,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                phase,
            })

            const battleSquaddieIdsThatAreDrawn: string[] =
                drawUtilitiesSpy.mock.calls.map(
                    (call) => call[1].battleSquaddieId
                )
            expect(battleSquaddieIdsThatAreDrawn).toEqual(
                expect.arrayContaining(team.battleSquaddieIds)
            )
            expect(battleSquaddieIdsThatAreDrawn).toHaveLength(
                team.battleSquaddieIds.length
            )
        })
    })
})
