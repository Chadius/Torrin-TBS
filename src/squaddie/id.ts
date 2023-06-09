import {NullSquaddieResource, SquaddieResource} from "./resource";
import {NullTraitStatusStorage, TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "./squaddieAffiliation";

export const NewDummySquaddieID: (id: string, affiliation: SquaddieAffiliation) => SquaddieId = (id: string, affiliation: SquaddieAffiliation) => {
    return new SquaddieId({
        staticId: id,
        name: id,
        resources: NullSquaddieResource(),
        traits: NullTraitStatusStorage(),
        affiliation
    });
}

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
        this.resources = params.resources || NullSquaddieResource();
        this.traits = params.traits || NullTraitStatusStorage();
        this.affiliation = params.affiliation;
    }
}
