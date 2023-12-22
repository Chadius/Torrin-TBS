import {TeamStrategyCalculator} from "./teamStrategyCalculator";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {BattleSquaddieTeamHelper} from "../battleSquaddieTeam";
import {TeamStrategyOptions} from "./teamStrategy";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {MissionMap} from "../../missionMap/missionMap";
import {MissionMapSquaddieLocation} from "../../missionMap/squaddieLocation";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";

export class MoveCloserToSquaddie implements TeamStrategyCalculator {
    desiredBattleSquaddieId: string;
    desiredAffiliation: SquaddieAffiliation;

    constructor(options: TeamStrategyOptions) {
        this.desiredBattleSquaddieId = options.desiredBattleSquaddieId;
        this.desiredAffiliation = options.desiredAffiliation;
    }

    DetermineNextInstruction(state: TeamStrategyState, repository: ObjectRepository): SquaddieActionsForThisRound | undefined {
        if (!this.desiredBattleSquaddieId && !this.desiredAffiliation) {
            throw new Error("Move Closer to Squaddie strategy has no target");
        }

        const squaddiesWhoCanAct: string[] = BattleSquaddieTeamHelper.getBattleSquaddiesThatCanAct(state.team, repository);
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        let squaddieToAct = this.getActingSquaddie(state, squaddiesWhoCanAct);

        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(state.squaddieRepository, squaddieToAct));
        const {mapLocation} = state.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie});
        const movementPerActionThisRound = squaddieTemplate.attributes.movement.movementPerAction;

        const searchResults: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [mapLocation],
                squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
                movementPerAction: movementPerActionThisRound,
                canPassOverPits: squaddieTemplate.attributes.movement.crossOverPits,
                canPassThroughWalls: squaddieTemplate.attributes.movement.passThroughWalls,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                canStopOnSquaddies: false,
                ignoreTerrainCost: false,
                numberOfActions: actionPointsRemaining,
            }),
            missionMap: state.missionMap,
            repository: state.squaddieRepository,
        })

        const closestSquaddieInfo = getClosestSquaddieAndLocationToFollow({
            missionMap: state.missionMap,
            searchResult: searchResults,
            desiredBattleSquaddieId: this.desiredBattleSquaddieId,
            desiredAffiliation: this.desiredAffiliation,
            repository: state.squaddieRepository,
            actingSquaddieBattleId: squaddieToAct,
            numberOfActions: actionPointsRemaining,
            movementPerAction: movementPerActionThisRound,
        });

        if (closestSquaddieInfo === undefined) {
            return undefined;
        }

        const {shortestRoute} = closestSquaddieInfo;

        const moveTowardsLocation: SquaddieActionsForThisRound = {
            squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
            battleSquaddieId: squaddieToAct,
            startingLocation: mapLocation,
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.addAction(moveTowardsLocation, {
            type: SquaddieActionType.MOVEMENT,
            data: {
                destination: shortestRoute.destination,
                numberOfActionPointsSpent: shortestRoute.currentNumberOfMoveActions,
            }
        });
        state.setInstruction(moveTowardsLocation);
        return moveTowardsLocation;
    }

    private getActingSquaddie(state: TeamStrategyState, squaddiesWhoCanAct: string[]) {
        let actingSquaddie = state.instruction && state.instruction.battleSquaddieId ? state.instruction.battleSquaddieId : undefined;
        if (actingSquaddie === undefined) {
            actingSquaddie = squaddiesWhoCanAct[0];
        }
        return actingSquaddie;
    }
}

const getClosestSquaddieAndLocationToFollow = ({
                                 missionMap,
                                 searchResult,
                                 desiredBattleSquaddieId,
                                 desiredAffiliation,
                                 repository,
                                 actingSquaddieBattleId,
                                 numberOfActions,
                                 movementPerAction,
                             }: {
    missionMap: MissionMap,
    searchResult: SearchResult,
    repository: ObjectRepository
    actingSquaddieBattleId: string,
    numberOfActions: number,
    movementPerAction: number,
    desiredBattleSquaddieId?: string,
    desiredAffiliation?: SquaddieAffiliation
}): {
    battleSquaddieId: string,
    distance: number,
    location: HexCoordinate,
    shortestRoute: SearchPath,
} => {
    // TODO refactor!
    const desiredBattleSquaddies = ObjectRepositoryHelper.getBattleSquaddieIterator(repository).filter(battleSquaddieIter => {
        if (battleSquaddieIter.battleSquaddieId === actingSquaddieBattleId) {
            return false;
        }

        if (desiredBattleSquaddieId && desiredBattleSquaddieId === battleSquaddieIter.battleSquaddieId) {
            return true;
        }

        const {
            squaddieTemplate,
        } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(repository, battleSquaddieIter.battleSquaddieId));

        return desiredAffiliation && squaddieTemplate.squaddieId.affiliation === desiredAffiliation;
    });

    const actorLocation = missionMap.getSquaddieByBattleId(actingSquaddieBattleId);

    let maximumDistanceToConsider: number = missionMap.terrainTileMap.getDimensions().numberOfRows + missionMap.terrainTileMap.getDimensions().widthOfWidestRow;
    if (movementPerAction > 0 && numberOfActions > 0) {
        maximumDistanceToConsider = movementPerAction * numberOfActions;
    }

    for (let distanceFromActor = 0; distanceFromActor < maximumDistanceToConsider; distanceFromActor++) {
        const closestReachableLocations: HexCoordinate[] = SearchResultsHelper.getClosestRoutesToLocationByDistance(searchResult, actorLocation.mapLocation, distanceFromActor);

        const closestSquaddies = desiredBattleSquaddies.filter(battleSquaddieIter => {
            const location: MissionMapSquaddieLocation = missionMap.getSquaddieByBattleId(battleSquaddieIter.battleSquaddieId);
            return closestReachableLocations.some(closestReachableLocation => closestReachableLocation.q === location.mapLocation.q && closestReachableLocation.r === location.mapLocation.r);
        })

        if (closestSquaddies.length > 0) {
            const candidateToChase = closestSquaddies[Math.floor(Math.random() * closestSquaddies.length)];
            const targetLocationInfo: MissionMapSquaddieLocation = missionMap.getSquaddieByBattleId(candidateToChase.battleSquaddieId);

            // TODO cool found the closest one, now get the closest route
            let maximumDistanceToConsider2: number = missionMap.terrainTileMap.getDimensions().numberOfRows + missionMap.terrainTileMap.getDimensions().widthOfWidestRow;
            if (movementPerAction > 0 && numberOfActions > 0) {
                maximumDistanceToConsider2 = movementPerAction * numberOfActions;
            }

            for (let distanceFromActor2 = 0; distanceFromActor < maximumDistanceToConsider; distanceFromActor++) {
                const closestReachableLocations2: HexCoordinate[] = SearchResultsHelper.getClosestRoutesToLocationByDistance(searchResult, targetLocationInfo.mapLocation, distanceFromActor2);
                const shortestRouteLocations = closestReachableLocations2.map(locationFromCandidate => {
                    const path = SearchResultsHelper.getShortestPathToLocation(searchResult, locationFromCandidate.q, locationFromCandidate.r);
                    if (numberOfActions === undefined || path.currentNumberOfMoveActions < numberOfActions) {
                        return {
                            battleSquaddieId: candidateToChase.battleSquaddieId,
                            distance: distanceFromActor,
                            location: targetLocationInfo.mapLocation,
                            shortestRoute: path,
                        }
                    }
                    return undefined
                }).filter(x => x != undefined);
                if (shortestRouteLocations.length > 0) {
                    return shortestRouteLocations[0];
                }
            }

        }
    }

    return undefined;
}

