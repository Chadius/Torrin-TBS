import {SquaddieTemplate, SquaddieTemplateHelper} from "./squaddieTemplate";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {ArmyAttributes, DefaultArmyAttributes} from "../squaddie/armyAttributes";
import {NewDummySquaddieID} from "../utils/test/squaddie";

describe('Squaddie Template', () => {
    describe('attributes', () => {
        it('will give static squaddie defaults', () => {
            const squaddieWithoutAttributes: SquaddieTemplate = {
                squaddieId: NewDummySquaddieID("id", SquaddieAffiliation.PLAYER),
                actions: [],
                attributes: DefaultArmyAttributes(),
            };

            const defaultAttributes: ArmyAttributes = DefaultArmyAttributes();

            expect(squaddieWithoutAttributes.attributes).toStrictEqual(defaultAttributes);
        });
    });

    it('will sanitize the template with empty fields', () => {
        const templateWithInvalidFields: SquaddieTemplate = {
            squaddieId: {
                templateId: "templateId",
                name: "name",
                resources: undefined,
                traits: null,
                affiliation: undefined,
            },
            attributes: null,
            actions: undefined,
        }

        SquaddieTemplateHelper.sanitize(templateWithInvalidFields);

        expect(templateWithInvalidFields.actions).toHaveLength(0);
        expect(templateWithInvalidFields.attributes).toEqual(DefaultArmyAttributes());
        expect(templateWithInvalidFields.squaddieId.resources).not.toBeUndefined();
        expect(templateWithInvalidFields.squaddieId.affiliation).not.toBeUndefined();
        expect(templateWithInvalidFields.squaddieId.traits).not.toBeNull();
    });
    it('will throw an error if there is no squaddie id', () => {
        const templateWithoutASquaddieId: SquaddieTemplate = {
            squaddieId: undefined,
            attributes: null,
            actions: undefined,
        }

        const throwErrorBecauseOfNoSquaddieId = () => {
            SquaddieTemplateHelper.sanitize(templateWithoutASquaddieId);
        };

        expect(throwErrorBecauseOfNoSquaddieId).toThrowError('cannot sanitize');
    });
});
