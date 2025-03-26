import { isValidValue } from "../utils/objectValidityCheck"
import { SquaddieBuild, SquaddieBuildService } from "./squaddieBuild"

export interface PlayerArmy {
    squaddieBuilds: SquaddieBuild[]
}

export const PlayerArmyService = {
    new: ({
        squaddieBuilds,
    }: {
        squaddieBuilds: SquaddieBuild[]
    }): PlayerArmy => ({
        squaddieBuilds,
    }),
    sanitize: (data: PlayerArmy): PlayerArmy => {
        return sanitize(data)
    },
}

const sanitize = (data: PlayerArmy): PlayerArmy => {
    data.squaddieBuilds = isValidValue(data.squaddieBuilds)
        ? data.squaddieBuilds
        : []
    data.squaddieBuilds.forEach(SquaddieBuildService.sanitize)
    return data
}
