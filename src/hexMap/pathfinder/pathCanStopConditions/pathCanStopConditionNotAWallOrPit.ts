import { MissionMap } from "../../../missionMap/missionMap"
import { SearchPath, SearchPathService } from "../searchPath"
import { SearchParameters } from "../searchParams"
import { TerrainTileMapService } from "../../terrainTileMap"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { HexGridMovementCost } from "../../hexGridMovementCost"
import {
    AreValidParametersForPathCanStopCondition,
    PathCanStopCondition,
} from "./pathCanStopCondition"

export class PathCanStopConditionNotAWallOrPit implements PathCanStopCondition {
    missionMap: MissionMap

    constructor({ missionMap }: { missionMap: MissionMap }) {
        this.missionMap = missionMap
    }

    shouldMarkPathLocationAsStoppable({
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
            SearchPathService.getMostRecentLocation(newPath).hexCoordinate
        const terrainType = TerrainTileMapService.getTileTerrainTypeAtLocation(
            this.missionMap.terrainTileMap,
            coordinate
        )
        return ![HexGridMovementCost.pit, HexGridMovementCost.wall].includes(
            terrainType
        )
    }
}
