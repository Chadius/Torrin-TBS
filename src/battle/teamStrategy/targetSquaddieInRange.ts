import {TeamStrategy} from "./teamStrategy";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {FindValidTargets, TargetingResults} from "../targeting/targetingService";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieAction} from "../../squaddie/action";
import {SquaddieSquaddieAction} from "../history/squaddieSquaddieAction";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";

export class TargetSquaddieInRange implements TeamStrategy {
    desiredDynamicSquaddieId: string;
    desiredAffiliation: SquaddieAffiliation;

    constructor(options: {
        desiredDynamicSquaddieId?: string;
        desiredAffiliation?: SquaddieAffiliation;
    }) {
        this.desiredDynamicSquaddieId = options.desiredDynamicSquaddieId;
        this.desiredAffiliation = options.desiredAffiliation;
    }

    DetermineNextInstruction(state: TeamStrategyState): SquaddieActionsForThisRound | undefined {
        if (!this.desiredDynamicSquaddieId && !this.desiredAffiliation) {
            throw new Error("Target Squaddie In Range strategy has no target");
        }

        const squaddiesWhoCanAct: string[] = state.team.getDynamicSquaddiesThatCanAct();
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
        let actingSquaddie = state.instruction && state.instruction.dynamicSquaddieId ? state.instruction.dynamicSquaddieId : undefined;
        if (actingSquaddie === undefined) {
            actingSquaddie = squaddiesWhoCanAct[0];
        }
        return actingSquaddie;
    }

    private askSquaddieToSelectNewAction(state: TeamStrategyState, actingSquaddieDynamicId: string): SquaddieActionsForThisRound | undefined {
        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(actingSquaddieDynamicId));

        const validActions = staticSquaddie.action.filter((action) => {
            return dynamicSquaddie.squaddieTurn.canPerformAction(action).canPerform === true;
        });

        const targetingResultsInfo = this.getTargetingResultsOfActionWithTargets({
            actions: validActions,
            dynamicSquaddie,
            state,
            staticSquaddie,
        })

        if (targetingResultsInfo === undefined) {
            return undefined;
        }

        const targetingResults = targetingResultsInfo.targetingResults;
        if (this.desiredDynamicSquaddieId !== "" && targetingResults.dynamicSquaddieIdsInRange.includes(this.desiredDynamicSquaddieId)) {
            const modifiedInstruction = this.createOrModifyStateInstruction({
                state,
                squaddieToTarget: this.desiredDynamicSquaddieId,
                actingSquaddieDynamic: dynamicSquaddie,
                actingSquaddieStatic: staticSquaddie,
                action: targetingResultsInfo.action,
            });
            if (modifiedInstruction !== undefined) {
                return modifiedInstruction;
            }
        }

        if (this.desiredAffiliation !== SquaddieAffiliation.UNKNOWN) {
            const squaddiesOfDesiredAffiliation = targetingResults.dynamicSquaddieIdsInRange.filter((dynamicId) => {
                const {staticSquaddie} = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(dynamicId))
                return staticSquaddie.squaddieId.affiliation === this.desiredAffiliation
            });

            if (squaddiesOfDesiredAffiliation.length === 0) {
                return undefined;
            }

            const modifiedInstruction = this.createOrModifyStateInstruction({
                state,
                squaddieToTarget: squaddiesOfDesiredAffiliation[0],
                actingSquaddieDynamic: dynamicSquaddie,
                actingSquaddieStatic: staticSquaddie,
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
                                                       staticSquaddie,
                                                       dynamicSquaddie,
                                                       actions,
                                                   }: {
        state: TeamStrategyState,
        staticSquaddie: BattleSquaddieStatic,
        dynamicSquaddie: BattleSquaddieDynamic
        actions: SquaddieAction[]
    }): {
        action: SquaddieAction,
        targetingResults: TargetingResults,
    } | undefined {
        let actionsWithTargets = actions.map((action) => {
            const results: TargetingResults = FindValidTargets({
                map: state.missionMap,
                action: action,
                actingStaticSquaddie: staticSquaddie,
                actingDynamicSquaddie: dynamicSquaddie,
                squaddieRepository: state.squaddieRepository,
            });

            if (results.dynamicSquaddieIdsInRange.length > 0) {
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
                                     actingSquaddieStatic,
                                     actingSquaddieDynamic,
                                     actingSquaddieMapLocation,
                                     actingSquaddieAction,
                                     targetLocation,
                                 }: {
        actingSquaddieStatic: BattleSquaddieStatic,
        actingSquaddieDynamic: BattleSquaddieDynamic,
        actingSquaddieMapLocation: HexCoordinate | undefined,
        actingSquaddieAction: SquaddieAction,
        targetLocation: HexCoordinate,
    }) {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            dynamicSquaddieId: actingSquaddieDynamic.dynamicSquaddieId,
            staticSquaddieId: actingSquaddieStatic.staticId,
            startingLocation: actingSquaddieMapLocation,
        });
        return this.addActionToInstruction(instruction, actingSquaddieAction, targetLocation);
    }

    private addActionToInstruction(instruction: SquaddieActionsForThisRound, action: SquaddieAction, targetLocation: HexCoordinate) {
        instruction.addAction(new SquaddieSquaddieAction({
            squaddieAction: action,
            targetLocation: targetLocation,
        }));
        return instruction;
    }

    private createOrModifyStateInstruction({
                                               state,
                                               squaddieToTarget,
                                               actingSquaddieDynamic,
                                               actingSquaddieStatic,
                                               action,
                                           }: {
        state: TeamStrategyState,
        squaddieToTarget: string,
        actingSquaddieDynamic: BattleSquaddieDynamic,
        actingSquaddieStatic: BattleSquaddieStatic
        action: SquaddieAction
    }): SquaddieActionsForThisRound | undefined {
        const targetingSquaddieMapDatum = state.missionMap.getSquaddieByDynamicId(actingSquaddieDynamic.dynamicSquaddieId);
        const desiredSquaddieMapDatum = state.missionMap.getSquaddieByDynamicId(squaddieToTarget);
        if (desiredSquaddieMapDatum.isValid()) {
            if (state.instruction === undefined) {
                const instruction = this.createNewInstruction({
                    actingSquaddieAction: action,
                    actingSquaddieDynamic,
                    actingSquaddieStatic,
                    actingSquaddieMapLocation: targetingSquaddieMapDatum.mapLocation,
                    targetLocation: desiredSquaddieMapDatum.mapLocation,
                })

                if (instruction !== undefined) {
                    state.setInstruction(instruction);
                    return instruction;
                }
            } else {
                state.instruction.addAction(new SquaddieSquaddieAction({
                    targetLocation: desiredSquaddieMapDatum.mapLocation,
                    squaddieAction: action,
                }));
                return state.instruction;
            }
        }
        return undefined;
    }
}
