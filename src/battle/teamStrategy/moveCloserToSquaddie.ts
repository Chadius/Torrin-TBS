import {TeamStrategy} from "./teamStrategy";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {ReachableSquaddieDescription} from "../../hexMap/pathfinder/reachableSquaddiesResults";
import {HexCoordinate} from "../../hexMap/hexGrid";

// TODO Make a MoveCloser specific state object, I want this strategy to be stateless!
export type MoveCloserToSquaddieOptions = {
    desiredDynamicSquaddieId?: string
}

export class MoveCloserToSquaddie implements TeamStrategy {
    desiredDynamicSquaddieId: string;

    constructor(options: MoveCloserToSquaddieOptions) {
        this.desiredDynamicSquaddieId = options.desiredDynamicSquaddieId;
    }

    DetermineNextInstruction(state: TeamStrategyState): SquaddieInstruction {
        const squaddiesWhoCanAct: string[] = state.getTeam().getDynamicSquaddiesThatCanAct();
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        const squaddieToAct = squaddiesWhoCanAct[0];
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.getSquaddieRepository().getSquaddieByDynamicID(squaddieToAct));

        const pathfinder = new Pathfinder();
        const searchResults: SearchResults =
            pathfinder.findReachableSquaddies(new SearchParams({
                missionMap: state.missionMap,
                squaddieMovement: staticSquaddie.movement,
                numberOfActions: dynamicSquaddie.squaddieTurn.getRemainingActions(),
                startLocation: dynamicSquaddie.mapLocation,
                squaddieAffiliation: staticSquaddie.squaddieId.affiliation,
            }));
        const reachableSquaddiesResults = searchResults.getReachableSquaddies();
        const reachableSquaddieLocations = reachableSquaddiesResults.getClosestSquaddies();

        const [foundSquaddieId, _] = Object.entries(reachableSquaddieLocations).find(([squaddieId, mapLocation]) => {
            const {
                dynamicSquaddieId,
            } = getResultOrThrowError(state.getSquaddieRepository().getSquaddieByStaticIdAndLocation(squaddieId, mapLocation));
            return dynamicSquaddieId === this.desiredDynamicSquaddieId;
        });

        if (foundSquaddieId) {
            const closestCoordinatesByDistance = reachableSquaddiesResults.getCoordinatesCloseToSquaddieByDistance(foundSquaddieId);
            const targetLocation = this.getClosestLocationToSquaddie(closestCoordinatesByDistance);
            const numberOfMoveActions = this.calculateNumberOfMoveActionsRequired(searchResults, targetLocation);

            const moveTowardsLocation: SquaddieInstruction = new SquaddieInstruction({
                staticSquaddieId: staticSquaddie.squaddieId.id,
                dynamicSquaddieId: squaddieToAct,
                startingLocation: dynamicSquaddie.mapLocation,
            });
            moveTowardsLocation.addMovement(new SquaddieMovementActivity({
                numberOfActionsSpent: numberOfMoveActions,
                destination: targetLocation,
            }));
            state.setInstruction(moveTowardsLocation);
            return moveTowardsLocation;
        }

        const endTurnActivity: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: staticSquaddie.squaddieId.id,
            dynamicSquaddieId: squaddieToAct,
            startingLocation: dynamicSquaddie.mapLocation,
        });
        endTurnActivity.endTurn();

        state.setInstruction(endTurnActivity);

        return endTurnActivity;
    }

    private calculateNumberOfMoveActionsRequired(searchResults: SearchResults, targetLocation: HexCoordinate) {
        const reachableTilesByNumberOfMovementActions = searchResults.getReachableTilesByNumberOfMovementActions();
        const [numberOfMoveActionsStr, _] =
            Object.entries(reachableTilesByNumberOfMovementActions)
                .find(([_, destination]) => {
                    return destination.some((mapLocation) =>
                        mapLocation.q === targetLocation.q && mapLocation.r === targetLocation.r
                    )
                });
        return parseInt(numberOfMoveActionsStr);
    }

    private getClosestLocationToSquaddie(closestCoordinatesByDistance: ReachableSquaddieDescription) {
        const closestDistance = this.getClosestDistanceToSquaddie(closestCoordinatesByDistance);
        const targetLocation = closestCoordinatesByDistance.closestCoordinatesByDistance[closestDistance][0];
        return targetLocation;
    }

    private getClosestDistanceToSquaddie(closestCoordinatesByDistance: ReachableSquaddieDescription) {
        const distances: number[] = Object.keys(closestCoordinatesByDistance.closestCoordinatesByDistance).sort((a, b) => {
            if (parseInt(a) < parseInt(b)) {
                return -1;
            }
            if (parseInt(a) > parseInt(b)) {
                return 1;
            }
            return 0;
        }).map(g => parseInt(g));
        const closestDistance = distances.find(d => d > 0);
        return closestDistance;
    }
}
