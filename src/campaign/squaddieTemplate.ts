import { SquaddieId, SquaddieIdService } from "../squaddie/id"
import {
    ArmyAttributes,
    ArmyAttributesService,
    DefaultArmyAttributes,
} from "../squaddie/armyAttributes"
import { getValidValueOrDefault, isValidValue } from "../utils/validityCheck"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { SquaddieResourceService } from "../squaddie/resource"

export interface SquaddieTemplate {
    squaddieId: SquaddieId
    attributes: ArmyAttributes
    actionTemplates: ActionTemplate[]
}

export const SquaddieTemplateService = {
    new: ({
        squaddieId,
        attributes,
        actionTemplates,
    }: {
        squaddieId: SquaddieId
        attributes?: ArmyAttributes
        actionTemplates?: ActionTemplate[]
    }) => {
        const data: SquaddieTemplate = {
            squaddieId,
            attributes: isValidValue(attributes)
                ? attributes
                : ArmyAttributesService.default(),
            actionTemplates: getValidValueOrDefault(actionTemplates, []),
        }
        SquaddieTemplateService.sanitize(data)
        return data
    },
    sanitize: (data: SquaddieTemplate): SquaddieTemplate => {
        return sanitize(data)
    },
    getResourceKeys: (squaddieTemplate: SquaddieTemplate): string[] => {
        let resourceKeys: string[] = []

        resourceKeys.push(
            ...SquaddieResourceService.getResourceKeys(
                squaddieTemplate.squaddieId.resources
            )
        )
        resourceKeys.push(
            ...squaddieTemplate.actionTemplates
                .filter(
                    (actionTemplate) => !!actionTemplate.buttonIconResourceKey
                )
                .map((actionTemplate) => actionTemplate.buttonIconResourceKey)
        )
        return resourceKeys
    },
}

const sanitize = (data: SquaddieTemplate): SquaddieTemplate => {
    if (!data.squaddieId || !isValidValue(data.squaddieId)) {
        throw new Error("Squaddie Action cannot sanitize, missing squaddieId ")
    }
    SquaddieIdService.sanitize(data.squaddieId)
    data.actionTemplates.forEach((actionTemplate) =>
        ActionTemplateService.sanitize(actionTemplate)
    )
    data.attributes = isValidValue(data.attributes)
        ? data.attributes
        : DefaultArmyAttributes()
    return data
}
