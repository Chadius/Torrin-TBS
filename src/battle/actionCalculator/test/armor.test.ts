import { BattleSquaddie, BattleSquaddieService } from "../../battleSquaddie"
import { StreamNumberGenerator } from "../../numberGenerator/stream"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngine"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../../action/template/actionEffectSquaddieTemplate"
import { DamageType } from "../../../squaddie/squaddieService"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SquaddieTemplateService } from "../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../squaddie/id"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { CampaignService } from "../../../campaign/campaign"
import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../orchestrator/battleState"
import { ActionsThisRoundService } from "../../history/actionsThisRound"
import { ProcessedActionService } from "../../../action/processed/processedAction"
import { DecidedActionService } from "../../../action/decided/decidedAction"
import { DecidedActionSquaddieEffectService } from "../../../action/decided/decidedActionSquaddieEffect"
import { ActionCalculator } from "../calculator"
import { DegreeOfSuccess } from "../degreeOfSuccess"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import {
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "../../../squaddie/attributeModifier"

describe("Armor Attribute affects Armor Attacks", () => {
    let actingSquaddie: BattleSquaddie
    let targetSquaddie: BattleSquaddie
    let armorAttackingAction: ActionTemplate
    let numberGenerator: StreamNumberGenerator
    let gameEngineState: GameEngineState
    let missionMap: MissionMap

    beforeEach(() => {
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })

        armorAttackingAction = ActionTemplateService.new({
            id: "armorAttackingAction",
            name: "ArmorAttackingAction",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    damageDescriptions: {
                        [DamageType.UNKNOWN]: 1,
                    },
                    minimumRange: 1,
                    maximumRange: 1,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGETS_FOE]: true,
                        [Trait.TARGET_ARMOR]: true,
                    }),
                }),
            ],
        })

        const repository: ObjectRepository = ObjectRepositoryService.new()

        const actingTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                templateId: "actingTemplate",
                name: "actingTemplate",
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            actionTemplates: [armorAttackingAction],
        })
        actingSquaddie = BattleSquaddieService.new({
            squaddieTemplate: actingTemplate,
            battleSquaddieId: "actingSquaddie",
        })
        ObjectRepositoryService.addSquaddie(
            repository,
            actingTemplate,
            actingSquaddie
        )
        MissionMapService.addSquaddie(
            missionMap,
            actingTemplate.squaddieId.templateId,
            actingSquaddie.battleSquaddieId,
            { q: 0, r: 0 }
        )

        const targetTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                templateId: "targetTemplate",
                name: "targetTemplate",
                affiliation: SquaddieAffiliation.ENEMY,
            }),
        })
        targetSquaddie = BattleSquaddieService.new({
            squaddieTemplate: targetTemplate,
            battleSquaddieId: "targetSquaddie",
        })
        ObjectRepositoryService.addSquaddie(
            repository,
            targetTemplate,
            targetSquaddie
        )
        MissionMapService.addSquaddie(
            missionMap,
            targetTemplate.squaddieId.templateId,
            targetSquaddie.battleSquaddieId,
            { q: 0, r: 1 }
        )

        gameEngineState = GameEngineStateService.new({
            repository,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.new({
                    missionMap: missionMap,
                    missionId: "armor test",
                    campaignId: "calculator campaign",
                }),
            }),
            campaign: CampaignService.default({}),
        })
    })

    const createActionsThisRound = (action: ActionTemplate) => {
        return ActionsThisRoundService.new({
            battleSquaddieId: actingSquaddie.battleSquaddieId,
            startingLocation: { q: 0, r: 0 },
            processedActions: [
                ProcessedActionService.new({
                    decidedAction: DecidedActionService.new({
                        actionTemplateName: action.name,
                        actionTemplateId: action.id,
                        battleSquaddieId: actingSquaddie.battleSquaddieId,
                        actionPointCost: action.actionPoints,
                        actionEffects: [
                            DecidedActionSquaddieEffectService.new({
                                template: action
                                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                target: { q: 0, r: 1 },
                            }),
                        ],
                    }),
                }),
            ],
            previewedActionTemplateId: armorAttackingAction.id,
        })
    }

    it("can use armor to reduce a successful hit into a failure miss", () => {
        const expectedRolls: number[] = [1, 6]
        numberGenerator = new StreamNumberGenerator({ results: expectedRolls })
        gameEngineState.battleOrchestratorState.numberGenerator =
            numberGenerator

        gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
            createActionsThisRound(armorAttackingAction)

        InBattleAttributesService.addActiveAttributeModifier(
            targetSquaddie.inBattleAttributes,
            AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.CIRCUMSTANCE,
                amount: 8,
                duration: 1,
                description: "Raise Shield",
            })
        )

        const results = ActionCalculator.calculateResults({
            gameEngineState,
            actionsThisRound:
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound,
            actionEffect:
                ActionsThisRoundService.getDecidedButNotProcessedActionEffect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                ).decidedActionEffect,
            actingBattleSquaddie: actingSquaddie,
            validTargetLocation: { q: 0, r: 1 },
        })

        expect(
            results.actingContext.targetSquaddieModifiers[
                targetSquaddie.battleSquaddieId
            ][AttributeType.ARMOR]
        ).toEqual(8)
        expect(results.squaddieChanges[0].actorDegreeOfSuccess).toEqual(
            DegreeOfSuccess.FAILURE
        )
    })

    it("attacks that do not aim at armor ignore target armor", () => {
        const expectedRolls: number[] = [1, 6]
        numberGenerator = new StreamNumberGenerator({ results: expectedRolls })
        gameEngineState.battleOrchestratorState.numberGenerator =
            numberGenerator

        const armorIgnoringAction = ActionTemplateService.new({
            id: "armorIgnoringAction",
            name: "ArmorIgnoringAction",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    damageDescriptions: {
                        [DamageType.UNKNOWN]: 1,
                    },
                    minimumRange: 1,
                    maximumRange: 1,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGETS_FOE]: true,
                    }),
                }),
            ],
        })

        gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
            createActionsThisRound(armorIgnoringAction)

        InBattleAttributesService.addActiveAttributeModifier(
            targetSquaddie.inBattleAttributes,
            AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.CIRCUMSTANCE,
                amount: 9001,
                duration: 1,
                description: "Impenetrable Armor",
            })
        )

        const results = ActionCalculator.calculateResults({
            gameEngineState,
            actionsThisRound:
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound,
            actionEffect:
                ActionsThisRoundService.getDecidedButNotProcessedActionEffect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                ).decidedActionEffect,
            actingBattleSquaddie: actingSquaddie,
            validTargetLocation: { q: 0, r: 1 },
        })

        expect(
            results.actingContext.targetSquaddieModifiers[
                targetSquaddie.battleSquaddieId
            ][AttributeType.ARMOR]
        ).toBeUndefined()
        expect(results.squaddieChanges[0].actorDegreeOfSuccess).toEqual(
            DegreeOfSuccess.CRITICAL_SUCCESS
        )
    })
})
