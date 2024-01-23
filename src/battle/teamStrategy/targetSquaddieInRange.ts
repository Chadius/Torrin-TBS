import {TeamStrategyCalculator} from "./teamStrategyCalculator";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TeamStrategyState} from "./teamStrategyState";
import {
    SquaddieActionsForThisRoundService,
    SquaddieDecisionsDuringThisPhase
} from "../history/squaddieDecisionsDuringThisPhase";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {FindValidTargets, TargetingResults} from "../targeting/targetingService";
import {BattleSquaddie} from "../battleSquaddie";
import {ActionEffectSquaddieTemplate} from "../../decision/actionEffectSquaddieTemplate";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
import {SquaddieTurnService} from "../../squaddie/turn";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {TeamStrategyOptions} from "./teamStrategy";
import {DecisionService} from "../../decision/decision";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";

export class TargetSquaddieInRange implements TeamStrategyCalculator {
    desiredBattleSquaddieId: string;
    desiredAffiliation: SquaddieAffiliation;

    constructor(options: TeamStrategyOptions) {
        this.desiredBattleSquaddieId = options.desiredBattleSquaddieId;
        this.desiredAffiliation = options.desiredAffiliation;
    }

    DetermineNextInstruction(state: TeamStrategyState, repository: ObjectRepository): SquaddieDecisionsDuringThisPhase | undefined {
        if (!this.desiredBattleSquaddieId && (!this.desiredAffiliation || this.desiredAffiliation === SquaddieAffiliation.UNKNOWN)) {
            throw new Error("Target Squaddie In Range strategy has no target");
        }

        const squaddiesWhoCanAct: string[] = BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(state.team, repository);
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        let actingSquaddie = this.getActingSquaddie(state, squaddiesWhoCanAct);

        const squaddieInstruction = this.askSquaddieToSelectNewAction(state, actingSquaddie);
        if (squaddieInstruction !== undefined) {
            return squaddieInstruction;
        }

        return undefined;
    }

    private getActingSquaddie(state: TeamStrategyState, squaddiesWhoCanAct: string[]) {
        let actingSquaddie = state.instruction && state.instruction.battleSquaddieId ? state.instruction.battleSquaddieId : undefined;
        if (actingSquaddie === undefined) {
            actingSquaddie = squaddiesWhoCanAct[0];
        }
        return actingSquaddie;
    }

    private askSquaddieToSelectNewAction(state: TeamStrategyState, actingBattleSquaddieId: string): SquaddieDecisionsDuringThisPhase | undefined {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, actingBattleSquaddieId));

        const validActions = squaddieTemplate.actions.filter((action) => {
            return SquaddieTurnService.canPerformAction(battleSquaddie.squaddieTurn, action).canPerform === true;
        });

        const targetingResultsInfo = this.getTargetingResultsOfActionWithTargets({
            actions: validActions,
            battleSquaddie,
            state,
            squaddieTemplate,
        })

        if (targetingResultsInfo === undefined) {
            return undefined;
        }

        const targetingResults = targetingResultsInfo.targetingResults;
        if (this.desiredBattleSquaddieId !== "" && targetingResults.battleSquaddieIdsInRange.includes(this.desiredBattleSquaddieId)) {
            const modifiedInstruction = this.createOrModifyStateInstruction({
                state,
                squaddieToTarget: this.desiredBattleSquaddieId,
                actingBattleSquaddie: battleSquaddie,
                actingSquaddieTemplate: squaddieTemplate,
                action: targetingResultsInfo.action,
            });
            if (modifiedInstruction !== undefined) {
                return modifiedInstruction;
            }
        }

        if (this.desiredAffiliation !== SquaddieAffiliation.UNKNOWN) {
            const squaddiesOfDesiredAffiliation = targetingResults.battleSquaddieIdsInRange.filter((battleId) => {
                const {squaddieTemplate: targetSquaddieTemplate} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, battleId))
                return targetSquaddieTemplate.squaddieId.affiliation === this.desiredAffiliation;
            });

            if (squaddiesOfDesiredAffiliation.length === 0) {
                return undefined;
            }

            const modifiedInstruction = this.createOrModifyStateInstruction({
                state,
                squaddieToTarget: squaddiesOfDesiredAffiliation[0],
                actingBattleSquaddie: battleSquaddie,
                actingSquaddieTemplate: squaddieTemplate,
                action: targetingResultsInfo.action,
            });
            if (modifiedInstruction !== undefined) {
                return modifiedInstruction;
            }
        }

        return undefined;
    }

    private getTargetingResultsOfActionWithTargets({
                                                       state,
                                                       squaddieTemplate,
                                                       battleSquaddie,
                                                       actions,
                                                   }: {
        state: TeamStrategyState,
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie
        actions: ActionEffectSquaddieTemplate[]
    }): {
        action: ActionEffectSquaddieTemplate,
        targetingResults: TargetingResults,
    } | undefined {
        let actionsWithTargets = actions.map((action) => {
            const results: TargetingResults = FindValidTargets({
                map: state.missionMap,
                action: action,
                actingSquaddieTemplate: squaddieTemplate,
                actingBattleSquaddie: battleSquaddie,
                squaddieRepository: state.repository,
            });

            if (results.battleSquaddieIdsInRange.length > 0) {
                return {
                    action: action,
                    targetingResults: results,
                };
            }
            return undefined;
        }).filter(x => x !== undefined);

        return actionsWithTargets[0];
    }

    private createNewInstruction({
                                     actingSquaddieTemplate,
                                     actingBattleSquaddie,
                                     actingSquaddieMapLocation,
                                     actingSquaddieAction,
                                     targetLocation,
                                 }: {
        actingSquaddieTemplate: SquaddieTemplate,
        actingBattleSquaddie: BattleSquaddie,
        actingSquaddieMapLocation: HexCoordinate | undefined,
        actingSquaddieAction: ActionEffectSquaddieTemplate,
        targetLocation: HexCoordinate,
    }) {
        const instruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            battleSquaddieId: actingBattleSquaddie.battleSquaddieId,
            squaddieTemplateId: actingSquaddieTemplate.squaddieId.templateId,
            startingLocation: actingSquaddieMapLocation,
        });
        return this.addSquaddieActionTemplateDecisionToInstruction(instruction, actingSquaddieAction, targetLocation)
    }

    private addSquaddieActionTemplateDecisionToInstruction(instruction: SquaddieDecisionsDuringThisPhase, action: ActionEffectSquaddieTemplate, targetLocation: HexCoordinate) {
        SquaddieActionsForThisRoundService.addDecision(instruction,
            DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: action,
                        targetLocation: targetLocation,
                        numberOfActionPointsSpent: 1,
                    })
                ]
            })
        );

        return instruction;
    }

    private createOrModifyStateInstruction({
                                               state,
                                               squaddieToTarget,
                                               actingBattleSquaddie,
                                               actingSquaddieTemplate,
                                               action,
                                           }: {
        state: TeamStrategyState,
        squaddieToTarget: string,
        actingBattleSquaddie: BattleSquaddie,
        actingSquaddieTemplate: SquaddieTemplate
        action: ActionEffectSquaddieTemplate
    }): SquaddieDecisionsDuringThisPhase | undefined {
        const targetingSquaddieMapDatum = state.missionMap.getSquaddieByBattleId(actingBattleSquaddie.battleSquaddieId);
        const desiredSquaddieMapDatum = state.missionMap.getSquaddieByBattleId(squaddieToTarget);
        if (MissionMapSquaddieLocationHandler.isValid(desiredSquaddieMapDatum)) {
            if (state.instruction === undefined) {
                const instruction = this.createNewInstruction({
                    actingSquaddieAction: action,
                    actingBattleSquaddie: actingBattleSquaddie,
                    actingSquaddieTemplate: actingSquaddieTemplate,
                    actingSquaddieMapLocation: targetingSquaddieMapDatum.mapLocation,
                    targetLocation: desiredSquaddieMapDatum.mapLocation,
                })

                if (instruction !== undefined) {
                    state.setInstruction(instruction);
                    return instruction;
                }
            } else {
                SquaddieActionsForThisRoundService.addDecision(state.instruction,
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                template: action,
                                targetLocation: desiredSquaddieMapDatum.mapLocation,
                                numberOfActionPointsSpent: 1,
                            })
                        ]
                    })
                );

                return state.instruction;
            }
        }
        return undefined;
    }
}
