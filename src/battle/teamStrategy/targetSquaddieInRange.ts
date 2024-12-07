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
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { ActionEffectTemplate } from "../../action/template/actionEffectTemplate"
import { isValidValue } from "../../utils/validityCheck"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"

export class TargetSquaddieInRange implements TeamStrategyCalculator {
    desiredBattleSquaddieId: string
    desiredAffiliation: SquaddieAffiliation

    constructor(options: TeamStrategyOptions) {
        this.desiredBattleSquaddieId = options.desiredBattleSquaddieId
        this.desiredAffiliation = options.desiredAffiliation
    }

    DetermineNextInstruction({
        team,
        gameEngineState,
    }: {
        team: BattleSquaddieTeam
        gameEngineState: GameEngineState
    }): BattleActionDecisionStep[] {
        if (
            !this.desiredBattleSquaddieId &&
            (!this.desiredAffiliation ||
                this.desiredAffiliation === SquaddieAffiliation.UNKNOWN)
        ) {
            throw new Error("Target Squaddie In Range strategy has no target")
        }

        const previousActionsThisTurn =
            BattleActionRecorderService.peekAtAlreadyAnimatedQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        let battleSquaddieIdToAct =
            TeamStrategyService.getCurrentlyActingSquaddieWhoCanAct({
                team,
                battleSquaddieId:
                    previousActionsThisTurn?.actor.actorBattleSquaddieId,
                objectRepository: gameEngineState.repository,
            })
        if (!isValidValue(battleSquaddieIdToAct)) {
            return undefined
        }
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieIdToAct
            )
        )
        const validActionTemplates = squaddieTemplate.actionTemplateIds
            .map((id) =>
                ObjectRepositoryService.getActionTemplateById(
                    gameEngineState.repository,
                    id
                )
            )
            .filter((actionTemplate) => {
                return (
                    SquaddieTurnService.canPerformAction(
                        battleSquaddie.squaddieTurn,
                        actionTemplate
                    ).canPerform === true
                )
            })

        const firstActionTemplateWithTarget =
            this.getTargetingResultsOfActionWithTargets({
                actionTemplates: validActionTemplates,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository,
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

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            firstActionTemplateWithTarget.actionTemplateId
        )
        if (desiredBattleSquaddieIsInRange) {
            const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                this.desiredBattleSquaddieId
            )
            return createBattleActionDecisionSteps(
                actionTemplate,
                mapCoordinate,
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
                                gameEngineState.repository,
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
        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddieIdToTarget
        )
        return createBattleActionDecisionSteps(
            actionTemplate,
            mapCoordinate,
            battleSquaddieIdToAct
        )
    }

    private getTargetingResultsOfActionWithTargets({
        missionMap,
        objectRepository,
        squaddieTemplate,
        battleSquaddie,
        actionTemplates,
    }: {
        missionMap: MissionMap
        objectRepository: ObjectRepository
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
        actionTemplates: ActionTemplate[]
    }):
        | {
              actionTemplateId: string
              targetingResults: TargetingResults
          }
        | undefined {
        let actionsWithTargets = actionTemplates
            .map((actionTemplate) => {
                const firstActionEffectTemplate: ActionEffectTemplate =
                    actionTemplate.actionEffectTemplates[0]
                if (!isValidValue(firstActionEffectTemplate)) {
                    return undefined
                }
                const results: TargetingResults =
                    TargetingResultsService.findValidTargets({
                        map: missionMap,
                        actionTemplate,
                        actionEffectSquaddieTemplate: firstActionEffectTemplate,
                        actingSquaddieTemplate: squaddieTemplate,
                        actingBattleSquaddie: battleSquaddie,
                        squaddieRepository: objectRepository,
                    })

                if (results.battleSquaddieIdsInRange.length > 0) {
                    return {
                        actionTemplateId: actionTemplate.id,
                        targetingResults: results,
                    }
                }
                return undefined
            })
            .filter((x) => x !== undefined)

        return actionsWithTargets[0]
    }
}

const createBattleActionDecisionSteps = (
    actionTemplate: ActionTemplate,
    mapCoordinate: HexCoordinate,
    battleSquaddieIdToAct: string
): BattleActionDecisionStep[] => {
    const actionStep: BattleActionDecisionStep =
        BattleActionDecisionStepService.new()
    BattleActionDecisionStepService.setActor({
        actionDecisionStep: actionStep,
        battleSquaddieId: battleSquaddieIdToAct,
    })
    BattleActionDecisionStepService.addAction({
        actionDecisionStep: actionStep,
        actionTemplateId: actionTemplate.id,
    })
    BattleActionDecisionStepService.setConfirmedTarget({
        actionDecisionStep: actionStep,
        targetLocation: mapCoordinate,
    })

    return [actionStep]
}
