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
import {BattlePlayerSquaddieSelector} from "./battle/orchestratorComponents/battlePlayerSquaddieSelector";
import {BattleSquaddieMover} from "./battle/orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "./battle/orchestratorComponents/battleMapDisplay";
import {BattlePhaseController} from "./battle/orchestratorComponents/battlePhaseController";
import {BattleSquaddieMapActivity} from "./battle/orchestratorComponents/battleSquaddieMapActivity";
import {EndTurnTeamStrategy} from "./battle/teamStrategy/endTurn";
import {MoveCloserToSquaddie} from "./battle/teamStrategy/moveCloserToSquaddie";
import {SquaddieAffiliation} from "./squaddie/squaddieAffiliation";
import {BattlePlayerSquaddieTarget} from "./battle/orchestratorComponents/battlePlayerSquaddieTarget";
import {BattleSquaddieSquaddieActivity} from "./battle/orchestratorComponents/battleSquaddieSquaddieActivity";
import {BattleComputerSquaddieSelector} from "./battle/orchestratorComponents/battleComputerSquaddieSelector";
import {TargetSquaddieInRange} from "./battle/teamStrategy/targetSquaddieInRange";
import {GameEngine} from "./gameEngine/gameEngine";

let gameEngine: GameEngine;

export const sketch = (p: p5) => {
    p.setup = () => {
        p.createCanvas(ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT);

        gameEngine = new GameEngine({graphicsContext: p});
        gameEngine.setup();
    }

    p.draw = () => {
        gameEngine.draw();
    }

    p.keyPressed = () => {
        gameEngine.keyPressed(p.keyCode);
    }

    p.mouseClicked = () => {
        gameEngine.mouseClicked(p.mouseButton, p.mouseX, p.mouseY);
    }

    p.mouseMoved = () => {
        gameEngine.mouseMoved(p.mouseX, p.mouseY);
    }
}

export const myp5 = new p5(sketch, document.body);
