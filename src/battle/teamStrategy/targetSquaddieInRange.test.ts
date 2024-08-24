import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { TargetSquaddieInRange } from "./targetSquaddieInRange"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../action/template/actionEffectSquaddieTemplate"
import {
    DecidedAction,
    DecidedActionService,
} from "../../action/decided/decidedAction"
import { DecidedActionSquaddieEffectService } from "../../action/decided/decidedActionSquaddieEffect"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"

describe("target a squaddie within reach of actions", () => {
    let objectRepository: ObjectRepository
    let missionMap: MissionMap
    let enemyBanditStatic: SquaddieTemplate
    let enemyBanditDynamic: BattleSquaddie
    let playerKnightStatic: SquaddieTemplate
    let playerKnightDynamic: BattleSquaddie
    let allyClericStatic: SquaddieTemplate
    let allyClericDynamic: BattleSquaddie
    let shortBowAction: ActionTemplate
    let enemyTeam: BattleSquaddieTeam

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()

        shortBowAction = ActionTemplateService.new({
            name: "short bow",
            id: "short_bow",
            actionPoints: 2,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                        [Trait.TARGETS_FOE]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 2,
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            shortBowAction
        )
        ;({
            squaddieTemplate: enemyBanditStatic,
            battleSquaddie: enemyBanditDynamic,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "enemy_bandit",
            battleId: "enemy_bandit_0",
            name: "Bandit",
            affiliation: SquaddieAffiliation.ENEMY,
            objectRepository: objectRepository,
            actionTemplateIds: [shortBowAction.id],
        }))
        ;({
            squaddieTemplate: playerKnightStatic,
            battleSquaddie: playerKnightDynamic,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "player_knight",
            battleId: "player_knight_0",
            name: "Knight",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: objectRepository,
            actionTemplateIds: [],
        }))
        ;({
            squaddieTemplate: allyClericStatic,
            battleSquaddie: allyClericDynamic,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "ally_cleric",
            battleId: "ally_cleric_0",
            name: "Cleric",
            affiliation: SquaddieAffiliation.ALLY,
            objectRepository: objectRepository,
            actionTemplateIds: [],
        }))

        missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 "],
            }),
        })

        missionMap.addSquaddie(
            enemyBanditStatic.squaddieId.templateId,
            enemyBanditDynamic.battleSquaddieId,
            {
                q: 0,
                r: 0,
            }
        )

        enemyTeam = BattleSquaddieTeamService.new({
            id: "teamId",
            name: "team",
            affiliation: SquaddieAffiliation.ENEMY,
            battleSquaddieIds: [],
            iconResourceKey: "icon_enemy_team",
        })
        BattleSquaddieTeamService.addBattleSquaddieIds(enemyTeam, [
            enemyBanditDynamic.battleSquaddieId,
        ])
    })

    it("will return undefined if desired squaddies are out of range", () => {
        missionMap.addSquaddie(
            playerKnightStatic.squaddieId.templateId,
            playerKnightDynamic.battleSquaddieId,
            {
                q: 0,
                r: 3,
            }
        )

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.PLAYER,
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            missionMap,
            repository: objectRepository,
        })
        expect(actualInstruction).toBeUndefined()
    })

    it("will raise an error if there is no target squaddie or affiliation with a given id", () => {
        missionMap.addSquaddie(
            playerKnightStatic.squaddieId.templateId,
            playerKnightDynamic.battleSquaddieId,
            {
                q: 0,
                r: 1,
            }
        )

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({})
        const shouldThrowError = () => {
            strategy.DetermineNextInstruction({
                team: enemyTeam,
                missionMap,
                repository: objectRepository,
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow("Target Squaddie In Range strategy has no target")
    })

    it("will target squaddie by dynamic id", () => {
        missionMap.addSquaddie(
            playerKnightStatic.squaddieId.templateId,
            playerKnightDynamic.battleSquaddieId,
            {
                q: 0,
                r: 1,
            }
        )
        missionMap.addSquaddie(
            allyClericStatic.squaddieId.templateId,
            allyClericDynamic.battleSquaddieId,
            {
                q: 0,
                r: 2,
            }
        )
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        })

        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            missionMap,
            repository: objectRepository,
        })
        const decidedActionSquaddieEffect =
            DecidedActionSquaddieEffectService.new({
                template: shortBowAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                target: { q: 0, r: 1 },
            })
        const decidedAction: DecidedAction = DecidedActionService.new({
            actionPointCost: shortBowAction.actionPoints,
            actionTemplateName: shortBowAction.name,
            actionTemplateId: shortBowAction.id,
            battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
            actionEffects: [decidedActionSquaddieEffect],
        })
        expect(actualInstruction).toStrictEqual(decidedAction)
    })

    it("will target squaddie by affiliation", () => {
        missionMap.addSquaddie(
            playerKnightStatic.squaddieId.templateId,
            playerKnightDynamic.battleSquaddieId,
            {
                q: 0,
                r: 1,
            }
        )
        missionMap.addSquaddie(
            allyClericStatic.squaddieId.templateId,
            allyClericDynamic.battleSquaddieId,
            {
                q: 0,
                r: 2,
            }
        )
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.ALLY,
        })

        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            missionMap,
            repository: objectRepository,
        })
        const decidedActionSquaddieEffect =
            DecidedActionSquaddieEffectService.new({
                template: shortBowAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                target: { q: 0, r: 2 },
            })
        const decidedAction: DecidedAction = DecidedActionService.new({
            actionPointCost: shortBowAction.actionPoints,
            actionTemplateName: shortBowAction.name,
            actionTemplateId: shortBowAction.id,
            battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
            actionEffects: [decidedActionSquaddieEffect],
        })
        expect(actualInstruction).toStrictEqual(decidedAction)
    })

    it("will pass if there are no squaddies of the desired affiliation", () => {
        missionMap.addSquaddie(
            playerKnightStatic.squaddieId.templateId,
            playerKnightDynamic.battleSquaddieId,
            {
                q: 0,
                r: 1,
            }
        )
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.ALLY,
        })

        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            missionMap,
            repository: objectRepository,
        })

        expect(actualInstruction).toBeUndefined()
    })

    it("will not use an action if there are not enough action points remaining", () => {
        missionMap.addSquaddie(
            playerKnightStatic.squaddieId.templateId,
            playerKnightDynamic.battleSquaddieId,
            {
                q: 0,
                r: 1,
            }
        )
        missionMap.addSquaddie(
            allyClericStatic.squaddieId.templateId,
            allyClericDynamic.battleSquaddieId,
            {
                q: 0,
                r: 2,
            }
        )
        SquaddieTurnService.spendActionPoints(
            enemyBanditDynamic.squaddieTurn,
            4 - shortBowAction.actionPoints
        )

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        })

        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            missionMap,
            repository: objectRepository,
        })

        expect(actualInstruction).toBeUndefined()
    })

    it("will add to existing instruction", () => {
        missionMap.addSquaddie(
            playerKnightStatic.squaddieId.templateId,
            playerKnightDynamic.battleSquaddieId,
            {
                q: 0,
                r: 1,
            }
        )

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        })

        const decidedActionMovementEffect =
            DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
            })
        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
            startingLocation: { q: 0, r: 0 },
            processedActions: [
                ProcessedActionService.new({
                    decidedAction: DecidedActionService.new({
                        actionPointCost: 1,
                        actionTemplateName: "Move",
                        battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
                        actionEffects: [decidedActionMovementEffect],
                    }),
                    processedActionEffects: [
                        ProcessedActionMovementEffectService.new({
                            decidedActionEffect: decidedActionMovementEffect,
                        }),
                    ],
                }),
            ],
        })

        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            missionMap,
            repository: objectRepository,
            actionsThisRound,
        })
        const decidedActionSquaddieEffect =
            DecidedActionSquaddieEffectService.new({
                template: shortBowAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                target: { q: 0, r: 1 },
            })
        const decidedAction: DecidedAction = DecidedActionService.new({
            actionPointCost: shortBowAction.actionPoints,
            actionTemplateName: shortBowAction.name,
            actionTemplateId: shortBowAction.id,
            battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
            actionEffects: [decidedActionSquaddieEffect],
        })
        expect(actualInstruction).toStrictEqual(decidedAction)
    })

    it("will not change the currently acting squaddie", () => {
        const longBowAction = ActionTemplateService.new({
            name: "long bow",
            id: "long_bow",
            actionPoints: 2,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 2,
                }),
            ],
        })

        const {
            squaddieTemplate: enemyBanditStatic2,
            battleSquaddie: enemyBanditDynamic2,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "enemy_bandit_2",
            battleId: "enemy_bandit_2",
            name: "Bandit",
            affiliation: SquaddieAffiliation.ENEMY,
            objectRepository: objectRepository,
            actionTemplateIds: [longBowAction.id],
        })
        BattleSquaddieTeamService.addBattleSquaddieIds(enemyTeam, [
            enemyBanditDynamic2.battleSquaddieId,
        ])
        missionMap.addSquaddie(
            enemyBanditStatic2.squaddieId.templateId,
            enemyBanditDynamic2.battleSquaddieId,
            {
                q: 0,
                r: 1,
            }
        )
        missionMap.addSquaddie(
            playerKnightStatic.squaddieId.templateId,
            playerKnightDynamic.battleSquaddieId,
            {
                q: 0,
                r: 2,
            }
        )

        const decidedActionMovementEffect =
            DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
            })
        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
            startingLocation: { q: 0, r: 0 },
            processedActions: [
                ProcessedActionService.new({
                    decidedAction: DecidedActionService.new({
                        actionPointCost: 1,
                        actionTemplateName: "Move",
                        battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
                        actionEffects: [decidedActionMovementEffect],
                    }),
                    processedActionEffects: [
                        ProcessedActionMovementEffectService.new({
                            decidedActionEffect: decidedActionMovementEffect,
                        }),
                    ],
                }),
            ],
        })

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            missionMap,
            repository: objectRepository,
            actionsThisRound,
        })
        const decidedActionSquaddieEffect =
            DecidedActionSquaddieEffectService.new({
                template: shortBowAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                target: { q: 0, r: 2 },
            })
        const decidedAction: DecidedAction = DecidedActionService.new({
            actionPointCost: shortBowAction.actionPoints,
            actionTemplateName: shortBowAction.name,
            actionTemplateId: shortBowAction.id,
            battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
            actionEffects: [decidedActionSquaddieEffect],
        })
        expect(actualInstruction).toStrictEqual(decidedAction)
    })

    it("should pass if there are no squaddies to act", () => {
        const allyTeam: BattleSquaddieTeam = BattleSquaddieTeamService.new({
            id: "allyTeamId",
            affiliation: SquaddieAffiliation.ALLY,
            battleSquaddieIds: [],
            name: "Da team",
            iconResourceKey: "icon_ally_team",
        })

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            missionMap,
            repository: objectRepository,
        })
        expect(actualInstruction).toBeUndefined()
    })
})
