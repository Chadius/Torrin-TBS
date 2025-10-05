import {
    CoordinateGeneratorShape,
    TCoordinateGeneratorShape,
} from "../battle/targeting/coordinateGenerator"
import { EnumLike } from "../utils/enum"

export const ActionRange = {
    SELF: "SELF",
    MELEE: "MELEE",
    REACH: "REACH",
    SHORT: "SHORT",
    MEDIUM: "MEDIUM",
    LONG: "LONG",
} as const satisfies Record<string, string>

export type TActionRange = EnumLike<typeof ActionRange>

const TileRangeByActionRange: {
    [a in TActionRange]: { minimum: number; maximum: number }
} = {
    [ActionRange.SELF]: { minimum: 0, maximum: 0 },
    [ActionRange.MELEE]: { minimum: 0, maximum: 1 },
    [ActionRange.REACH]: { minimum: 0, maximum: 2 },
    [ActionRange.SHORT]: { minimum: 0, maximum: 3 },
    [ActionRange.MEDIUM]: { minimum: 0, maximum: 4 },
    [ActionRange.LONG]: { minimum: 0, maximum: 6 },
}

export interface TargetConstraints {
    range: TActionRange
    coordinateGeneratorShape: TCoordinateGeneratorShape
}

export const TargetConstraintsService = {
    new: ({
        range,
        coordinateGeneratorShape,
    }: {
        coordinateGeneratorShape?: TCoordinateGeneratorShape
        range?: TActionRange
    }): TargetConstraints => ({
        range: range ?? ActionRange.SELF,
        coordinateGeneratorShape:
            coordinateGeneratorShape ?? CoordinateGeneratorShape.BLOOM,
    }),
    // TODO use this to determine if attacks are in range
    isInRange: ({
        constraints,
        distance,
    }: {
        constraints: TargetConstraints
        distance: number
    }): boolean => {
        if (constraints == undefined) {
            throw new Error(
                "[TargetConstraintsService.isInRange] constraints must be defined"
            )
        }
        return (
            distance >= TileRangeByActionRange[constraints.range].minimum &&
            distance <= TileRangeByActionRange[constraints.range].maximum
        )
    },
    getRangeDistance: (constraints: TargetConstraints) => {
        if (constraints == undefined) {
            throw new Error(
                "[TargetConstraintsService.getRangeDistance] constraints must be defined"
            )
        }
        return [
            TileRangeByActionRange[constraints.range].minimum,
            TileRangeByActionRange[constraints.range].maximum,
        ]
    },
    getDistanceDescriptor: (constraints: TargetConstraints) => {
        if (constraints == undefined) {
            throw new Error(
                "[TargetConstraintsService.getRangeDistance] constraints must be defined"
            )
        }

        switch (constraints.range) {
            case ActionRange.SELF:
                return "Self Only"
            case ActionRange.MELEE:
                return "Melee"
            case ActionRange.REACH:
                return "Reach (0-2)"
            case ActionRange.SHORT:
                return "Short (0-3)"
            case ActionRange.MEDIUM:
                return "Medium (0-4)"
            case ActionRange.LONG:
                return "Long (0-6)"
            default:
                throw new Error(
                    `[TargetConstraintsService.getDistanceDescriptor] Unknown range ${constraints.range}`
                )
        }
    },
}
