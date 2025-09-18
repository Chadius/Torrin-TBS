import { SquaddieResource, SquaddieResourceService } from "./resource"
import {
    TraitStatusStorage,
    TraitStatusStorageService,
} from "../trait/traitStatusStorage"
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "./squaddieAffiliation"
import { isValidValue } from "../utils/objectValidityCheck"

export interface SquaddieId {
    name: string
    templateId: string
    resources: SquaddieResource
    traits: TraitStatusStorage
    affiliation: TSquaddieAffiliation
}

export const SquaddieIdService = {
    new: ({
        squaddieTemplateId,
        name,
        affiliation,
        resources,
        traits,
    }: {
        squaddieTemplateId: string
        name: string
        affiliation: TSquaddieAffiliation
        resources?: SquaddieResource
        traits?: TraitStatusStorage
    }) => {
        const data: SquaddieId = {
            templateId: squaddieTemplateId,
            name,
            affiliation,
            resources: resources ?? SquaddieResourceService.new({}),
            traits: traits ?? TraitStatusStorageService.newUsingTraitValues({}),
        }
        return sanitize(data)
    },
    sanitize: (data: SquaddieId): SquaddieId => {
        return sanitize(data)
    },
}

const sanitize = (data: SquaddieId): SquaddieId => {
    if (!data.templateId || !isValidValue(data.templateId)) {
        throw new Error("SquaddieId cannot sanitize, missing templateId")
    }

    if (!data.name || !isValidValue(data.name)) {
        throw new Error("SquaddieId cannot sanitize, missing name")
    }

    data.affiliation = isValidValue(data.affiliation)
        ? data.affiliation
        : SquaddieAffiliation.UNKNOWN
    data.traits = isValidValue(data.traits)
        ? TraitStatusStorageService.sanitize(data.traits)
        : TraitStatusStorageService.newUsingTraitValues({})
    data.resources = isValidValue(data.resources)
        ? data.resources
        : SquaddieResourceService.new({})
    SquaddieResourceService.sanitize(data.resources)
    return data
}
