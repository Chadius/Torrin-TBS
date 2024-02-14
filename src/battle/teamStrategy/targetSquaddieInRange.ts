import {TeamStrategyCalculator, TeamStrategyService} from "./teamStrategyCalculator";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TODODELTEMETeamStrategyState} from "./TODODELTEMETeamStrategyState";
import {
    TODODELETEMESquaddieActionsForThisRoundService,
    TODODELETEMESquaddieDecisionsDuringThisPhase
} from "../history/TODODELETEMESquaddieDecisionsDuringThisPhase";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {FindValidTargets, TargetingResults, TargetingResultsService} from "../targeting/targetingService";
import {BattleSquaddie} from "../battleSquaddie";
import {TODODELETEMEActionEffectSquaddieTemplate} from "../../decision/TODODELETEMEActionEffectSquaddieTemplate";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
import {SquaddieTurnService} from "../../squaddie/turn";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {TeamStrategyOptions} from "./teamStrategy";
import {DecisionService} from "../../decision/TODODELETEMEdecision";
import {ActionEffectSquaddieService} from "../../decision/TODODELETEMEactionEffectSquaddie";
import {DecidedAction, DecidedActionService} from "../../action/decided/decidedAction";
import {MissionMap, MissionMapService} from "../../missionMap/missionMap";
import {ActionsThisRound} from "../history/actionsThisRound";
import {ActionTemplate} from "../../action/template/actionTemplate";
import {ActionEffectType} from "../../action/template/actionEffectTemplate";
import {ActionEffectSquaddieTemplate} from "../../action/template/actionEffectSquaddieTemplate";
import {isValidValue} from "../../utils/validityCheck";
import {DecidedActionSquaddieEffectService} from "../../action/decided/decidedActionSquaddieEffect";

export class TargetSquaddieInRange implements TeamStrategyCalculator {
    desiredBattleSquaddieId: string;
    desiredAffiliation: SquaddieAffiliation;

    constructor(options: TeamStrategyOptions) {
        this.desiredBattleSquaddieId = options.desiredBattleSquaddieId;
        this.desiredAffiliation = options.desiredAffiliation;
    }

    DetermineNextInstruction({
                                 team,
                                 missionMap,
                                 repository,
                                 actionsThisRound,
                             }: {
        team: BattleSquaddieTeam,
        missionMap: MissionMap,
        repository: ObjectRepository,
        actionsThisRound?: ActionsThisRound,
    }): DecidedAction {
        if (!this.desiredBattleSquaddieId && (!this.desiredAffiliation || this.desiredAffiliation === SquaddieAffiliation.UNKNOWN)) {
            throw new Error("Target Squaddie In Range strategy has no target");
        }

        let battleSquaddieIdToAct = TeamStrategyService.getCurrentlyActingSquaddieWhoCanAct(team, actionsThisRound, repository);
        if (!isValidValue(battleSquaddieIdToAct)) {
            return undefined;
        }
        const {
            battleSquaddie,
            squaddieTemplate
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, battleSquaddieIdToAct));
        const validActionTemplates = squaddieTemplate.actionTemplates.filter((actionTemplate) => {
            return SquaddieTurnService.canPerformAction(battleSquaddie.squaddieTurn, actionTemplate).canPerform === true;
        });

        const firstActionTemplateWithTarget = this.getTargetingResultsOfActionWithTargets({
            actionTemplates: validActionTemplates,
            missionMap,
            repository,
            battleSquaddie,
            squaddieTemplate,
        });

        if (firstActionTemplateWithTarget === undefined) {
            return undefined;
        }

        const desiredBattleSquaddieIsInRange = isValidValue(this.desiredBattleSquaddieId)
            && this.desiredBattleSquaddieId !== ""
            && firstActionTemplateWithTarget.targetingResults.battleSquaddieIdsInRange.includes(this.desiredBattleSquaddieId);

        if (desiredBattleSquaddieIsInRange) {
            const {mapLocation} = MissionMapService.getByBattleSquaddieId(missionMap, this.desiredBattleSquaddieId);
            return createDecidedAction(firstActionTemplateWithTarget.actionTemplate, mapLocation, battleSquaddieIdToAct);
        }

        if (
            !isValidValue(this.desiredAffiliation)
            || this.desiredAffiliation === SquaddieAffiliation.UNKNOWN
        ) {
            return undefined;
        }

        const battleSquaddieIdsOfDesiredAffiliation = firstActionTemplateWithTarget.targetingResults.battleSquaddieIdsInRange.filter((battleSquaddieId) => {
            const {squaddieTemplate: targetSquaddieTemplate} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, battleSquaddieId))
            return targetSquaddieTemplate.squaddieId.affiliation === this.desiredAffiliation;
        });

        if (battleSquaddieIdsOfDesiredAffiliation.length === 0) {
            return undefined;
        }

        const battleSquaddieIdToTarget = battleSquaddieIdsOfDesiredAffiliation[0];
        const {mapLocation} = MissionMapService.getByBattleSquaddieId(missionMap, battleSquaddieIdToTarget);
        return createDecidedAction(firstActionTemplateWithTarget.actionTemplate, mapLocation, battleSquaddieIdToAct);
    }

    private getTargetingResultsOfActionWithTargets({
                                                       missionMap,
                                                       repository,
                                                       squaddieTemplate,
                                                       battleSquaddie,
                                                       actionTemplates,
                                                   }: {
        missionMap: MissionMap,
        repository: ObjectRepository,
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie
        actionTemplates: ActionTemplate[]
    }): {
        actionTemplate: ActionTemplate,
        targetingResults: TargetingResults,
    } | undefined {
        let actionsWithTargets =
            actionTemplates.map((actionTemplate) => {
                const firstActionEffectSquaddieTemplate: ActionEffectSquaddieTemplate = actionTemplate.actionEffectTemplates.find(actionEffectTemplate => actionEffectTemplate.type === ActionEffectType.SQUADDIE) as ActionEffectSquaddieTemplate;
                if (!isValidValue(firstActionEffectSquaddieTemplate)) {
                    return undefined;
                }
                const results: TargetingResults = TargetingResultsService.findValidTargets({
                    map: missionMap,
                    actionEffectSquaddieTemplate: firstActionEffectSquaddieTemplate,
                    actingSquaddieTemplate: squaddieTemplate,
                    actingBattleSquaddie: battleSquaddie,
                    squaddieRepository: repository,
                });

                if (results.battleSquaddieIdsInRange.length > 0) {
                    return {
                        actionTemplate: actionTemplate,
                        targetingResults: results,
                    };
                }
                return undefined;
            }).filter(x => x !== undefined);

        return actionsWithTargets[0];
    }

    TODODELTEMEDetermineNextInstruction(state: TODODELTEMETeamStrategyState, repository: ObjectRepository): DecidedAction | undefined {
        if (!this.desiredBattleSquaddieId && (!this.desiredAffiliation || this.desiredAffiliation === SquaddieAffiliation.UNKNOWN)) {
            throw new Error("Target Squaddie In Range strategy has no target");
        }

        const squaddiesWhoCanAct: string[] = BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(state.team, repository);
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        let actingSquaddie = this.TODODELETEMEgetActingSquaddie(state, squaddiesWhoCanAct);

        const squaddieInstruction = this.TODODELETEMEaskSquaddieToSelectNewAction(state, actingSquaddie);
        if (squaddieInstruction !== undefined) {
            //return squaddieInstruction;
            return undefined; // TODO
        }
        return undefined;
    }

    private TODODELETEMEgetActingSquaddie(state: TODODELTEMETeamStrategyState, squaddiesWhoCanAct: string[]) {
        let actingSquaddie = state.instruction && state.instruction.battleSquaddieId ? state.instruction.battleSquaddieId : undefined;
        if (actingSquaddie === undefined) {
            actingSquaddie = squaddiesWhoCanAct[0];
        }
        return actingSquaddie;
    }

    private TODODELETEMEaskSquaddieToSelectNewAction(state: TODODELTEMETeamStrategyState, actingBattleSquaddieId: string): TODODELETEMESquaddieDecisionsDuringThisPhase | undefined {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, actingBattleSquaddieId));

        const validActions = squaddieTemplate.TODODELETEMEactions.filter((action) => {
            return SquaddieTurnService.TODODELETEMEcanPerformAction(battleSquaddie.squaddieTurn, action).canPerform === true;
        });

        const targetingResultsInfo = this.TODODELETEMEgetTargetingResultsOfActionWithTargets({
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
            const modifiedInstruction = this.TODODELETEMEcreateOrModifyStateInstruction({
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

            const modifiedInstruction = this.TODODELETEMEcreateOrModifyStateInstruction({
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

    private TODODELETEMEgetTargetingResultsOfActionWithTargets({
                                                                   state,
                                                                   squaddieTemplate,
                                                                   battleSquaddie,
                                                                   actions,
                                                               }: {
        state: TODODELTEMETeamStrategyState,
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie
        actions: TODODELETEMEActionEffectSquaddieTemplate[]
    }): {
        action: TODODELETEMEActionEffectSquaddieTemplate,
        targetingResults: TargetingResults,
    } | undefined {
        let actionsWithTargets = actions.map((action) => {
            const results: TargetingResults = FindValidTargets({
                map: state.missionMap,
                TODODELETEMEaction: action,
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
        actingSquaddieAction: TODODELETEMEActionEffectSquaddieTemplate,
        targetLocation: HexCoordinate,
    }) {
        const instruction: TODODELETEMESquaddieDecisionsDuringThisPhase = TODODELETEMESquaddieActionsForThisRoundService.new({
            battleSquaddieId: actingBattleSquaddie.battleSquaddieId,
            squaddieTemplateId: actingSquaddieTemplate.squaddieId.templateId,
            startingLocation: actingSquaddieMapLocation,
        });
        return this.addSquaddieActionTemplateDecisionToInstruction(instruction, actingSquaddieAction, targetLocation)
    }

    private addSquaddieActionTemplateDecisionToInstruction(instruction: TODODELETEMESquaddieDecisionsDuringThisPhase, action: TODODELETEMEActionEffectSquaddieTemplate, targetLocation: HexCoordinate) {
        TODODELETEMESquaddieActionsForThisRoundService.addDecision(instruction,
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

    private TODODELETEMEcreateOrModifyStateInstruction({
                                                           state,
                                                           squaddieToTarget,
                                                           actingBattleSquaddie,
                                                           actingSquaddieTemplate,
                                                           action,
                                                       }: {
        state: TODODELTEMETeamStrategyState,
        squaddieToTarget: string,
        actingBattleSquaddie: BattleSquaddie,
        actingSquaddieTemplate: SquaddieTemplate
        action: TODODELETEMEActionEffectSquaddieTemplate
    }): TODODELETEMESquaddieDecisionsDuringThisPhase | undefined {
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
                TODODELETEMESquaddieActionsForThisRoundService.addDecision(state.instruction,
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

const createDecidedAction = (
    actionTemplate: ActionTemplate,
    mapLocation: HexCoordinate,
    battleSquaddieIdToAct: string
) => {
    const decidedActionSquaddieEffect = DecidedActionSquaddieEffectService.new({
        template: actionTemplate.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
        target: mapLocation,
    });
    return DecidedActionService.new({
        actionTemplateName: actionTemplate.name,
        actionTemplateId: actionTemplate.id,
        battleSquaddieId: battleSquaddieIdToAct,
        actionEffects: [decidedActionSquaddieEffect],
        actionPointCost: actionTemplate.actionPoints,
    });
};
