import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../battle/objectRepository"
import {
    BattleSquaddie,
    BattleSquaddieService,
} from "../../battle/battleSquaddie"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    ArmyAttributes,
    DefaultArmyAttributes,
} from "../../squaddie/armyAttributes"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { getValidValueOrDefault } from "../validityCheck"

export const SquaddieRepositoryService = {
    createNewSquaddieAndAddToRepository: ({
        name,
        templateId,
        battleId,
        affiliation,
        objectRepository,
        attributes,
        actionTemplateIds,
    }: {
        name: string
        templateId: string
        battleId: string
        affiliation: SquaddieAffiliation
        objectRepository: ObjectRepository
        attributes?: ArmyAttributes
        actionTemplateIds: string[]
    }): {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    } => {
        return createNewSquaddieAndAddToRepository({
            name,
            templateId,
            battleId,
            affiliation,
            objectRepository,
            attributes,
            actionTemplateIds,
        })
    },
}

const createNewSquaddieAndAddToRepository: (params: {
    name: string
    templateId: string
    battleId: string
    affiliation: SquaddieAffiliation
    objectRepository: ObjectRepository
    attributes?: ArmyAttributes
    actionTemplateIds?: string[]
}) => {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
} = ({
    name,
    templateId,
    battleId,
    affiliation,
    objectRepository,
    attributes,
    actionTemplateIds,
}: {
    name: string
    templateId: string
    battleId: string
    affiliation: SquaddieAffiliation
    objectRepository: ObjectRepository
    attributes?: ArmyAttributes
    actionTemplateIds?: string[]
}) => {
    const squaddieTemplate: SquaddieTemplate = SquaddieTemplateService.new({
        squaddieId: {
            templateId,
            name,
            resources: {
                mapIconResourceKey: "",
                actionSpritesByEmotion: {},
            },
            traits: TraitStatusStorageService.newUsingTraitValues(),
            affiliation,
        },
        actionTemplateIds: getValidValueOrDefault(actionTemplateIds, []),
        attributes: attributes || DefaultArmyAttributes(),
    })
    const battleSquaddie = BattleSquaddieService.newBattleSquaddie({
        squaddieTemplateId: templateId,
        battleSquaddieId: battleId,
        squaddieTurn: SquaddieTurnService.new(),
    })

    if (
        ObjectRepositoryService.hasSquaddieByTemplateId(
            objectRepository,
            templateId
        )
    ) {
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            battleSquaddie
        )
    } else {
        ObjectRepositoryService.addSquaddie({
            repo: objectRepository,
            squaddieTemplate: squaddieTemplate,
            battleSquaddie: battleSquaddie,
        })
    }

    return {
        squaddieTemplate,
        battleSquaddie,
    }
}

export const CreateNewThiefSquaddie: (params: {
    squaddieRepository: ObjectRepository
    name?: string
    templateId?: string
    battleId?: string
    affiliation?: SquaddieAffiliation
    attributes?: ArmyAttributes
}) => {
    thiefSquaddieTemplate: SquaddieTemplate
    thiefBattleSquaddie: BattleSquaddie
} = ({
    squaddieRepository,
    name,
    templateId,
    battleId,
    affiliation,
    attributes,
}: {
    squaddieRepository: ObjectRepository
    name?: string
    templateId?: string
    battleId?: string
    affiliation?: SquaddieAffiliation
    attributes?: ArmyAttributes
}) => {
    const {
        squaddieTemplate: thiefSquaddieTemplate,
        battleSquaddie: thiefBattleSquaddie,
    } = createNewSquaddieAndAddToRepository({
        name: name || "Thief",
        templateId: templateId || "Thief",
        battleId: battleId || "Thief 0",
        affiliation:
            affiliation && affiliation !== SquaddieAffiliation.UNKNOWN
                ? affiliation
                : SquaddieAffiliation.ENEMY,
        objectRepository: squaddieRepository,
        attributes: attributes || DefaultArmyAttributes(),
    })

    return {
        thiefSquaddieTemplate,
        thiefBattleSquaddie,
    }
}

export const CreateNewKnightSquaddie: (params: {
    squaddieRepository: ObjectRepository
    name?: string
    templateId?: string
    battleId?: string
    affiliation?: SquaddieAffiliation
    actionTemplates?: ActionTemplate[]
    attributes?: ArmyAttributes
}) => {
    knightSquaddieTemplate: SquaddieTemplate
    knightBattleSquaddie: BattleSquaddie
} = ({
    squaddieRepository,
    name,
    templateId,
    battleId,
    affiliation,
    attributes,
}: {
    squaddieRepository: ObjectRepository
    name?: string
    templateId?: string
    battleId?: string
    affiliation?: SquaddieAffiliation
    attributes?: ArmyAttributes
}) => {
    const {
        squaddieTemplate: knightSquaddieTemplate,
        battleSquaddie: knightBattleSquaddie,
    } = createNewSquaddieAndAddToRepository({
        name: name || "Knight",
        templateId: templateId || "Knight",
        battleId: battleId || "Knight 0",
        affiliation:
            affiliation && affiliation !== SquaddieAffiliation.UNKNOWN
                ? affiliation
                : SquaddieAffiliation.PLAYER,
        objectRepository: squaddieRepository,
        attributes: attributes || DefaultArmyAttributes(),
    })

    return {
        knightSquaddieTemplate,
        knightBattleSquaddie,
    }
}
