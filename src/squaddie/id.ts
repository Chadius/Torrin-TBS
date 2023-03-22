import {NullSquaddieResource, SquaddieResource} from "./resource";
import {NullTraitStatusStorage, TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "./squaddieAffiliation";

type RequiredOptions = {
    name: string;
    id: string;
    resources: SquaddieResource;
    traits: TraitStatusStorage;
    affiliation: SquaddieAffiliation;
}

export const NewDummySquaddieID: (id: string, affiliation: SquaddieAffiliation) => SquaddieID = (id: string, affiliation: SquaddieAffiliation) => {
    return new SquaddieID({
        id,
        name: id,
        resources: NullSquaddieResource(),
        traits: NullTraitStatusStorage(),
        affiliation
    });
}

export class SquaddieID {
    name: string;
    id: string;
    resources: SquaddieResource;
    traits: TraitStatusStorage;
    affiliation: SquaddieAffiliation;

    constructor(options: RequiredOptions) {
        this.name = options.name;
        this.id = options.id;
        this.resources = options.resources;
        this.traits = options.traits;
        this.affiliation = options.affiliation;
    }
}