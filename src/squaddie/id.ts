import {NullSquaddieResource, SquaddieResource} from "./resource";
import {NullTraitStatusStorage, TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "./squaddieAffiliation";

type RequiredOptions = {
    name: string;
    staticId: string;
    affiliation: SquaddieAffiliation;
}

type Options = {
    resources: SquaddieResource;
    traits: TraitStatusStorage;
}

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

    constructor(options: RequiredOptions & Partial<Options>) {
        this.name = options.name;
        this.staticId = options.staticId;
        this.resources = options.resources || NullSquaddieResource();
        this.traits = options.traits || NullTraitStatusStorage();
        this.affiliation = options.affiliation;
    }
}
