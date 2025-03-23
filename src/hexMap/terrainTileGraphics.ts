import { ConvertCoordinateService } from "./convertCoordinates"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { MousePress, MouseRelease, ScreenLocation } from "../utils/mouseConfig"
import { BattleCamera } from "../battle/battleCamera"
import { HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { TerrainTileMap, TerrainTileMapService } from "./terrainTileMap"
import { HexGridTile } from "./hexGridMovementCost"

export const TerrainTileGraphicsService = {
    isCoordinateOnScreen: ({
        terrainTileMap,
        coordinate,
        camera,
    }: {
        terrainTileMap: TerrainTileMap
        coordinate: HexCoordinate
        camera: BattleCamera
    }): boolean =>
        isCoordinateOnScreen({
            terrainTileMap,
            coordinate: coordinate,
            camera,
        }),
    getAllOnscreenTerrainTiles: ({
        terrainTileMap,
        camera,
    }: {
        terrainTileMap: TerrainTileMap
        camera: BattleCamera
    }): HexGridTile[] =>
        terrainTileMap.coordinates.filter((tile) =>
            isCoordinateOnScreen({
                terrainTileMap,
                coordinate: tile,
                camera,
            })
        ),
    mouseClicked({
        terrainTileMap,
        mouseClick,
        cameraLocation,
    }: {
        mouseClick: MouseRelease | MousePress
        terrainTileMap: TerrainTileMap
        cameraLocation: ScreenLocation
    }) {
        const mapCoordinate =
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenLocation: {
                    x: mouseClick.x,
                    y: mouseClick.y,
                },
                cameraLocation,
            })

        TerrainTileMapService.selectCoordinate({
            terrainTileMap,
            mapCoordinate,
        })
    },
}

const isCoordinateOnScreen = ({
    terrainTileMap,
    coordinate,
    camera,
}: {
    terrainTileMap: TerrainTileMap
    coordinate: HexCoordinate
    camera: BattleCamera
}): boolean => {
    const hexGridTile = TerrainTileMapService.getTileAtCoordinate(
        terrainTileMap,
        coordinate
    )
    const tileScreenCoordinates =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate: hexGridTile,
            cameraLocation: camera.getWorldLocation(),
        })

    const horizontallyOnScreen =
        tileScreenCoordinates.x + HEX_TILE_WIDTH >= 0 &&
        tileScreenCoordinates.x - HEX_TILE_WIDTH <=
            ScreenDimensions.SCREEN_WIDTH

    const verticallyOnScreen =
        tileScreenCoordinates.y + HEX_TILE_WIDTH >= 0 &&
        tileScreenCoordinates.y - HEX_TILE_WIDTH <=
            ScreenDimensions.SCREEN_HEIGHT

    return horizontallyOnScreen && verticallyOnScreen
}
