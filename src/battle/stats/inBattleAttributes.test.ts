import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {InBattleAttributes} from "./inBattleAttributes";
import {DamageType} from "../../squaddie/squaddieService";

describe('inBattleAttributes', () => {
    it('starts with the same hit points as maximum', () => {
        const soldierAttributes: ArmyAttributes = new ArmyAttributes({
            maxHitPoints: 3,
            armorClass: 3,
        });

        const inBattleAttributes: InBattleAttributes = new InBattleAttributes(soldierAttributes);

        expect(inBattleAttributes.currentHitPoints).toBe(soldierAttributes.maxHitPoints)
    });
    it('takes damage', () => {
        const soldierAttributes: ArmyAttributes = new ArmyAttributes({
            maxHitPoints: 3,
            armorClass: 3,
        });

        const inBattleAttributes: InBattleAttributes = new InBattleAttributes(soldierAttributes);
        const actualDamageTaken = inBattleAttributes.takeDamage(2, DamageType.Body);

        expect(actualDamageTaken).toBe(2);
        expect(inBattleAttributes.currentHitPoints).toBe(soldierAttributes.maxHitPoints - actualDamageTaken);
    });
    it('cannot take more than maximum hit points of damage', () => {
        const soldierAttributes: ArmyAttributes = new ArmyAttributes({
            maxHitPoints: 3,
            armorClass: 3,
        });

        const inBattleAttributes: InBattleAttributes = new InBattleAttributes(soldierAttributes);
        const actualDamageTaken = inBattleAttributes.takeDamage(9001, DamageType.Body);

        expect(actualDamageTaken).toBe(soldierAttributes.maxHitPoints);
        expect(inBattleAttributes.currentHitPoints).toBe(0);
    });
    it('receive healing up to maximum', () => {
        const soldierAttributes: ArmyAttributes = new ArmyAttributes({
            maxHitPoints: 3,
            armorClass: 3,
        });

        const inBattleAttributes: InBattleAttributes = new InBattleAttributes(soldierAttributes);
        inBattleAttributes.takeDamage(2, DamageType.Body);

        const actualAmountHealed = inBattleAttributes.receiveHealing(9001);

        expect(actualAmountHealed).toBe(2);
        expect(inBattleAttributes.currentHitPoints).toBe(soldierAttributes.maxHitPoints);
    });

});
