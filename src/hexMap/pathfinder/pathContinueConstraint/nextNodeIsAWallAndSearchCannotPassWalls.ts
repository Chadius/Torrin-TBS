import {
    AreValidParametersForAddPathCondition,
    PathContinueConstraint,
} from "./pathContinueConstraint"
import { MissionMap } from "../../../missionMap/missionMap"
import { SearchParameters } from "../searchParameters"
import { TerrainTileMapService } from "../../terrainTileMap"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { HexGridMovementCost } from "../../hexGridMovementCost"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../../search/searchPathAdapter/searchPathAdapter"

export class NextNodeIsAWallAndSearchCannotPassWalls
    implements PathContinueConstraint
{
    missionMap: MissionMap

    constructor({ missionMap }: { missionMap: MissionMap }) {
        this.missionMap = missionMap
    }

    shouldContinue({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPathAdapter
        searchParameters: SearchParameters
    }): boolean {
        if (!AreValidParametersForAddPathCondition({ newPath })) {
            return undefined
        }

        if (searchParameters.pathContinueConstraints.passThroughWalls) {
            return true
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
        return terrainType !== HexGridMovementCost.wall
    }
}
