import {ArmyAttributes, ArmyAttributesHelper} from "./armyAttributes";

describe('sanitize', () => {
    it('can be sanitized to fill in missing fields', () => {
        const attributesWithMissingFields: ArmyAttributes = {
            maxHitPoints: NaN,
            armorClass: null,
            movement: undefined,
        };
        ArmyAttributesHelper.sanitize(attributesWithMissingFields);
        const defaultAttributes = ArmyAttributesHelper.default();

        expect(attributesWithMissingFields.maxHitPoints).toEqual(defaultAttributes.maxHitPoints);
        expect(attributesWithMissingFields.armorClass).toEqual(defaultAttributes.armorClass);
        expect(attributesWithMissingFields.movement).toEqual(defaultAttributes.movement);
    });
    it('will sanitize and give default maximum hit points if maxHitPoints is non positive', () => {
        const attributesWithNoHitPoints: ArmyAttributes = {
            maxHitPoints: 0,
            armorClass: null,
            movement: undefined,
        };
        ArmyAttributesHelper.sanitize(attributesWithNoHitPoints);
        const defaultAttributes = ArmyAttributesHelper.default();

        expect(attributesWithNoHitPoints.maxHitPoints).toEqual(defaultAttributes.maxHitPoints);
    });
});
