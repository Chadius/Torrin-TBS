import {
    describe,
    it,
    expect,
    beforeEach,
    vi,
    afterEach,
    MockInstance,
} from "vitest"
import { PlayerProgress, PlayerProgressService } from "./playerProgress"
import {
    ApplyPlayerProgressToGameEngineService,
    PlayerProgressToGameEngine,
} from "./applyPlayerProgressToGameEngine"
import { LoadCampaignData } from "../../utils/fileHandling/loadCampaignData"
import { CampaignFileFormat } from "../../campaign/campaignFileFormat"
import { MissionFileFormat } from "../../dataLoader/missionLoader"
import { PlayerArmy } from "../../campaign/playerArmy"
import { TestCampaignData } from "../../utils/test/campaignData"
import { LoadCampaignService } from "./loadCampaignService/loadCampaignService"
import { LoadMissionService } from "./loadMissionService/loadMissionService"
import { LoadPlayerArmyService } from "./loadPlayerArmyService/loadPlayerArmyService"

describe("applyPlayerProgressToGameEngine", () => {
    it("Can store the given player progress into a new object", () => {
        const newGamePlayerProgress = PlayerProgressService.new({
            campaignId: "campaignId",
        })
        const newProgress = ApplyPlayerProgressToGameEngineService.new(
            newGamePlayerProgress
        )
        expect(newProgress.playerProgress.tryingToApply).toEqual(
            newGamePlayerProgress
        )
    })
    describe("begin applying player progress", () => {
        it("Will start applying player progress upon command", () => {
            const newGamePlayerProgress = PlayerProgressService.new({
                campaignId: "campaignId",
            })
            const newProgress = ApplyPlayerProgressToGameEngineService.new(
                newGamePlayerProgress
            )
            expect(
                ApplyPlayerProgressToGameEngineService.hasStartedApplying(
                    newProgress
                )
            ).toBeFalsy()
            ApplyPlayerProgressToGameEngineService.startApplyingPlayerProgress(
                newProgress
            )
            expect(
                ApplyPlayerProgressToGameEngineService.hasStartedApplying(
                    newProgress
                )
            ).toBeTruthy()
        })

        it("Will throw an error if it tries to revert to a nonexistent build", () => {
            const newGamePlayerProgress = PlayerProgressService.new({
                campaignId: "campaignId",
            })
            const newProgress = ApplyPlayerProgressToGameEngineService.new(
                newGamePlayerProgress
            )

            expect(() => {
                ApplyPlayerProgressToGameEngineService.revertToLastValidPlayerProgress(
                    newProgress
                )
            }).toThrow("no valid player progress exists, cannot revert")
        })
    })

    describe("applying is complete and successful", () => {
        let newGamePlayerProgress: PlayerProgress
        let playerProgressToGameEngine: PlayerProgressToGameEngine

        let campaignLoadSpy: MockInstance
        let campaignFileData: CampaignFileFormat

        let missionLoadSpy: MockInstance
        let missionFileData: MissionFileFormat

        let playerArmySpy: MockInstance
        let playerArmy: PlayerArmy

        beforeEach(async () => {
            ;({
                campaignFileData,
                missionData: missionFileData,
                playerArmy,
            } = LoadCampaignData.createLoadFileSpy())
            newGamePlayerProgress = PlayerProgressService.new({
                campaignId: campaignFileData.id,
            })
            playerProgressToGameEngine =
                ApplyPlayerProgressToGameEngineService.new(
                    newGamePlayerProgress
                )
            ApplyPlayerProgressToGameEngineService.startApplyingPlayerProgress(
                playerProgressToGameEngine
            )
            ;({ campaignLoadSpy, missionLoadSpy, playerArmySpy } =
                setupSpiesForSuccessfulLoad({
                    campaignFileData,
                    missionFileData,
                    playerArmy,
                }))

            expect(
                await runUntilSuccess(playerProgressToGameEngine)
            ).toBeTruthy()
        })

        afterEach(() => {
            ;[
                campaignLoadSpy,
                missionLoadSpy,
                missionLoadSpy,
                playerArmySpy,
            ].forEach((spy) => {
                if (spy) {
                    spy.mockRestore()
                }
            })
        })

        it("Will mark itself as finished", () => {
            expect(
                ApplyPlayerProgressToGameEngineService.hasFinishedApplyingSuccessfully(
                    playerProgressToGameEngine
                )
            ).toBeTruthy()
            expect(
                ApplyPlayerProgressToGameEngineService.hasAbortedWithError(
                    playerProgressToGameEngine
                )
            ).toBeFalsy()
            expect(
                ApplyPlayerProgressToGameEngineService.hasStartedApplying(
                    playerProgressToGameEngine
                )
            ).toBeFalsy()
        })

        it("Will replace the previous valid player progress", () => {
            expect(
                playerProgressToGameEngine.playerProgress.previousValid
            ).toEqual(newGamePlayerProgress)
            expect(
                playerProgressToGameEngine.playerProgress.tryingToApply
            ).toBeUndefined()
        })

        it("tried to load campaign, mission and player army", () => {
            expect(campaignLoadSpy).toBeCalled()
            expect(missionLoadSpy).toBeCalled()
            expect(playerArmySpy).toBeCalled()
        })

        it("it is finished applying and no longer started", () => {
            expect(
                ApplyPlayerProgressToGameEngineService.hasFinishedApplyingSuccessfully(
                    playerProgressToGameEngine
                )
            ).toBeTruthy()
            expect(
                ApplyPlayerProgressToGameEngineService.hasStartedApplying(
                    playerProgressToGameEngine
                )
            ).toBeFalsy()
        })
    })

    describe("apply progress when all you have is a campaignId", () => {
        let playerProgressCampaign0: PlayerProgress
        let playerProgressToGameEngine: PlayerProgressToGameEngine

        let campaignLoadSpy: MockInstance
        let campaignFileData: CampaignFileFormat

        let missionLoadSpy: MockInstance
        let missionFileData: MissionFileFormat

        let playerArmySpy: MockInstance
        let playerArmy: PlayerArmy

        beforeEach(async () => {
            ;({
                campaignFileData,
                missionData: missionFileData,
                playerArmy,
            } = LoadCampaignData.createLoadFileSpy())

            playerProgressCampaign0 = PlayerProgressService.new({
                campaignId: campaignFileData.id,
            })
            playerProgressToGameEngine =
                ApplyPlayerProgressToGameEngineService.new(
                    playerProgressCampaign0
                )
            ApplyPlayerProgressToGameEngineService.startApplyingPlayerProgress(
                playerProgressToGameEngine
            )
            ;({ campaignLoadSpy, playerArmySpy, missionLoadSpy } =
                setupSpiesForSuccessfulLoad({
                    campaignFileData: campaignFileData,
                    missionFileData: missionFileData,
                    playerArmy: playerArmy,
                }))
        })

        afterEach(() => {
            ;[
                campaignLoadSpy,
                missionLoadSpy,
                missionLoadSpy,
                playerArmySpy,
            ].forEach((spy) => {
                if (spy) {
                    spy.mockRestore()
                }
            })
        })

        describe("loading the campaign file data", () => {
            it("will try to load the campaign with the given campaign Id", async () => {
                expect(
                    await runUpdateUntil({
                        playerProgressToGameEngine: playerProgressToGameEngine,
                        stopPredicate: (
                            playerProgressToGameEngine: PlayerProgressToGameEngine
                        ) =>
                            playerProgressToGameEngine.loadedFileData
                                .campaign == campaignFileData,
                    })
                ).toBeTruthy()
                expect(
                    playerProgressToGameEngine.loadedFileData.campaign
                ).toEqual(campaignFileData)
                expect(campaignLoadSpy).toBeCalled()
            })

            it("will report an error if loading the campaign fails and stop loading", async () => {
                campaignLoadSpy.mockRejectedValue(
                    new Error("Campaign Load Error")
                )

                expect(
                    await runUntilAbortsDueToError(playerProgressToGameEngine)
                ).toBeTruthy()

                expect(
                    ApplyPlayerProgressToGameEngineService.getError(
                        playerProgressToGameEngine
                    )
                ).toEqual(new Error("Campaign Load Error"))
            })

            it("will always try to load the campaign", async () => {
                expect(
                    await runUntilSuccess(playerProgressToGameEngine)
                ).toBeTruthy()

                campaignLoadSpy.mockClear()
                ApplyPlayerProgressToGameEngineService.startApplyingPlayerProgress(
                    playerProgressToGameEngine,
                    playerProgressCampaign0
                )

                expect(
                    ApplyPlayerProgressToGameEngineService.hasStartedApplying(
                        playerProgressToGameEngine
                    )
                ).toBeTruthy()

                expect(
                    await runUntilSuccess(playerProgressToGameEngine)
                ).toBeTruthy()
                expect(campaignLoadSpy).toBeCalled()
            })
        })

        describe("loading the mission file data", () => {
            beforeEach(() => {
                missionFileData.id = campaignFileData.missionIds[0]
            })

            it("will try to load the first mission in the given campaign when there is no mission progress", async () => {
                expect(
                    await runUpdateUntil({
                        playerProgressToGameEngine: playerProgressToGameEngine,
                        stopPredicate: (
                            playerProgressToGameEngine: PlayerProgressToGameEngine
                        ) =>
                            playerProgressToGameEngine.loadedFileData.mission ==
                            missionFileData,
                    })
                ).toBeTruthy()
                expect(
                    playerProgressToGameEngine.loadedFileData.mission?.id
                ).toEqual(
                    playerProgressToGameEngine.loadedFileData.campaign
                        ?.missionIds[0]
                )
                expect(missionLoadSpy).toBeCalled()
            })

            it("will report an error if loading the mission fails to load", async () => {
                missionLoadSpy.mockRejectedValue(
                    new Error("Mission Load Error")
                )

                expect(
                    await runUntilAbortsDueToError(playerProgressToGameEngine)
                ).toBeTruthy()

                expect(
                    ApplyPlayerProgressToGameEngineService.getError(
                        playerProgressToGameEngine
                    )
                ).toEqual(new Error("Mission Load Error"))
            })
        })

        describe("loading the player army", () => {
            it("will load the player army", async () => {
                expect(
                    await runUpdateUntil({
                        playerProgressToGameEngine: playerProgressToGameEngine,
                        stopPredicate: (
                            playerProgressToGameEngine: PlayerProgressToGameEngine
                        ) =>
                            playerProgressToGameEngine.loadedFileData
                                .playerArmy == playerArmy,
                    })
                ).toBeTruthy()
                expect(
                    playerProgressToGameEngine.loadedFileData.playerArmy
                ).toEqual(playerArmy)
                expect(playerArmySpy).toBeCalled()
            })

            it("will report an error if loading the player army fails to load", async () => {
                playerArmySpy.mockRejectedValue(
                    new Error("Player Army Load Error")
                )

                expect(
                    await runUntilAbortsDueToError(playerProgressToGameEngine)
                ).toBeTruthy()

                expect(
                    ApplyPlayerProgressToGameEngineService.getError(
                        playerProgressToGameEngine
                    )
                ).toEqual(new Error("Player Army Load Error"))
            })
        })

        it("If it loads successfully once and then errors, we can rollback to the previous valid load and try again", async () => {
            expect(
                await runUntilSuccess(playerProgressToGameEngine)
            ).toBeTruthy()

            ApplyPlayerProgressToGameEngineService.startApplyingPlayerProgress(
                playerProgressToGameEngine,
                playerProgressCampaign0
            )

            expect(
                ApplyPlayerProgressToGameEngineService.hasStartedApplying(
                    playerProgressToGameEngine
                )
            ).toBeTruthy()

            campaignLoadSpy.mockRejectedValue(new Error("Campaign Load Error"))

            expect(
                await runUntilAbortsDueToError(playerProgressToGameEngine)
            ).toBeTruthy()

            ApplyPlayerProgressToGameEngineService.revertToLastValidPlayerProgress(
                playerProgressToGameEngine
            )
            expect(
                playerProgressToGameEngine.playerProgress.tryingToApply
            ).toEqual(playerProgressCampaign0)
            expect(
                playerProgressToGameEngine.playerProgress.previousValid
            ).toBeUndefined()
        })
    })

    describe("applying another player progress", () => {
        let applicationProgress: PlayerProgressToGameEngine
        let playerProgressCampaign0: PlayerProgress
        let playerProgressCampaign1: PlayerProgress

        let campaignLoadSpy: MockInstance
        let campaignFileData: CampaignFileFormat

        let missionLoadSpy: MockInstance
        let missionFileData: MissionFileFormat

        let playerArmySpy: MockInstance
        let playerArmy: PlayerArmy

        beforeEach(async () => {
            ;({
                campaignFileData,
                missionData: missionFileData,
                playerArmy,
            } = LoadCampaignData.createLoadFileSpy())
            playerProgressCampaign0 = PlayerProgressService.new({
                campaignId: campaignFileData.id,
            })
            applicationProgress = ApplyPlayerProgressToGameEngineService.new(
                playerProgressCampaign0
            )
            ApplyPlayerProgressToGameEngineService.startApplyingPlayerProgress(
                applicationProgress
            )
            ;({ campaignLoadSpy, playerArmySpy, missionLoadSpy } =
                setupSpiesForSuccessfulLoad({
                    campaignFileData: campaignFileData,
                    missionFileData: missionFileData,
                    playerArmy: playerArmy,
                }))
            expect(
                await runUpdateUntil({
                    playerProgressToGameEngine: applicationProgress,
                    stopPredicate: (
                        playerProgressToGameEngine: PlayerProgressToGameEngine
                    ) =>
                        ApplyPlayerProgressToGameEngineService.hasFinishedApplyingSuccessfully(
                            playerProgressToGameEngine
                        ),
                })
            ).toBeTruthy()

            playerProgressCampaign1 = PlayerProgressService.new({
                campaignId: "campaign1",
            })
        })

        afterEach(() => {
            ;[
                campaignLoadSpy,
                missionLoadSpy,
                missionLoadSpy,
                playerArmySpy,
            ].forEach((spy) => {
                if (spy) {
                    spy.mockRestore()
                }
            })
        })

        it("starting to apply player progress keeps the previous valid until it finishes successfully", async () => {
            ApplyPlayerProgressToGameEngineService.startApplyingPlayerProgress(
                applicationProgress,
                playerProgressCampaign1
            )
            expect(applicationProgress.playerProgress.tryingToApply).toEqual(
                playerProgressCampaign1
            )
            expect(applicationProgress.playerProgress.previousValid).toEqual(
                playerProgressCampaign0
            )

            const campaignFileData1 = TestCampaignData().campaignFile
            campaignFileData1.id = playerProgressCampaign1.campaignId
            campaignLoadSpy.mockResolvedValue(campaignFileData1)

            expect(await runUntilSuccess(applicationProgress)).toBeTruthy()

            expect(
                applicationProgress.playerProgress.tryingToApply
            ).toBeUndefined()
            expect(applicationProgress.playerProgress.previousValid).toEqual(
                playerProgressCampaign1
            )
        })
    })
})

const runUpdateUntil = async ({
    playerProgressToGameEngine,
    stopPredicate,
    timeout,
}: {
    playerProgressToGameEngine: PlayerProgressToGameEngine
    stopPredicate: (_: PlayerProgressToGameEngine) => boolean
    timeout?: number
}): Promise<boolean> => {
    const timeStarted = Date.now()
    let maxRunTime = timeout ?? 1000
    let timeElapsed: number = 0
    while (
        timeElapsed <= maxRunTime &&
        !stopPredicate(playerProgressToGameEngine)
    ) {
        await ApplyPlayerProgressToGameEngineService.update(
            playerProgressToGameEngine
        )
        timeElapsed = Date.now() - timeStarted
    }
    expect(Date.now() - timeStarted).toBeLessThan(maxRunTime)
    return true
}

const setupSpiesForSuccessfulLoad = ({
    campaignFileData,
    missionFileData,
    playerArmy,
}: {
    campaignFileData: CampaignFileFormat
    missionFileData: MissionFileFormat
    playerArmy: PlayerArmy
}) => {
    const campaignLoadSpy = vi
        .spyOn(LoadCampaignService, "loadCampaign")
        .mockResolvedValue(campaignFileData)

    const missionLoadSpy = vi
        .spyOn(LoadMissionService, "loadMission")
        .mockResolvedValue(missionFileData)

    const playerArmySpy = vi
        .spyOn(LoadPlayerArmyService, "loadPlayerArmy")
        .mockResolvedValue(playerArmy)
    return { campaignLoadSpy, missionLoadSpy, playerArmySpy }
}

const runUntilAbortsDueToError = async (
    newProgress: PlayerProgressToGameEngine
): Promise<boolean> => {
    expect(
        await runUpdateUntil({
            playerProgressToGameEngine: newProgress,
            stopPredicate: (
                playerProgressToGameEngine: PlayerProgressToGameEngine
            ) =>
                ApplyPlayerProgressToGameEngineService.hasAbortedWithError(
                    playerProgressToGameEngine
                ),
        })
    ).toBeTruthy()

    expect(
        ApplyPlayerProgressToGameEngineService.hasStartedApplying(newProgress)
    ).toBeFalsy()
    expect(
        ApplyPlayerProgressToGameEngineService.hasFinishedApplyingSuccessfully(
            newProgress
        )
    ).toBeFalsy()
    expect(
        ApplyPlayerProgressToGameEngineService.hasAbortedWithError(newProgress)
    ).toBeTruthy()

    expect(newProgress.playerProgress.tryingToApply).toBeUndefined()
    return true
}

const runUntilSuccess = async (
    newProgress: PlayerProgressToGameEngine
): Promise<boolean> => {
    expect(
        await runUpdateUntil({
            playerProgressToGameEngine: newProgress,
            stopPredicate: (
                playerProgressToGameEngine: PlayerProgressToGameEngine
            ) =>
                ApplyPlayerProgressToGameEngineService.hasFinishedApplyingSuccessfully(
                    playerProgressToGameEngine
                ),
        })
    ).toBeTruthy()

    expect(
        ApplyPlayerProgressToGameEngineService.hasStartedApplying(newProgress)
    ).toBeFalsy()
    expect(
        ApplyPlayerProgressToGameEngineService.hasAbortedWithError(newProgress)
    ).toBeFalsy()

    expect(newProgress.playerProgress.tryingToApply).toBeUndefined()
    return true
}
