import {TeamStrategy} from "./teamStrategy";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActivitiesForThisRound} from "../history/squaddieActivitiesForThisRound";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {SearchMovement, SearchParams, SearchSetup, SearchStopCondition} from "../../hexMap/pathfinder/searchParams";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";

import {GetSquaddieAtMapLocation} from "../orchestratorComponents/orchestratorUtils";
import {GetNumberOfActions} from "../../squaddie/squaddieService";

export class MoveCloserToSquaddie implements TeamStrategy {
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
            throw new Error("Move Closer to Squaddie strategy has no target");
        }

        const squaddiesWhoCanAct: string[] = state.team.getDynamicSquaddiesThatCanAct();
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        let squaddieToAct = this.getActingSquaddie(state, squaddiesWhoCanAct);

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(squaddieToAct));
        const {mapLocation} = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie});
        const pathfinder = new Pathfinder();
        const searchResults: SearchResults =
            pathfinder.findReachableSquaddies(new SearchParams({
                setup: new SearchSetup({

                    missionMap: state.missionMap,
                    squaddieRepository: state.squaddieRepository,
                    startLocation: mapLocation,
                    affiliation: staticSquaddie.squaddieId.affiliation,
                }),
                movement: new SearchMovement({
                    movementPerAction: staticSquaddie.movement.movementPerAction,
                    crossOverPits: staticSquaddie.movement.crossOverPits,
                    passThroughWalls: staticSquaddie.movement.passThroughWalls,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                }),
                stopCondition: new SearchStopCondition({
                    numberOfActions: normalActionsRemaining,
                }),
            }));
        const reachableSquaddiesResults = searchResults.getReachableSquaddies();
        const reachableSquaddieLocations = reachableSquaddiesResults.getClosestSquaddies();

        const foundInfo = Object.entries(reachableSquaddieLocations).filter(([squaddieId, mapLocation]) => {
            const {
                staticSquaddie,
                dynamicSquaddie,
            } = GetSquaddieAtMapLocation({
                mapLocation,
                map: state.missionMap,
                squaddieRepository: state.squaddieRepository,
            });

            if (this.desiredDynamicSquaddieId) {
                return dynamicSquaddie.dynamicSquaddieId === this.desiredDynamicSquaddieId;
            }
            if (this.desiredAffiliation) {
                return staticSquaddie.squaddieId.affiliation === this.desiredAffiliation;
            }
            return false;
        });

        if (foundInfo.length === 0) {
            return undefined;
        }

        let closestSquaddieInfo = reachableSquaddiesResults.getClosestSquaddieAndClosestDistance(
            foundInfo.map(([squaddieId, _]) =>
                squaddieId
            )
        );

        if (closestSquaddieInfo) {
            const {
                squaddieId: closestSquaddieToMoveTowards,
                distance: closestPotentialDistanceFromSquaddie
            } = closestSquaddieInfo;

            const closestCoordinatesByDistance = reachableSquaddiesResults.getCoordinatesCloseToSquaddieByDistance(closestSquaddieToMoveTowards);
            const targetLocation = closestCoordinatesByDistance.getClosestAdjacentLocationToSquaddie(1);
            if (targetLocation === undefined) {
                return undefined;
            }

            const routeToTargetSquaddie: SearchResults =
                getResultOrThrowError(pathfinder.findPathToStopLocation(new SearchParams({
                        setup: new SearchSetup({

                            missionMap: state.missionMap,
                            startLocation: mapLocation,
                            squaddieRepository: state.squaddieRepository,
                        }),
                        movement: new SearchMovement({
                            movementPerAction: staticSquaddie.movement.movementPerAction,
                            passThroughWalls: staticSquaddie.movement.passThroughWalls,
                            crossOverPits: staticSquaddie.movement.crossOverPits,
                            canStopOnSquaddies: true,

                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                        }),
                        stopCondition: new SearchStopCondition({
                            stopLocation: reachableSquaddieLocations[closestSquaddieToMoveTowards],
                        })
                    }))
                );

            const currentDistanceFromSquaddie = getResultOrThrowError(routeToTargetSquaddie.getRouteToStopLocation()).getTotalDistance();
            if (closestPotentialDistanceFromSquaddie >= currentDistanceFromSquaddie) {
                return undefined;
            }

            const numberOfMoveActions = searchResults.calculateNumberOfMoveActionsRequired(targetLocation);

            const moveTowardsLocation: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
                staticSquaddieId: staticSquaddie.squaddieId.staticId,
                dynamicSquaddieId: squaddieToAct,
                startingLocation: mapLocation,
            });
            moveTowardsLocation.addActivity(new SquaddieMovementActivity({
                numberOfActionsSpent: numberOfMoveActions,
                destination: targetLocation,
            }));
            state.setInstruction(moveTowardsLocation);
            return moveTowardsLocation;
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
}
