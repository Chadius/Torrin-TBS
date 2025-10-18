import { BattleSquaddie, BattleSquaddieService } from "./battleSquaddie"
import { SquaddieTemplate } from "../campaign/squaddieTemplate"
import { TSquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { ActionTemplate } from "../action/template/actionTemplate"
import { ImageUI } from "../ui/imageUI/imageUI"
import { TBattlePhase } from "./orchestratorComponents/battlePhaseTracker"

export interface ObjectRepository {
    actionTemplatesById: {
        [id: string]: ActionTemplate
    }
    imageUIByBattleSquaddieId: {
        [id: string]: ImageUI
    }
    squaddieTemplates: {
        [id: string]: SquaddieTemplate
    }
    battleSquaddies: {
        [id: string]: BattleSquaddie
    }
    uiElements: {
        phaseBannersByAffiliation: {
            [affiliation in TSquaddieAffiliation]?: string
        }
        teamAffiliationIcons: { [teamId: string]: string }
    }
}

export const ObjectRepositoryService = {
    new: (): ObjectRepository => {
        return {
            actionTemplatesById: {},
            imageUIByBattleSquaddieId: {},
            squaddieTemplates: {},
            battleSquaddies: {},
            uiElements: {
                phaseBannersByAffiliation: {},
                teamAffiliationIcons: {},
            },
        }
    },
    reset: (repo: ObjectRepository) => {
        reset(repo)
    },
    addSquaddieTemplate: (
        repo: ObjectRepository,
        squaddieTemplate: SquaddieTemplate
    ) => {
        addSquaddieTemplate(repo, squaddieTemplate)
    },
    addBattleSquaddie: (
        repo: ObjectRepository,
        battleSquaddie: BattleSquaddie
    ) => {
        addBattleSquaddie(repo, battleSquaddie)
    },
    addSquaddie: ({
        repo,
        squaddieTemplate,
        battleSquaddie,
    }: {
        repo: ObjectRepository
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    }) => {
        addSquaddieTemplate(repo, squaddieTemplate)
        addBattleSquaddie(repo, battleSquaddie)
    },
    updateBattleSquaddie: (
        repo: ObjectRepository,
        battleSquaddie: BattleSquaddie
    ) => {
        BattleSquaddieService.assertBattleSquaddie(battleSquaddie)
        if (!repo.squaddieTemplates[battleSquaddie.squaddieTemplateId]) {
            throw new Error(
                `cannot updateBattleSquaddie '${battleSquaddie.battleSquaddieId}', no squaddie template with id '${battleSquaddie.squaddieTemplateId}' exists`
            )
        }

        repo.battleSquaddies[battleSquaddie.battleSquaddieId] = battleSquaddie
    },
    getSquaddieByBattleId: (
        repo: ObjectRepository,
        battleSquaddieId: string
    ): {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    } => {
        const battleSquaddie: BattleSquaddie =
            repo.battleSquaddies[battleSquaddieId]

        if (!battleSquaddie) {
            throw new Error(
                `cannot getBattleSquaddieByID for '${battleSquaddieId}', does not exist`
            )
        }

        const squaddieTemplate: SquaddieTemplate =
            repo.squaddieTemplates[battleSquaddie.squaddieTemplateId]

        return {
            squaddieTemplate,
            battleSquaddie,
        }
    },
    hasSquaddieByBattleId: (
        repo: ObjectRepository,
        battleSquaddieId: string
    ): boolean => {
        return !!repo.battleSquaddies[battleSquaddieId]
    },
    hasSquaddieByTemplateId: (
        repo: ObjectRepository,
        squaddieTemplateId: string
    ): boolean => {
        return !!repo.squaddieTemplates[squaddieTemplateId]
    },
    getSquaddieTemplateIterator: (
        repo: ObjectRepository
    ): {
        squaddieTemplateId: string
        squaddieTemplate: SquaddieTemplate
    }[] => {
        return Object.entries(repo.squaddieTemplates).map(
            ([squaddieTemplateId, squaddieTemplate]) => {
                return {
                    squaddieTemplate,
                    squaddieTemplateId,
                }
            }
        )
    },
    getBattleSquaddieIterator: (
        repo: ObjectRepository
    ): {
        battleSquaddieId: string
        battleSquaddie: BattleSquaddie
    }[] => {
        return Object.entries(repo.battleSquaddies).map(
            ([battleSquaddieId, battleSquaddie]) => {
                return {
                    battleSquaddie,
                    battleSquaddieId,
                }
            }
        )
    },
    addActionTemplate: (
        repository: ObjectRepository,
        actionTemplate: ActionTemplate
    ) => {
        if (repository.actionTemplatesById[actionTemplate.id] !== undefined) {
            throw new Error(
                `cannot addActionTemplate '${actionTemplate.id}', already exists`
            )
        }

        repository.actionTemplatesById[actionTemplate.id] = actionTemplate
    },
    getActionTemplateById: (
        repository: ObjectRepository,
        actionTemplateId: string
    ): ActionTemplate => {
        const actionTemplate = repository.actionTemplatesById[actionTemplateId]
        if (actionTemplate === undefined) {
            throw new Error(
                `cannot getActionTemplateById '${actionTemplateId}', does not exist`
            )
        }
        return actionTemplate
    },
    hasActionTemplateId: (
        repository: ObjectRepository,
        actionTemplateId: string
    ): boolean => {
        return repository.actionTemplatesById[actionTemplateId] !== undefined
    },
    getImageUIByBattleSquaddieId: ({
        repository,
        battleSquaddieId,
        throwErrorIfNotFound = true,
    }: {
        repository: ObjectRepository
        battleSquaddieId: string
        throwErrorIfNotFound?: boolean
    }): ImageUI | undefined => {
        const imageUI = repository.imageUIByBattleSquaddieId[battleSquaddieId]
        if (imageUI === undefined && throwErrorIfNotFound) {
            throw new Error(
                `[objectRepository.getImageUIByBattleSquaddieId] '${battleSquaddieId}' not found`
            )
        }
        return imageUI
    },
    addImageUIByBattleSquaddieId: ({
        repository,
        imageUI,
        battleSquaddieId,
    }: {
        repository: ObjectRepository
        imageUI: ImageUI
        battleSquaddieId: string
    }) => {
        if (repository == undefined) {
            throw new Error(
                "[ObjectRepositoryService.addImageUIByBattleSquaddieId]: repository must be defined"
            )
        }
        repository.imageUIByBattleSquaddieId[battleSquaddieId] = imageUI
    },
    getPhaseBanners: (repository: ObjectRepository) => {
        if (repository == undefined) {
            throw new Error(
                "[ObjectRepositoryService.getPhaseBanners]: repository must be defined"
            )
        }
        return { ...repository.uiElements.phaseBannersByAffiliation }
    },
    getPhaseBannerForAffiliation: (
        repository: ObjectRepository,
        battlePhase: TBattlePhase
    ): string | undefined => {
        if (repository == undefined) {
            throw new Error(
                "[ObjectRepositoryService.getPhaseBannerByAffiliation]: repository must be defined"
            )
        }
        return repository.uiElements.phaseBannersByAffiliation[battlePhase]
    },
    setPhaseBanner: ({
        repository,
        battlePhase,
        resourceKey,
    }: {
        repository: ObjectRepository
        battlePhase: TBattlePhase
        resourceKey: string
    }): void => {
        if (repository == undefined) {
            throw new Error(
                "[ObjectRepositoryService.setPhaseBanner]: repository must be defined"
            )
        }
        repository.uiElements.phaseBannersByAffiliation[battlePhase] =
            resourceKey
    },
    getTeamAffiliationIcons: (repository: ObjectRepository) => {
        if (repository == undefined) {
            throw new Error(
                "[ObjectRepositoryService.getTeamAffiliationIcons]: repository must be defined"
            )
        }

        return { ...repository.uiElements.teamAffiliationIcons }
    },
    setTeamAffiliationIcon: ({
        repository,
        teamId,
        resourceKey,
    }: {
        repository: ObjectRepository
        teamId: string
        resourceKey: string
    }) => {
        if (repository == undefined) {
            throw new Error(
                "[ObjectRepositoryService.setTeamAffiliationIcon]: repository must be defined"
            )
        }
        repository.uiElements.teamAffiliationIcons[teamId] = resourceKey
    },
    resetTeamAffiliationIcons: (repository: ObjectRepository) => {
        if (repository == undefined) {
            throw new Error(
                "[ObjectRepositoryService.resetTeamAffiliationIcons]: repository must be defined"
            )
        }
        repository.uiElements.teamAffiliationIcons = {}
    },
}

const reset = (repo: ObjectRepository) => {
    repo.squaddieTemplates = {}
    repo.battleSquaddies = {}
    repo.actionTemplatesById = {}
    repo.uiElements = {
        phaseBannersByAffiliation: {},
        teamAffiliationIcons: {},
    }
}

const addSquaddieTemplate = (
    repo: ObjectRepository,
    squaddieTemplate: SquaddieTemplate
) => {
    if (repo.squaddieTemplates[squaddieTemplate.squaddieId.templateId]) {
        throw new Error(
            `cannot addSquaddieTemplate '${squaddieTemplate.squaddieId.templateId}', is already added`
        )
    }

    repo.squaddieTemplates[squaddieTemplate.squaddieId.templateId] =
        squaddieTemplate
}

const addBattleSquaddie = (
    repo: ObjectRepository,
    battleSquaddie: BattleSquaddie
) => {
    BattleSquaddieService.assertBattleSquaddie(battleSquaddie)
    if (!repo.squaddieTemplates[battleSquaddie.squaddieTemplateId]) {
        throw new Error(
            `cannot addBattleSquaddie '${battleSquaddie.battleSquaddieId}', no squaddie template with Id '${battleSquaddie.squaddieTemplateId}' exists`
        )
    }

    if (repo.battleSquaddies[battleSquaddie.battleSquaddieId]) {
        throw new Error(
            `cannot addBattleSquaddie '${battleSquaddie.battleSquaddieId}', again, it already exists`
        )
    }

    const squaddieTemplate: SquaddieTemplate =
        repo.squaddieTemplates[battleSquaddie.squaddieTemplateId]
    BattleSquaddieService.initializeInBattleAttributes(
        battleSquaddie,
        squaddieTemplate.attributes
    )

    repo.battleSquaddies[battleSquaddie.battleSquaddieId] = battleSquaddie
}
