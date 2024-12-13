import { SearchPath, SearchPathService } from "./searchPath"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../battle/objectRepository"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { BattleSquaddie } from "../../battle/battleSquaddie"

export const getSquaddieAtEndOfPath = ({
    searchPath,
    missionMap,
    objectRepository,
}: {
    searchPath: SearchPath
    missionMap: MissionMap
    objectRepository: ObjectRepository
}): {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
} => {
    const head = SearchPathService.getMostRecentLocation(searchPath)

    const { battleSquaddieId } = MissionMapService.getBattleSquaddieAtLocation(
        missionMap,
        {
            q: head.hexCoordinate.q,
            r: head.hexCoordinate.r,
        }
    )
    if (battleSquaddieId === undefined) {
        return {
            battleSquaddie: undefined,
            squaddieTemplate: undefined,
        }
    }

    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            battleSquaddieId
        )
    )

    if (!squaddieTemplate) {
        return {
            battleSquaddie: undefined,
            squaddieTemplate: undefined,
        }
    }

    if (
        !SquaddieService.isSquaddieAlive({
            squaddieTemplate,
            battleSquaddie,
        })
    ) {
        return {
            battleSquaddie: undefined,
            squaddieTemplate: undefined,
        }
    }

    return {
        squaddieTemplate,
        battleSquaddie,
    }
}
