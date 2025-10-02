import { BattleSquaddie } from "../../battleSquaddie"
import {
    HEX_TILE_RADIUS,
    HEX_TILE_WIDTH,
    HUE_BY_SQUADDIE_AFFILIATION,
} from "../../../graphicsConstants"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { Rectangle, RectangleService } from "../../../ui/rectangle/rectangle"
import { BattleCamera } from "../../battleCamera"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../../ui/constants"
import { SquaddieService } from "../../../squaddie/squaddieService"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { MapHighlightService } from "../mapHighlight"
import { DEFAULT_ACTION_POINTS_PER_TURN } from "../../../squaddie/turn"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../../hexMap/mapLayer/mapGraphicsLayer"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import { ImageUI } from "../../../ui/imageUI/imageUI"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { ScreenLocation } from "../../../utils/mouseConfig"
import {
    PULSE_COLOR_FORMULA,
    PULSE_COLOR_FORMULA_TYPE,
    PulseColor,
    PulseColorService,
} from "../../../hexMap/pulseColor"
import { SearchResultsCache } from "../../../hexMap/pathfinder/searchResults/searchResultsCache"
import { HIGHLIGHT_PULSE_COLOR } from "../../../hexMap/hexDrawingUtils"
import { ActionTemplateService } from "../../../action/template/actionTemplate"
import {
    SquaddieMoveOnMapAnimation,
    SquaddieMoveOnMapAnimationService,
} from "../squaddieMoveOnMap/squaddieMoveOnMapAnimation"

interface DrawSquaddieIconOnMapLayout {
    ActionPointsBarColors: {
        strokeColor: [number, number, number]
        foregroundFillColor: [number, number, number]
        backgroundFillColor: [number, number, number]
    }
    ActionPointsBarRectangle20ths: {
        left: number
        top: number
        width: number
        height: number
    }
    HitPointsBarRectangle20ths: {
        left: number
        top: number
        width: number
        height: number
    }
    HitPointsBarColors: {
        strokeColor: [number, number, number]
        foregroundFillColor: [number, number, number]
        backgroundFillColor: [number, number, number]
    }
    mapIconTintWhenCannotAct: {
        saturation: number
        brightness: number
        alpha: number
    }
    actorSquaddie: {
        pulseColorForMapIcon: PulseColor
        circleHighlight: {
            radius: {
                range: {
                    low: number
                    high: number
                }
                periodInMilliseconds: number
                formula: PULSE_COLOR_FORMULA_TYPE
            }
            pulseColor: PulseColor
        }
    }
    targetFoeSquaddie: {
        pulseColorForMapIcon: PulseColor
        circleHighlight: {
            radius: {
                range: {
                    low: number
                    high: number
                }
                periodInMilliseconds: number
                formula: PULSE_COLOR_FORMULA_TYPE
            }
            pulseColor: PulseColor
        }
    }
    targetOtherSquaddie: {
        pulseColorForMapIcon: PulseColor
        circleHighlight: {
            radius: {
                range: {
                    low: number
                    high: number
                }
                periodInMilliseconds: number
                formula: PULSE_COLOR_FORMULA_TYPE
            }
            pulseColor: PulseColor
        }
    }
}

export const DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT: DrawSquaddieIconOnMapLayout = {
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
    mapIconTintWhenCannotAct: {
        saturation: 50,
        brightness: 50,
        alpha: 192,
    },
    actorSquaddie: {
        pulseColorForMapIcon: {
            hue: 10,
            saturation: 0,
            brightness: {
                low: 100,
                high: 80,
            },
            alpha: 256,
            pulse: {
                period: 5000,
                formula: PULSE_COLOR_FORMULA.SINE,
            },
        },
        circleHighlight: {
            radius: {
                range: {
                    low: 0,
                    high: HEX_TILE_RADIUS,
                },
                periodInMilliseconds: 2000,
                formula: PULSE_COLOR_FORMULA.LINEAR,
            },
            pulseColor: PulseColorService.new({
                hue: 0,
                saturation: 0,
                brightness: 100,
                alpha: {
                    low: 256 * 2,
                    high: 0,
                },
                pulse: {
                    period: 2000,
                    formula: PULSE_COLOR_FORMULA.LINEAR,
                },
            }),
        },
    },
    targetFoeSquaddie: {
        pulseColorForMapIcon: {
            hue: HIGHLIGHT_PULSE_COLOR.RED.hue,
            saturation: 60,
            brightness: {
                low: 100,
                high: 50,
            },
            alpha: 256,
            pulse: {
                period: 5000,
                formula: PULSE_COLOR_FORMULA.SINE,
            },
        },
        circleHighlight: {
            radius: {
                range: {
                    low: 0,
                    high: HEX_TILE_RADIUS,
                },
                periodInMilliseconds: 2000,
                formula: PULSE_COLOR_FORMULA.LINEAR,
            },
            pulseColor: PulseColorService.new({
                hue: HIGHLIGHT_PULSE_COLOR.RED.hue,
                saturation: 100,
                brightness: 80,
                alpha: {
                    low: 256 * 2,
                    high: 0,
                },
                pulse: {
                    period: 2000,
                    formula: PULSE_COLOR_FORMULA.LINEAR,
                },
            }),
        },
    },
    targetOtherSquaddie: {
        pulseColorForMapIcon: {
            hue: HIGHLIGHT_PULSE_COLOR.GREEN.hue,
            saturation: 60,
            brightness: {
                low: 100,
                high: 50,
            },
            alpha: 256,
            pulse: {
                period: 5000,
                formula: PULSE_COLOR_FORMULA.SINE,
            },
        },
        circleHighlight: {
            radius: {
                range: {
                    low: 0,
                    high: HEX_TILE_RADIUS,
                },
                periodInMilliseconds: 2000,
                formula: PULSE_COLOR_FORMULA.LINEAR,
            },
            pulseColor: PulseColorService.new({
                hue: HIGHLIGHT_PULSE_COLOR.GREEN.hue,
                saturation: 100,
                brightness: 80,
                alpha: {
                    low: 256 * 2,
                    high: 0,
                },
                pulse: {
                    period: 2000,
                    formula: PULSE_COLOR_FORMULA.LINEAR,
                },
            }),
        },
    },
}

export const DrawSquaddieIconOnMapUtilities = {
    tintSquaddieMapIconWhenTheyCannotAct: ({
        repository,
        battleSquaddieId,
    }: {
        repository: ObjectRepository
        battleSquaddieId: string
    }) => {
        const { battleSquaddie, squaddieTemplate } =
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieId
            )

        return tintSquaddieMapIconWhenTheyCannotAct(
            repository,
            squaddieTemplate,
            battleSquaddie
        )
    },
    highlightSquaddieRange: ({
        missionMap,
        battleSquaddieId,
        repository,
        squaddieAllMovementCache,
    }: {
        missionMap: MissionMap
        battleSquaddieId: string
        repository: ObjectRepository
        squaddieAllMovementCache: SearchResultsCache
    }) => {
        const { originMapCoordinate, currentMapCoordinate } =
            MissionMapService.getByBattleSquaddieId(
                missionMap,
                battleSquaddieId
            )
        const squaddieReachHighlightedOnMap =
            MapHighlightService.highlightAllCoordinatesWithinSquaddieRange({
                repository: repository,
                missionMap,
                battleSquaddieId,
                currentMapCoordinate,
                originMapCoordinate,
                squaddieAllMovementCache,
            })
        const actionRangeOnMap = MapGraphicsLayerService.new({
            id: battleSquaddieId,
            highlightedTileDescriptions: squaddieReachHighlightedOnMap,
            type: MapGraphicsLayerType.UNKNOWN,
        })
        TerrainTileMapService.removeGraphicsLayerById(
            missionMap.terrainTileMap,
            battleSquaddieId
        )
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
        const { battleSquaddie } =
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieId
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
        squaddieAllMovementCache,
    }: {
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        missionMap: MissionMap
        repository: ObjectRepository
        squaddieAllMovementCache: SearchResultsCache
    }) => {
        return highlightPlayableSquaddieReachIfTheyCanAct({
            battleSquaddie,
            squaddieTemplate,
            missionMap,
            repository,
            squaddieAllMovementCache,
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
        resourceHandler: ResourceHandler | undefined
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
    unTintSquaddieMapIcon: (
        repository: ObjectRepository,
        battleSquaddie: BattleSquaddie
    ) => {
        return unTintSquaddieMapIcon(repository, battleSquaddie)
    },
    drawPulsingCircleAtMapCoordinate: ({
        graphicsContext,
        mapCoordinate,
        camera,
        circleInfo,
    }: {
        graphicsContext: GraphicsBuffer
        camera: BattleCamera
        mapCoordinate: HexCoordinate
        circleInfo: {
            pulseColorForMapIcon: PulseColor
            circleHighlight: {
                radius: {
                    range: {
                        low: number
                        high: number
                    }
                    periodInMilliseconds: number
                    formula: PULSE_COLOR_FORMULA_TYPE
                }
                pulseColor: PulseColor
            }
        }
    }) => {
        const circleCenter =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate,
                cameraLocation: camera.getWorldLocation(),
            })

        const circleRadius = PulseColorService.calculatePulseAmount(
            circleInfo.circleHighlight.radius
        )
        const fillColor = PulseColorService.pulseColorToColor(
            circleInfo.circleHighlight.pulseColor
        )
        graphicsContext.push()
        graphicsContext.noStroke()
        graphicsContext.fill(
            fillColor[0],
            fillColor[1],
            fillColor[2],
            fillColor[3]
        )
        graphicsContext.circle(circleCenter.x, circleCenter.y, circleRadius * 2)
        graphicsContext.pop()
    },
    getMapIconLayout: ({
        objectRepository,
        actionTemplateId,
    }: {
        objectRepository: ObjectRepository
        actionTemplateId: string | undefined
    }) => {
        if (!actionTemplateId)
            return DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.targetOtherSquaddie

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            actionTemplateId
        )

        return ActionTemplateService.doesItTargetFoesFirst(actionTemplate)
            ? DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.targetFoeSquaddie
            : DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.targetOtherSquaddie
    },
    moveSquaddieOnMap: ({
        repository,
        squaddieMoveOnMapAnimations,
    }: {
        repository: ObjectRepository
        squaddieMoveOnMapAnimations: {
            [_: string]: SquaddieMoveOnMapAnimation
        }
    }) => {
        Object.entries(squaddieMoveOnMapAnimations).forEach(
            ([battleSquaddieId, squaddieMoveOnMapAnimation]) => {
                SquaddieMoveOnMapAnimationService.update(
                    squaddieMoveOnMapAnimation
                )

                const mapIcon =
                    ObjectRepositoryService.getImageUIByBattleSquaddieId({
                        repository,
                        battleSquaddieId: battleSquaddieId,
                    })
                setImageToLocation({
                    mapIcon,
                    screenLocation:
                        SquaddieMoveOnMapAnimationService.getScreenSquaddieScreenLocation(
                            squaddieMoveOnMapAnimation
                        ),
                })
            }
        )
    },
}

const tintSquaddieMapIconWhenTheyCannotAct = (
    squaddieRepository: ObjectRepository,
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie
) => {
    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation]
    const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId({
        repository: squaddieRepository,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
    })
    if (mapIcon) {
        mapIcon.setTint(
            squaddieAffiliationHue,
            DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.mapIconTintWhenCannotAct
                .saturation,
            DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.mapIconTintWhenCannotAct
                .brightness,
            DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.mapIconTintWhenCannotAct.alpha
        )
    }
}

const unTintSquaddieMapIcon = (
    repository: ObjectRepository,
    battleSquaddie: BattleSquaddie
) => {
    const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId({
        repository: repository,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        throwErrorIfNotFound: false,
    })
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
    resourceHandler: ResourceHandler | undefined
) => {
    const { x, y } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate,
            cameraLocation: camera.getWorldLocation(),
        })
    const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId({
        repository: squaddieRepository,
        battleSquaddieId: battleSquaddieId,
    })
    setImageToLocation({
        mapIcon,
        screenLocation: { x, y },
    })
    if (resourceHandler)
        mapIcon?.draw({ graphicsContext: graphics, resourceHandler })
    const { squaddieTemplate, battleSquaddie } =
        ObjectRepositoryService.getSquaddieByBattleId(
            squaddieRepository,
            battleSquaddieId
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
    mapIcon: ImageUI | undefined
    screenLocation: ScreenLocation
}) => {
    if (mapIcon == undefined) return
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

    const { unSpentActionPoints: actionPointsToShow } =
        SquaddieService.getActionPointSpend({
            battleSquaddie,
        })
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
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.ActionPointsBarRectangle20ths
                    .left) /
                20,
        top:
            y +
            (HEX_TILE_WIDTH *
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.ActionPointsBarRectangle20ths
                    .top) /
                20,
        width:
            (HEX_TILE_WIDTH *
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.ActionPointsBarRectangle20ths
                    .width) /
            20,
        height:
            (HEX_TILE_WIDTH *
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.ActionPointsBarRectangle20ths
                    .height) /
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
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.ActionPointsBarColors
                    .backgroundFillColor,
            strokeColor:
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.ActionPointsBarColors
                    .strokeColor,
            foregroundColor:
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.ActionPointsBarColors
                    .foregroundFillColor,
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
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.HitPointsBarRectangle20ths
                    .left) /
                20,
        top:
            y +
            (HEX_TILE_WIDTH *
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.HitPointsBarRectangle20ths
                    .top) /
                20,
        width:
            (HEX_TILE_WIDTH *
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.HitPointsBarRectangle20ths
                    .width) /
            20,
        height:
            (HEX_TILE_WIDTH *
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.HitPointsBarRectangle20ths
                    .height) /
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
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.HitPointsBarColors
                    .backgroundFillColor,
            strokeColor: [
                squaddieAffiliationHue,
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.HitPointsBarColors
                    .strokeColor[1],
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.HitPointsBarColors
                    .strokeColor[2],
            ],
            foregroundColor: [
                squaddieAffiliationHue,
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.HitPointsBarColors
                    .foregroundFillColor[1],
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.HitPointsBarColors
                    .foregroundFillColor[2],
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
    const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId({
        repository: squaddieRepository,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
    })

    setImageToLocation({ mapIcon, screenLocation: { x, y } })
}

const highlightPlayableSquaddieReachIfTheyCanAct = ({
    battleSquaddie,
    squaddieTemplate,
    missionMap,
    repository,
    squaddieAllMovementCache,
}: {
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
    missionMap: MissionMap
    repository: ObjectRepository
    squaddieAllMovementCache: SearchResultsCache
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
        squaddieAllMovementCache,
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

    DrawSquaddieIconOnMapUtilities.tintSquaddieMapIconWhenTheyCannotAct({
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
