import { SquaddieTurn, SquaddieTurnService } from "../squaddie/turn"
import { ArmyAttributes } from "../squaddie/armyAttributes"
import {
    InBattleAttributes,
    InBattleAttributesService,
} from "./stats/inBattleAttributes"
import { SquaddieTemplate } from "../campaign/squaddieTemplate"

export interface BattleSquaddie {
    squaddieTurn: SquaddieTurn
    inBattleAttributes: InBattleAttributes
    battleSquaddieId: string
    squaddieTemplateId: string
}

export interface BattleSquaddieConstructorParams {
    squaddieTemplateId?: string
    squaddieTemplate?: SquaddieTemplate
    battleSquaddieId: string
    squaddieTurn?: SquaddieTurn
    inBattleAttributes?: InBattleAttributes
}

export const BattleSquaddieService = {
    new: (params: BattleSquaddieConstructorParams): BattleSquaddie => {
        return newBattleSquaddie(params)
    },
    newBattleSquaddie: (
        params: BattleSquaddieConstructorParams
    ): BattleSquaddie => {
        return newBattleSquaddie(params)
    },
    assertBattleSquaddie: (data: BattleSquaddie): void => {
        assertBattleSquaddie(data)
    },
    canStillActThisRound: (data: BattleSquaddie): boolean => {
        return SquaddieTurnService.hasActionPointsRemaining(data.squaddieTurn)
    },
    beginNewTurn: (data: BattleSquaddie) => {
        InBattleAttributesService.reduceActionCooldownForAllActions({
            inBattleAttributes: data.inBattleAttributes,
        })
        SquaddieTurnService.beginNewTurn(data.squaddieTurn)
    },
    endTurn: (data: BattleSquaddie) => {
        return SquaddieTurnService.endTurn(data.squaddieTurn)
    },
    initializeInBattleAttributes: (
        data: BattleSquaddie,
        attributes: ArmyAttributes
    ): void => {
        data.inBattleAttributes = InBattleAttributesService.new({
            armyAttributes: attributes,
        })
    },
}

const newBattleSquaddie = ({
    battleSquaddieId,
    squaddieTurn,
    squaddieTemplate,
    squaddieTemplateId,
    inBattleAttributes,
}: BattleSquaddieConstructorParams): BattleSquaddie => {
    let newBattleSquaddie: BattleSquaddie = {
        battleSquaddieId,
        squaddieTurn: squaddieTurn || SquaddieTurnService.new(),
        squaddieTemplateId,
        inBattleAttributes: InBattleAttributesService.new({}),
    }

    if (squaddieTemplate) {
        newFromSquaddieTemplate(newBattleSquaddie, squaddieTemplate)
    }
    if (inBattleAttributes) {
        newBattleSquaddie.inBattleAttributes = inBattleAttributes
    }

    assertBattleSquaddie(newBattleSquaddie)
    return newBattleSquaddie
}

const assertBattleSquaddie = (data: BattleSquaddie): void => {
    if (!data.battleSquaddieId) throw new Error("Battle Squaddie has no Id")
    if (!data.squaddieTemplateId)
        throw new Error("Battle Squaddie has no Squaddie Template Id")
}

const newFromSquaddieTemplate = (
    data: BattleSquaddie,
    template: SquaddieTemplate
): void => {
    data.squaddieTemplateId = template.squaddieId.templateId
    data.inBattleAttributes = InBattleAttributesService.new({
        armyAttributes: template.attributes,
    })
}
