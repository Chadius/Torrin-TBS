import { BattleSquaddie } from "../../battleSquaddie"
import {
    HEX_TILE_WIDTH,
    HUE_BY_SQUADDIE_AFFILIATION,
} from "../../../graphicsConstants"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { Rectangle, RectangleService } from "../../../ui/rectangle/rectangle"
import { BattleCamera } from "../../battleCamera"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../../ui/constants"
import {
    SearchPath,
    SearchPathService,
} from "../../../hexMap/pathfinder/searchPath"
import {
    getSquaddiePositionAlongPath,
    TIME_TO_MOVE,
} from "../squaddieMoveAnimationUtils"
import { SquaddieService } from "../../../squaddie/squaddieService"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { MapHighlightService } from "../mapHighlight"
import { Campaign } from "../../../campaign/campaign"
import { DEFAULT_ACTION_POINTS_PER_TURN } from "../../../squaddie/turn"
import { isValidValue } from "../../../utils/validityCheck"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../../hexMap/mapLayer/mapGraphicsLayer"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import { ImageUI } from "../../../ui/imageUI/imageUI"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { ScreenLocation } from "../../../utils/mouseConfig"

const MAP_ICON_CONSTANTS = {
    ActionPointsBarColors: {
        strokeColor: [0, 0, 50],
        foregroundFillColor: [0, 2, 60],
        backgroundFillColor: [0, 0, 12],
    },
    ActionPointsBarRectangle20ths: {
        left: -8,
        top: 6,
        width: 14,
        height: 2,
    },
    HitPointsBarRectangle20ths: {
        left: -8,
        top: 8,
        width: 16,
        height: 3,
    },
    HitPointsBarColors: {
        strokeColor: [0, 10, 50],
        foregroundFillColor: [0, 70, 70],
        backgroundFillColor: [0, 0, 12],
    },
}

export const DrawSquaddieIconOnMapUtilities = {
    hasMovementAnimationFinished: (
        timeMovementStarted: number,
        squaddieMovePath: SearchPath
    ) => {
        return hasMovementAnimationFinished(
            timeMovementStarted,
            squaddieMovePath
        )
    },
    tintSquaddieMapIcon: ({
        repository,
        battleSquaddieId,
    }: {
        repository: ObjectRepository
        battleSquaddieId: string
    }) => {
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieId
            )
        )
        return tintSquaddieMapIcon(repository, squaddieTemplate, battleSquaddie)
    },
    highlightSquaddieRange: ({
        missionMap,
        battleSquaddieId,
        repository,
        campaign,
    }: {
        missionMap: MissionMap
        battleSquaddieId: string
        repository: ObjectRepository
        campaign: Campaign
    }) => {
        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            missionMap,
            battleSquaddieId
        )
        const squaddieReachHighlightedOnMap =
            MapHighlightService.highlightAllCoordinatesWithinSquaddieRange({
                repository: repository,
                missionMap,
                battleSquaddieId,
                startCoordinate: mapCoordinate,
                campaignResources: campaign.resources,
            })
        const actionRangeOnMap = MapGraphicsLayerService.new({
            id: battleSquaddieId,
            highlightedTileDescriptions: squaddieReachHighlightedOnMap,
            type: MapGraphicsLayerType.UNKNOWN,
        })
        TerrainTileMapService.addGraphicsLayer(
            missionMap.terrainTileMap,
            actionRangeOnMap
        )
    },
    updateSquaddieIconLocation: ({
        repository,
        battleSquaddieId,
        destination,
        camera,
    }: {
        repository: ObjectRepository
        battleSquaddieId: string
        destination: HexCoordinate
        camera: BattleCamera
    }) => {
        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieId
            )
        )
        return updateSquaddieIconLocation(
            repository,
            battleSquaddie,
            destination,
            camera
        )
    },
    highlightPlayableSquaddieReachIfTheyCanAct: ({
        battleSquaddie,
        squaddieTemplate,
        missionMap,
        repository,
        campaign,
    }: {
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        missionMap: MissionMap
        repository: ObjectRepository
        campaign: Campaign
    }) => {
        return highlightPlayableSquaddieReachIfTheyCanAct({
            battleSquaddie,
            squaddieTemplate,
            missionMap,
            repository,
            campaign,
        })
    },
    tintSquaddieMapIconIfTheyCannotAct: (
        battleSquaddie: BattleSquaddie,
        squaddieTemplate: SquaddieTemplate,
        repository: ObjectRepository
    ) => {
        return tintSquaddieMapIconIfTheyCannotAct(
            battleSquaddie,
            squaddieTemplate,
            repository
        )
    },
    drawSquaddieMapIconAtMapCoordinate: ({
        graphics,
        squaddieRepository,
        battleSquaddieId,
        mapCoordinate,
        camera,
        resourceHandler,
    }: {
        graphics: GraphicsBuffer
        squaddieRepository: ObjectRepository
        battleSquaddieId: string
        mapCoordinate: HexCoordinate
        camera: BattleCamera
        resourceHandler: ResourceHandler
    }) => {
        return drawSquaddieMapIconAtMapCoordinate(
            graphics,
            squaddieRepository,
            battleSquaddieId,
            mapCoordinate,
            camera,
            resourceHandler
        )
    },
    moveSquaddieAlongPath: ({
        squaddieRepository,
        battleSquaddie,
        timeMovementStarted,
        squaddieMovePath,
        camera,
    }: {
        squaddieRepository: ObjectRepository
        battleSquaddie: BattleSquaddie
        timeMovementStarted: number
        squaddieMovePath: SearchPath
        camera: BattleCamera
    }) => {
        return moveSquaddieAlongPath(
            squaddieRepository,
            battleSquaddie,
            timeMovementStarted,
            squaddieMovePath,
            camera
        )
    },
    unTintSquaddieMapIcon: (
        repository: ObjectRepository,
        battleSquaddie: BattleSquaddie
    ) => {
        return unTintSquaddieMapIcon(repository, battleSquaddie)
    },
}

const tintSquaddieMapIcon = (
    squaddieRepository: ObjectRepository,
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie
) => {
    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation]
    const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId(
        squaddieRepository,
        battleSquaddie.battleSquaddieId
    )
    if (mapIcon) {
        mapIcon.setTint(squaddieAffiliationHue, 50, 50, 192)
    }
}

const unTintSquaddieMapIcon = (
    repository: ObjectRepository,
    battleSquaddie: BattleSquaddie
) => {
    const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId(
        repository,
        battleSquaddie.battleSquaddieId
    )
    if (mapIcon) {
        mapIcon.removeTint()
    }
}

const drawSquaddieMapIconAtMapCoordinate = (
    graphics: GraphicsBuffer,
    squaddieRepository: ObjectRepository,
    battleSquaddieId: string,
    mapCoordinate: HexCoordinate,
    camera: BattleCamera,
    resourceHandler: ResourceHandler
) => {
    const { x, y } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate,
            cameraLocation: camera.getWorldLocation(),
        })
    const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId(
        squaddieRepository,
        battleSquaddieId
    )
    setImageToLocation({
        mapIcon,
        screenLocation: { x, y },
    })
    mapIcon.draw({ graphicsContext: graphics, resourceHandler })
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            squaddieRepository,
            battleSquaddieId
        )
    )
    drawMapIconActionPointsBar(
        graphics,
        squaddieTemplate,
        battleSquaddie,
        mapCoordinate,
        camera
    )
    drawMapIconHitPointBar(
        graphics,
        squaddieTemplate,
        battleSquaddie,
        mapCoordinate,
        camera
    )
}

const setImageToLocation = ({
    mapIcon,
    screenLocation,
}: {
    mapIcon: ImageUI
    screenLocation: ScreenLocation
}) => {
    RectAreaService.move(mapIcon.drawArea, {
        left: screenLocation.x,
        top: screenLocation.y,
    })
    RectAreaService.align(mapIcon.drawArea, {
        horizAlign: HORIZONTAL_ALIGN.CENTER,
        vertAlign: VERTICAL_ALIGN.CENTER,
    })
}

const drawMapIconActionPointsBar = (
    graphics: GraphicsBuffer,
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    mapCoordinate: HexCoordinate,
    camera: BattleCamera
) => {
    const { squaddieCanCurrentlyAct } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })
    if (!squaddieCanCurrentlyAct) {
        return
    }

    const { actionPointsRemaining } = SquaddieService.getNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    })
    const actionPointsToShow = actionPointsRemaining
    if (actionPointsToShow >= DEFAULT_ACTION_POINTS_PER_TURN) {
        return
    }
    const { x, y } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate,
            cameraLocation: camera.getWorldLocation(),
        })

    const backgroundArea: RectArea = RectAreaService.new({
        left:
            x +
            (HEX_TILE_WIDTH *
                MAP_ICON_CONSTANTS.ActionPointsBarRectangle20ths.left) /
                20,
        top:
            y +
            (HEX_TILE_WIDTH *
                MAP_ICON_CONSTANTS.ActionPointsBarRectangle20ths.top) /
                20,
        width:
            (HEX_TILE_WIDTH *
                MAP_ICON_CONSTANTS.ActionPointsBarRectangle20ths.width) /
            20,
        height:
            (HEX_TILE_WIDTH *
                MAP_ICON_CONSTANTS.ActionPointsBarRectangle20ths.height) /
            20,
    })

    drawMapIconBar({
        graphics,
        amount: {
            current: actionPointsToShow,
            max: DEFAULT_ACTION_POINTS_PER_TURN,
        },
        bar: {
            backgroundArea,
            strokeWeight: 1,
            backgroundColor:
                MAP_ICON_CONSTANTS.ActionPointsBarColors.backgroundFillColor,
            strokeColor: MAP_ICON_CONSTANTS.ActionPointsBarColors.strokeColor,
            foregroundColor:
                MAP_ICON_CONSTANTS.ActionPointsBarColors.foregroundFillColor,
        },
    })
}

const drawMapIconHitPointBar = (
    graphics: GraphicsBuffer,
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    mapCoordinate: HexCoordinate,
    camera: BattleCamera
) => {
    const { currentHitPoints, maxHitPoints } = SquaddieService.getHitPoints({
        squaddieTemplate,
        battleSquaddie,
    })

    if (currentHitPoints >= maxHitPoints) {
        return
    }

    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation]

    const { x, y } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate,
            cameraLocation: camera.getWorldLocation(),
        })

    const backgroundArea: RectArea = RectAreaService.new({
        left:
            x +
            (HEX_TILE_WIDTH *
                MAP_ICON_CONSTANTS.HitPointsBarRectangle20ths.left) /
                20,
        top:
            y +
            (HEX_TILE_WIDTH *
                MAP_ICON_CONSTANTS.HitPointsBarRectangle20ths.top) /
                20,
        width:
            (HEX_TILE_WIDTH *
                MAP_ICON_CONSTANTS.HitPointsBarRectangle20ths.width) /
            20,
        height:
            (HEX_TILE_WIDTH *
                MAP_ICON_CONSTANTS.HitPointsBarRectangle20ths.height) /
            20,
    })

    drawMapIconBar({
        graphics,
        amount: {
            current: currentHitPoints,
            max: maxHitPoints,
        },
        bar: {
            backgroundArea,
            strokeWeight: 1,
            backgroundColor:
                MAP_ICON_CONSTANTS.HitPointsBarColors.backgroundFillColor,
            strokeColor: [
                squaddieAffiliationHue,
                MAP_ICON_CONSTANTS.HitPointsBarColors.strokeColor[1],
                MAP_ICON_CONSTANTS.HitPointsBarColors.strokeColor[2],
            ],
            foregroundColor: [
                squaddieAffiliationHue,
                MAP_ICON_CONSTANTS.HitPointsBarColors.foregroundFillColor[1],
                MAP_ICON_CONSTANTS.HitPointsBarColors.foregroundFillColor[2],
            ],
        },
    })
}

const updateSquaddieIconLocation = (
    squaddieRepository: ObjectRepository,
    battleSquaddie: BattleSquaddie,
    destination: HexCoordinate,
    camera: BattleCamera
) => {
    const { x, y } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate: destination,
            cameraLocation: camera.getWorldLocation(),
        })
    const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId(
        squaddieRepository,
        battleSquaddie.battleSquaddieId
    )

    setImageToLocation({ mapIcon, screenLocation: { x, y } })
}

const hasMovementAnimationFinished = (
    timeMovementStarted: number,
    squaddieMovePath: SearchPath
) => {
    if (!isValidValue(squaddieMovePath)) {
        return true
    }

    if (SearchPathService.getCoordinates(squaddieMovePath).length <= 1) {
        return true
    }

    if (timeMovementStarted === undefined) {
        return true
    }

    const timePassed = Date.now() - timeMovementStarted
    return timePassed >= TIME_TO_MOVE
}

export const moveSquaddieAlongPath = (
    squaddieRepository: ObjectRepository,
    battleSquaddie: BattleSquaddie,
    timeMovementStarted: number,
    squaddieMovePath: SearchPath,
    camera: BattleCamera
) => {
    const timePassed = Date.now() - timeMovementStarted
    const { x, y } = getSquaddiePositionAlongPath(
        SearchPathService.getCoordinates(squaddieMovePath).map(
            (tile) => tile.hexCoordinate
        ),
        timePassed,
        TIME_TO_MOVE,
        camera
    )
    const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId(
        squaddieRepository,
        battleSquaddie.battleSquaddieId
    )
    if (mapIcon) {
        setImageToLocation({ mapIcon, screenLocation: { x, y } })
    }
}

const highlightPlayableSquaddieReachIfTheyCanAct = ({
    battleSquaddie,
    squaddieTemplate,
    missionMap,
    repository,
    campaign,
}: {
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
    missionMap: MissionMap
    repository: ObjectRepository
    campaign: Campaign
}) => {
    let { canAct } = SquaddieService.canSquaddieActRightNow({
        squaddieTemplate,
        battleSquaddie,
    })

    let { squaddieHasThePlayerControlledAffiliation } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })

    if (!canAct || !squaddieHasThePlayerControlledAffiliation) {
        return
    }

    DrawSquaddieIconOnMapUtilities.highlightSquaddieRange({
        missionMap: missionMap,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        repository: repository,
        campaign,
    })
}

const tintSquaddieMapIconIfTheyCannotAct = (
    battleSquaddie: BattleSquaddie,
    squaddieTemplate: SquaddieTemplate,
    repository: ObjectRepository
) => {
    let { canAct } = SquaddieService.canSquaddieActRightNow({
        squaddieTemplate,
        battleSquaddie,
    })

    if (canAct) {
        return
    }

    DrawSquaddieIconOnMapUtilities.tintSquaddieMapIcon({
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        repository,
    })
}

const drawMapIconBar = ({
    graphics,
    amount,
    bar,
}: {
    graphics: GraphicsBuffer
    amount: {
        current: number
        max: number
    }
    bar: {
        backgroundArea: RectArea
        strokeWeight: number
        backgroundColor: number[]
        strokeColor: number[]
        foregroundColor: number[]
    }
}) => {
    const background: Rectangle = RectangleService.new({
        area: bar.backgroundArea,
        fillColor: bar.backgroundColor,
        strokeColor: bar.strokeColor,
        strokeWeight: bar.strokeWeight,
    })
    RectangleService.draw(background, graphics)

    const foregroundWidth =
        (bar.backgroundArea.width * amount.current) / amount.max
    const foregroundRectArea: RectArea = RectAreaService.new({
        top: RectAreaService.top(bar.backgroundArea),
        left: RectAreaService.left(bar.backgroundArea),
        bottom: RectAreaService.bottom(bar.backgroundArea),
        width: foregroundWidth,
    })

    const foreground: Rectangle = RectangleService.new({
        area: foregroundRectArea,
        fillColor: bar.foregroundColor,
        noStroke: true,
    })
    RectangleService.draw(foreground, graphics)
}
