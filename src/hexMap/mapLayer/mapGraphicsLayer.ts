import {
    HexCoordinate,
    HexCoordinateService,
} from "../hexCoordinate/hexCoordinate"
import { PulseColor } from "../pulseColor"

import { HighlightCoordinateDescription } from "../highlightCoordinateDescription"

export interface MapGraphicsLayerHighlight {
    coordinate: HexCoordinate
    pulseColor: PulseColor
}

export enum MapGraphicsLayerType {
    UNKNOWN = "UNKNOWN",
    CLICKED_ON_CONTROLLABLE_SQUADDIE = "CLICKED_ON_CONTROLLABLE_SQUADDIE",
    CLICKED_ON_NORMALLY_UNCONTROLLABLE_SQUADDIE = "CLICKED_ON_NORMALLY_UNCONTROLLABLE_SQUADDIE",
    HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE = "HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE",
}

export const MapGraphicsLayerSquaddieTypes = [
    MapGraphicsLayerType.HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE,
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
        return HexCoordinateService.includes(
            mapGraphicsLayer.highlights.map((highlight) => ({
                q: highlight.coordinate.q,
                r: highlight.coordinate.r,
            })),
            coordinate
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
        }))
    mapGraphicsLayer.highlights.push(...highlights)
}
