import {BattleSquaddieDynamic, BattleSquaddieStatic, canPlayerControlSquaddieRightNow} from "./battleSquaddie";
import {SquaddieTurn} from "../squaddie/turn";
import {SquaddieId} from "../squaddie/id";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";

describe('BattleSquaddie', () => {
    it('throws an error if dynamic squaddie has no static ID', () => {
        const shouldThrowError = () => {
            const badDynamicSquaddie: BattleSquaddieDynamic = new BattleSquaddieDynamic({
                dynamicSquaddieId: "dynamicSquaddieId",
                staticSquaddieId: "",
                squaddieTurn: new SquaddieTurn(),
            })
            badDynamicSquaddie.assertBattleSquaddieDynamic();
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Dynamic Squaddie has no Static Squaddie Id");
    });
    it('throws an error if dynamic squaddie has no dynamic ID', () => {
        const shouldThrowError = () => {
            const badDynamicSquaddie: BattleSquaddieDynamic = new BattleSquaddieDynamic({
                staticSquaddieId: "staticSquaddieId",
                dynamicSquaddieId: "",
                squaddieTurn: new SquaddieTurn(),
            })
            badDynamicSquaddie.assertBattleSquaddieDynamic();
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Dynamic Squaddie has no Dynamic Squaddie Id");
    });
    describe('squaddie can act', () => {
        it('knows the squaddie can act at the start of the round', () => {
            const newTurnSquaddie: BattleSquaddieDynamic = new BattleSquaddieDynamic({
                dynamicSquaddieId: "dynamic_squaddie",
                staticSquaddieId: "static squaddie",
                squaddieTurn: new SquaddieTurn(),
            });

            expect(newTurnSquaddie.canStillActThisRound()).toBeTruthy();
            newTurnSquaddie.squaddieTurn.spendNumberActions(3);
            expect(newTurnSquaddie.canStillActThisRound()).toBeFalsy();
            newTurnSquaddie.beginNewRound();
            expect(newTurnSquaddie.canStillActThisRound()).toBeTruthy();
        })
    });
    describe('player control', () => {
        let playerStaticSquaddie: BattleSquaddieStatic;
        let newTurnDynamicSquaddie: BattleSquaddieDynamic;
        beforeEach(() => {
            playerStaticSquaddie = new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    name: "player_static_squaddie",
                    staticId: "static_squaddie",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            });
            newTurnDynamicSquaddie = new BattleSquaddieDynamic({
                dynamicSquaddieId: "dynamic_squaddie",
                staticSquaddieId: "static_squaddie",
                squaddieTurn: new SquaddieTurn(),
            });
        });
        it('knows the player can control the squaddie', () => {
            expect(canPlayerControlSquaddieRightNow(playerStaticSquaddie, newTurnDynamicSquaddie)).toBeTruthy();
        });
        it('knows the player cannot control a squaddie without actions', () => {
            newTurnDynamicSquaddie.endTurn();
            expect(canPlayerControlSquaddieRightNow(playerStaticSquaddie, newTurnDynamicSquaddie)).toBeFalsy();
        });
        it('knows the player can only control Player Affiliated squaddies', () => {
            const enemyStaticSquaddie: BattleSquaddieStatic = new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    name: "enemy_static_squaddie",
                    staticId: "static_squaddie",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            });

            expect(canPlayerControlSquaddieRightNow(enemyStaticSquaddie, newTurnDynamicSquaddie)).toBeFalsy();
        });
    });
});
