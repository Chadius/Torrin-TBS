import {SquaddieResource, SquaddieResourceHelper} from "./resource";
import {TraitStatusStorage, TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {isValidValue} from "../utils/validityCheck";

export interface SquaddieId {
    name: string;
    templateId: string;
    resources: SquaddieResource;
    traits: TraitStatusStorage;
    affiliation: SquaddieAffiliation;
}

export const SquaddieIdHelper = {
    sanitize(data: SquaddieId) {
        sanitize(data);
    }
}

const sanitize = (data: SquaddieId) => {
    data.affiliation = isValidValue(data.affiliation) ? data.affiliation : SquaddieAffiliation.UNKNOWN;
    data.traits = isValidValue(data.traits) ? data.traits : TraitStatusStorageHelper.newUsingTraitValues({});
    data.resources = isValidValue(data.resources) ? data.resources : SquaddieResourceHelper.new();
    SquaddieResourceHelper.sanitize(data.resources);
}
