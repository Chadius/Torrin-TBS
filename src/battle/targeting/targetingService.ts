import {SquaddieAction} from "../../squaddie/action";
import {MissionMap, MissionMapSquaddieDatum} from "../../missionMap/missionMap";
import {BattleSquaddie} from "../battleSquaddie";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SearchMovement, SearchParams, SearchSetup, SearchStopCondition} from "../../hexMap/pathfinder/searchParams";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {FriendlyAffiliationsByAffiliation, SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetTargetingShapeGenerator, TargetingShape} from "./targetingShapeGenerator";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

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

export const FindValidTargets = ({
                                     map,
                                     action,
                                     actingSquaddietemplate,
                                     actingDynamicSquaddie,
                                     squaddieRepository,
                                     sourceTiles,
                                 }: {
    map: MissionMap,
    action: SquaddieAction,
    actingSquaddietemplate: SquaddieTemplate,
    actingDynamicSquaddie: BattleSquaddie,
    squaddieRepository: BattleSquaddieRepository,
    sourceTiles?: HexCoordinate[],
}): TargetingResults => {
    const pathfinder: Pathfinder = new Pathfinder();
    const squaddieInfo = map.getSquaddieByDynamicId(actingDynamicSquaddie.dynamicSquaddieId)
    const tilesToHighlight: HexCoordinate[] = pathfinder.getTilesInRange(
        new SearchParams({
            setup: new SearchSetup({
                startLocation: squaddieInfo.mapLocation,
                missionMap: map,
                squaddieRepository,
            }),
            movement: new SearchMovement({
                canStopOnSquaddies: true,
                ignoreTerrainPenalty: true,
                minimumDistanceMoved: action.minimumRange,
                maximumDistanceMoved: action.maximumRange,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({}),
        }),
        action.maximumRange,
        sourceTiles && sourceTiles.length > 0 ? sourceTiles : [squaddieInfo.mapLocation],
    )

    const results = new TargetingResults();
    results.addLocationsInRange(
        tilesToHighlight
    );

    addValidTargetsToResult(results, actingSquaddietemplate, tilesToHighlight, map, squaddieRepository);

    return results;
};

function addValidTargetsToResult(
    targetingResults: TargetingResults,
    actingSquaddietemplate: SquaddieTemplate,
    tilesInRange: HexCoordinate[],
    map: MissionMap,
    squaddieRepository: BattleSquaddieRepository
) {
    const actingAffiliation: SquaddieAffiliation = actingSquaddietemplate.squaddieId.affiliation;
    const validDynamicSquaddieIds: string[] = tilesInRange.map((tile) => {
        const mapData: MissionMapSquaddieDatum = map.getSquaddieAtLocation(tile);
        if (!mapData.isValid()) {
            return undefined;
        }
        const {
            squaddietemplate,
            dynamicSquaddie
        } = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicId(mapData.dynamicSquaddieId));

        const friendlyAffiliations: { [friendlyAffiliation in SquaddieAffiliation]?: boolean } = FriendlyAffiliationsByAffiliation[actingAffiliation];
        if (friendlyAffiliations[squaddietemplate.squaddieId.affiliation]) {
            return undefined;
        }

        return dynamicSquaddie.dynamicSquaddieId;
    }).filter(x => x);

    targetingResults.addDynamicSquaddieIdsInRange(validDynamicSquaddieIds);
}
