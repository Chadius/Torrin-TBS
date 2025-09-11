import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import {
    SquaddieSelectorPanelButton,
    SquaddieSelectorPanelButtonContext,
    SquaddieSelectorPanelButtonService,
} from "./squaddieSelectorPanelButton/squaddieSelectorPanelButton"
import { getResultOrThrowError } from "../../../../utils/resultOrError"
import { SquaddieService } from "../../../../squaddie/squaddieService"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../../actionDecision/battleActionDecisionStep"
import { DataBlobService } from "../../../../utils/dataBlob/dataBlob"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../../../resource/resourceHandler"
import { MousePress } from "../../../../utils/mouseConfig"

export interface SquaddieSelectorPanel {
    buttons: SquaddieSelectorPanelButton[]
}

export const SquaddieSelectorPanelService = {
    new: ({
        battleSquaddieIds,
        objectRepository,
        battleActionDecisionStep,
    }: {
        battleSquaddieIds: string[]
        objectRepository: ObjectRepository
        battleActionDecisionStep?: BattleActionDecisionStep
    }): SquaddieSelectorPanel => {
        const buttons: SquaddieSelectorPanelButton[] = battleSquaddieIds.map(
            (battleSquaddieId, squaddieIndex) => {
                const { battleSquaddie, squaddieTemplate } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            objectRepository,
                            battleSquaddieId
                        )
                    )
                const squaddieIsControllable =
                    SquaddieService.canPlayerControlSquaddieRightNow({
                        battleSquaddie,
                        squaddieTemplate,
                    }).playerCanControlThisSquaddieRightNow

                const squaddieIsSelected =
                    battleActionDecisionStep &&
                    BattleActionDecisionStepService.isActorSet(
                        battleActionDecisionStep
                    ) &&
                    BattleActionDecisionStepService.getActor(
                        battleActionDecisionStep
                    ).battleSquaddieId === battleSquaddieId

                return SquaddieSelectorPanelButtonService.new({
                    battleSquaddieId,
                    squaddieIndex,
                    squaddieIsControllable,
                    squaddieIsSelected,
                })
            }
        )

        return {
            buttons,
        }
    },
    selectSquaddie: (panel: SquaddieSelectorPanel, battleSquaddieId: string) =>
        selectSquaddie(panel, battleSquaddieId),
    draw: ({
        squaddieSelectorPanel,
        objectRepository,
        graphicsContext,
        resourceHandler,
    }: {
        squaddieSelectorPanel: SquaddieSelectorPanel
        objectRepository: ObjectRepository
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }) => {
        squaddieSelectorPanel.buttons.forEach(
            (button: SquaddieSelectorPanelButton) => {
                const { battleSquaddie, squaddieTemplate } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            objectRepository,
                            SquaddieSelectorPanelButtonService.getBattleSquaddieId(
                                button
                            )
                        )
                    )

                SquaddieSelectorPanelButtonService.updateStatus({
                    button,
                    squaddieIsControllable:
                        SquaddieService.canPlayerControlSquaddieRightNow({
                            battleSquaddie,
                            squaddieTemplate,
                        }).playerCanControlThisSquaddieRightNow,
                })

                SquaddieSelectorPanelButtonService.draw({
                    button,
                    objectRepository,
                    graphicsContext,
                    resourceHandler,
                })
            }
        )
    },
    getClickedButton: (
        squaddieSelectorPanel: SquaddieSelectorPanel,
        mouseClick: MousePress
    ): SquaddieSelectorPanelButton =>
        getClickedButton(squaddieSelectorPanel, mouseClick),
    getSelectedBattleSquaddieId: (
        squaddieSelectorPanel: SquaddieSelectorPanel
    ): string => {
        const selectedButton = squaddieSelectorPanel.buttons.find(
            (button) =>
                SquaddieSelectorPanelButtonService.getStatus(button)
                    .squaddieIsSelected
        )

        if (selectedButton == undefined) return undefined
        return SquaddieSelectorPanelButtonService.getBattleSquaddieId(
            selectedButton
        )
    },
}

const selectSquaddie = (
    panel: SquaddieSelectorPanel,
    battleSquaddieId: string
) => {
    panel.buttons.forEach((button: SquaddieSelectorPanelButton) => {
        SquaddieSelectorPanelButtonService.updateStatus({
            button,
            squaddieIsSelected: false,
        })
    })

    const buttonToSelect = panel.buttons.find(
        (button: SquaddieSelectorPanelButton) => {
            const context =
                DataBlobService.get<SquaddieSelectorPanelButtonContext>(
                    button,
                    "context"
                )
            return context?.battleSquaddieId === battleSquaddieId
        }
    )

    if (buttonToSelect) {
        SquaddieSelectorPanelButtonService.updateStatus({
            button: buttonToSelect,
            squaddieIsSelected: true,
        })
    }
}

const getClickedButton = (
    squaddieSelectorPanel: SquaddieSelectorPanel,
    mouseClick: MousePress
): SquaddieSelectorPanelButton => {
    const selectedButton = squaddieSelectorPanel.buttons.find(
        (button) =>
            SquaddieSelectorPanelButtonService.getStatus(button)
                .squaddieIsSelected &&
            SquaddieSelectorPanelButtonService.isMouseSelecting({
                button,
                mouseClick,
            })
    )
    if (selectedButton != undefined) return selectedButton

    return squaddieSelectorPanel.buttons.find(
        (button: SquaddieSelectorPanelButton) =>
            SquaddieSelectorPanelButtonService.isMouseSelecting({
                button,
                mouseClick,
            })
    )
}
