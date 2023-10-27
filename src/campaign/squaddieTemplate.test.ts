import {SquaddieTemplate} from "./squaddieTemplate";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {ArmyAttributes, DefaultArmyAttributes} from "../squaddie/armyAttributes";
import {NewDummySquaddieID} from "../utils/test/squaddie";

describe('Squaddie Template', () => {
    describe('attributes', () => {
        it('will give static squaddie defaults', () => {
            const squaddieWithoutAttributes: SquaddieTemplate = new SquaddieTemplate({
                squaddieId: NewDummySquaddieID("id", SquaddieAffiliation.PLAYER),
            });

            const defaultAttributes: ArmyAttributes = DefaultArmyAttributes();

            expect(squaddieWithoutAttributes.attributes).toStrictEqual(defaultAttributes);
        });
    });
});
