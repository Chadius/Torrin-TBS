import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { ObjectRepository, ObjectRepositoryService } from "./objectRepository"
import { getResultOrThrowError } from "../utils/ResultOrError"
import { DrawSquaddieUtilities } from "./animation/drawSquaddie"
import { SquaddieService } from "../squaddie/squaddieService"
import { BattleSquaddieService } from "./battleSquaddie"
import { isValidValue } from "../utils/validityCheck"

export interface BattleSquaddieTeam {
    id: string
    name: string
    affiliation: SquaddieAffiliation
    battleSquaddieIds: string[]
    iconResourceKey: string
}

export const BattleSquaddieTeamService = {
    new: ({
        id,
        name,
        affiliation,
        battleSquaddieIds,
        iconResourceKey,
    }: {
        id: string
        name: string
        affiliation: SquaddieAffiliation
        battleSquaddieIds: string[]
        iconResourceKey?: string
    }): BattleSquaddieTeam => {
        return {
            id,
            name,
            affiliation,
            battleSquaddieIds,
            iconResourceKey,
        }
    },
    hasSquaddies: (team: BattleSquaddieTeam): boolean => {
        return team.battleSquaddieIds.length > 0
    },
    hasAnActingSquaddie: (
        team: BattleSquaddieTeam,
        squaddieRepository: ObjectRepository
    ): boolean => {
        return (
            isValidValue(team) &&
            isValidValue(team.battleSquaddieIds) &&
            team.battleSquaddieIds.some((battleSquaddieId) => {
                const { squaddieTemplate, battleSquaddie } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            squaddieRepository,
                            battleSquaddieId
                        )
                    )
                const { canAct } = SquaddieService.canSquaddieActRightNow({
                    squaddieTemplate,
                    battleSquaddie,
                })
                return canAct
            })
        )
    },
    addBattleSquaddieIds: (
        team: BattleSquaddieTeam,
        battleSquaddieIds: string[]
    ) => {
        team.battleSquaddieIds = [
            ...team.battleSquaddieIds,
            ...battleSquaddieIds.filter((notEmptyString) => {
                return (
                    notEmptyString &&
                    !team.battleSquaddieIds.includes(notEmptyString)
                )
            }),
        ]
    },
    canPlayerControlAnySquaddieOnThisTeamRightNow: (
        team: BattleSquaddieTeam,
        squaddieRepository: ObjectRepository
    ): boolean => {
        return team.battleSquaddieIds.some((battleSquaddieId) => {
            const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    squaddieRepository,
                    battleSquaddieId
                )
            )
            const { playerCanControlThisSquaddieRightNow } =
                SquaddieService.canPlayerControlSquaddieRightNow({
                    squaddieTemplate,
                    battleSquaddie,
                })
            return playerCanControlThisSquaddieRightNow
        })
    },
    getBattleSquaddieIdThatCanActButNotPlayerControlled: (
        team: BattleSquaddieTeam,
        squaddieRepository: ObjectRepository
    ): string => {
        return team.battleSquaddieIds.find((battleSquaddieId) => {
            const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    squaddieRepository,
                    battleSquaddieId
                )
            )
            const {
                squaddieCanCurrentlyAct,
                squaddieHasThePlayerControlledAffiliation,
            } = SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            })
            return (
                !squaddieHasThePlayerControlledAffiliation &&
                squaddieCanCurrentlyAct
            )
        })
    },
    getBattleSquaddiesThatCanAct: (
        team: BattleSquaddieTeam,
        squaddieRepository: ObjectRepository
    ): string[] => {
        return team.battleSquaddieIds.filter((battleSquaddieId) => {
            const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    squaddieRepository,
                    battleSquaddieId
                )
            )
            const { canAct } = SquaddieService.canSquaddieActRightNow({
                squaddieTemplate,
                battleSquaddie,
            })
            return canAct
        })
    },
    beginNewRound: (
        team: BattleSquaddieTeam,
        squaddieRepository: ObjectRepository
    ) => {
        team.battleSquaddieIds.forEach((battleSquaddieId) => {
            const { battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    squaddieRepository,
                    battleSquaddieId
                )
            )
            BattleSquaddieService.beginNewRound(battleSquaddie)
            DrawSquaddieUtilities.unTintSquaddieMapIcon(
                squaddieRepository,
                battleSquaddie
            )
        })
    },
    sanitize: (data: BattleSquaddieTeam): BattleSquaddieTeam => {
        return sanitize(data)
    },
    endTurn: (team: BattleSquaddieTeam, objectRepository: ObjectRepository) => {
        team.battleSquaddieIds.forEach((battleSquaddieId) => {
            const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    battleSquaddieId
                )
            )
            BattleSquaddieService.endTurn(battleSquaddie)
            DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(
                battleSquaddie,
                squaddieTemplate,
                objectRepository
            )
        })
    },
}

const sanitize = (data: BattleSquaddieTeam): BattleSquaddieTeam => {
    if (!data.name || !isValidValue(data.name)) {
        throw new Error("BattleSquaddieTeam cannot sanitize, missing name")
    }

    if (!data.id || !isValidValue(data.id)) {
        throw new Error("BattleSquaddieTeam cannot sanitize, missing id")
    }

    if (!isValidValue(data.battleSquaddieIds)) {
        data.battleSquaddieIds = []
    }
    if (!isValidValue(data.affiliation)) {
        data.affiliation = SquaddieAffiliation.UNKNOWN
    }

    if (!isValidValue(data.iconResourceKey)) {
        data.iconResourceKey = ""
    }

    return data
}
