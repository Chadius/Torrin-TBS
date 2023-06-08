import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {InBattleAttributes} from "./inBattleAttributes";

describe('inBattleAttributes', () => {
    it('starts with the same hit points as maximum', () => {
        const soldierAttributes: ArmyAttributes = new ArmyAttributes({
            maxHitPoints: 3,
            armorClass: 3,
        });

        const inBattleAttributes: InBattleAttributes = new InBattleAttributes(soldierAttributes);

        expect(inBattleAttributes.currentHitPoints).toBe(soldierAttributes.maxHitPoints)
    });
});
