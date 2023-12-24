import {MissionMap} from "../../../missionMap/missionMap";
import {SearchPath, SearchPathHelper} from "../searchPath";
import {SearchParameters} from "../searchParams";
import {TerrainTileMapHelper} from "../../terrainTileMap";
import {HexCoordinate} from "../../hexCoordinate/hexCoordinate";
import {HexGridMovementCost} from "../../hexGridMovementCost";
import {AreValidParametersForPathCanStopCondition, PathCanStopCondition} from "./pathCanStopCondition";

export class PathCanStopConditionNotAWallOrPit implements PathCanStopCondition {
    missionMap: MissionMap;

    constructor({missionMap}: { missionMap: MissionMap }) {
        this.missionMap = missionMap;
    }

    shouldMarkPathLocationAsStoppable({
                                          newPath,
                                          searchParameters,
                                      }: { newPath: SearchPath; searchParameters: SearchParameters }): boolean {
        if (!AreValidParametersForPathCanStopCondition({newPath})) {
            return undefined;
        }

        const coordinate: HexCoordinate = SearchPathHelper.getMostRecentLocation(newPath).hexCoordinate;
        const terrainType = TerrainTileMapHelper.getTileTerrainTypeAtLocation(this.missionMap.terrainTileMap, coordinate.q, coordinate.r);
        return ![HexGridMovementCost.pit, HexGridMovementCost.wall].includes(terrainType);
    }
}
