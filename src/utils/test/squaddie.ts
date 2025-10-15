import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
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
import { getValidValueOrDefault } from "../objectValidityCheck"
import {
    SquaddieEmotion,
    TSquaddieEmotion,
} from "../../battle/animation/actionAnimation/actionAnimationConstants"

export const SquaddieRepositoryService = {
    createNewSquaddieAndAddToRepository: ({
        name,
        templateId,
        battleId,
        affiliation,
        objectRepository,
        attributes,
        actionTemplateIds,
        actionSpritesByEmotion,
    }: {
        name: string
        templateId: string
        battleId: string
        affiliation: TSquaddieAffiliation
        objectRepository: ObjectRepository
        attributes?: ArmyAttributes
        actionTemplateIds: string[]
        actionSpritesByEmotion?: { [key in TSquaddieEmotion]?: string }
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
            actionSpritesByEmotion,
        })
    },
}

const createNewSquaddieAndAddToRepository: (params: {
    name: string
    templateId: string
    battleId: string
    affiliation: TSquaddieAffiliation
    objectRepository: ObjectRepository
    attributes?: ArmyAttributes
    actionTemplateIds?: string[]
    actionSpritesByEmotion?: { [key in TSquaddieEmotion]?: string }
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
    actionSpritesByEmotion,
}: {
    name: string
    templateId: string
    battleId: string
    affiliation: TSquaddieAffiliation
    objectRepository: ObjectRepository
    attributes?: ArmyAttributes
    actionTemplateIds?: string[]
    actionSpritesByEmotion?: { [key in TSquaddieEmotion]?: string }
}) => {
    const squaddieTemplate: SquaddieTemplate = SquaddieTemplateService.new({
        squaddieId: {
            templateId,
            name,
            resources: {
                mapIconResourceKey: "",
                actionSpritesByEmotion: actionSpritesByEmotion ?? {},
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
    affiliation?: TSquaddieAffiliation
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
    affiliation?: TSquaddieAffiliation
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
        actionSpritesByEmotion: {
            [SquaddieEmotion.NEUTRAL]: "thief_neutral",
            [SquaddieEmotion.DAMAGED]: "thief_damaged",
            [SquaddieEmotion.TARGETED]: "thief_targeted",
            [SquaddieEmotion.DEAD]: "thief_dead",
            [SquaddieEmotion.ASSISTING]: "thief_assisting",
            [SquaddieEmotion.THANKFUL]: "thief_thankful",
            [SquaddieEmotion.ATTACK]: "thief_attack",
        },
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
    affiliation?: TSquaddieAffiliation
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
    affiliation?: TSquaddieAffiliation
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
        actionSpritesByEmotion: {
            [SquaddieEmotion.NEUTRAL]: "knight_neutral",
            [SquaddieEmotion.ATTACK]: "knight_attack",
            [SquaddieEmotion.ASSISTING]: "knight_assisting",
            [SquaddieEmotion.THANKFUL]: "knight_thankful",
            [SquaddieEmotion.DAMAGED]: "knight_damaged",
            [SquaddieEmotion.TARGETED]: "knight_targeted",
        },
    })

    return {
        knightSquaddieTemplate,
        knightBattleSquaddie,
    }
}
