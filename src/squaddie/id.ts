import {SquaddieResource} from "./resource";
import {TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "./squaddieAffiliation";

export class SquaddieId {
    name: string;
    templateId: string;
    resources: SquaddieResource;
    traits: TraitStatusStorage;
    private readonly _affiliation: SquaddieAffiliation;

    constructor(params: {
        name: string;
        templateId: string;
        affiliation: SquaddieAffiliation;
        resources?: SquaddieResource;
        traits?: TraitStatusStorage;
    }) {
        this.name = params.name;
        this.templateId = params.templateId;
        this.resources = params.resources || new SquaddieResource({});
        this.traits = params.traits || {booleanTraits: {}};
        this._affiliation = params.affiliation;
    }

    get affiliation(): SquaddieAffiliation {
        return this._affiliation;
    }
}
