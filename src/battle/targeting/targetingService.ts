import {SquaddieSquaddieAction} from "../../squaddie/action";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddie} from "../battleSquaddie";
import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {FriendlyAffiliationsByAffiliation, SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetTargetingShapeGenerator, TargetingShape} from "./targetingShapeGenerator";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {MissionMapSquaddieLocation, MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";

export class TargetingResults {
    constructor() {
        this._locationsInRange = [];
        this._battleSquaddieIdsInRange = [];
    }

    private _locationsInRange: HexCoordinate[];

    get locationsInRange(): HexCoordinate[] {
        return this._locationsInRange;
    }

    private _battleSquaddieIdsInRange: string[];

    get battleSquaddieIdsInRange(): string[] {
        return this._battleSquaddieIdsInRange;
    }

    addLocationsInRange(hexCoordinates: HexCoordinate[]) {
        this._locationsInRange = [...this._locationsInRange, ...hexCoordinates];
    }

    addBattleSquaddieIdsInRange(battleIds: string[]) {
        this._battleSquaddieIdsInRange = [...this._battleSquaddieIdsInRange, ...battleIds];
    }
}

export const FindValidTargets = ({
                                     map,
                                     action,
                                     actingSquaddieTemplate,
                                     actingBattleSquaddie,
                                     squaddieRepository,
                                     sourceTiles,
                                 }: {
    map: MissionMap,
    action: SquaddieSquaddieAction,
    actingSquaddieTemplate: SquaddieTemplate,
    actingBattleSquaddie: BattleSquaddie,
    squaddieRepository: ObjectRepository,
    sourceTiles?: HexCoordinate[],
}): TargetingResults => {

    const squaddieInfo = map.getSquaddieByBattleId(actingBattleSquaddie.battleSquaddieId)
    const invalidSourceTiles = (sourceTiles === undefined || sourceTiles.length === 0);
    const invalidSquaddieLocation = (squaddieInfo === undefined || squaddieInfo.mapLocation === undefined)
    if (invalidSourceTiles && invalidSquaddieLocation) {
        return new TargetingResults();
    }

    const allLocationsInRange: SearchResult = PathfinderHelper.search({
        searchParameters: SearchParametersHelper.new({
            startLocations: sourceTiles && sourceTiles.length > 0 ? sourceTiles : [squaddieInfo.mapLocation],
            squaddieAffiliation: SquaddieAffiliation.UNKNOWN,
            canStopOnSquaddies: true,
            ignoreTerrainCost: true,
            minimumDistanceMoved: action.minimumRange,
            maximumDistanceMoved: action.maximumRange,
            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
            movementPerAction: undefined,
            canPassOverPits: false,
            canPassThroughWalls: false,
        }),
        missionMap: map,
        repository: squaddieRepository,
    });

    const results = new TargetingResults();
    results.addLocationsInRange(
        SearchResultsHelper.getStoppableLocations(allLocationsInRange)
    );

    addValidTargetsToResult(results, actingSquaddieTemplate, SearchResultsHelper.getStoppableLocations(allLocationsInRange), map, squaddieRepository);

    return results;
};

function addValidTargetsToResult(
    targetingResults: TargetingResults,
    actingSquaddieTemplate: SquaddieTemplate,
    tilesInRange: HexCoordinate[],
    map: MissionMap,
    squaddieRepository: ObjectRepository
) {
    const actingAffiliation: SquaddieAffiliation = actingSquaddieTemplate.squaddieId.affiliation;
    const validBattleSquaddieIds: string[] = tilesInRange.map((tile) => {
        const mapData: MissionMapSquaddieLocation = map.getSquaddieAtLocation(tile);
        if (!MissionMapSquaddieLocationHandler.isValid(mapData)) {
            return undefined;
        }
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, mapData.battleSquaddieId));

        const friendlyAffiliations: { [friendlyAffiliation in SquaddieAffiliation]?: boolean } = FriendlyAffiliationsByAffiliation[actingAffiliation];
        if (friendlyAffiliations[squaddieTemplate.squaddieId.affiliation]) {
            return undefined;
        }

        return battleSquaddie.battleSquaddieId;
    }).filter(x => x);

    targetingResults.addBattleSquaddieIdsInRange(validBattleSquaddieIds);
}
