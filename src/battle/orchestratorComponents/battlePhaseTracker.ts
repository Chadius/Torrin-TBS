import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattlePhaseState } from "./battlePhaseController"

export enum BattlePhase {
    UNKNOWN = "UNKNOWN",
    PLAYER = "PLAYER",
    ENEMY = "ENEMY",
    ALLY = "ALLY",
    NONE = "NONE",
}

const squaddieAffiliationToBattlePhase: (
    squaddieAffiliation: SquaddieAffiliation
) => BattlePhase = (squaddieAffiliation: SquaddieAffiliation): BattlePhase => {
    switch (squaddieAffiliation) {
        case SquaddieAffiliation.PLAYER:
            return BattlePhase.PLAYER
        case SquaddieAffiliation.ENEMY:
            return BattlePhase.ENEMY
        case SquaddieAffiliation.ALLY:
            return BattlePhase.ALLY
        case SquaddieAffiliation.NONE:
            return BattlePhase.NONE
        default:
            return BattlePhase.UNKNOWN
    }
}

export const ConvertBattlePhaseToSquaddieAffiliation: (
    phase: BattlePhase
) => SquaddieAffiliation = (phase: BattlePhase): SquaddieAffiliation => {
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

export const AdvanceToNextPhase = (
    startingPhaseState: BattlePhaseState,
    teams: BattleSquaddieTeam[]
) => {
    const getNextPhase = (phase: BattlePhase) => {
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
        const teamsOfAffiliation = FindTeamsOfAffiliation(
            teams,
            ConvertBattlePhaseToSquaddieAffiliation(phase)
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

export const FindTeamsOfAffiliation = (
    teams: BattleSquaddieTeam[],
    affiliation: SquaddieAffiliation
): BattleSquaddieTeam[] => {
    return teams.filter((team) => team.affiliation === affiliation)
}
