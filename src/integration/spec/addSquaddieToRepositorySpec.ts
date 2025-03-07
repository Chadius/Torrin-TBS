import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../battle/objectRepository"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { SquaddieTemplateService } from "../../campaign/squaddieTemplate"
import { BattleSquaddieService } from "../../battle/battleSquaddie"
import { SquaddieIdService } from "../../squaddie/id"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"

export const AddSquaddieToRepositorySpec = {
    addSinglePlayerSquaddie: (
        objectRepository: ObjectRepository,
        attackAction: ActionTemplate
    ) => {
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            attackAction
        )

        const playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player",
            }),
            actionTemplateIds: [attackAction.id],
        })
        ObjectRepositoryService.addSquaddieTemplate(
            objectRepository,
            playerSquaddieTemplate
        )

        const playerBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 0",
        })
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            playerBattleSquaddie
        )
        return { playerSquaddieTemplate, playerBattleSquaddie }
    },
}
