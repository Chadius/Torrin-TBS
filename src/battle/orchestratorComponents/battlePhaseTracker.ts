import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
import { BattlePhaseState } from "./battlePhaseController"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattleSquaddie } from "../battleSquaddie"
import { getResultOrThrowError } from "../../utils/resultOrError"
import { ObjectRepositoryService } from "../objectRepository"

export const BattlePhase = {
    UNKNOWN: "UNKNOWN",
    PLAYER: "PLAYER",
    ENEMY: "ENEMY",
    ALLY: "ALLY",
    NONE: "NONE",
} as const satisfies Record<string, string>

export type TBattlePhase = EnumLike<typeof BattlePhase>

export const BattlePhaseService = {
    ConvertBattlePhaseToSquaddieAffiliation: (
        phase: TBattlePhase
    ): TSquaddieAffiliation => {
        return convertBattlePhaseToSquaddieAffiliation(phase)
    },
    AdvanceToNextPhase: (
        startingPhaseState: BattlePhaseState,
        teams: BattleSquaddieTeam[]
    ) => {
        return advanceToNextPhase(startingPhaseState, teams)
    },
    findTeamsOfAffiliation: (
        teams: BattleSquaddieTeam[],
        affiliation: TSquaddieAffiliation
    ): BattleSquaddieTeam[] => {
        return findTeamsOfAffiliation(teams, affiliation)
    },
    doForEachSquaddieOfBattlePhase: (
        gameEngineState: GameEngineState,
        phase: TBattlePhase,
        callback: (battleSquaddie: BattleSquaddie) => void
    ) => {
        const squaddieAffiliation =
            BattlePhaseService.ConvertBattlePhaseToSquaddieAffiliation(phase)

        const squaddieTeams =
            gameEngineState.battleOrchestratorState.battleState.teams.filter(
                (team) => team.affiliation === squaddieAffiliation
            )
        squaddieTeams.forEach((team) => {
            team.battleSquaddieIds.forEach((battleSquaddieId) => {
                const { battleSquaddie } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository,
                        battleSquaddieId
                    )
                )

                callback(battleSquaddie)
            })
        })
    },
}

const convertBattlePhaseToSquaddieAffiliation: (
    phase: TBattlePhase
) => TSquaddieAffiliation = (phase: TBattlePhase): TSquaddieAffiliation => {
    switch (phase) {
        case BattlePhase.PLAYER:
            return SquaddieAffiliation.PLAYER
        case BattlePhase.ENEMY:
            return SquaddieAffiliation.ENEMY
        case BattlePhase.ALLY:
            return SquaddieAffiliation.ALLY
        case BattlePhase.NONE:
            return SquaddieAffiliation.NONE
        default:
            return SquaddieAffiliation.UNKNOWN
    }
}

const advanceToNextPhase = (
    startingPhaseState: BattlePhaseState,
    teams: BattleSquaddieTeam[]
) => {
    const getNextPhase = (phase: TBattlePhase) => {
        switch (phase) {
            case BattlePhase.PLAYER:
                return { phase: BattlePhase.ENEMY, incrementTurn: false }
            case BattlePhase.ENEMY:
                return { phase: BattlePhase.ALLY, incrementTurn: false }
            case BattlePhase.ALLY:
                return { phase: BattlePhase.NONE, incrementTurn: false }
            case BattlePhase.NONE:
                return { phase: BattlePhase.PLAYER, incrementTurn: true }
            case BattlePhase.UNKNOWN:
                return { phase: BattlePhase.PLAYER, incrementTurn: true }
            default:
                return { phase: BattlePhase.UNKNOWN, incrementTurn: false }
        }
    }

    const startingPhase = startingPhaseState.currentAffiliation
    let { phase, incrementTurn } = getNextPhase(startingPhase)

    let numberOfAttemptedSwitches = 0
    while (numberOfAttemptedSwitches < 5) {
        const teamsOfAffiliation = findTeamsOfAffiliation(
            teams,
            convertBattlePhaseToSquaddieAffiliation(phase)
        )
        if (
            teamsOfAffiliation.length > 0 &&
            teamsOfAffiliation.some((team) =>
                BattleSquaddieTeamService.hasSquaddies(team)
            )
        ) {
            startingPhaseState.currentAffiliation = phase
            if (incrementTurn) {
                startingPhaseState.turnCount += 1
            }
            return
        }

        ;({ phase, incrementTurn } = getNextPhase(phase))
        if (phase === startingPhase) {
            startingPhaseState.currentAffiliation = BattlePhase.UNKNOWN
            if (incrementTurn) {
                startingPhaseState.turnCount += 1
            }
            return
        }

        numberOfAttemptedSwitches += 1
    }
    throw new Error("No teams are available")
}

const findTeamsOfAffiliation = (
    teams: BattleSquaddieTeam[],
    affiliation: TSquaddieAffiliation
): BattleSquaddieTeam[] => {
    return teams.filter((team) => team.affiliation === affiliation)
}
