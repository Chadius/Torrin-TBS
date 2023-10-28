import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {InBattleAttributes, InBattleAttributesHandler} from "./inBattleAttributes";
import {DamageType} from "../../squaddie/squaddieService";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";

describe('inBattleAttributes', () => {
    it('starts with the same hit points as maximum', () => {
        const soldierAttributes: ArmyAttributes = {
            maxHitPoints: 3,
            armorClass: 3,
            movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
        };

        const inBattleAttributes: InBattleAttributes = InBattleAttributesHandler.new(soldierAttributes);

        expect(inBattleAttributes.currentHitPoints).toBe(soldierAttributes.maxHitPoints)
    });
    it('takes damage', () => {
        const soldierAttributes: ArmyAttributes = {
            maxHitPoints: 3,
            armorClass: 3,
            movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
        };

        const inBattleAttributes: InBattleAttributes = InBattleAttributesHandler.new(soldierAttributes);
        const actualDamageTaken = InBattleAttributesHandler.takeDamage(inBattleAttributes, 2, DamageType.Body);

        expect(actualDamageTaken).toBe(2);
        expect(inBattleAttributes.currentHitPoints).toBe(soldierAttributes.maxHitPoints - actualDamageTaken);
    });
    it('cannot take more than maximum hit points of damage', () => {
        const soldierAttributes: ArmyAttributes = {
            maxHitPoints: 3,
            armorClass: 3,
            movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
        };

        const inBattleAttributes: InBattleAttributes = InBattleAttributesHandler.new(soldierAttributes);
        const actualDamageTaken = InBattleAttributesHandler.takeDamage(inBattleAttributes, 9001, DamageType.Body);

        expect(actualDamageTaken).toBe(soldierAttributes.maxHitPoints);
        expect(inBattleAttributes.currentHitPoints).toBe(0);
    });
    it('receive healing up to maximum', () => {
        const soldierAttributes: ArmyAttributes = {
            maxHitPoints: 3,
            armorClass: 3,
            movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
        };

        const inBattleAttributes: InBattleAttributes = InBattleAttributesHandler.new(soldierAttributes);
        InBattleAttributesHandler.takeDamage(inBattleAttributes, 2, DamageType.Body);
        const actualAmountHealed = InBattleAttributesHandler.receiveHealing(inBattleAttributes, 9001);

        expect(actualAmountHealed).toBe(2);
        expect(inBattleAttributes.currentHitPoints).toBe(soldierAttributes.maxHitPoints);
    });

});
