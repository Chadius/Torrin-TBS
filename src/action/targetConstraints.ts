import { TargetingShape } from "../battle/targeting/targetingShapeGenerator"

export interface TargetConstraints {
    minimumRange: number
    maximumRange: number
    targetingShape: TargetingShape
}

export const TargetConstraintsService = {
    new: ({
        minimumRange,
        maximumRange,
        targetingShape,
    }: {
        minimumRange?: number
        maximumRange?: number
        targetingShape?: TargetingShape
    }): TargetConstraints => ({
        minimumRange: Math.max(
            Math.min(minimumRange ?? 0, maximumRange ?? 0),
            0
        ),
        maximumRange: Math.max(
            Math.max(minimumRange ?? 0, maximumRange ?? 0),
            0
        ),
        targetingShape: targetingShape ?? TargetingShape.SNAKE,
    }),
}
