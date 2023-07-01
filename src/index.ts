import p5 from 'p5';
import {ResourceHandler, ResourceType} from "./resource/resourceHandler";
import {ScreenDimensions} from "./utils/graphicsConfig";
import {Orchestrator} from "./battle/orchestrator/orchestrator";
import {OrchestratorState} from "./battle/orchestrator/orchestratorState";
import {BattleSquaddieRepository} from "./battle/battleSquaddieRepository";
import {BattlePhaseTracker} from "./battle/orchestratorComponents/battlePhaseTracker";
import {BattleCamera} from "./battle/battleCamera";
import {BattleMissionLoader} from "./battle/orchestratorComponents/battleMissionLoader";
import {BattleCutscenePlayer} from "./battle/orchestratorComponents/battleCutscenePlayer";
import {BattleSquaddieSelector} from "./battle/orchestratorComponents/battleSquaddieSelector";
import {BattleSquaddieMover} from "./battle/orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "./battle/orchestratorComponents/battleMapDisplay";
import {BattlePhaseController} from "./battle/orchestratorComponents/battlePhaseController";
import {BattleSquaddieMapActivity} from "./battle/orchestratorComponents/battleSquaddieMapActivity";
import {EndTurnTeamStrategy} from "./battle/teamStrategy/endTurn";
import {MoveCloserToSquaddie} from "./battle/teamStrategy/moveCloserToSquaddie";
import {SquaddieAffiliation} from "./squaddie/squaddieAffiliation";
import {BattleSquaddieTarget} from "./battle/orchestratorComponents/battleSquaddieTarget";
import {BattleSquaddieSquaddieActivity} from "./battle/orchestratorComponents/battleSquaddieSquaddieActivity";

let battleOrchestrator: Orchestrator;
let battleOrchestratorState: OrchestratorState;

export const sketch = (p: p5) => {
    p.setup = () => {
        p.createCanvas(ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT);

        battleOrchestratorState = new OrchestratorState({
            resourceHandler: new ResourceHandler({
                p: p,
                allResources: [
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/testPortrait0001.png",
                        key: "crazy pete face",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-young-torrin.png",
                        key: "map icon young torrin",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-sir-camil.png",
                        key: "map icon sir camil",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-demon-slither.png",
                        key: "map icon demon slither",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-move-1-action.png",
                        key: "map icon move 1 action"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-move-2-actions.png",
                        key: "map icon move 2 actions"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-move-3-actions.png",
                        key: "map icon move 3 actions"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-attack-1-action.png",
                        key: "map icon attack 1 action"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/affiliate-icon-crusaders.png",
                        key: "affiliate_icon_crusaders"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/affiliate-icon-infiltrators.png",
                        key: "affiliate_icon_infiltrators"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/affiliate-icon-western.png",
                        key: "affiliate_icon_western"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/affiliate-icon-none.png",
                        key: "affiliate_icon_none"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/phase-banner-player.png",
                        key: "phase banner player",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/phase-banner-enemy.png",
                        key: "phase banner enemy",
                    },
                ],
            }),
            squaddieRepo: new BattleSquaddieRepository(),
            battlePhaseTracker: new BattlePhaseTracker(),
            camera: new BattleCamera(0, 100),
            teamStrategyByAffiliation: {
                ENEMY: [new MoveCloserToSquaddie({
                    desiredAffiliation: SquaddieAffiliation.PLAYER
                })],
                ALLY: [new EndTurnTeamStrategy()],
                NONE: [new EndTurnTeamStrategy()],
            }
        });

        battleOrchestrator = new Orchestrator({
            missionLoader: new BattleMissionLoader(),
            cutscenePlayer: new BattleCutscenePlayer(),
            squaddieSelector: new BattleSquaddieSelector(),
            squaddieMapActivity: new BattleSquaddieMapActivity(),
            squaddieMover: new BattleSquaddieMover(),
            mapDisplay: new BattleMapDisplay(),
            phaseController: new BattlePhaseController(),
            squaddieTarget: new BattleSquaddieTarget(),
            squaddieSquaddieActivity: new BattleSquaddieSquaddieActivity(),
        });
    }

    p.draw = () => {
        battleOrchestrator.update(battleOrchestratorState, p);
    }

    p.mouseClicked = () => {
        battleOrchestrator.mouseClicked(battleOrchestratorState, p.mouseX, p.mouseY);
    }

    p.mouseMoved = () => {
        battleOrchestrator.mouseMoved(battleOrchestratorState, p.mouseX, p.mouseY);
    }
}

export const myp5 = new p5(sketch, document.body);
