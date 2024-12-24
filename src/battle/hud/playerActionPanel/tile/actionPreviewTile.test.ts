import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../../action/template/actionTemplate"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import {
    ActionPreviewTile,
    ActionPreviewTileService,
} from "./actionPreviewTile"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../../gameEngine/gameEngine"
import { SquaddieRepositoryService } from "../../../../utils/test/squaddie"
import { ActionEffectTemplateService } from "../../../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../../trait/traitStatusStorage"
import { DamageType } from "../../../../squaddie/squaddieService"

import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../utils/test/mocks"
import { BattleOrchestratorStateService } from "../../../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../../orchestrator/battleState"
import { CampaignService } from "../../../../campaign/campaign"
import {
    MissionMap,
    MissionMapService,
} from "../../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../../hexMap/terrainTileMap"
import { BattleActionDecisionStepService } from "../../../actionDecision/battleActionDecisionStep"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
} from "vitest"

describe("Action Preview Tile", () => {
    let objectRepository: ObjectRepository
    let actionTemplateNeedsToHit: ActionTemplate
    let gameEngineState: GameEngineState
    let tile: ActionPreviewTile

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        actionTemplateNeedsToHit = ActionTemplateService.new({
            id: "actionTemplateNeedsToHit",
            name: "Action needs to hit",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.TARGET_FOE]: true,
                    }),
                    damageDescriptions: {
                        [DamageType.BODY]: 2,
                    },
                }),
            ],
            buttonIconResourceKey: "button-icon-resource-key",
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplateNeedsToHit
        )

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "player",
            templateId: "player_0",
            battleId: "player_0",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository,
            actionTemplateIds: ["actionTemplateNeedsToHit"],
        })

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "enemy",
            templateId: "enemy_0",
            battleId: "enemy_0",
            affiliation: SquaddieAffiliation.ENEMY,
            objectRepository,
            actionTemplateIds: ["actionTemplateNeedsToHit"],
        })
    })

    describe("drawing", () => {
        let graphicsBuffer: GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }
        let missionMap: MissionMap

        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 "],
                }),
            })

            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: "player_0",
                squaddieTemplateId: "player_0",
                coordinate: { q: 0, r: 0 },
            })

            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: "enemy_0",
                squaddieTemplateId: "enemy_0",
                coordinate: { q: 0, r: 1 },
            })

            gameEngineState = GameEngineStateService.new({
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        campaignId: "test campaign",
                        missionId: "test mission",
                        missionMap,
                    }),
                }),
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            const actionStep = BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionStep,
                battleSquaddieId: "player_0",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionStep,
                actionTemplateId: "actionTemplateNeedsToHit",
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionStep,
                targetCoordinate: { q: 0, r: 1 },
            })
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                actionStep

            tile = ActionPreviewTileService.new({
                gameEngineState,
                objectRepository,
            })
            graphicsBuffer = new MockedP5GraphicsBuffer()
            graphicsBufferSpies =
                MockedGraphicsBufferService.addSpies(graphicsBuffer)
        })

        afterEach(() => {
            MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
        })

        it("will draw the background", () => {
            ActionPreviewTileService.draw({
                tile: tile,
                graphicsContext: graphicsBuffer,
            })
            expect(graphicsBufferSpies["rect"]).toBeCalled()
        })
    })
})
