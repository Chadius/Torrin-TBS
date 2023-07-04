import {SquaddieResource} from "./resource";
import {TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "./squaddieAffiliation";

export class SquaddieId {
    name: string;
    staticId: string;
    resources: SquaddieResource;
    traits: TraitStatusStorage;
    affiliation: SquaddieAffiliation;

    constructor(params: {
        name: string;
        staticId: string;
        affiliation: SquaddieAffiliation;
        resources?: SquaddieResource;
        traits?: TraitStatusStorage;
    }) {
        this.name = params.name;
        this.staticId = params.staticId;
        this.resources = params.resources || new SquaddieResource();
        this.traits = params.traits || new TraitStatusStorage();
        this.affiliation = params.affiliation;
    }
}
