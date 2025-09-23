import { TeamStrategy, TeamStrategyType } from "./teamStrategy"
import { MoveCloserToSquaddie } from "./moveCloserToSquaddie"
import { TargetSquaddieInRange } from "./targetSquaddieInRange"
import { EndTurnTeamStrategy } from "./endTurn"
import { TeamStrategyCalculator } from "./teamStrategyCalculator"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { BattleActionDecisionStep } from "../actionDecision/battleActionDecisionStep"
import { DebugModeMenuService } from "../hud/debugModeMenu/debugModeMenu"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

export const DetermineNextDecisionService = {
    determineNextDecision: ({
        team,
        strategy,
        gameEngineState,
    }: {
        team: BattleSquaddieTeam
        strategy: TeamStrategy
        gameEngineState: GameEngineState
    }): BattleActionDecisionStep[] => {
        return determineNextDecision({
            team,
            strategy,
            gameEngineState,
        })
    },
}

const determineNextDecision = ({
    team,
    strategy,
    gameEngineState,
}: {
    team: BattleSquaddieTeam
    strategy: TeamStrategy
    gameEngineState: GameEngineState
}): BattleActionDecisionStep[] => {
    let calculator: TeamStrategyCalculator
    switch (strategy.type) {
        case TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE:
            calculator = new MoveCloserToSquaddie(strategy.options)
            break
        case TeamStrategyType.TARGET_SQUADDIE_IN_RANGE:
            calculator = new TargetSquaddieInRange(strategy.options)
            break
        default:
            calculator = new EndTurnTeamStrategy()
            break
    }
    return calculator.DetermineNextInstruction({
        team,
        gameEngineState,
        behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
            gameEngineState.battleOrchestratorState.battleHUD.debugMode
        ).behaviorOverrides,
    })
}
