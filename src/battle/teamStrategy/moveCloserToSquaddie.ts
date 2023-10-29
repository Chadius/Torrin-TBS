import {TeamStrategy} from "./teamStrategy";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {SearchMovement, SearchParams, SearchSetup, SearchStopCondition} from "../../hexMap/pathfinder/searchParams";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";

import {GetSquaddieAtMapLocation} from "../orchestratorComponents/orchestratorUtils";
import {GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {SquaddieActionType} from "../history/anySquaddieAction";

export class MoveCloserToSquaddie implements TeamStrategy {
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
            throw new Error("Move Closer to Squaddie strategy has no target");
        }

        const squaddiesWhoCanAct: string[] = state.team.getBattleSquaddiesThatCanAct();
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        let squaddieToAct = this.getActingSquaddie(state, squaddiesWhoCanAct);

        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(squaddieToAct));
        const {mapLocation} = state.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie});
        const pathfinder = new Pathfinder();
        const searchResults: SearchResults =
            pathfinder.findReachableSquaddies(new SearchParams({
                setup: new SearchSetup({

                    missionMap: state.missionMap,
                    squaddieRepository: state.squaddieRepository,
                    startLocation: mapLocation,
                    affiliation: squaddieTemplate.squaddieId.affiliation,
                }),
                movement: new SearchMovement({
                    movementPerAction: squaddieTemplate.movement.movementPerAction,
                    crossOverPits: squaddieTemplate.movement.crossOverPits,
                    passThroughWalls: squaddieTemplate.movement.passThroughWalls,
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
                squaddieTemplate,
                battleSquaddie,
            } = GetSquaddieAtMapLocation({
                mapLocation,
                map: state.missionMap,
                squaddieRepository: state.squaddieRepository,
            });

            if (this.desiredBattleSquaddieId) {
                return battleSquaddie.battleSquaddieId === this.desiredBattleSquaddieId;
            }
            if (this.desiredAffiliation) {
                return squaddieTemplate.squaddieId.affiliation === this.desiredAffiliation;
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
                            movementPerAction: squaddieTemplate.movement.movementPerAction,
                            passThroughWalls: squaddieTemplate.movement.passThroughWalls,
                            crossOverPits: squaddieTemplate.movement.crossOverPits,
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

            const moveTowardsLocation: SquaddieActionsForThisRound = {
                squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
                battleSquaddieId: squaddieToAct,
                startingLocation: mapLocation,
                actions: [],
            };
            SquaddieActionsForThisRoundHandler.addAction(moveTowardsLocation, {
                type: SquaddieActionType.MOVEMENT,
                data: {
                    destination: targetLocation,
                    numberOfActionPointsSpent: numberOfMoveActions,
                }
            });
            state.setInstruction(moveTowardsLocation);
            return moveTowardsLocation;
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
}
