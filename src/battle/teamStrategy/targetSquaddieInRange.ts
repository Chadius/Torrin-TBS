import {TeamStrategy} from "./teamStrategy";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {FindValidTargets, TargetingResults} from "../targeting/targetingService";
import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieAction} from "../../squaddie/action";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";

export class TargetSquaddieInRange implements TeamStrategy {
    desiredBattleSquaddieId: string;
    desiredAffiliation: SquaddieAffiliation;

    constructor(options: {
        desiredBattleSquaddieId?: string;
        desiredAffiliation?: SquaddieAffiliation;
    }) {
        this.desiredBattleSquaddieId = options.desiredBattleSquaddieId;
        this.desiredAffiliation = options.desiredAffiliation;
    }

    DetermineNextInstruction(state: TeamStrategyState): SquaddieActionsForThisRound | undefined {
        if (!this.desiredBattleSquaddieId && !this.desiredAffiliation) {
            throw new Error("Target Squaddie In Range strategy has no target");
        }

        const squaddiesWhoCanAct: string[] = state.team.getBattleSquaddiesThatCanAct();
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

    private askSquaddieToSelectNewAction(state: TeamStrategyState, actingBattleSquaddieId: string): SquaddieActionsForThisRound | undefined {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(actingBattleSquaddieId));

        const validActions = squaddieTemplate.action.filter((action) => {
            return battleSquaddie.squaddieTurn.canPerformAction(action).canPerform === true;
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
                const {squaddieTemplate} = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(battleId))
                return squaddieTemplate.squaddieId.affiliation === this.desiredAffiliation
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
        actions: SquaddieAction[]
    }): {
        action: SquaddieAction,
        targetingResults: TargetingResults,
    } | undefined {
        let actionsWithTargets = actions.map((action) => {
            const results: TargetingResults = FindValidTargets({
                map: state.missionMap,
                action: action,
                actingSquaddieTemplate: squaddieTemplate,
                actingBattleSquaddie: battleSquaddie,
                squaddieRepository: state.squaddieRepository,
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
        actingSquaddieAction: SquaddieAction,
        targetLocation: HexCoordinate,
    }) {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            battleSquaddieId: actingBattleSquaddie.battleSquaddieId,
            squaddieTemplateId: actingSquaddieTemplate.templateId,
            startingLocation: actingSquaddieMapLocation,
            actions: [],
        });
        return this.addActionToInstruction(instruction, actingSquaddieAction, targetLocation);
    }

    private addActionToInstruction(instruction: SquaddieActionsForThisRound, action: SquaddieAction, targetLocation: HexCoordinate) {
        instruction.addAction({
            type: SquaddieActionType.SQUADDIE,
            data: {
                squaddieAction: action,
                targetLocation: targetLocation,
            }
        });
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
        action: SquaddieAction
    }): SquaddieActionsForThisRound | undefined {
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
                state.instruction.addAction({
                    type: SquaddieActionType.SQUADDIE,
                    data: {
                        squaddieAction: action,
                        targetLocation: desiredSquaddieMapDatum.mapLocation,
                    }
                });
                return state.instruction;
            }
        }
        return undefined;
    }
}
