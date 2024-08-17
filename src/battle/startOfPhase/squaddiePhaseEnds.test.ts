import { BattleHUDService } from "../hud/battleHUD"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../orchestrator/battleState"
import {
    BattlePhase,
    BattlePhaseService,
} from "../orchestratorComponents/battlePhaseTracker"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddieService } from "../battleSquaddie"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { SquaddieTurnService } from "../../squaddie/turn"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddiePhaseListener } from "./squaddiePhaseListener"
import { DrawSquaddieUtilities } from "../animation/drawSquaddie"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"

describe("squaddie phase ends", () => {
    let squaddiePhaseListener: SquaddiePhaseListener
    let gameEngineState: GameEngineState
    let repository: ObjectRepository
    let drawUtilitiesSpy: jest.SpyInstance

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
        affiliation: SquaddieAffiliation
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
        startingBattlePhase: BattlePhase
    ): GameEngineState => {
        return GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.new({
                    battlePhaseState: {
                        currentAffiliation: startingBattlePhase,
                        turnCount: 0,
                    },
                    teams: teams,
                    missionId: "missionId",
                    campaignId: "test campaign",
                }),
            }),
            repository,
        })
    }

    beforeEach(() => {
        repository = ObjectRepositoryService.new()
        drawUtilitiesSpy = jest.spyOn(
            DrawSquaddieUtilities,
            "unTintSquaddieMapIcon"
        )
    })

    afterEach(() => {
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
                const { battleSquaddie } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository,
                        battleSquaddieId
                    )
                )
                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            })

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SQUADDIE_PHASE_ENDS,
                gameEngineState: gameEngineState,
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
