import {SquaddieResource} from "./resource";
import {TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "./squaddieAffiliation";

export interface SquaddieId {
    name: string;
    templateId: string;
    resources: SquaddieResource;
    traits: TraitStatusStorage;
    affiliation: SquaddieAffiliation;
}
