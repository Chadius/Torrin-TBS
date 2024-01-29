import {SquaddieTemplate, SquaddieTemplateService} from "./squaddieTemplate";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {ArmyAttributes, DefaultArmyAttributes} from "../squaddie/armyAttributes";
import {NewDummySquaddieID} from "../utils/test/squaddie";

describe('Squaddie Template', () => {
    describe('attributes', () => {
        it('will give static squaddie defaults', () => {
            const squaddieWithoutAttributes: SquaddieTemplate = SquaddieTemplateService.new({
                squaddieId: NewDummySquaddieID("id", SquaddieAffiliation.PLAYER),
                actionTemplates: [],
                attributes: DefaultArmyAttributes(),
            });

            const defaultAttributes: ArmyAttributes = DefaultArmyAttributes();

            expect(squaddieWithoutAttributes.attributes).toStrictEqual(defaultAttributes);
        });
    });

    it('will sanitize the template with empty fields', () => {
        const templateWithInvalidFields: SquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: {
                templateId: "templateId",
                name: "name",
                resources: undefined,
                traits: null,
                affiliation: undefined,
            },
            attributes: null,
        });

        SquaddieTemplateService.sanitize(templateWithInvalidFields);

        expect(templateWithInvalidFields.actionTemplates).toHaveLength(0);
        expect(templateWithInvalidFields.attributes).toEqual(DefaultArmyAttributes());
        expect(templateWithInvalidFields.squaddieId.resources).not.toBeUndefined();
        expect(templateWithInvalidFields.squaddieId.affiliation).not.toBeUndefined();
        expect(templateWithInvalidFields.squaddieId.traits).not.toBeNull();
    });
    it('will throw an error if there is no squaddie id', () => {
        const throwErrorBecauseOfNoSquaddieId = () => {
            SquaddieTemplateService.new({
                squaddieId: undefined,
                attributes: null,
                actionTemplates: undefined,
            });
        };

        expect(throwErrorBecauseOfNoSquaddieId).toThrowError('cannot sanitize');
    });
});
