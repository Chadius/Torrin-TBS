import {Integer} from "../hexMap/hexGrid";

export type PositiveNumber = number & { _brand: 'PositiveNumber' }
export function assertsPositiveNumber(value: number): asserts value is PositiveNumber {
  if(value < 0) throw new Error('Value must be a positive number');
}

export function assertsInteger(value: number): asserts value is Integer {
  if(Number.isInteger(value) !== true) throw new Error('Value must be an integer');
}
