import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { isValidValue } from "../../utils/objectValidityCheck"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"
import { BattleActionDecisionStep } from "../actionDecision/battleActionDecisionStep"
import { GameEngineState } from "../../gameEngine/gameEngine"

export interface TeamStrategyCalculator {
    DetermineNextInstruction({
        team,
        gameEngineState,
    }: {
        team: BattleSquaddieTeam
        gameEngineState: GameEngineState
    }): BattleActionDecisionStep[]
}

export const TeamStrategyService = {
    getCurrentlyActingSquaddieWhoCanAct: ({
        team,
        battleSquaddieId,
        objectRepository,
    }: {
        team: BattleSquaddieTeam
        battleSquaddieId?: string
        objectRepository: ObjectRepository
    }): string => {
        if (!isValidValue(team)) {
            return undefined
        }

        let battleSquaddieIdToAct = getBattleSquaddieWhoCanAct(
            team,
            objectRepository
        )
        if (!isValidValue(battleSquaddieIdToAct)) {
            return undefined
        }

        if (battleSquaddieId) {
            const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    battleSquaddieId
                )
            )
            const { canAct } = SquaddieService.canSquaddieActRightNow({
                battleSquaddie,
                squaddieTemplate,
            })
            if (canAct) {
                return battleSquaddie.battleSquaddieId
            }
        }

        return battleSquaddieIdToAct
    },
    getBattleSquaddieWhoCanAct: (
        team: BattleSquaddieTeam,
        repository: ObjectRepository
    ): string => {
        return getBattleSquaddieWhoCanAct(team, repository)
    },
}

const getBattleSquaddieWhoCanAct = (
    team: BattleSquaddieTeam,
    repository: ObjectRepository
): string => {
    const squaddiesWhoCanAct: string[] =
        BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(team, repository)
    if (squaddiesWhoCanAct.length === 0) {
        return undefined
    }

    return squaddiesWhoCanAct[0]
}
