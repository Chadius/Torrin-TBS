export type BlendColor = [number, number, number, number]

export type PulseBlendColor = {
    hue: number
    saturation: number
    brightness: number
    lowAlpha: number
    highAlpha: number
    periodAlpha: number
}

export const ColorUtils = {
    calculatePulseValueOverTime: ({
        low,
        high,
        periodInMilliseconds,
    }: {
        low: number
        high: number
        periodInMilliseconds: number
    }): number => calculatePulseValueOverTime(low, high, periodInMilliseconds),
    pulseBlendColorToBlendColor: (pulse: PulseBlendColor): BlendColor =>
        pulseBlendColorToBlendColor(pulse),
}

const calculatePulseValueOverTime = (
    low: number,
    high: number,
    periodInMilliseconds: number
): number => {
    const millisecondsSinceEpoch = Date.now()

    const base = (high + low) / 2
    const amplitude = (high - low) / 2

    return (
        Math.sin(
            (millisecondsSinceEpoch * (Math.PI * 2)) / periodInMilliseconds
        ) *
            amplitude +
        base
    )
}

const pulseBlendColorToBlendColor = (pulse: PulseBlendColor): BlendColor =>
    [
        pulse.hue,
        pulse.saturation,
        pulse.brightness,
        calculatePulseValueOverTime(
            pulse.lowAlpha,
            pulse.highAlpha,
            pulse.periodAlpha
        ),
    ] as BlendColor
