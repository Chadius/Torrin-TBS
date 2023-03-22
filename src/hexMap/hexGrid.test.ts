import {HexGridTile} from "./hexGrid";
import {HexGridMovementCost} from "./hexGridMovementCost";

describe('HexGrid', () => {
    it('throws an error if non integer coordinates are used', () => {
        const shouldThrowError = () => {
            new HexGridTile(
                5.5,
                4.5,
                HexGridMovementCost.singleMovement
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Value must be an integer: 5.5");
    });
});