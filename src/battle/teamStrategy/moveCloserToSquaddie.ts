import {TeamStrategy} from "./teamStrategy";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TargetingShape} from "../targeting/targetingShapeGenerator";

import {GetSquaddieAtMapLocation} from "../orchestratorComponents/orchestratorUtils";
import {GetNumberOfActions} from "../../squaddie/squaddieService";

export type MoveCloserToSquaddieOptions = {
    desiredDynamicSquaddieId?: string;
    desiredAffiliation?: SquaddieAffiliation;
}

export class MoveCloserToSquaddie implements TeamStrategy {
    desiredDynamicSquaddieId: string;
    desiredAffiliation: SquaddieAffiliation;

    constructor(options: MoveCloserToSquaddieOptions) {
        this.desiredDynamicSquaddieId = options.desiredDynamicSquaddieId;
        this.desiredAffiliation = options.desiredAffiliation;
    }

    DetermineNextInstruction(state: TeamStrategyState): SquaddieInstruction | undefined {
        if (!this.desiredDynamicSquaddieId && !this.desiredAffiliation) {
            throw new Error("Move Closer to Squaddie strategy has no target");
        }

        const squaddiesWhoCanAct: string[] = state.getTeam().getDynamicSquaddiesThatCanAct();
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        const squaddieToAct = squaddiesWhoCanAct[0];
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.getSquaddieRepository().getSquaddieByDynamicId(squaddieToAct));
        const {mapLocation} = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie});
        const pathfinder = new Pathfinder();
        const searchResults: SearchResults =
            pathfinder.findReachableSquaddies(new SearchParams({
                missionMap: state.missionMap,
                squaddieMovement: staticSquaddie.movement,
                numberOfActions: normalActionsRemaining,
                startLocation: mapLocation,
                squaddieAffiliation: staticSquaddie.squaddieId.affiliation,
                squaddieRepository: state.getSquaddieRepository(),
                shapeGeneratorType: TargetingShape.Snake,
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
                        missionMap: state.missionMap,
                        squaddieMovement: staticSquaddie.movement,
                        startLocation: mapLocation,
                        canStopOnSquaddies: true,
                        stopLocation: reachableSquaddieLocations[closestSquaddieToMoveTowards],
                        shapeGeneratorType: TargetingShape.Snake,
                        squaddieRepository: state.squaddieRepository,
                    }))
                );

            const currentDistanceFromSquaddie = getResultOrThrowError(routeToTargetSquaddie.getRouteToStopLocation()).getTotalDistance();
            if (closestPotentialDistanceFromSquaddie >= currentDistanceFromSquaddie) {
                return undefined;
            }

            const numberOfMoveActions = searchResults.calculateNumberOfMoveActionsRequired(targetLocation);

            const moveTowardsLocation: SquaddieInstruction = new SquaddieInstruction({
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
}
