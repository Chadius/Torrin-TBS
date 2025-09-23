import {
    TeamStrategyBehaviorOverride,
    TeamStrategyCalculator,
    TeamStrategyService,
} from "./teamStrategyCalculator"
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
import { getResultOrThrowError } from "../../utils/resultOrError"
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
import { isValidValue } from "../../utils/objectValidityCheck"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

export class TargetSquaddieInRange implements TeamStrategyCalculator {
    desiredBattleSquaddieId: string | undefined
    desiredAffiliation: TSquaddieAffiliation | undefined

    constructor(options: TeamStrategyOptions) {
        this.desiredBattleSquaddieId = options.desiredBattleSquaddieId
        this.desiredAffiliation = options.desiredAffiliation
    }

    DetermineNextInstruction({
        team,
        gameEngineState,
        behaviorOverrides,
    }: {
        team: BattleSquaddieTeam
        gameEngineState: GameEngineState
        behaviorOverrides: TeamStrategyBehaviorOverride
    }): BattleActionDecisionStep[] {
        if (behaviorOverrides.noActions) {
            return []
        }

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
        if (gameEngineState.repository == undefined) return []
        let battleSquaddieIdToAct =
            TeamStrategyService.getCurrentlyActingSquaddieWhoCanAct({
                team,
                battleSquaddieId:
                    previousActionsThisTurn?.actor.actorBattleSquaddieId,
                objectRepository: gameEngineState.repository,
            })
        if (battleSquaddieIdToAct == undefined) {
            return []
        }
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieIdToAct
            )
        )
        const validActionTemplates = squaddieTemplate.actionTemplateIds
            .map((id) =>
                gameEngineState.repository != undefined
                    ? ObjectRepositoryService.getActionTemplateById(
                          gameEngineState.repository,
                          id
                      )
                    : undefined
            )
            .filter((x) => x != undefined)
            .filter((actionTemplate) => {
                return SquaddieTurnService.canPerformAction({
                    actionTemplate: actionTemplate,
                    battleSquaddie,
                }).canPerform
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
            return []
        }

        const desiredBattleSquaddieIsInRange =
            isValidValue(this.desiredBattleSquaddieId) &&
            this.desiredBattleSquaddieId !== "" &&
            this.desiredBattleSquaddieId != undefined &&
            firstActionTemplateWithTarget.targetingResults.battleSquaddieIds.inRange.has(
                this.desiredBattleSquaddieId!
            )

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            firstActionTemplateWithTarget.actionTemplateId
        )
        if (desiredBattleSquaddieIsInRange && this.desiredBattleSquaddieId) {
            const { currentMapCoordinate } =
                MissionMapService.getByBattleSquaddieId(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                    this.desiredBattleSquaddieId
                )
            if (currentMapCoordinate != undefined) {
                return createBattleActionDecisionSteps(
                    actionTemplate,
                    currentMapCoordinate,
                    battleSquaddieIdToAct
                )
            }
        }

        if (this.desiredAffiliation === SquaddieAffiliation.UNKNOWN) {
            return []
        }

        const battleSquaddieIdsOfDesiredAffiliation =
            firstActionTemplateWithTarget.targetingResults.battleSquaddieIds.inRange
                .values()
                .filter((battleSquaddieId) => {
                    if (gameEngineState.repository == undefined) return false
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
                })
                .toArray()

        if (battleSquaddieIdsOfDesiredAffiliation.length === 0) {
            return []
        }

        const battleSquaddieIdToTarget =
            battleSquaddieIdsOfDesiredAffiliation[0]
        const { currentMapCoordinate } =
            MissionMapService.getByBattleSquaddieId(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                battleSquaddieIdToTarget
            )
        if (currentMapCoordinate == undefined) return []
        return createBattleActionDecisionSteps(
            actionTemplate,
            currentMapCoordinate,
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

                if (results.battleSquaddieIds.inRange.size > 0) {
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
        targetCoordinate: mapCoordinate,
    })

    return [actionStep]
}
