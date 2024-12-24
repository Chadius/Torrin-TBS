import { HexGridTile } from "./hexGrid"
import { ConvertCoordinateService } from "./convertCoordinates"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { MouseButton } from "../utils/mouseConfig"
import { BattleCamera } from "../battle/battleCamera"
import { HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { TerrainTileMap, TerrainTileMapService } from "./terrainTileMap"

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
        mouseButton,
        mouseX,
        mouseY,
        cameraX,
        cameraY,
    }: {
        terrainTileMap: TerrainTileMap
        mouseButton: MouseButton
        mouseX: number
        mouseY: number
        cameraX: number
        cameraY: number
    }) {
        const { q, r } =
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenX: mouseX,
                screenY: mouseY,
                cameraX,
                cameraY,
            })

        TerrainTileMapService.selectCoordinate({
            terrainTileMap,
            q,
            r,
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
            ...hexGridTile,
            ...camera.getCoordinates(),
        })

    const horizontallyOnScreen =
        tileScreenCoordinates.screenX + HEX_TILE_WIDTH >= 0 &&
        tileScreenCoordinates.screenX - HEX_TILE_WIDTH <=
            ScreenDimensions.SCREEN_WIDTH

    const verticallyOnScreen =
        tileScreenCoordinates.screenY + HEX_TILE_WIDTH >= 0 &&
        tileScreenCoordinates.screenY - HEX_TILE_WIDTH <=
            ScreenDimensions.SCREEN_HEIGHT

    return horizontallyOnScreen && verticallyOnScreen
}
