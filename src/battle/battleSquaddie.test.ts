import {BattleSquaddie} from "./battleSquaddie";
import {SquaddieTurn} from "../squaddie/turn";
import {SquaddieId} from "../squaddie/id";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {InBattleAttributes} from "./stats/inBattleAttributes";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";

describe('BattleSquaddie', () => {
    it('throws an error if dynamic squaddie has no static ID', () => {
        const shouldThrowError = () => {
            new BattleSquaddie({
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
            const badDynamicSquaddie: BattleSquaddie = new BattleSquaddie({
                squaddieTemplateId: "squaddietemplateId",
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
    describe('attributes', () => {
        let staticSoldier: SquaddieTemplate;
        let dynamicSoldier: BattleSquaddie;

        beforeEach(() => {
            staticSoldier = new SquaddieTemplate({
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

        it('will give dynamic squaddie defaults', () => {
            dynamicSoldier = new BattleSquaddie({
                dynamicSquaddieId: "soldier_dynamic",
                squaddieTemplateId: staticSoldier.squaddieId.staticId,
            });

            const defaultInBattleAttributes: InBattleAttributes = new InBattleAttributes();

            expect(dynamicSoldier.inBattleAttributes).toStrictEqual(defaultInBattleAttributes);
        });

        it('will create in battle attributes based on the army attributes given', () => {
            expect(staticSoldier.attributes.maxHitPoints).toBe(5);
            expect(staticSoldier.attributes.armorClass).toBe(2);

            dynamicSoldier = new BattleSquaddie({
                dynamicSquaddieId: "soldier_dynamic",
                squaddieTemplateId: staticSoldier.squaddieId.staticId,
            });

            dynamicSoldier.initializeInBattleAttributes(staticSoldier.attributes);

            expect(dynamicSoldier.squaddieTemplateId).toBe(staticSoldier.squaddieId.staticId);
            expect(dynamicSoldier.inBattleAttributes.currentHitPoints).toBe(staticSoldier.attributes.maxHitPoints);
        });

        it('will create in battle attributes based on the static squaddie army attributes upon creation', () => {
            expect(staticSoldier.attributes.maxHitPoints).toBe(5);
            expect(staticSoldier.attributes.armorClass).toBe(2);

            dynamicSoldier = new BattleSquaddie({
                dynamicSquaddieId: "soldier_dynamic",
                squaddieTemplate: staticSoldier,
            });

            expect(dynamicSoldier.squaddieTemplateId).toBe(staticSoldier.squaddieId.staticId);
            expect(dynamicSoldier.inBattleAttributes.currentHitPoints).toBe(staticSoldier.attributes.maxHitPoints);
        });
    });
});
