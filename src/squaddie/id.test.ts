import {SquaddieId, SquaddieIdService} from "./id";
import {SquaddieResourceHelper} from "./resource";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {TraitStatusStorageService} from "../trait/traitStatusStorage";

describe('Squaddie Id', () => {
    it('sanitizes to fill in missing values', () => {
        const squaddieIdWithMissingFields: SquaddieId = {
            templateId: "templateId",
            name: "name",
            resources: undefined,
            traits: null,
            affiliation: undefined,
        };

        SquaddieIdService.sanitize(squaddieIdWithMissingFields);
        expect(squaddieIdWithMissingFields.templateId).toEqual("templateId");
        expect(squaddieIdWithMissingFields.name).toEqual("name");
        expect(squaddieIdWithMissingFields.affiliation).toEqual(SquaddieAffiliation.UNKNOWN);
        expect(squaddieIdWithMissingFields.resources).toEqual(SquaddieResourceHelper.new());
        expect(squaddieIdWithMissingFields.traits).toEqual(TraitStatusStorageService.newUsingTraitValues({}));
    });
    it('throws an error during sanitization if there is no name or id', () => {
        const invalidSquaddie: SquaddieId = {
            templateId: null,
            name: undefined,
            resources: undefined,
            traits: null,
            affiliation: undefined,
        };

        const throwErrorBecauseOfNoTemplateIdOrName = () => {
            SquaddieIdService.sanitize(invalidSquaddie);
        };

        expect(throwErrorBecauseOfNoTemplateIdOrName).toThrowError('cannot sanitize');
    });

    describe('sanitization', () => {
        let invalidSquaddieBase: SquaddieId;

        beforeEach(() => {
            invalidSquaddieBase = {
                templateId: "templateId",
                name: "name",
                resources: undefined,
                traits: null,
                affiliation: undefined,
            };
        });

        const tests: { field: string, value: any }[] = [
            {
                field: "templateId",
                value: "",
            },
            {
                field: "templateId",
                value: undefined,
            },
            {
                field: "templateId",
                value: null,
            },
            {
                field: "name",
                value: "",
            },
            {
                field: "name",
                value: undefined,
            },
            {
                field: "name",
                value: null,
            }
        ];

        it.each(tests)(`$field: $value will throw an error for being invalid`, ({
                                                                                    field,
                                                                                    value
                                                                                }) => {
            const invalidSquaddie = {
                ...invalidSquaddieBase,
                [field]: value,
            }
            const throwErrorBecauseInvalid = () => {
                SquaddieIdService.sanitize(invalidSquaddie);
            };

            expect(throwErrorBecauseInvalid).toThrowError('cannot sanitize');
        });
    });
});
