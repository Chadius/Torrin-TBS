import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { PulseBlendColor } from "./colorUtils"
import { HighlightTileDescription } from "./terrainTileMap"
import { isValidValue } from "../utils/validityCheck"

export interface MapGraphicsLayerHighlight {
    location: HexCoordinate
    pulseColor: PulseBlendColor
    overlayImageResourceName: string
}

export enum MapGraphicsLayerType {
    UNKNOWN = "UNKNOWN",
    CLICKED_ON_CONTROLLABLE_SQUADDIE = "CLICKED_ON_CONTROLLABLE_SQUADDIE",
    CLICKED_ON_NORMALLY_UNCONTROLLABLE_SQUADDIE = "CLICKED_ON_NORMALLY_UNCONTROLLABLE_SQUADDIE",
    HOVERED_OVER_CONTROLLABLE_SQUADDIE = "HOVERED_OVER_CONTROLLABLE_SQUADDIE",
    HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE = "HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE",
}

export const MapGraphicsLayerSquaddieTypes = [
    MapGraphicsLayerType.HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE,
    MapGraphicsLayerType.HOVERED_OVER_CONTROLLABLE_SQUADDIE,
    MapGraphicsLayerType.CLICKED_ON_NORMALLY_UNCONTROLLABLE_SQUADDIE,
    MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
]

export interface MapGraphicsLayer {
    id: string
    overlayImageResourceNames: string[]
    highlights: MapGraphicsLayerHighlight[]
    type: MapGraphicsLayerType
}

export const MapGraphicsLayerService = {
    new: ({
        id,
        highlightedTileDescriptions,
        type,
    }: {
        id: string
        type: MapGraphicsLayerType
        highlightedTileDescriptions?: HighlightTileDescription[]
    }): MapGraphicsLayer => {
        const mapGraphicsLayer: MapGraphicsLayer = {
            id,
            overlayImageResourceNames: [],
            type,
            highlights: [],
        }
        if (highlightedTileDescriptions) {
            highlightedTileDescriptions.forEach((description) => {
                addHighlightedTileDescription(mapGraphicsLayer, description)
            })
        }
        return mapGraphicsLayer
    },
    getHighlights: (
        mapGraphicsLayer: MapGraphicsLayer
    ): MapGraphicsLayerHighlight[] => mapGraphicsLayer.highlights,
    getHighlightedTileDescriptions: (
        mapGraphicsLayer: MapGraphicsLayer,
        locationsToExclude?: HexCoordinate[]
    ): HighlightTileDescription[] =>
        mapGraphicsLayer.overlayImageResourceNames
            .map((overlayImageResourceName) => {
                const firstHighlight = mapGraphicsLayer.highlights.find(
                    (highlight) =>
                        highlight.overlayImageResourceName ===
                        overlayImageResourceName
                )
                if (!isValidValue(firstHighlight)) {
                    return undefined
                }

                const pulseColor = firstHighlight.pulseColor
                return {
                    tiles: mapGraphicsLayer.highlights
                        .filter(
                            (highlight) =>
                                highlight.overlayImageResourceName ===
                                overlayImageResourceName
                        )
                        .filter((highlight) => {
                            if (
                                !isValidValue(locationsToExclude) ||
                                locationsToExclude.length === 0
                            ) {
                                return true
                            }

                            return !locationsToExclude.some(
                                (locationToExclude) =>
                                    locationToExclude.q ===
                                        highlight.location.q &&
                                    locationToExclude.r === highlight.location.r
                            )
                        })
                        .map((highlight) => highlight.location),
                    pulseColor,
                    overlayImageResourceName,
                }
            })
            .filter((x) => x)
            .filter((description) => description.tiles.length > 0),
    addHighlightedTileDescription: (
        mapGraphicsLayer: MapGraphicsLayer,
        highlightedTileDescription: HighlightTileDescription
    ) =>
        addHighlightedTileDescription(
            mapGraphicsLayer,
            highlightedTileDescription
        ),
    hasLocation: (
        mapGraphicsLayer: MapGraphicsLayer,
        location: HexCoordinate
    ): boolean => {
        return mapGraphicsLayer.highlights.some(
            (highlight) =>
                highlight.location.q === location.q &&
                highlight.location.r === location.r
        )
    },
    getLocations: (mapGraphicsLayer: MapGraphicsLayer): HexCoordinate[] =>
        mapGraphicsLayer.highlights.map((highlight) => highlight.location),
}

const addHighlightedTileDescription = (
    mapGraphicsLayer: MapGraphicsLayer,
    highlightedTileDescription: HighlightTileDescription
) => {
    const highlights: MapGraphicsLayerHighlight[] =
        highlightedTileDescription.tiles.map((location) => ({
            location,
            pulseColor: highlightedTileDescription.pulseColor,
            overlayImageResourceName:
                highlightedTileDescription.overlayImageResourceName,
        }))
    mapGraphicsLayer.highlights.push(...highlights)

    if (
        !mapGraphicsLayer.overlayImageResourceNames.includes(
            highlightedTileDescription.overlayImageResourceName
        )
    ) {
        mapGraphicsLayer.overlayImageResourceNames.push(
            highlightedTileDescription.overlayImageResourceName
        )
    }
}
