import {SquaddieAction} from "../../squaddie/action";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddie} from "../battleSquaddie";
import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {FriendlyAffiliationsByAffiliation, SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetTargetingShapeGenerator, TargetingShape} from "./targetingShapeGenerator";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {MissionMapSquaddieLocation, MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";

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
    action: SquaddieAction,
    actingSquaddieTemplate: SquaddieTemplate,
    actingBattleSquaddie: BattleSquaddie,
    squaddieRepository: ObjectRepository,
    sourceTiles?: HexCoordinate[],
}): TargetingResults => {
    const squaddieInfo = map.getSquaddieByBattleId(actingBattleSquaddie.battleSquaddieId)
    const tilesToHighlight: HexCoordinate[] = Pathfinder.getTilesInRange(
        SearchParametersHelper.newUsingSearchSetupMovementStop(
            {
                setup: {
                    startLocation: squaddieInfo.mapLocation,
                    affiliation: SquaddieAffiliation.UNKNOWN,
                },
                movement: {
                    canStopOnSquaddies: true,
                    ignoreTerrainPenalty: true,
                    minimumDistanceMoved: action.minimumRange,
                    maximumDistanceMoved: action.maximumRange,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                    movementPerAction: undefined,
                    crossOverPits: false,
                    passThroughWalls: false,
                },
                stopCondition: {
                    stopLocation: undefined,
                    numberOfActions: undefined,
                }
            }
        ),
        action.maximumRange,
        sourceTiles && sourceTiles.length > 0 ? sourceTiles : [squaddieInfo.mapLocation],
        map,
        squaddieRepository,
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
