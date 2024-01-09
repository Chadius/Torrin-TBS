import {PlayerArmy, PlayerArmyHelper} from "./playerArmy";
import {SquaddieTemplateService} from "./squaddieTemplate";
import {SquaddieIdService} from "../squaddie/id";
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
                    SquaddieTemplateService.new({
                        squaddieId: SquaddieIdService.new({
                            templateId: "squaddie 1",
                            name: "Number 1",
                            affiliation: SquaddieAffiliation.PLAYER,
                        })
                    }),
                    SquaddieTemplateService.new({
                        squaddieId: SquaddieIdService.new({
                            templateId: "squaddie 2",
                            name: "Number 2",
                            affiliation: SquaddieAffiliation.PLAYER,
                        })
                    }),
                ],
            };
            const squaddieTemplateSanitizer = jest.spyOn(SquaddieTemplateService, "sanitize");

            PlayerArmyHelper.sanitize(armyOfTwo);

            expect(squaddieTemplateSanitizer).toBeCalledTimes(2);
        });
    });
});
