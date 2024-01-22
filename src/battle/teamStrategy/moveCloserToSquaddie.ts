import {TeamStrategyCalculator} from "./teamStrategyCalculator";
import {TeamStrategyState} from "./teamStrategyState";
import {
    SquaddieActionsForThisRoundService,
    SquaddieDecisionsDuringThisPhase
} from "../history/squaddieDecisionsDuringThisPhase";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {TeamStrategyOptions} from "./teamStrategy";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {MissionMap} from "../../missionMap/missionMap";
import {MissionMapSquaddieLocation} from "../../missionMap/squaddieLocation";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {BattleSquaddie} from "../battleSquaddie";
import {DecisionService} from "../../decision/decision";
import {ActionEffectMovementService} from "../../decision/actionEffectMovement";

export class MoveCloserToSquaddie implements TeamStrategyCalculator {
    desiredBattleSquaddieId: string;
    desiredAffiliation: SquaddieAffiliation;

    constructor(options: TeamStrategyOptions) {
        this.desiredBattleSquaddieId = options.desiredBattleSquaddieId;
        this.desiredAffiliation = options.desiredAffiliation;
    }

    DetermineNextInstruction(state: TeamStrategyState, repository: ObjectRepository): SquaddieDecisionsDuringThisPhase | undefined {
        if (!this.desiredBattleSquaddieId && !this.desiredAffiliation) {
            throw new Error("Move Closer to Squaddie strategy has no target");
        }

        const squaddiesWhoCanAct: string[] = BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(state.team, repository);
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        let squaddieToAct = this.getActingSquaddie(state, squaddiesWhoCanAct);

        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, squaddieToAct));
        const {mapLocation} = state.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie});
        const movementPerActionThisRound = squaddieTemplate.attributes.movement.movementPerAction;

        const routesToAllSquaddies: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [mapLocation],
                squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
                movementPerAction: movementPerActionThisRound,
                canPassOverPits: squaddieTemplate.attributes.movement.crossOverPits,
                canPassThroughWalls: squaddieTemplate.attributes.movement.passThroughWalls,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                canStopOnSquaddies: true,
                ignoreTerrainCost: false,
                numberOfActions: actionPointsRemaining,
            }),
            missionMap: state.missionMap,
            repository: state.repository,
        })

        const closestSquaddieInfo = getClosestSquaddieAndLocationToFollow({
            missionMap: state.missionMap,
            routesToAllSquaddies: routesToAllSquaddies,
            desiredBattleSquaddieId: this.desiredBattleSquaddieId,
            desiredAffiliation: this.desiredAffiliation,
            repository: state.repository,
            actingSquaddieBattleId: squaddieToAct,
            numberOfActions: actionPointsRemaining,
            movementPerAction: movementPerActionThisRound,
        });

        if (closestSquaddieInfo === undefined) {
            return undefined;
        }

        const {shortestRoute, distance} = closestSquaddieInfo;
        if (distance < 2) {
            return undefined;
        }

        const moveTowardsLocation: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
            battleSquaddieId: squaddieToAct,
            startingLocation: mapLocation,
            decisions: [
                DecisionService.new({
                    actionEffects: [
                        ActionEffectMovementService.new({
                            destination: shortestRoute.destination,
                            numberOfActionPointsSpent: shortestRoute.currentNumberOfMoveActions,
                        })
                    ]
                })
            ]
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
                                                   routesToAllSquaddies,
                                                   desiredBattleSquaddieId,
                                                   desiredAffiliation,
                                                   repository,
                                                   actingSquaddieBattleId,
                                                   numberOfActions,
                                                   movementPerAction,
                                               }: {
    missionMap: MissionMap,
    routesToAllSquaddies: SearchResult,
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
    const desiredBattleSquaddies = selectDesiredBattleSquaddies(repository, actingSquaddieBattleId, desiredBattleSquaddieId, desiredAffiliation);

    const {mapLocation: actorLocation} = missionMap.getSquaddieByBattleId(actingSquaddieBattleId);
    const {squaddieTemplate: actorSquaddieTemplate} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, actingSquaddieBattleId));
    const maximumDistanceToConsider: number = (movementPerAction > 0 && numberOfActions > 0)
        ? movementPerAction * numberOfActions
        : missionMap.terrainTileMap.getDimensions().numberOfRows + missionMap.terrainTileMap.getDimensions().widthOfWidestRow;

    function getShortestRoutesThatLeadToSquaddie(closestReachableLocationsFromTheCandidate: HexCoordinate[], candidateToChase: {
        battleSquaddieId: string;
        battleSquaddie: BattleSquaddie
    }, distanceFromActor: number, candidateLocation: HexCoordinate): {
        battleSquaddieId: string,
        distance: number,
        location: HexCoordinate,
        shortestRoute: SearchPath,
    }[] {
        const routesThatEndCloseToCandidate: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [actorLocation],
                squaddieAffiliation: actorSquaddieTemplate.squaddieId.affiliation,
                movementPerAction: movementPerAction,
                canPassOverPits: actorSquaddieTemplate.attributes.movement.crossOverPits,
                canPassThroughWalls: actorSquaddieTemplate.attributes.movement.passThroughWalls,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                canStopOnSquaddies: false,
                numberOfActions: numberOfActions,
                stopLocations: closestReachableLocationsFromTheCandidate,
            }),
            missionMap,
            repository,
        });

        return routesThatEndCloseToCandidate.stopLocationsReached.map(locationFromCandidate => {
            const path = SearchResultsHelper.getShortestPathToLocation(routesThatEndCloseToCandidate, locationFromCandidate.q, locationFromCandidate.r);
            if (numberOfActions === undefined || path.currentNumberOfMoveActions < numberOfActions) {
                return {
                    battleSquaddieId: candidateToChase.battleSquaddieId,
                    distance: distanceFromActor,
                    location: candidateLocation,
                    shortestRoute: path,
                }
            }
            return undefined;
        }).filter(x => x != undefined);
    }

    for (let distanceFromActor = 0; distanceFromActor < maximumDistanceToConsider; distanceFromActor++) {
        const closestReachableLocationsFromTheActor: HexCoordinate[] = SearchResultsHelper.getClosestRoutesToLocationByDistance(routesToAllSquaddies, actorLocation, distanceFromActor);
        const closestSquaddies = getClosestSquaddiesToActor(desiredBattleSquaddies, missionMap, closestReachableLocationsFromTheActor);
        if (closestSquaddies.length < 1) {
            continue;
        }

        const candidateToChase = closestSquaddies[Math.floor(Math.random() * closestSquaddies.length)];
        const {mapLocation: candidateLocation}: MissionMapSquaddieLocation = missionMap.getSquaddieByBattleId(candidateToChase.battleSquaddieId);

        for (let distanceFromCandidate = 0; distanceFromCandidate < maximumDistanceToConsider; distanceFromCandidate++) {
            const closestReachableLocationsFromTheCandidate: HexCoordinate[] = SearchResultsHelper.getClosestRoutesToLocationByDistance(routesToAllSquaddies, candidateLocation, distanceFromCandidate);
            const shortestRoutesThatLeadToSquaddieAndInfo = getShortestRoutesThatLeadToSquaddie(closestReachableLocationsFromTheCandidate, candidateToChase, distanceFromActor, candidateLocation);
            if (shortestRoutesThatLeadToSquaddieAndInfo.length > 0) {
                return shortestRoutesThatLeadToSquaddieAndInfo.find(route => route.shortestRoute.currentNumberOfMoveActions !== 0)
            }
        }
    }

    return undefined;
}

function selectDesiredBattleSquaddies(repository: ObjectRepository, actingSquaddieBattleId: string, desiredBattleSquaddieId: string, desiredAffiliation: SquaddieAffiliation) {
    return ObjectRepositoryService.getBattleSquaddieIterator(repository).filter(battleSquaddieIter => {
        if (battleSquaddieIter.battleSquaddieId === actingSquaddieBattleId) {
            return false;
        }

        if (desiredBattleSquaddieId && desiredBattleSquaddieId === battleSquaddieIter.battleSquaddieId) {
            return true;
        }

        const {
            squaddieTemplate,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, battleSquaddieIter.battleSquaddieId));

        return desiredAffiliation && squaddieTemplate.squaddieId.affiliation === desiredAffiliation;
    });
}

function getClosestSquaddiesToActor(desiredBattleSquaddies: {
    battleSquaddieId: string;
    battleSquaddie: BattleSquaddie
}[], missionMap: MissionMap, closestReachableLocations: HexCoordinate[]) {
    return desiredBattleSquaddies.filter(battleSquaddieIter => {
        const {mapLocation: location} = missionMap.getSquaddieByBattleId(battleSquaddieIter.battleSquaddieId);
        if (location === undefined) {
            return false;
        }
        return closestReachableLocations.some(closestReachableLocation => closestReachableLocation.q === location.q && closestReachableLocation.r === location.r);
    });
}
