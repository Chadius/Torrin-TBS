import {BattleSquaddieDynamic, BattleSquaddieStatic, canPlayerControlSquaddieRightNow} from "./battleSquaddie";
import {SquaddieTurn} from "../squaddie/turn";
import {SquaddieId} from "../squaddie/id";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {InBattleAttributes} from "./stats/inBattleAttributes";
import {NewDummySquaddieID} from "../utils/test/squaddie";

describe('BattleSquaddie', () => {
    it('throws an error if dynamic squaddie has no static ID', () => {
        const shouldThrowError = () => {
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "dynamicSquaddieId",
            })
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
    describe('attributes', () => {
        let staticSoldier: BattleSquaddieStatic;
        let dynamicSoldier: BattleSquaddieDynamic;

        beforeEach(() => {
            staticSoldier = new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    staticId: "soldier_static",
                    name: "Soldier",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                attributes: new ArmyAttributes({
                    maxHitPoints: 5,
                    armorClass: 2,
                })
            });
        });

        it('will give static squaddie defaults', () => {
            const squaddieWithoutAttributes: BattleSquaddieStatic = new BattleSquaddieStatic({
                squaddieId: NewDummySquaddieID("id", SquaddieAffiliation.PLAYER),
            });

            const defaultAttributes: ArmyAttributes = new ArmyAttributes();

            expect(squaddieWithoutAttributes.attributes).toStrictEqual(defaultAttributes);
        });

        it('will give dynamic squaddie defaults', () => {
            dynamicSoldier = new BattleSquaddieDynamic({
                dynamicSquaddieId: "soldier_dynamic",
                staticSquaddieId: staticSoldier.squaddieId.staticId,
            });

            const defaultInBattleAttributes: InBattleAttributes = new InBattleAttributes();

            expect(dynamicSoldier.inBattleAttributes).toStrictEqual(defaultInBattleAttributes);
        });

        it('will create in battle attributes based on the army attributes given', () => {
            expect(staticSoldier.attributes.maxHitPoints).toBe(5);
            expect(staticSoldier.attributes.armorClass).toBe(2);

            dynamicSoldier = new BattleSquaddieDynamic({
                dynamicSquaddieId: "soldier_dynamic",
                staticSquaddieId: staticSoldier.squaddieId.staticId,
            });

            dynamicSoldier.initializeInBattleAttributes(staticSoldier.attributes);

            expect(dynamicSoldier.staticSquaddieId).toBe(staticSoldier.squaddieId.staticId);
            expect(dynamicSoldier.inBattleAttributes.currentHitPoints).toBe(staticSoldier.attributes.maxHitPoints);
        });

        it('will create in battle attributes based on the static squaddie army attributes upon creation', () => {
            expect(staticSoldier.attributes.maxHitPoints).toBe(5);
            expect(staticSoldier.attributes.armorClass).toBe(2);

            dynamicSoldier = new BattleSquaddieDynamic({
                dynamicSquaddieId: "soldier_dynamic",
                staticSquaddie: staticSoldier,
            });

            expect(dynamicSoldier.staticSquaddieId).toBe(staticSoldier.squaddieId.staticId);
            expect(dynamicSoldier.inBattleAttributes.currentHitPoints).toBe(staticSoldier.attributes.maxHitPoints);
        });
    });
});
