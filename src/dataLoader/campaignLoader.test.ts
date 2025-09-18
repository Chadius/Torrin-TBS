import { CampaignFileFormat } from "../campaign/campaignFileFormat"
import { CampaignLoaderService } from "./campaignLoader"
import { TestCampaignData } from "../utils/test/campaignData"
import * as DataLoader from "./dataLoader"
import { CampaignResourcesService } from "../campaign/campaignResources"
import { beforeEach, describe, expect, it, MockInstance, vi } from "vitest"

describe("campaign loader", () => {
    describe("sanitization", () => {
        let validCampaign: CampaignFileFormat
        beforeEach(() => {
            validCampaign = CampaignLoaderService.new({
                id: "mission id",
                missionIds: ["0000", "0001"],
            })
        })
        it("throws an error if id is missing", () => {
            const throwErrorBecauseOfNoId = () => {
                // @ts-ignore intentionally deleting a field to throw an error
                delete validCampaign["id"]
                CampaignLoaderService.sanitize(validCampaign)
            }

            expect(throwErrorBecauseOfNoId).toThrowError("cannot sanitize")
        })
        it("makes empty mission ids if it is missing", () => {
            // @ts-ignore intentionally deleting a field to throw an error
            delete validCampaign["missionIds"]
            const sanitizedCampaign =
                CampaignLoaderService.sanitize(validCampaign)
            expect(sanitizedCampaign.missionIds).toHaveLength(0)
        })
        it("makes default resources fields if it is missing", () => {
            // @ts-ignore intentionally deleting a field to test a default regenerates
            delete validCampaign["resources"]
            const sanitizedCampaign =
                CampaignLoaderService.sanitize(validCampaign)
            expect(sanitizedCampaign.resources).toEqual(
                CampaignResourcesService.default()
            )
        })
    })
    describe("load from a file", () => {
        let campaignFileData: CampaignFileFormat
        let loadFileIntoFormatSpy: MockInstance

        beforeEach(() => {
            ;({ campaignFile: campaignFileData } = TestCampaignData())

            loadFileIntoFormatSpy = vi
                .spyOn(DataLoader, "LoadFileIntoFormat")
                .mockImplementation(
                    async (
                        filename: string
                    ): Promise<CampaignFileFormat | undefined> => {
                        if (
                            filename === "assets/campaign/default/campaign.json"
                        ) {
                            return campaignFileData
                        }
                    }
                )
        })

        it("loads the campaign file when requested", async () => {
            const actualData =
                await CampaignLoaderService.loadCampaignFromFile("default")
            expect(loadFileIntoFormatSpy).toBeCalled()
            expect(actualData).not.toBeUndefined()
            expect(actualData).toEqual(campaignFileData)
        })
    })
})
