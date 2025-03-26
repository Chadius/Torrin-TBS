import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { getResultOrThrowError } from "../../utils/ResultOrError"

export const ActionValidityTestUtils = {
    setup: ({
        missionMap,
        actorSquaddie,
        otherSquaddies,
    }: {
        missionMap: MissionMap
        actorSquaddie: {
            name: string
            affiliation: SquaddieAffiliation
            mapCoordinate: HexCoordinate
        }
        otherSquaddies: {
            name: string
            affiliation: SquaddieAffiliation
            mapCoordinate: HexCoordinate
        }[]
    }): ObjectRepository => {
        const objectRepository = ObjectRepositoryService.new()

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: actorSquaddie.name,
            battleId: actorSquaddie.name,
            templateId: actorSquaddie.name,
            affiliation: actorSquaddie.affiliation,
            objectRepository,
            actionTemplateIds: [],
        })

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: actorSquaddie.name,
            battleSquaddieId: actorSquaddie.name,
            coordinate: actorSquaddie.mapCoordinate,
        })

        otherSquaddies.forEach((squaddieInfo) => {
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: squaddieInfo.name,
                battleId: squaddieInfo.name,
                templateId: squaddieInfo.name,
                affiliation: squaddieInfo.affiliation,
                objectRepository,
                actionTemplateIds: [],
            })

            MissionMapService.addSquaddie({
                missionMap,
                squaddieTemplateId: squaddieInfo.name,
                battleSquaddieId: squaddieInfo.name,
                coordinate: squaddieInfo.mapCoordinate,
            })
        })

        return objectRepository
    },
    addActionTemplateToSquaddie: ({
        objectRepository,
        actionTemplate,
        actorSquaddieName,
    }: {
        objectRepository: ObjectRepository
        actionTemplate: ActionTemplate
        actorSquaddieName: string
    }) => {
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplate
        )

        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                actorSquaddieName
            )
        )
        squaddieTemplate.actionTemplateIds.push(actionTemplate.id)
    },
}
