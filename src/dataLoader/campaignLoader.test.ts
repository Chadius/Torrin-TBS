import { CampaignFileFormat } from "../campaign/campaignFileFormat"
import { CampaignLoaderService } from "./campaignLoader"
import { TestCampaignData } from "../utils/test/campaignData"
import * as DataLoader from "./dataLoader"
import { CampaignResourcesService } from "../campaign/campaignResources"

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
                delete validCampaign["id"]
                CampaignLoaderService.sanitize(validCampaign)
            }

            expect(throwErrorBecauseOfNoId).toThrowError("cannot sanitize")
        })
        it("makes empty mission ids if it is missing", () => {
            delete validCampaign["missionIds"]
            CampaignLoaderService.sanitize(validCampaign)
            expect(validCampaign.missionIds).toHaveLength(0)
        })
        it("makes default resources fields if it is missing", () => {
            delete validCampaign["resources"]
            CampaignLoaderService.sanitize(validCampaign)
            expect(validCampaign.resources).toEqual(
                CampaignResourcesService.default()
            )
        })
    })
    describe("load from a file", () => {
        let campaignFileData: CampaignFileFormat
        let loadFileIntoFormatSpy: jest.SpyInstance

        beforeEach(() => {
            ;({ campaignFile: campaignFileData } = TestCampaignData())

            loadFileIntoFormatSpy = jest
                .spyOn(DataLoader, "LoadFileIntoFormat")
                .mockImplementation(
                    async (filename: string): Promise<CampaignFileFormat> => {
                        if (
                            filename === "assets/campaign/default/campaign.json"
                        ) {
                            return campaignFileData
                        }
                    }
                )
        })

        it("loads the campaign file when requested", async () => {
            const actualData: CampaignFileFormat =
                await CampaignLoaderService.loadCampaignFromFile("default")
            expect(loadFileIntoFormatSpy).toBeCalled()
            expect(actualData).toEqual(campaignFileData)
        })
    })
})
