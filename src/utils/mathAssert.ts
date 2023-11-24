import {Integer} from "../hexMap/hexGrid";

export type NonNegativeNumber = number & {
    _brand: 'PositiveNumber'
}

export function assertsNonNegativeNumber(value: number): asserts value is NonNegativeNumber {
    if (value < 0) throw new Error(`Value must be a non negative number: ${value}`);
}

export function assertsInteger(value: number): asserts value is Integer {
    if (Number.isInteger(value) !== true) throw new Error(`Value must be an integer: ${value}`);
}
