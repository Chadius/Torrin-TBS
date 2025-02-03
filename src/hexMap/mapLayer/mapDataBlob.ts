import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import { TerrainTileMap, TerrainTileMapService } from "../terrainTileMap"
import { HexCoordinate } from "../hexCoordinate/hexCoordinate"

export class MapDataBlob {
    dataBlob: DataBlob
    terrainTileMap: TerrainTileMap

    constructor(terrainTileMap: TerrainTileMap) {
        this.terrainTileMap = terrainTileMap
        this.dataBlob = DataBlobService.new()
    }

    add<T>(coordinate: HexCoordinate, value: T): void {
        if (
            !TerrainTileMapService.isCoordinateOnMap(
                this.terrainTileMap,
                coordinate
            )
        )
            return
        DataBlobService.add<T>(
            this.dataBlob,
            coordinateToKey(coordinate),
            value
        )
    }

    get<T>(coordinate: HexCoordinate): T {
        return DataBlobService.get<T>(
            this.dataBlob,
            coordinateToKey(coordinate)
        )
    }
}

const coordinateToKey = (coordinate: HexCoordinate): string =>
    `${coordinate.q},${coordinate.r}`
