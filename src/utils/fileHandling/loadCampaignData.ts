import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { TestMissionData } from "../test/missionData"
import { TestPlayerArmyData } from "../test/army"
import { TestCampaignData } from "../test/campaignData"
import * as DataLoader from "../../dataLoader/dataLoader"
import { MissionFileFormat } from "../../dataLoader/missionLoader"
import { PlayerArmy } from "../../campaign/playerArmy"
import { CampaignFileFormat } from "../../campaign/campaignFileFormat"
import { vi } from "vitest"

export const LoadCampaignData = {
    createLoadFileSpy: () => {
        let missionData: MissionFileFormat
        let enemyDemonSlitherTemplate: SquaddieTemplate
        let enemyDemonSlitherTemplate2: SquaddieTemplate
        let allyGuardTemplate: SquaddieTemplate
        let noAffiliationLivingFlameTemplate: SquaddieTemplate
        let npcActionTemplates: ActionTemplate[]
        let playerActionTemplates: ActionTemplate[]
        let playerArmy: PlayerArmy
        let campaignFileData: CampaignFileFormat
        let baseSquaddieTemplatesById: { [id: string]: SquaddieTemplate }
        ;({
            missionData,
            enemyDemonSlitherTemplate,
            enemyDemonSlitherTemplate2,
            allyGuardTemplate,
            noAffiliationLivingFlameTemplate,
            npcActionTemplates,
        } = TestMissionData())
        ;({ playerArmy, playerActionTemplates, baseSquaddieTemplatesById } =
            TestPlayerArmyData())
        ;({ campaignFile: campaignFileData } = TestCampaignData())

        let loadFileIntoFormatSpy = vi
            .spyOn(DataLoader, "LoadFileIntoFormat")
            .mockImplementation(
                async (
                    filename: string
                ): Promise<
                    | MissionFileFormat
                    | SquaddieTemplate
                    | PlayerArmy
                    | CampaignFileFormat
                    | ActionTemplate[]
                    | undefined
                > => {
                    if (
                        filename ===
                        `assets/campaign/${campaignFileData.id}/missions/0000.json`
                    ) {
                        return missionData
                    }

                    if (
                        filename ===
                        `assets/campaign/theNewCampaign/missions/0000.json`
                    ) {
                        return missionData
                    }

                    if (
                        filename ===
                        "assets/playerArmy/young_nahla/base-squaddie-template.json"
                    ) {
                        return baseSquaddieTemplatesById["young_nahla"]
                    }

                    if (
                        filename ===
                        "assets/playerArmy/sir_camil/base-squaddie-template.json"
                    ) {
                        return baseSquaddieTemplatesById["sir_camil"]
                    }

                    if (
                        filename ===
                        "assets/npcData/enemy_demon_slither/enemy_demon_slither.json"
                    ) {
                        return enemyDemonSlitherTemplate
                    }

                    if (
                        filename ===
                        "assets/npcData/enemyDemonSlitherTemplate2_id/enemyDemonSlitherTemplate2_id.json"
                    ) {
                        return enemyDemonSlitherTemplate2
                    }

                    if (
                        filename === "assets/npcData/ally_guard/ally_guard.json"
                    ) {
                        return allyGuardTemplate
                    }

                    if (
                        filename ===
                        "assets/npcData/no_affiliation_living_flame/no_affiliation_living_flame.json"
                    ) {
                        return noAffiliationLivingFlameTemplate
                    }

                    if (filename === "assets/playerArmy/playerArmy.json") {
                        return playerArmy
                    }

                    if (
                        filename ===
                        "assets/campaign/coolCampaign/campaign.json"
                    ) {
                        return campaignFileData
                    }

                    if (
                        filename ===
                        "assets/campaign/theNewCampaign/campaign.json"
                    ) {
                        return {
                            ...campaignFileData,
                            id: "theNewCampaign",
                        }
                    }

                    if (filename === "assets/npcData/action_templates.json") {
                        return npcActionTemplates
                    }

                    if (
                        filename === "assets/playerArmy/action_templates.json"
                    ) {
                        return playerActionTemplates
                    }
                }
            )

        return {
            loadFileIntoFormatSpy,
            playerArmy,
            playerActionTemplates,
            campaignFileData,
            missionData,
            enemyDemonSlitherTemplate,
            enemyDemonSlitherTemplate2,
            allyGuardTemplate,
            noAffiliationLivingFlameTemplate,
            npcActionTemplates,
            baseSquaddieTemplatesById,
        }
    },
    getExpectedFileNames: () => {
        const { campaignFile: campaignFileData } = TestCampaignData()
        return {
            [campaignFileData.id]: `assets/campaign/${campaignFileData.id}/missions/0000.json`,
            mission_0000: `assets/campaign/theNewCampaign/missions/0000.json`,
            playerArmy: "assets/playerArmy/playerArmy.json",
            campaignFileData: "assets/campaign/coolCampaign/campaign.json",
            theNewCampaign: "assets/campaign/theNewCampaign/campaign.json",
            npcActionTemplates: "assets/npcData/action_templates.json",
            playerActionTemplates: "assets/playerArmy/action_templates.json",
            ...getExpectedSquaddieFileNames(),
        }
    },
    getExpectedSquaddieFileNames: () => getExpectedSquaddieFileNames(),
    getExpectedSquaddieTemplates: () => getExpectedSquaddieTemplates(),
    getExpectedActionTemplateIds: () => getExpectedActionTemplateIds(),
}

const getExpectedSquaddieFileNames = () => {
    return {
        young_nahla:
            "assets/playerArmy/young_nahla/base-squaddie-template.json",
        sir_camil: "assets/playerArmy/sir_camil/base-squaddie-template.json",
        enemyDemonSlitherTemplate:
            "assets/npcData/enemy_demon_slither/enemy_demon_slither.json",
        enemyDemonSlitherTemplate2:
            "assets/npcData/enemyDemonSlitherTemplate2_id/enemyDemonSlitherTemplate2_id.json",
        allyGuardTemplate: "assets/npcData/ally_guard/ally_guard.json",
        noAffiliationLivingFlameTemplate:
            "assets/npcData/no_affiliation_living_flame/no_affiliation_living_flame.json",
    }
}

const getExpectedSquaddieTemplates = () => {
    const {
        enemyDemonSlitherTemplate,
        enemyDemonSlitherTemplate2,
        allyGuardTemplate,
        noAffiliationLivingFlameTemplate,
    } = TestMissionData()

    const { baseSquaddieTemplatesById } = TestPlayerArmyData()

    return [
        enemyDemonSlitherTemplate,
        enemyDemonSlitherTemplate2,
        allyGuardTemplate,
        noAffiliationLivingFlameTemplate,
        ...Object.values(baseSquaddieTemplatesById),
    ]
}

const getExpectedActionTemplateIds = () => {
    return LoadCampaignData.getExpectedSquaddieTemplates()
        .map((squaddieTemplate) => squaddieTemplate.actionTemplateIds)
        .flat()
}
