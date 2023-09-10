import {TeamStrategy} from "./teamStrategy";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActivitiesForThisRound} from "../history/squaddieActivitiesForThisRound";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {findValidTargets, TargetingResults} from "../targeting/targetingService";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieActivity} from "../../squaddie/activity";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
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

    DetermineNextInstruction(state: TeamStrategyState): SquaddieActivitiesForThisRound | undefined {
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

    private askSquaddieToSelectNewAction(state: TeamStrategyState, actingSquaddieDynamicId: string): SquaddieActivitiesForThisRound | undefined {
        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(actingSquaddieDynamicId));

        const validActivities = staticSquaddie.activities.filter((activity) => {
            return dynamicSquaddie.squaddieTurn.canPerformActivity(activity).canPerform === true;
        });

        const targetingResultsInfo = this.getTargetingResultsOfActivityWithTargets({
            activities: validActivities,
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
                activity: targetingResultsInfo.activity,
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
                activity: targetingResultsInfo.activity,
            });
            if (modifiedInstruction !== undefined) {
                return modifiedInstruction;
            }
        }

        return undefined;
    }

    private getTargetingResultsOfActivityWithTargets({
                                                         state,
                                                         staticSquaddie,
                                                         dynamicSquaddie,
                                                         activities,
                                                     }: {
        state: TeamStrategyState,
        staticSquaddie: BattleSquaddieStatic,
        dynamicSquaddie: BattleSquaddieDynamic
        activities: SquaddieActivity[]
    }): {
        activity: SquaddieActivity,
        targetingResults: TargetingResults,
    } | undefined {
        let activitiesWithTargets = activities.map((activity) => {
            const results: TargetingResults = findValidTargets({
                map: state.missionMap,
                activity: activity,
                actingStaticSquaddie: staticSquaddie,
                actingDynamicSquaddie: dynamicSquaddie,
                squaddieRepository: state.squaddieRepository,
            });

            if (results.dynamicSquaddieIdsInRange.length > 0) {
                return {
                    activity,
                    targetingResults: results,
                };
            }
            return undefined;
        }).filter(x => x !== undefined);

        return activitiesWithTargets[0];
    }

    private createNewInstruction({
                                     actingSquaddieStatic,
                                     actingSquaddieDynamic,
                                     actingSquaddieMapLocation,
                                     actingSquaddieActivity,
                                     targetLocation,
                                 }: {
        actingSquaddieStatic: BattleSquaddieStatic,
        actingSquaddieDynamic: BattleSquaddieDynamic,
        actingSquaddieMapLocation: HexCoordinate | undefined,
        actingSquaddieActivity: SquaddieActivity,
        targetLocation: HexCoordinate,
    }) {
        const instruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            dynamicSquaddieId: actingSquaddieDynamic.dynamicSquaddieId,
            staticSquaddieId: actingSquaddieStatic.staticId,
            startingLocation: actingSquaddieMapLocation,
        });
        return this.addActivityToInstruction(instruction, actingSquaddieActivity, targetLocation);
    }

    private addActivityToInstruction(instruction: SquaddieActivitiesForThisRound, activity: SquaddieActivity, targetLocation: HexCoordinate) {
        instruction.addActivity(new SquaddieSquaddieActivity({
            squaddieActivity: activity,
            targetLocation: targetLocation,
        }));
        return instruction;
    }

    private createOrModifyStateInstruction({
                                               state,
                                               squaddieToTarget,
                                               actingSquaddieDynamic,
                                               actingSquaddieStatic,
                                               activity,
                                           }: {
        state: TeamStrategyState,
        squaddieToTarget: string,
        actingSquaddieDynamic: BattleSquaddieDynamic,
        actingSquaddieStatic: BattleSquaddieStatic
        activity: SquaddieActivity
    }): SquaddieActivitiesForThisRound | undefined {
        const targetingSquaddieMapDatum = state.missionMap.getSquaddieByDynamicId(actingSquaddieDynamic.dynamicSquaddieId);
        const desiredSquaddieMapDatum = state.missionMap.getSquaddieByDynamicId(squaddieToTarget);
        if (desiredSquaddieMapDatum.isValid()) {
            if (state.instruction === undefined) {
                const instruction = this.createNewInstruction({
                    actingSquaddieActivity: activity,
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
                state.instruction.addActivity(new SquaddieSquaddieActivity({
                    targetLocation: desiredSquaddieMapDatum.mapLocation,
                    squaddieActivity: activity,
                }));
                return state.instruction;
            }
        }
        return undefined;
    }
}
