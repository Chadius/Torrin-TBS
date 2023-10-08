import {TeamStrategy} from "./teamStrategy";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {SearchMovement, SearchParams, SearchSetup, SearchStopCondition} from "../../hexMap/pathfinder/searchParams";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieMovementAction} from "../history/squaddieMovementAction";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";

import {GetSquaddieAtMapLocation} from "../orchestratorComponents/orchestratorUtils";
import {GetNumberOfActionPoints} from "../../squaddie/squaddieService";

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

    DetermineNextInstruction(state: TeamStrategyState): SquaddieActionsForThisRound | undefined {
        if (!this.desiredDynamicSquaddieId && !this.desiredAffiliation) {
            throw new Error("Move Closer to Squaddie strategy has no target");
        }

        const squaddiesWhoCanAct: string[] = state.team.getDynamicSquaddiesThatCanAct();
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        let squaddieToAct = this.getActingSquaddie(state, squaddiesWhoCanAct);

        const {
            squaddietemplate,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(squaddieToAct));
        const {mapLocation} = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        const {actionPointsRemaining} = GetNumberOfActionPoints({squaddietemplate, dynamicSquaddie});
        const pathfinder = new Pathfinder();
        const searchResults: SearchResults =
            pathfinder.findReachableSquaddies(new SearchParams({
                setup: new SearchSetup({

                    missionMap: state.missionMap,
                    squaddieRepository: state.squaddieRepository,
                    startLocation: mapLocation,
                    affiliation: squaddietemplate.squaddieId.affiliation,
                }),
                movement: new SearchMovement({
                    movementPerAction: squaddietemplate.movement.movementPerAction,
                    crossOverPits: squaddietemplate.movement.crossOverPits,
                    passThroughWalls: squaddietemplate.movement.passThroughWalls,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                }),
                stopCondition: new SearchStopCondition({
                    numberOfActionPoints: actionPointsRemaining,
                }),
            }));
        const reachableSquaddiesResults = searchResults.getReachableSquaddies();
        const reachableSquaddieLocations = reachableSquaddiesResults.getClosestSquaddies();

        const foundInfo = Object.entries(reachableSquaddieLocations).filter(([squaddieId, mapLocation]) => {
            const {
                squaddietemplate,
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
                return squaddietemplate.squaddieId.affiliation === this.desiredAffiliation;
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
                            movementPerAction: squaddietemplate.movement.movementPerAction,
                            passThroughWalls: squaddietemplate.movement.passThroughWalls,
                            crossOverPits: squaddietemplate.movement.crossOverPits,
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

            const moveTowardsLocation: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
                squaddietemplateId: squaddietemplate.squaddieId.staticId,
                dynamicSquaddieId: squaddieToAct,
                startingLocation: mapLocation,
            });
            moveTowardsLocation.addAction(new SquaddieMovementAction({
                numberOfActionPointsSpent: numberOfMoveActions,
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
