import p5 from 'p5';
import {BattleScene} from './battle/battleScene'
import {ResourceHandler, ResourceType} from "./resource/resourceHandler";
import {NonNegativeNumber} from "./utils/mathAssert";
import {ScreenDimensions} from "./utils/graphicsConfig";

let battleScene: BattleScene;

export const sketch = (p: p5) => {
    p.setup = () => {
        p.createCanvas(ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT);
        battleScene = new BattleScene({
            p: p,
            width: ScreenDimensions.SCREEN_WIDTH as NonNegativeNumber,
            height: ScreenDimensions.SCREEN_HEIGHT as NonNegativeNumber,
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
                    }
                ]
            })
        });
    }

    p.draw = () => {
        battleScene.draw(p);
    }

    p.mouseClicked = () => {
        battleScene.mouseClicked(p.mouseX, p.mouseY);
    }

    p.mouseMoved = () => {
        battleScene.mouseMoved(p.mouseX, p.mouseY);
    }
}

export const myp5 = new p5(sketch, document.body);
