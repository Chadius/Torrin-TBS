import {SquaddieActionData} from "../../squaddie/action";
import {MissionMap, MissionMapSquaddieLocation} from "../../missionMap/missionMap";
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
    action: SquaddieActionData,
    actingSquaddieTemplate: SquaddieTemplate,
    actingBattleSquaddie: BattleSquaddie,
    squaddieRepository: BattleSquaddieRepository,
    sourceTiles?: HexCoordinate[],
}): TargetingResults => {
    const pathfinder: Pathfinder = new Pathfinder();
    const squaddieInfo = map.getSquaddieByBattleId(actingBattleSquaddie.battleSquaddieId)
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

    addValidTargetsToResult(results, actingSquaddieTemplate, tilesToHighlight, map, squaddieRepository);

    return results;
};

function addValidTargetsToResult(
    targetingResults: TargetingResults,
    actingSquaddieTemplate: SquaddieTemplate,
    tilesInRange: HexCoordinate[],
    map: MissionMap,
    squaddieRepository: BattleSquaddieRepository
) {
    const actingAffiliation: SquaddieAffiliation = actingSquaddieTemplate.squaddieId.affiliation;
    const validBattleSquaddieIds: string[] = tilesInRange.map((tile) => {
        const mapData: MissionMapSquaddieLocation = map.getSquaddieAtLocation(tile);
        if (!mapData.isValid()) {
            return undefined;
        }
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(mapData.battleSquaddieId));

        const friendlyAffiliations: { [friendlyAffiliation in SquaddieAffiliation]?: boolean } = FriendlyAffiliationsByAffiliation[actingAffiliation];
        if (friendlyAffiliations[squaddieTemplate.squaddieId.affiliation]) {
            return undefined;
        }

        return battleSquaddie.battleSquaddieId;
    }).filter(x => x);

    targetingResults.addBattleSquaddieIdsInRange(validBattleSquaddieIds);
}
