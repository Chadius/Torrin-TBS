import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import { SquaddieId } from "../../squaddie/id"
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
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { getValidValueOrDefault } from "../validityCheck"

export const SquaddieAndObjectRepositoryService = {
    createNewSquaddieAndAddToRepository: ({
        name,
        templateId,
        battleId,
        affiliation,
        squaddieRepository,
        attributes,
    }: {
        name: string
        templateId: string
        battleId: string
        affiliation: SquaddieAffiliation
        squaddieRepository: ObjectRepository
        attributes?: ArmyAttributes
    }): {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    } => {
        return CreateNewSquaddieAndAddToRepository({
            name,
            templateId,
            battleId,
            affiliation,
            squaddieRepository,
            attributes,
        })
    },
}

export const NewDummySquaddieID: (
    id: string,
    affiliation: SquaddieAffiliation
) => SquaddieId = (
    id: string,
    affiliation: SquaddieAffiliation
): SquaddieId => {
    return {
        templateId: id,
        name: id,
        resources: {
            mapIconResourceKey: "",
            actionSpritesByEmotion: {},
        },
        traits: TraitStatusStorageService.newUsingTraitValues(),
        affiliation,
    }
}

export const CreateNewSquaddieAndAddToRepository: (params: {
    name: string
    templateId: string
    battleId: string
    affiliation: SquaddieAffiliation
    squaddieRepository: ObjectRepository
    attributes?: ArmyAttributes
    actionTemplates?: ActionTemplate[]
}) => {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
} = ({
    name,
    templateId,
    battleId,
    affiliation,
    squaddieRepository,
    attributes,
    actionTemplates,
}: {
    name: string
    templateId: string
    battleId: string
    affiliation: SquaddieAffiliation
    squaddieRepository: ObjectRepository
    attributes?: ArmyAttributes
    actionTemplates?: ActionTemplate[]
}) => {
    const squaddieTemplate: SquaddieTemplate = {
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
        actionTemplates: getValidValueOrDefault(actionTemplates, []),
        attributes: attributes || DefaultArmyAttributes(),
    }
    const battleSquaddie = BattleSquaddieService.newBattleSquaddie({
        squaddieTemplateId: templateId,
        battleSquaddieId: battleId,
        squaddieTurn: SquaddieTurnService.new(),
    })
    ObjectRepositoryService.addSquaddie(
        squaddieRepository,
        squaddieTemplate,
        battleSquaddie
    )

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
    } = CreateNewSquaddieAndAddToRepository({
        name: name || "Thief",
        templateId: templateId || "Thief",
        battleId: battleId || "Thief 0",
        affiliation:
            affiliation && affiliation !== SquaddieAffiliation.UNKNOWN
                ? affiliation
                : SquaddieAffiliation.ENEMY,
        squaddieRepository: squaddieRepository,
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
    } = CreateNewSquaddieAndAddToRepository({
        name: name || "Knight",
        templateId: templateId || "Knight",
        battleId: battleId || "Knight 0",
        affiliation:
            affiliation && affiliation !== SquaddieAffiliation.UNKNOWN
                ? affiliation
                : SquaddieAffiliation.PLAYER,
        squaddieRepository: squaddieRepository,
        attributes: attributes || DefaultArmyAttributes(),
    })

    return {
        knightSquaddieTemplate,
        knightBattleSquaddie,
    }
}
