import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { PulseBlendColor } from "./colorUtils"
import { HighlightCoordinateDescription } from "./terrainTileMap"
import { isValidValue } from "../utils/validityCheck"

export interface MapGraphicsLayerHighlight {
    coordinate: HexCoordinate
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
        highlightedTileDescriptions?: HighlightCoordinateDescription[]
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
        coordinatesToExclude?: HexCoordinate[]
    ): HighlightCoordinateDescription[] =>
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
                    coordinates: mapGraphicsLayer.highlights
                        .filter(
                            (highlight) =>
                                highlight.overlayImageResourceName ===
                                overlayImageResourceName
                        )
                        .filter((highlight) => {
                            if (
                                !isValidValue(coordinatesToExclude) ||
                                coordinatesToExclude.length === 0
                            ) {
                                return true
                            }

                            return !coordinatesToExclude.some(
                                (coordinateToExclude) =>
                                    coordinateToExclude.q ===
                                        highlight.coordinate.q &&
                                    coordinateToExclude.r ===
                                        highlight.coordinate.r
                            )
                        })
                        .map((highlight) => highlight.coordinate),
                    pulseColor,
                    overlayImageResourceName,
                }
            })
            .filter((x) => x)
            .filter((description) => description.coordinates.length > 0),
    addHighlightedTileDescription: (
        mapGraphicsLayer: MapGraphicsLayer,
        highlightedTileDescription: HighlightCoordinateDescription
    ) =>
        addHighlightedTileDescription(
            mapGraphicsLayer,
            highlightedTileDescription
        ),
    hasCoordinate: (
        mapGraphicsLayer: MapGraphicsLayer,
        coordinate: HexCoordinate
    ): boolean => {
        return mapGraphicsLayer.highlights.some(
            (highlight) =>
                highlight.coordinate.q === coordinate.q &&
                highlight.coordinate.r === coordinate.r
        )
    },
    getCoordinates: (mapGraphicsLayer: MapGraphicsLayer): HexCoordinate[] =>
        mapGraphicsLayer.highlights.map((highlight) => highlight.coordinate),
}

const addHighlightedTileDescription = (
    mapGraphicsLayer: MapGraphicsLayer,
    highlightedTileDescription: HighlightCoordinateDescription
) => {
    const highlights: MapGraphicsLayerHighlight[] =
        highlightedTileDescription.coordinates.map((coordinate) => ({
            coordinate: coordinate,
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
