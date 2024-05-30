import { SquaddieTemplate, SquaddieTemplateService } from "./squaddieTemplate"
import { isValidValue } from "../utils/validityCheck"

export interface PlayerArmy {
    squaddieTemplates: SquaddieTemplate[]
}

export const PlayerArmyHelper = {
    sanitize: (data: PlayerArmy): PlayerArmy => {
        return sanitize(data)
    },
}

const sanitize = (data: PlayerArmy): PlayerArmy => {
    data.squaddieTemplates = isValidValue(data.squaddieTemplates)
        ? data.squaddieTemplates
        : []
    data.squaddieTemplates.forEach(SquaddieTemplateService.sanitize)
    return data
}
