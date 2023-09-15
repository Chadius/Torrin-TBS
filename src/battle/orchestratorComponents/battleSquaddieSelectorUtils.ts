import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {DamageType, DealDamageToTheSquaddie, GetNumberOfActions} from "../../squaddie/squaddieService";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {TileFoundDescription} from "../../hexMap/pathfinder/tileFoundDescription";
import {getHighlightedTileDescriptionByNumberOfMovementActions} from "../animation/mapHighlight";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {BattleEvent} from "../history/battleEvent";
import {ActivityResult} from "../history/activityResult";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct} from "./orchestratorUtils";
import {TintSquaddieIfTurnIsComplete} from "../animation/drawSquaddie";

export function createSearchPath(state: BattleOrchestratorState, staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic, clickedHexCoordinate: HexCoordinate) {
    const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
    const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie})
    const searchResults: SearchResults = getResultOrThrowError(
        state.pathfinder.findPathToStopLocation(new SearchParams({
            missionMap: state.missionMap,
            squaddieMovement: staticSquaddie.movement,
            numberOfActions: normalActionsRemaining,
            startLocation: new HexCoordinate({
                q: datum.mapLocation.q,
                r: datum.mapLocation.r,
            }),
            stopLocation: new HexCoordinate({
                q: clickedHexCoordinate.q,
                r: clickedHexCoordinate.r
            }),
            squaddieAffiliation: staticSquaddie.squaddieId.affiliation,
            squaddieRepository: state.squaddieRepository,
            shapeGeneratorType: TargetingShape.Snake,
        }))
    );

    const closestRoute: SearchPath = getResultOrThrowError(searchResults.getRouteToStopLocation());

    const noDirectRouteToDestination = closestRoute === null;
    if (noDirectRouteToDestination) {
        return;
    }

    state.squaddieMovePath = closestRoute;
    let routeSortedByNumberOfMovementActions: TileFoundDescription[][] = getResultOrThrowError(searchResults.getRouteToStopLocationSortedByNumberOfMovementActions());

    const routeTilesByDistance = getHighlightedTileDescriptionByNumberOfMovementActions(
        routeSortedByNumberOfMovementActions.map(
            tiles => tiles.map(
                tile => tile.hexCoordinate
            )
        )
    );
    state.hexMap.stopHighlightingTiles();
    state.hexMap.highlightTiles(routeTilesByDistance);

    state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
}

export function AddMovementInstruction(state: BattleOrchestratorState, staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic, destinationHexCoordinate: HexCoordinate) {
    MaybeCreateSquaddieInstruction(state, dynamicSquaddie, staticSquaddie);

    const moveActivity = new SquaddieMovementActivity({
        destination: destinationHexCoordinate,
        numberOfActionsSpent: state.squaddieMovePath.getNumberOfMovementActions(),
    });

    state.squaddieCurrentlyActing.addConfirmedActivity(moveActivity);
    state.battleEventRecording.addEvent(new BattleEvent({
        currentSquaddieInstruction: state.squaddieCurrentlyActing,
    }));
    return moveActivity;
}

export function MaybeCreateSquaddieInstruction(state: BattleOrchestratorState, dynamicSquaddie: BattleSquaddieDynamic, staticSquaddie: BattleSquaddieStatic) {
    if (state.squaddieCurrentlyActing.isReadyForNewSquaddie) {
        const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        const dynamicSquaddieId = dynamicSquaddie.dynamicSquaddieId;

        state.squaddieCurrentlyActing.reset();
        state.squaddieCurrentlyActing.addInitialState({
            staticSquaddieId: staticSquaddie.squaddieId.staticId,
            dynamicSquaddieId,
            startingLocation: new HexCoordinate({
                q: datum.mapLocation.q,
                r: datum.mapLocation.r,
            }),
        })
    }
}

export function CalculateResults(state: BattleOrchestratorState, actingSquaddieDynamic: BattleSquaddieDynamic, validTargetLocation: HexCoordinate) {
    const {
        dynamicSquaddieId: targetedSquaddieDynamicId,
        staticSquaddieId: targetedSquaddieStaticId
    } = state.missionMap.getSquaddieAtLocation(validTargetLocation);

    const {
        staticSquaddie: targetedSquaddieStatic,
        dynamicSquaddie: targetedSquaddieDynamic
    } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(targetedSquaddieDynamicId));
    const targetedSquaddieDynamicIds: string[] = [targetedSquaddieDynamicId];
    let damageDealt = 0;
    Object.keys(state.squaddieCurrentlyActing.currentlySelectedActivity.damageDescriptions).forEach((damageTypeStr: string) => {
        const damageType = parseInt(damageTypeStr) as DamageType;
        const activityDamage = state.squaddieCurrentlyActing.currentlySelectedActivity.damageDescriptions[damageType]
        const {damageTaken: damageTakenByThisType} = DealDamageToTheSquaddie({
            staticSquaddie: targetedSquaddieStatic,
            dynamicSquaddie: targetedSquaddieDynamic,
            damage: activityDamage,
            damageType,
        });
        damageDealt += damageTakenByThisType;
    });
    const resultPerTarget = {[targetedSquaddieDynamicId]: new ActivityResult({damageTaken: damageDealt})};

    const instructionResults: SquaddieSquaddieResults = new SquaddieSquaddieResults({
        actingSquaddieDynamicId: actingSquaddieDynamic.dynamicSquaddieId,
        targetedSquaddieDynamicIds,
        resultPerTarget,
    });
    return instructionResults;
}

export function MaybeEndSquaddieTurn(state: BattleOrchestratorState) {
    if (!state.squaddieCurrentlyActing) {
        return;
    }

    if (!state.squaddieCurrentlyActing.dynamicSquaddieId) {
        return;
    }

    const {
        dynamicSquaddie: actingSquaddieDynamic,
        staticSquaddie: actingSquaddieStatic
    } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId));
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
    TintSquaddieIfTurnIsComplete(actingSquaddieDynamic, actingSquaddieStatic);
}
