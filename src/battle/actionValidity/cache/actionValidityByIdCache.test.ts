import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { ValidityCheckService } from "../validityChecker"
import { MapSearchTestUtils } from "../../../hexMap/pathfinder/pathGeneration/mapSearchTests/mapSearchTestUtils"
import {
    ActionValidityByIdCache,
    ActionValidityByIdCacheService,
} from "./actionValidityByIdCache"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../../history/battleAction/battleActionRecorder"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { BattleActionService } from "../../history/battleAction/battleAction"

describe("ActionValidityByIdCache", () => {
    const battleSquaddieId = "battleSquaddieId"

    let cache: ActionValidityByIdCache

    let objectRepository: ObjectRepository
    let missionMap: MissionMap
    let battleActionRecorder: BattleActionRecorder

    let validityCheckSpy: MockInstance

    beforeEach(() => {
        missionMap = MapSearchTestUtils.create1row5columnsAllFlatTerrain()
        validityCheckSpy = vi
            .spyOn(ValidityCheckService, "calculateActionValidity")
            .mockReturnValue({
                action: {
                    isValid: true,
                    warning: false,
                    messages: [],
                },
            })
        objectRepository = ObjectRepositoryService.new()
        cache = ActionValidityByIdCacheService.new()
        battleActionRecorder = BattleActionRecorderService.new()

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: battleSquaddieId,
            battleId: battleSquaddieId,
            affiliation: SquaddieAffiliation.PLAYER,
            name: battleSquaddieId,
            objectRepository,
            actionTemplateIds: [],
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId,
            squaddieTemplateId: battleSquaddieId,
            originMapCoordinate: { q: 0, r: 0 },
        })
    })

    afterEach(() => {
        validityCheckSpy.mockRestore()
    })

    it("will try to calculate when requested the first time", () => {
        ActionValidityByIdCacheService.calculateActionValidity({
            battleSquaddieId,
            objectRepository,
            missionMap,
            battleActionRecorder,
            actionValidityByIdCache: undefined,
        })

        expect(validityCheckSpy).toBeCalled()
    })
    it("will use the same results for the same battle squaddie, location and number of actions taken", () => {
        cache = ActionValidityByIdCacheService.calculateActionValidity({
            battleSquaddieId,
            objectRepository,
            missionMap,
            battleActionRecorder,
            actionValidityByIdCache: undefined,
        })

        validityCheckSpy.mockClear()

        ActionValidityByIdCacheService.calculateActionValidity({
            battleSquaddieId,
            objectRepository,
            missionMap,
            battleActionRecorder,
            actionValidityByIdCache: cache,
        })

        expect(validityCheckSpy).not.toBeCalled()
    })
    it("will recalculate if the battle squaddie id is different", () => {
        cache = ActionValidityByIdCacheService.calculateActionValidity({
            battleSquaddieId,
            objectRepository,
            missionMap,
            battleActionRecorder,
            actionValidityByIdCache: undefined,
        })

        validityCheckSpy.mockClear()

        ActionValidityByIdCacheService.calculateActionValidity({
            battleSquaddieId: "new squaddie who dis",
            objectRepository,
            missionMap,
            battleActionRecorder,
            actionValidityByIdCache: cache,
        })

        expect(validityCheckSpy).toBeCalled()
    })
    it("will recalculate if the squaddie location is different is different", () => {
        cache = ActionValidityByIdCacheService.calculateActionValidity({
            battleSquaddieId,
            objectRepository,
            missionMap,
            battleActionRecorder,
            actionValidityByIdCache: undefined,
        })

        validityCheckSpy.mockClear()

        MissionMapService.updateBattleSquaddieCoordinate({
            missionMap,
            battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })

        ActionValidityByIdCacheService.calculateActionValidity({
            battleSquaddieId,
            objectRepository,
            missionMap,
            battleActionRecorder,
            actionValidityByIdCache: cache,
        })

        expect(validityCheckSpy).toBeCalled()
    })
    it("will recalculate if the squaddie takes a different number of actions", () => {
        cache = ActionValidityByIdCacheService.calculateActionValidity({
            battleSquaddieId,
            objectRepository,
            missionMap,
            battleActionRecorder,
            actionValidityByIdCache: undefined,
        })

        validityCheckSpy.mockClear()

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            battleActionRecorder,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: battleSquaddieId,
                },
                action: {
                    isEndTurn: true,
                },
                effect: { endTurn: true },
            })
        )
        BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
            battleActionRecorder
        )

        ActionValidityByIdCacheService.calculateActionValidity({
            battleSquaddieId,
            objectRepository,
            missionMap,
            battleActionRecorder,
            actionValidityByIdCache: cache,
        })

        expect(validityCheckSpy).toBeCalled()
    })
})
