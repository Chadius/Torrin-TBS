import {
    TeamStrategyCalculator,
    TeamStrategyService,
} from "./teamStrategyCalculator"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { ObjectRepository } from "../objectRepository"
import { TeamStrategyOptions } from "./teamStrategy"
import {
    DecidedAction,
    DecidedActionService,
} from "../../action/decided/decidedAction"
import { MissionMap } from "../../missionMap/missionMap"
import { ActionsThisRound } from "../history/actionsThisRound"
import { isValidValue } from "../../utils/validityCheck"
import { DecidedActionEndTurnEffectService } from "../../action/decided/decidedActionEndTurnEffect"
import { ActionEffectEndTurnTemplateService } from "../../action/template/actionEffectEndTurnTemplate"

export class EndTurnTeamStrategy implements TeamStrategyCalculator {
    constructor(options: TeamStrategyOptions) {}

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
    }): DecidedAction {
        const battleSquaddieIdToAct =
            TeamStrategyService.getBattleSquaddieWhoCanAct(team, repository)
        if (!isValidValue(battleSquaddieIdToAct)) {
            return undefined
        }

        const endTurnDecidedActionEffect =
            DecidedActionEndTurnEffectService.new({
                template: ActionEffectEndTurnTemplateService.new({}),
            })
        return DecidedActionService.new({
            actionTemplateName: "End Turn",
            battleSquaddieId: battleSquaddieIdToAct,
            actionEffects: [endTurnDecidedActionEffect],
        })
    }
}
