import { HexGridTile } from "./hexGrid"
import { ConvertCoordinateService } from "./convertCoordinates"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { MouseButton } from "../utils/mouseConfig"
import { BattleCamera } from "../battle/battleCamera"
import { HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { TerrainTileMap, TerrainTileMapService } from "./terrainTileMap"

export const TerrainTileGraphicsService = {
    isLocationOnScreen: ({
        terrainTileMap,
        location,
        camera,
    }: {
        terrainTileMap: TerrainTileMap
        location: HexCoordinate
        camera: BattleCamera
    }): boolean =>
        isLocationOnScreen({
            terrainTileMap,
            location,
            camera,
        }),
    getAllOnscreenLocations: ({
        terrainTileMap,
        camera,
    }: {
        terrainTileMap: TerrainTileMap
        camera: BattleCamera
    }): HexGridTile[] =>
        terrainTileMap.tiles.filter((tile) =>
            isLocationOnScreen({
                terrainTileMap,
                location: tile,
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
            ConvertCoordinateService.convertScreenCoordinatesToMapCoordinates({
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

const isLocationOnScreen = ({
    terrainTileMap,
    location,
    camera,
}: {
    terrainTileMap: TerrainTileMap
    location: HexCoordinate
    camera: BattleCamera
}): boolean => {
    const hexGridTile = TerrainTileMapService.getTileAtLocation(
        terrainTileMap,
        location
    )
    const tileScreenCoordinates =
        ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
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
