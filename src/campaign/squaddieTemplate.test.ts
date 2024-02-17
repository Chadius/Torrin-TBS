import {SquaddieTemplate, SquaddieTemplateService} from "./squaddieTemplate";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {ArmyAttributes, DefaultArmyAttributes} from "../squaddie/armyAttributes";
import {NewDummySquaddieID} from "../utils/test/squaddie";
import {ActionTemplate, ActionTemplateService} from "../action/template/actionTemplate";

describe('Squaddie Template', () => {
    describe('attributes', () => {
        it('will give static squaddie defaults', () => {
            const squaddieWithoutAttributes: SquaddieTemplate = SquaddieTemplateService.new({
                squaddieId: NewDummySquaddieID("id", SquaddieAffiliation.PLAYER),
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
            actionTemplates: undefined,
        });

        SquaddieTemplateService.sanitize(templateWithInvalidFields);

        expect(templateWithInvalidFields.actionTemplates).toHaveLength(0);
        expect(templateWithInvalidFields.attributes).toEqual(DefaultArmyAttributes());
        expect(templateWithInvalidFields.squaddieId.resources).not.toBeUndefined();
        expect(templateWithInvalidFields.squaddieId.affiliation).not.toBeUndefined();
        expect(templateWithInvalidFields.squaddieId.traits).not.toBeNull();
    });
    it('will sanitize action templates', () => {
        const actionTemplateSanitizeSpy = jest.spyOn(ActionTemplateService, "sanitize");

        const actionTemplate: ActionTemplate = {
            id: "actionTemplateId",
            name: "must use raw object to test sanitization",
            actionPoints: 1,
            actionEffectTemplates: [],
        };
        SquaddieTemplateService.new({
            squaddieId: {
                templateId: "templateId",
                name: "name",
                resources: undefined,
                traits: null,
                affiliation: undefined,
            },
            attributes: null,
            actionTemplates: [
                actionTemplate
            ],
        });

        expect(actionTemplateSanitizeSpy).toBeCalledWith(actionTemplate);
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
