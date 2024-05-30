import { MissionMap } from "../../missionMap/missionMap"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"

export const NullMissionMap = () =>
    new MissionMap({
        terrainTileMap: new TerrainTileMap({
            movementCost: ["1 "],
        }),
    })
