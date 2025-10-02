import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { isValidValue } from "../../utils/objectValidityCheck"
import { SquaddieService } from "../../squaddie/squaddieService"
import { BattleActionDecisionStep } from "../actionDecision/battleActionDecisionStep"

import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

export type TeamStrategyBehaviorOverride = {
    noActions: boolean
}

export interface TeamStrategyCalculator {
    DetermineNextInstruction({
        team,
        gameEngineState,
        behaviorOverrides,
    }: {
        team: BattleSquaddieTeam
        gameEngineState: GameEngineState
        behaviorOverrides: TeamStrategyBehaviorOverride
    }): BattleActionDecisionStep[]
}

export const TeamStrategyService = {
    getCurrentlyActingSquaddieWhoCanAct: ({
        team,
        battleSquaddieId,
        objectRepository,
    }: {
        team: BattleSquaddieTeam | undefined
        battleSquaddieId?: string
        objectRepository: ObjectRepository
    }): string | undefined => {
        if (team == undefined) {
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
            const { battleSquaddie, squaddieTemplate } =
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    battleSquaddieId
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
    ): string | undefined => {
        return getBattleSquaddieWhoCanAct(team, repository)
    },
}

const getBattleSquaddieWhoCanAct = (
    team: BattleSquaddieTeam,
    repository: ObjectRepository
): string | undefined => {
    const squaddiesWhoCanAct: string[] =
        BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(team, repository)
    if (squaddiesWhoCanAct.length === 0) {
        return undefined
    }

    return squaddiesWhoCanAct[0]
}
