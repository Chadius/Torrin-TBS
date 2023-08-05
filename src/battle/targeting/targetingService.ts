import {SquaddieActivity} from "../../squaddie/activity";
import {MissionMap, MissionMapSquaddieDatum} from "../../missionMap/missionMap";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {FriendlyAffiliationsByAffiliation, SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {TargetingShape} from "./targetingShapeGenerator";

export class TargetingResults {
    constructor() {
        this._locationsInRange = [];
        this._dynamicSquaddieIdsInRange = [];
    }

    private _locationsInRange: HexCoordinate[];

    get locationsInRange(): HexCoordinate[] {
        return this._locationsInRange;
    }

    private _dynamicSquaddieIdsInRange: string[];

    get dynamicSquaddieIdsInRange(): string[] {
        return this._dynamicSquaddieIdsInRange;
    }

    addLocationsInRange(hexCoordinates: HexCoordinate[]) {
        this._locationsInRange = [...this._locationsInRange, ...hexCoordinates];
    }

    addDynamicSquaddieIdsInRange(dynamicIds: string[]) {
        this._dynamicSquaddieIdsInRange = [...this._dynamicSquaddieIdsInRange, ...dynamicIds];
    }
}

export const findValidTargets = (params: {
    map: MissionMap,
    activity: SquaddieActivity,
    actingStaticSquaddie: BattleSquaddieStatic,
    actingDynamicSquaddie: BattleSquaddieDynamic,
    squaddieRepository: BattleSquaddieRepository,
}): TargetingResults => {
    const map = params.map;
    const activity = params.activity;
    const actingStaticSquaddie = params.actingStaticSquaddie;
    const actingDynamicSquaddie = params.actingDynamicSquaddie;
    const squaddieRepository = params.squaddieRepository;

    const pathfinder: Pathfinder = new Pathfinder();
    const squaddieInfo = map.getSquaddieByDynamicId(params.actingDynamicSquaddie.dynamicSquaddieId)

    const tilesToHighlight: HexCoordinate[] = pathfinder.getTilesInRange(
        new SearchParams({
            startLocation: squaddieInfo.mapLocation,
            canStopOnSquaddies: true,
            minimumDistanceMoved: activity.minimumRange,
            maximumDistanceMoved: activity.maximumRange,
            missionMap: map,
            squaddieRepository: squaddieRepository,
            shapeGeneratorType: TargetingShape.Snake,
        }),
        activity.maximumRange,
        [squaddieInfo.mapLocation],
    )

    const results = new TargetingResults();
    results.addLocationsInRange(
        tilesToHighlight
    );

    addValidTargetsToResult(results, actingStaticSquaddie, tilesToHighlight, map, squaddieRepository);

    return results;
};

function addValidTargetsToResult(
    targetingResults: TargetingResults,
    actingStaticSquaddie: BattleSquaddieStatic,
    tilesInRange: HexCoordinate[],
    map: MissionMap,
    squaddieRepository: BattleSquaddieRepository
) {
    const actingAffiliation: SquaddieAffiliation = actingStaticSquaddie.squaddieId.affiliation;
    const validDynamicSquaddieIds: string[] = tilesInRange.map((tile) => {
        const mapData: MissionMapSquaddieDatum = map.getSquaddieAtLocation(tile);
        if (!mapData.isValid()) {
            return undefined;
        }
        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicId(mapData.dynamicSquaddieId));

        const friendlyAffiliations: { [friendlyAffiliation in SquaddieAffiliation]?: boolean } = FriendlyAffiliationsByAffiliation[actingAffiliation];
        if (friendlyAffiliations[staticSquaddie.squaddieId.affiliation]) {
            return undefined;
        }

        return dynamicSquaddie.dynamicSquaddieId;
    }).filter(x => x);

    targetingResults.addDynamicSquaddieIdsInRange(validDynamicSquaddieIds);
}
