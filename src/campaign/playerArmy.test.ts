import {PlayerArmy, PlayerArmyHelper} from "./playerArmy";
import {SquaddieTemplateHelper} from "./squaddieTemplate";
import {SquaddieIdHelper} from "../squaddie/id";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";

describe('Player Army', () => {
    describe('sanitization', () => {
        it('creates empty player templates if it is missing', () => {
            const army: PlayerArmy = {
                squaddieTemplates: undefined
            };
            PlayerArmyHelper.sanitize(army);
            expect(army.squaddieTemplates).toHaveLength(0);
        });
        it('sanitizes each squaddie template', () => {
            const armyOfTwo: PlayerArmy = {
                squaddieTemplates: [
                    SquaddieTemplateHelper.new({
                        squaddieId: SquaddieIdHelper.new({
                            templateId: "squaddie 1",
                            name: "Number 1",
                            affiliation: SquaddieAffiliation.PLAYER,
                        })
                    }),
                    SquaddieTemplateHelper.new({
                        squaddieId: SquaddieIdHelper.new({
                            templateId: "squaddie 2",
                            name: "Number 2",
                            affiliation: SquaddieAffiliation.PLAYER,
                        })
                    }),
                ],
            };
            const squaddieTemplateSanitizer = jest.spyOn(SquaddieTemplateHelper, "sanitize");

            PlayerArmyHelper.sanitize(armyOfTwo);

            expect(squaddieTemplateSanitizer).toBeCalledTimes(2);
        });
    });
});
