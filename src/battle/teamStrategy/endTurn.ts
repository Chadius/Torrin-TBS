import {
    TeamStrategyCalculator,
    TeamStrategyService,
} from "./teamStrategyCalculator"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { ObjectRepository } from "../objectRepository"
import { MissionMap } from "../../missionMap/missionMap"
import { ActionsThisRound } from "../history/actionsThisRound"
import { isValidValue } from "../../utils/validityCheck"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"

export class EndTurnTeamStrategy implements TeamStrategyCalculator {
    DetermineNextInstruction({
        team,
        missionMap,
        repository,
        actionsThisRound,
    }: {
        team: BattleSquaddieTeam
        missionMap: MissionMap
        repository: ObjectRepository
        actionsThisRound?: ActionsThisRound
    }): BattleActionDecisionStep[] {
        const battleSquaddieIdToAct =
            TeamStrategyService.getBattleSquaddieWhoCanAct(team, repository)
        if (!isValidValue(battleSquaddieIdToAct)) {
            return undefined
        }

        const endTurnStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: endTurnStep,
            battleSquaddieId: battleSquaddieIdToAct,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: endTurnStep,
            endTurn: true,
        })

        return [endTurnStep]
    }
}
