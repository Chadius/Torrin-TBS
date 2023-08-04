import p5 from "p5";
import {Orchestrator} from "../battle/orchestrator/orchestrator";
import {OrchestratorState} from "../battle/orchestrator/orchestratorState";
import {ResourceHandler, ResourceType} from "../resource/resourceHandler";
import {BattleSquaddieRepository} from "../battle/battleSquaddieRepository";
import {BattlePhaseTracker} from "../battle/orchestratorComponents/battlePhaseTracker";
import {BattleCamera} from "../battle/battleCamera";
import {TargetSquaddieInRange} from "../battle/teamStrategy/targetSquaddieInRange";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {MoveCloserToSquaddie} from "../battle/teamStrategy/moveCloserToSquaddie";
import {EndTurnTeamStrategy} from "../battle/teamStrategy/endTurn";
import {BattleMissionLoader} from "../battle/orchestratorComponents/battleMissionLoader";
import {BattleCutscenePlayer} from "../battle/orchestratorComponents/battleCutscenePlayer";
import {BattlePlayerSquaddieSelector} from "../battle/orchestratorComponents/battlePlayerSquaddieSelector";
import {BattleComputerSquaddieSelector} from "../battle/orchestratorComponents/battleComputerSquaddieSelector";
import {BattleSquaddieMapActivity} from "../battle/orchestratorComponents/battleSquaddieMapActivity";
import {BattleSquaddieMover} from "../battle/orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "../battle/orchestratorComponents/battleMapDisplay";
import {BattlePhaseController} from "../battle/orchestratorComponents/battlePhaseController";
import {BattlePlayerSquaddieTarget} from "../battle/orchestratorComponents/battlePlayerSquaddieTarget";
import {BattleSquaddieSquaddieActivity} from "../battle/orchestratorComponents/battleSquaddieSquaddieActivity";

export class GameEngine {
    get battleOrchestrator(): Orchestrator {
        return this._battleOrchestrator;
    }
    get battleOrchestratorState(): OrchestratorState {
        return this._battleOrchestratorState;
    }

    private graphicsContext: p5;
    private _battleOrchestrator: Orchestrator;
    private _battleOrchestratorState: OrchestratorState;

    constructor({graphicsContext}: {graphicsContext: p5}) {
        this.graphicsContext = graphicsContext;
    }


    setup() {
        this._battleOrchestratorState = new OrchestratorState({
            resourceHandler: new ResourceHandler({
                p: this.graphicsContext,
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
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/icon-armor-class.png",
                        key: "armor class icon",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/icon-hit-points.png",
                        key: "hit points icon",
                    },
                ],
            }),
            squaddieRepo: new BattleSquaddieRepository(),
            battlePhaseTracker: new BattlePhaseTracker(),
            camera: new BattleCamera(0, 100),
            teamStrategyByAffiliation: {
                ENEMY: [
                    new TargetSquaddieInRange({
                        desiredAffiliation: SquaddieAffiliation.PLAYER
                    }),
                    new MoveCloserToSquaddie({
                        desiredAffiliation: SquaddieAffiliation.PLAYER
                    })
                ],
                ALLY: [new EndTurnTeamStrategy()],
                NONE: [new EndTurnTeamStrategy()],
            }
        });

        this._battleOrchestrator = new Orchestrator({
            missionLoader: new BattleMissionLoader(),
            cutscenePlayer: new BattleCutscenePlayer(),
            playerSquaddieSelector: new BattlePlayerSquaddieSelector(),
            computerSquaddieSelector: new BattleComputerSquaddieSelector(),
            squaddieMapActivity: new BattleSquaddieMapActivity(),
            squaddieMover: new BattleSquaddieMover(),
            mapDisplay: new BattleMapDisplay(),
            phaseController: new BattlePhaseController(),
            playerSquaddieTarget: new BattlePlayerSquaddieTarget(),
            squaddieSquaddieActivity: new BattleSquaddieSquaddieActivity(),
        });
    }

    draw() {
        this.battleOrchestrator.update(this.battleOrchestratorState, this.graphicsContext);
    }

    keyPressed(keyCode: number) {
        this.battleOrchestrator.keyPressed(this._battleOrchestratorState, keyCode);
    }

    mouseClicked(mouseButton: "LEFT"|"CENTER"|"RIGHT", mouseX: number, mouseY: number) {
        this.battleOrchestrator.mouseClicked(this.battleOrchestratorState, mouseX, mouseY);
    }

    mouseMoved(mouseX: number, mouseY: number) {
        this.battleOrchestrator.mouseMoved(this.battleOrchestratorState, mouseX, mouseY);
    }
}
