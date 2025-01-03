import { CoordinateGeneratorShape } from "../battle/targeting/coordinateGenerator"

export interface TargetConstraints {
    minimumRange: number
    maximumRange: number
    coordinateGeneratorShape: CoordinateGeneratorShape
}

export const TargetConstraintsService = {
    new: ({
        minimumRange,
        maximumRange,
        coordinateGeneratorShape,
    }: {
        minimumRange?: number
        maximumRange?: number
        coordinateGeneratorShape?: CoordinateGeneratorShape
    }): TargetConstraints => ({
        minimumRange: Math.max(
            Math.min(minimumRange ?? 0, maximumRange ?? 0),
            0
        ),
        maximumRange: Math.max(
            Math.max(minimumRange ?? 0, maximumRange ?? 0),
            0
        ),
        coordinateGeneratorShape:
            coordinateGeneratorShape ?? CoordinateGeneratorShape.BLOOM,
    }),
}
