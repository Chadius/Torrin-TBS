import { MissionMap } from "../../../missionMap/missionMap"
import { SearchParameters } from "../searchParameters"
import { TerrainTileMapService } from "../../terrainTileMap"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { HexGridMovementCost } from "../../hexGridMovementCost"
import {
    AreValidParametersForPathCanStopCondition,
    PathStopConstraint,
} from "./pathStopConstraint"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../../search/searchPathAdapter/searchPathAdapter"

export class PathDoesNotEndOnAWallOrPit implements PathStopConstraint {
    missionMap: MissionMap

    constructor({ missionMap }: { missionMap: MissionMap }) {
        this.missionMap = missionMap
    }

    squaddieCanStopAtTheEndOfThisPath({
        newPath,
    }: {
        newPath: SearchPathAdapter
        searchParameters: SearchParameters
    }): boolean {
        if (!AreValidParametersForPathCanStopCondition({ newPath })) {
            return undefined
        }

        const coordinate: HexCoordinate =
            SearchPathAdapterService.getMostRecentCoordinate(
                newPath
            ).hexCoordinate
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
