import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { PulseBlendColor } from "./colorUtils"
import { HighlightTileDescription } from "./terrainTileMap"
import { isValidValue } from "../utils/validityCheck"

export interface MapGraphicsLayerHighlight {
    location: HexCoordinate
    pulseColor: PulseBlendColor
    overlayImageResourceName: string
}

export interface MapGraphicsLayer {
    id: string
    overlayImageResourceNames: string[]
    highlights: MapGraphicsLayerHighlight[]
}

export const MapGraphicsLayerService = {
    new: ({
        id,
        highlightedTileDescriptions,
    }: {
        id: string
        highlightedTileDescriptions?: HighlightTileDescription[]
    }): MapGraphicsLayer => {
        const mapGraphicsLayer: MapGraphicsLayer = {
            id,
            overlayImageResourceNames: [],
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
