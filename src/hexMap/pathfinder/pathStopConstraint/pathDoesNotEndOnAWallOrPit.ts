import { MissionMap } from "../../../missionMap/missionMap"
import { SearchPath, SearchPathService } from "../searchPath"
import { SearchParameters } from "../searchParameters"
import { TerrainTileMapService } from "../../terrainTileMap"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { HexGridMovementCost } from "../../hexGridMovementCost"
import {
    AreValidParametersForPathCanStopCondition,
    PathStopConstraint,
} from "./pathStopConstraint"

export class PathDoesNotEndOnAWallOrPit implements PathStopConstraint {
    missionMap: MissionMap

    constructor({ missionMap }: { missionMap: MissionMap }) {
        this.missionMap = missionMap
    }

    squaddieCanStopAtTheEndOfThisPath({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPath
        searchParameters: SearchParameters
    }): boolean {
        if (!AreValidParametersForPathCanStopCondition({ newPath })) {
            return undefined
        }

        const coordinate: HexCoordinate =
            SearchPathService.getMostRecentCoordinate(newPath).hexCoordinate
        const terrainType =
            TerrainTileMapService.getTileTerrainTypeAtCoordinate(
                this.missionMap.terrainTileMap,
                coordinate
            )
        return ![HexGridMovementCost.pit, HexGridMovementCost.wall].includes(
            terrainType
        )
    }
}
