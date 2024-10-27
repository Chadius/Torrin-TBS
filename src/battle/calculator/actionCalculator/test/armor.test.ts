import { BattleSquaddie, BattleSquaddieService } from "../../../battleSquaddie"
import { StreamNumberGenerator } from "../../../numberGenerator/stream"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../../action/template/actionTemplate"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../../gameEngine/gameEngine"
import {
    MissionMap,
    MissionMapService,
} from "../../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../../hexMap/terrainTileMap"
import { ActionEffectSquaddieTemplateService } from "../../../../action/template/actionEffectSquaddieTemplate"
import { DamageType } from "../../../../squaddie/squaddieService"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../../trait/traitStatusStorage"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import { SquaddieTemplateService } from "../../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../../squaddie/id"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import { CampaignService } from "../../../../campaign/campaign"
import { BattleOrchestratorStateService } from "../../../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../../orchestrator/battleState"
import { ActionsThisRoundService } from "../../../history/actionsThisRound"
import { ProcessedActionService } from "../../../../action/processed/processedAction"
import { ActionCalculator } from "../calculator"
import { DegreeOfSuccess } from "../degreeOfSuccess"
import { InBattleAttributesService } from "../../../stats/inBattleAttributes"
import {
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "../../../../squaddie/attributeModifier"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../../actionDecision/battleActionDecisionStep"

describe("Armor Attribute affects Armor Attacks", () => {
    let actingSquaddie: BattleSquaddie
    let targetSquaddie: BattleSquaddie
    let armorAttackingAction: ActionTemplate
    let numberGenerator: StreamNumberGenerator
    let gameEngineState: GameEngineState
    let missionMap: MissionMap
    let objectRepository: ObjectRepository

    beforeEach(() => {
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })

        objectRepository = ObjectRepositoryService.new()
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
                        [Trait.TARGET_FOE]: true,
                        [Trait.VERSUS_ARMOR]: true,
                    }),
                }),
            ],
        })

        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            armorAttackingAction
        )

        const actingTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                templateId: "actingTemplate",
                name: "actingTemplate",
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            actionTemplateIds: [armorAttackingAction.id],
        })
        actingSquaddie = BattleSquaddieService.new({
            squaddieTemplate: actingTemplate,
            battleSquaddieId: "actingSquaddie",
        })
        ObjectRepositoryService.addSquaddie(
            objectRepository,
            actingTemplate,
            actingSquaddie
        )
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: actingTemplate.squaddieId.templateId,
            battleSquaddieId: actingSquaddie.battleSquaddieId,
            location: {
                q: 0,
                r: 0,
            },
        })

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
            objectRepository,
            targetTemplate,
            targetSquaddie
        )
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: targetTemplate.squaddieId.templateId,
            battleSquaddieId: targetSquaddie.battleSquaddieId,
            location: { q: 0, r: 1 },
        })

        gameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.new({
                    missionMap: missionMap,
                    missionId: "armor test",
                    campaignId: "calculator campaign",
                }),
            }),
            campaign: CampaignService.default(),
        })
    })

    const createActionsThisRound = (action: ActionTemplate) => {
        return ActionsThisRoundService.new({
            battleSquaddieId: actingSquaddie.battleSquaddieId,
            startingLocation: { q: 0, r: 0 },
            processedActions: [
                ProcessedActionService.new({
                    actionPointCost: 1,
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

        const actionStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionStep,
            battleSquaddieId: actingSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionStep,
            actionTemplateId: armorAttackingAction.id,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionStep,
            targetLocation: { q: 0, r: 1 },
        })

        const results = ActionCalculator.calculateResults({
            gameEngineState,
            actionsThisRound:
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound,
            battleActionDecisionStep: actionStep,
            actingBattleSquaddie: actingSquaddie,
            validTargetLocation: { q: 0, r: 1 },
        })

        expect(
            results[0].actingContext.targetSquaddieModifiers[
                targetSquaddie.battleSquaddieId
            ].find((t) => t.type === AttributeType.ARMOR).amount
        ).toEqual(8)
        expect(results[0].squaddieChanges[0].actorDegreeOfSuccess).toEqual(
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
                        [Trait.TARGET_FOE]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            armorIgnoringAction
        )

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
        const actionStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionStep,
            battleSquaddieId: actingSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionStep,
            actionTemplateId: armorIgnoringAction.id,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionStep,
            targetLocation: { q: 0, r: 1 },
        })

        const results = ActionCalculator.calculateResults({
            gameEngineState,
            actionsThisRound:
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound,
            battleActionDecisionStep: actionStep,
            actingBattleSquaddie: actingSquaddie,
            validTargetLocation: { q: 0, r: 1 },
        })

        expect(
            results[0].actingContext.targetSquaddieModifiers[
                targetSquaddie.battleSquaddieId
            ].find((t) => t.type === AttributeType.ARMOR)
        ).toBeUndefined()
        expect(results[0].squaddieChanges[0].actorDegreeOfSuccess).toEqual(
            DegreeOfSuccess.CRITICAL_SUCCESS
        )
    })
})
