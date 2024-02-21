import {SquaddieResource, SquaddieResourceService} from "./resource";
import {TraitStatusStorage, TraitStatusStorageService} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {isValidValue} from "../utils/validityCheck";

export interface SquaddieId {
    name: string;
    templateId: string;
    resources: SquaddieResource;
    traits: TraitStatusStorage;
    affiliation: SquaddieAffiliation;
}

export const SquaddieIdService = {
    new: ({
              templateId,
              name,
              affiliation,
              resources,
              traits,
          }: {
        templateId: string,
        name: string,
        affiliation: SquaddieAffiliation,
        resources?: SquaddieResource,
        traits?: TraitStatusStorage,
    }) => {
        const data: SquaddieId = {
            templateId,
            name,
            affiliation,
            resources,
            traits,
        };
        return sanitize(data);
    },
    sanitize: (data: SquaddieId): SquaddieId => {
        return sanitize(data);
    }
}

const sanitize = (data: SquaddieId): SquaddieId => {
    if (!data.templateId || !isValidValue(data.templateId)) {
        throw new Error('SquaddieId cannot sanitize, missing templateId');
    }

    if (!data.name || !isValidValue(data.name)) {
        throw new Error('SquaddieId cannot sanitize, missing name');
    }

    data.affiliation = isValidValue(data.affiliation) ? data.affiliation : SquaddieAffiliation.UNKNOWN;
    data.traits = isValidValue(data.traits) ? data.traits : TraitStatusStorageService.newUsingTraitValues({});
    data.resources = isValidValue(data.resources) ? data.resources : SquaddieResourceService.new({});
    SquaddieResourceService.sanitize(data.resources);
    return data;
}
