import { SquaddieId, SquaddieIdService } from "../squaddie/id"
import {
    ArmyAttributes,
    ArmyAttributesService,
    DefaultArmyAttributes,
} from "../squaddie/armyAttributes"
import { isValidValue } from "../utils/objectValidityCheck"
import { ActionTemplate } from "../action/template/actionTemplate"
import { SquaddieResourceService } from "../squaddie/resource"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"

export interface SquaddieTemplate {
    squaddieId: SquaddieId
    attributes: ArmyAttributes
    actionTemplateIds: string[]
}

export const SquaddieTemplateService = {
    new: ({
        squaddieId,
        attributes,
        actionTemplateIds,
    }: {
        squaddieId: SquaddieId
        attributes?: ArmyAttributes
        actionTemplateIds?: string[]
    }) => {
        return newSquaddieTemplate({
            squaddieId: squaddieId,
            attributes: attributes,
            actionTemplateIds: actionTemplateIds,
        })
    },
    sanitize: (data: SquaddieTemplate): SquaddieTemplate => {
        return sanitize(data)
    },
    getResourceKeys: (
        squaddieTemplate: SquaddieTemplate,
        objectRepository: ObjectRepository
    ): string[] => {
        let resourceKeys: string[] = []

        resourceKeys.push(
            ...SquaddieResourceService.getResourceKeys(
                squaddieTemplate.squaddieId.resources
            )
        )

        const actionTemplates: ActionTemplate[] =
            squaddieTemplate.actionTemplateIds.map((id) =>
                ObjectRepositoryService.getActionTemplateById(
                    objectRepository,
                    id
                )
            )

        resourceKeys.push(
            ...actionTemplates
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
    data.attributes = isValidValue(data.attributes)
        ? data.attributes
        : DefaultArmyAttributes()
    return data
}

const newSquaddieTemplate = ({
    squaddieId,
    attributes,
    actionTemplateIds,
}: {
    squaddieId: SquaddieId
    attributes: ArmyAttributes
    actionTemplateIds: string[]
}) => {
    const data: SquaddieTemplate = {
        squaddieId,
        attributes: isValidValue(attributes)
            ? attributes
            : ArmyAttributesService.default(),
        actionTemplateIds: actionTemplateIds || [],
    }
    SquaddieTemplateService.sanitize(data)
    return data
}
