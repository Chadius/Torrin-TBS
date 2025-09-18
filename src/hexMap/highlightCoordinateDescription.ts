import {
    HexCoordinate,
    HexCoordinateService,
} from "./hexCoordinate/hexCoordinate"
import { PulseColor } from "./pulseColor"

export type HighlightCoordinateDescription = {
    coordinates: HexCoordinate[]
    pulseColor: PulseColor
}

export const HighlightCoordinateDescriptionService = {
    areEqual: (
        a: HighlightCoordinateDescription | undefined,
        b: HighlightCoordinateDescription | undefined
    ): boolean => {
        if (a == undefined || b == undefined) return false
        if (a.pulseColor != b.pulseColor) return false
        if (a.coordinates.length != b.coordinates.length) return false
        return a.coordinates.every((aCoordinate) =>
            b.coordinates.some((bCoordinate) =>
                HexCoordinateService.areEqual(aCoordinate, bCoordinate)
            )
        )
    },
}
