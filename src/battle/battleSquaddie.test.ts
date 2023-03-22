import {assertBattleSquaddieDynamic, BattleSquaddieDynamic} from "./battleSquaddie";
import {SquaddieTurn} from "../squaddie/turn";

describe('BattleSquaddie', () => {
    it('throws an error if non integer coordinates are used for dynamic placement', () => {
        const shouldThrowError = () => {
            const badDynamicSquaddie: BattleSquaddieDynamic = {
                staticSquaddieId: "static squaddie",
                mapLocation: {q: 0.5, r: 1},
                squaddieTurn: new SquaddieTurn(),
            }
            assertBattleSquaddieDynamic(badDynamicSquaddie);
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Value must be an integer: 0.5");
    });
    it('throws an error if dynamic squaddie has no static ID', () => {
        const shouldThrowError = () => {
            const badDynamicSquaddie: BattleSquaddieDynamic = {
                staticSquaddieId: "",
                mapLocation: {q: 0, r: 1},
                squaddieTurn: new SquaddieTurn(),
            }
            assertBattleSquaddieDynamic(badDynamicSquaddie);
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Dynamic Squaddie has no Static Squaddie Id");
    });
});