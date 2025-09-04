export type BlendColor = [number, number, number, number]

export const PULSE_COLOR_FORMULA = {
    SINE: "SINE",
    LINEAR: "LINEAR",
} as const satisfies Record<string, string>
export type PULSE_COLOR_FORMULA_TYPE = EnumLike<typeof PULSE_COLOR_FORMULA>

type LowHighRange = { low: number; high: number }

export interface PulseColor {
    hue: number | LowHighRange
    saturation: number | LowHighRange
    brightness: number | LowHighRange
    alpha: number | LowHighRange
    pulse: {
        period: number
        formula: PULSE_COLOR_FORMULA_TYPE
    }
}

export const PulseColorService = {
    pulseColorToColor: (pulseBlendColor: PulseColor): BlendColor => {
        return [
            calculatePulseAmount({
                range: pulseBlendColor.hue,
                periodInMilliseconds: pulseBlendColor.pulse.period,
                formulaType: pulseBlendColor.pulse.formula,
            }),
            calculatePulseAmount({
                range: pulseBlendColor.saturation,
                periodInMilliseconds: pulseBlendColor.pulse.period,
                formulaType: pulseBlendColor.pulse.formula,
            }),
            calculatePulseAmount({
                range: pulseBlendColor.brightness,
                periodInMilliseconds: pulseBlendColor.pulse.period,
                formulaType: pulseBlendColor.pulse.formula,
            }),
            calculatePulseAmount({
                range: pulseBlendColor.alpha,
                periodInMilliseconds: pulseBlendColor.pulse.period,
                formulaType: pulseBlendColor.pulse.formula,
            }),
        ]
    },
    calculatePulseAmount: ({
        range,
        periodInMilliseconds,
        formula,
    }: {
        range: number | LowHighRange
        periodInMilliseconds: number
        formula: PULSE_COLOR_FORMULA_TYPE
    }): number =>
        calculatePulseAmount({
            range,
            periodInMilliseconds,
            formulaType: formula,
        }),
    new: ({
        hue,
        saturation,
        brightness,
        pulse,
        alpha,
    }: {
        hue: number | LowHighRange
        saturation: number | LowHighRange
        brightness: number | LowHighRange
        alpha: number | LowHighRange
        pulse: { period: number; formula: PULSE_COLOR_FORMULA_TYPE }
    }): PulseColor => ({
        hue,
        saturation,
        brightness,
        alpha,
        pulse,
    }),
}

const calculatePulseAmount = ({
    range,
    periodInMilliseconds,
    formulaType,
}: {
    range: number | LowHighRange
    periodInMilliseconds: number
    formulaType: PULSE_COLOR_FORMULA_TYPE
}): number => {
    if (typeof range === "number") {
        return range
    }

    return useFormulaOnTimeElapsed({
        ...range,
        periodInMilliseconds,
        formulaType: formulaType,
    })
}

const useFormulaOnTimeElapsed = ({
    low,
    high,
    formulaType,
    periodInMilliseconds,
}: {
    low: number
    high: number
    formulaType: PULSE_COLOR_FORMULA_TYPE
    periodInMilliseconds: number
}) => {
    switch (formulaType) {
        case PULSE_COLOR_FORMULA.SINE:
            return useSineFormulaOnTimeElapsed({
                low,
                high,
                periodInMilliseconds,
            })
        case PULSE_COLOR_FORMULA.LINEAR:
            return (
                ((high - low) / periodInMilliseconds) *
                    (Date.now() % periodInMilliseconds) +
                low
            )
        default:
            return 0
    }
}

const useSineFormulaOnTimeElapsed = ({
    low,
    high,
    periodInMilliseconds,
}: {
    low: number
    high: number
    periodInMilliseconds: number
}) => {
    const sine = Math.sin((Date.now() * (Math.PI * 2)) / periodInMilliseconds)
    const base = (high + low) / 2
    const amplitude = (high - low) / 2
    return sine * amplitude + base
}
