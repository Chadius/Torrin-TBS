import {SquaddieId, SquaddieIdHelper} from "./id";
import {SquaddieResourceHelper} from "./resource";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {TraitStatusStorageHelper} from "../trait/traitStatusStorage";

describe('Squaddie Id', () => {
    it('sanitizes to fill in missing values', () => {
        const squaddieIdWithMissingFields: SquaddieId = {
            templateId: "templateId",
            name: "name",
            resources: undefined,
            traits: null,
            affiliation: undefined,
        };

        SquaddieIdHelper.sanitize(squaddieIdWithMissingFields);
        expect(squaddieIdWithMissingFields.templateId).toEqual("templateId");
        expect(squaddieIdWithMissingFields.name).toEqual("name");
        expect(squaddieIdWithMissingFields.affiliation).toEqual(SquaddieAffiliation.UNKNOWN);
        expect(squaddieIdWithMissingFields.resources).toEqual(SquaddieResourceHelper.new());
        expect(squaddieIdWithMissingFields.traits).toEqual(TraitStatusStorageHelper.newUsingTraitValues({}));
    });
});
