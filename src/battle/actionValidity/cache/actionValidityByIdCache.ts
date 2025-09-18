import { ActionValidityStatus, ValidityCheckService } from "../validityChecker"
import { ObjectRepository } from "../../objectRepository"
import { BattleActionRecorder } from "../../history/battleAction/battleActionRecorder"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../../hexMap/hexCoordinate/hexCoordinate"

type CacheKey = {
    battleSquaddieId: string
    coordinate: HexCoordinate | undefined
    actionsTakenCount: number
}
export type ActionValidityByIdCache = {
    key?: CacheKey
    byActionTemplateId: {
        [actionTemplateId: string]: ActionValidityStatus
    }
}

export const ActionValidityByIdCacheService = {
    new: (): ActionValidityByIdCache => {
        return { byActionTemplateId: {} }
    },
    calculateActionValidity: ({
        objectRepository,
        battleSquaddieId,
        battleActionRecorder,
        missionMap,
        actionValidityByIdCache,
    }: {
        objectRepository: ObjectRepository
        battleSquaddieId: string
        battleActionRecorder: BattleActionRecorder
        missionMap: MissionMap
        actionValidityByIdCache: ActionValidityByIdCache | undefined
    }): ActionValidityByIdCache => {
        const cacheKey = calculateCacheKey({
            battleSquaddieId: battleSquaddieId,
            missionMap: missionMap,
            battleActionRecorder: battleActionRecorder,
        })

        if (
            areCacheKeysEqual({
                cacheKey: cacheKey,
                actionValidityByIdCache: actionValidityByIdCache,
            }) &&
            actionValidityByIdCache
        ) {
            return actionValidityByIdCache
        }

        return {
            key: cacheKey,
            byActionTemplateId: ValidityCheckService.calculateActionValidity({
                objectRepository,
                battleSquaddieId,
                battleActionRecorder,
                missionMap,
            }),
        }
    },
}

const calculateCacheKey = ({
    battleSquaddieId,
    missionMap,
    battleActionRecorder,
}: {
    battleSquaddieId: string
    missionMap: MissionMap
    battleActionRecorder: BattleActionRecorder
}): CacheKey => {
    const coordinate: HexCoordinate | undefined =
        MissionMapService.getByBattleSquaddieId(
            missionMap,
            battleSquaddieId
        )?.currentMapCoordinate

    return {
        actionsTakenCount:
            battleActionRecorder.actionsAlreadyAnimatedThisTurn.battleActions
                .length,
        coordinate,
        battleSquaddieId,
    }
}

const areCacheKeysEqual = ({
    cacheKey,
    actionValidityByIdCache,
}: {
    cacheKey: CacheKey | undefined
    actionValidityByIdCache: ActionValidityByIdCache | undefined
}) =>
    actionValidityByIdCache?.key?.coordinate &&
    cacheKey?.coordinate &&
    actionValidityByIdCache.key.actionsTakenCount ==
        cacheKey.actionsTakenCount &&
    actionValidityByIdCache.key.battleSquaddieId == cacheKey.battleSquaddieId &&
    HexCoordinateService.areEqual(
        actionValidityByIdCache.key.coordinate,
        cacheKey.coordinate
    )
