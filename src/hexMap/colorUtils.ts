export type BlendColor = [number, number, number, number];

export type PulseBlendColor = {
  hue: number,
  saturation: number,
  brightness: number,
  lowAlpha: number,
  highAlpha: number,
  periodAlpha: number,
};

export function calculatePulseValueOverTime(low: number, high: number, periodInMilliseconds: number): number {
  const millisecondsSinceEpoch = Date.now();

  const base = (high + low) / 2;
  const amplitude = (high - low) / 2;

  return Math.sin(
    millisecondsSinceEpoch * (Math.PI * 2) / periodInMilliseconds
  ) * amplitude + base;
}

export function pulseBlendColorToBlendColor(pulse: PulseBlendColor): BlendColor {
  return [
    pulse.hue,
    pulse.saturation,
    pulse.brightness,
    calculatePulseValueOverTime(
      pulse.lowAlpha,
      pulse.highAlpha,
      pulse.periodAlpha,
    )
  ] as BlendColor;
}
