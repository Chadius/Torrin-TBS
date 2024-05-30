import {
    TeamStrategyCalculator,
    TeamStrategyService,
} from "./teamStrategyCalculator"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import {
    TargetingResults,
    TargetingResultsService,
} from "../targeting/targetingService"
import { BattleSquaddie } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { SquaddieTurnService } from "../../squaddie/turn"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { TeamStrategyOptions } from "./teamStrategy"
import {
    DecidedAction,
    DecidedActionService,
} from "../../action/decided/decidedAction"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { ActionsThisRound } from "../history/actionsThisRound"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { ActionEffectSquaddieTemplate } from "../../action/template/actionEffectSquaddieTemplate"
import { isValidValue } from "../../utils/validityCheck"
import { DecidedActionSquaddieEffectService } from "../../action/decided/decidedActionSquaddieEffect"

export class TargetSquaddieInRange implements TeamStrategyCalculator {
    desiredBattleSquaddieId: string
    desiredAffiliation: SquaddieAffiliation

    constructor(options: TeamStrategyOptions) {
        this.desiredBattleSquaddieId = options.desiredBattleSquaddieId
        this.desiredAffiliation = options.desiredAffiliation
    }

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
        if (
            !this.desiredBattleSquaddieId &&
            (!this.desiredAffiliation ||
                this.desiredAffiliation === SquaddieAffiliation.UNKNOWN)
        ) {
            throw new Error("Target Squaddie In Range strategy has no target")
        }

        let battleSquaddieIdToAct =
            TeamStrategyService.getCurrentlyActingSquaddieWhoCanAct(
                team,
                actionsThisRound,
                repository
            )
        if (!isValidValue(battleSquaddieIdToAct)) {
            return undefined
        }
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieIdToAct
            )
        )
        const validActionTemplates = squaddieTemplate.actionTemplates.filter(
            (actionTemplate) => {
                return (
                    SquaddieTurnService.canPerformAction(
                        battleSquaddie.squaddieTurn,
                        actionTemplate
                    ).canPerform === true
                )
            }
        )

        const firstActionTemplateWithTarget =
            this.getTargetingResultsOfActionWithTargets({
                actionTemplates: validActionTemplates,
                missionMap,
                repository,
                battleSquaddie,
                squaddieTemplate,
            })

        if (firstActionTemplateWithTarget === undefined) {
            return undefined
        }

        const desiredBattleSquaddieIsInRange =
            isValidValue(this.desiredBattleSquaddieId) &&
            this.desiredBattleSquaddieId !== "" &&
            firstActionTemplateWithTarget.targetingResults.battleSquaddieIdsInRange.includes(
                this.desiredBattleSquaddieId
            )

        if (desiredBattleSquaddieIsInRange) {
            const { mapLocation } = MissionMapService.getByBattleSquaddieId(
                missionMap,
                this.desiredBattleSquaddieId
            )
            return createDecidedAction(
                firstActionTemplateWithTarget.actionTemplate,
                mapLocation,
                battleSquaddieIdToAct
            )
        }

        if (
            !isValidValue(this.desiredAffiliation) ||
            this.desiredAffiliation === SquaddieAffiliation.UNKNOWN
        ) {
            return undefined
        }

        const battleSquaddieIdsOfDesiredAffiliation =
            firstActionTemplateWithTarget.targetingResults.battleSquaddieIdsInRange.filter(
                (battleSquaddieId) => {
                    const { squaddieTemplate: targetSquaddieTemplate } =
                        getResultOrThrowError(
                            ObjectRepositoryService.getSquaddieByBattleId(
                                repository,
                                battleSquaddieId
                            )
                        )
                    return (
                        targetSquaddieTemplate.squaddieId.affiliation ===
                        this.desiredAffiliation
                    )
                }
            )

        if (battleSquaddieIdsOfDesiredAffiliation.length === 0) {
            return undefined
        }

        const battleSquaddieIdToTarget =
            battleSquaddieIdsOfDesiredAffiliation[0]
        const { mapLocation } = MissionMapService.getByBattleSquaddieId(
            missionMap,
            battleSquaddieIdToTarget
        )
        return createDecidedAction(
            firstActionTemplateWithTarget.actionTemplate,
            mapLocation,
            battleSquaddieIdToAct
        )
    }

    private getTargetingResultsOfActionWithTargets({
        missionMap,
        repository,
        squaddieTemplate,
        battleSquaddie,
        actionTemplates,
    }: {
        missionMap: MissionMap
        repository: ObjectRepository
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
        actionTemplates: ActionTemplate[]
    }):
        | {
              actionTemplate: ActionTemplate
              targetingResults: TargetingResults
          }
        | undefined {
        let actionsWithTargets = actionTemplates
            .map((actionTemplate) => {
                const firstActionEffectSquaddieTemplate: ActionEffectSquaddieTemplate =
                    actionTemplate.actionEffectTemplates.find(
                        (actionEffectTemplate) =>
                            actionEffectTemplate.type ===
                            ActionEffectType.SQUADDIE
                    ) as ActionEffectSquaddieTemplate
                if (!isValidValue(firstActionEffectSquaddieTemplate)) {
                    return undefined
                }
                const results: TargetingResults =
                    TargetingResultsService.findValidTargets({
                        map: missionMap,
                        actionEffectSquaddieTemplate:
                            firstActionEffectSquaddieTemplate,
                        actingSquaddieTemplate: squaddieTemplate,
                        actingBattleSquaddie: battleSquaddie,
                        squaddieRepository: repository,
                    })

                if (results.battleSquaddieIdsInRange.length > 0) {
                    return {
                        actionTemplate: actionTemplate,
                        targetingResults: results,
                    }
                }
                return undefined
            })
            .filter((x) => x !== undefined)

        return actionsWithTargets[0]
    }
}

const createDecidedAction = (
    actionTemplate: ActionTemplate,
    mapLocation: HexCoordinate,
    battleSquaddieIdToAct: string
) => {
    const decidedActionSquaddieEffect = DecidedActionSquaddieEffectService.new({
        template: actionTemplate
            .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        target: mapLocation,
    })
    return DecidedActionService.new({
        actionTemplateName: actionTemplate.name,
        actionTemplateId: actionTemplate.id,
        battleSquaddieId: battleSquaddieIdToAct,
        actionEffects: [decidedActionSquaddieEffect],
        actionPointCost: actionTemplate.actionPoints,
    })
}
