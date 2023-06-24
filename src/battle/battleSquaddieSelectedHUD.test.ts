import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {MissionMap} from "../missionMap/missionMap";
import {ResourceHandler, ResourceType} from "../resource/resourceHandler";
import p5 from "p5";
import {BattleSquaddieSelectedHUD} from "./battleSquaddieSelectedHUD";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieId} from "../squaddie/id";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {SquaddieTurn} from "../squaddie/turn";
import {stubImmediateLoader} from "../resource/resourceHandlerTestUtils";
import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {ActivityButton} from "../squaddie/activityButton";
import {SquaddieActivity} from "../squaddie/activity";
import {NullTraitStatusStorage} from "../trait/traitStatusStorage";
import {TargetingShape} from "./targeting/targetingShapeGenerator";
import {SquaddieEndTurnActivity} from "./history/squaddieEndTurnActivity";

jest.mock('p5', () => () => {
    return {}
});
describe('BattleSquaddieSelectedHUD', () => {
    let hud: BattleSquaddieSelectedHUD;
    let squaddieRepository: BattleSquaddieRepository;
    let missionMap: MissionMap;
    let resourceHandler: ResourceHandler;
    let mockedP5: p5;
    let playerSquaddieDynamicID: string = "player_squaddie_0";
    let longswordActivity: SquaddieActivity;

    beforeEach(() => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        })

        squaddieRepository = new BattleSquaddieRepository();
        mockedP5 = new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;

        resourceHandler = new ResourceHandler({
            imageLoader: new stubImmediateLoader(),
            allResources: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "affiliate_icon_crusaders",
                },
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "affiliate_icon_infiltrators",
                },
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "affiliate_icon_western",
                },
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "affiliate_icon_none",
                },
            ]
        });
        resourceHandler.loadResources([
            "affiliate_icon_crusaders",
            "affiliate_icon_infiltrators",
            "affiliate_icon_western",
            "affiliate_icon_none",
        ]);

        longswordActivity = new SquaddieActivity({
            name: "longsword",
            id: "longsword",
            traits: NullTraitStatusStorage(),
            actionsToSpend: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        });

        squaddieRepository.addStaticSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    staticId: "player_soldier",
                    name: "Player Soldier",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                activities: [
                    longswordActivity
                ]
            })
        );

        squaddieRepository.addDynamicSquaddie(
            new BattleSquaddieDynamic({
                dynamicSquaddieId: playerSquaddieDynamicID,
                staticSquaddieId: "player_soldier",
                squaddieTurn: new SquaddieTurn()
            })
        );

        hud = new BattleSquaddieSelectedHUD({
            squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
        })
    });

    it('generates a button for each squaddie activity', () => {
        hud.mouseClickedSquaddieSelected(playerSquaddieDynamicID, 0, 0);

        const activityButtons: ActivityButton[] = hud.getActivityButtons();
        expect(activityButtons).toBeTruthy();

        expect(activityButtons.find((button) =>
            button.activity instanceof SquaddieActivity
            && button.activity.name === longswordActivity.name
        )).toBeTruthy();
    });

    it('reports when an activity button is selected', () => {
        hud.mouseClickedSquaddieSelected(playerSquaddieDynamicID, 0, 0);
        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();

        const longswordButton = hud.getActivityButtons().find((button) =>
            button.activity instanceof SquaddieActivity
            && button.activity.name === longswordActivity.name
        );
        hud.mouseClicked(longswordButton.buttonArea.getLeft(), longswordButton.buttonArea.getTop());

        expect(hud.wasActivitySelected()).toBeTruthy();
        expect(hud.getSelectedActivity()).toBe(longswordActivity);

        hud.reset();
        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();
    });

    it('generates a Wait Turn activity button when a squaddie is selected', () => {
        hud.mouseClickedSquaddieSelected(playerSquaddieDynamicID, 0, 0);

        const activityButtons: ActivityButton[] = hud.getActivityButtons();
        expect(activityButtons).toBeTruthy();

        const waitTurnButton = activityButtons.find((button) =>
            button.activity instanceof SquaddieEndTurnActivity
        );
        expect(waitTurnButton).toBeTruthy();
    });

    it('reports when a Wait Turn activity button was clicked on', () => {
        hud.mouseClickedSquaddieSelected(playerSquaddieDynamicID, 0, 0);
        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();

        const waitTurnButton = hud.getActivityButtons().find((button) =>
            button.activity instanceof SquaddieEndTurnActivity
        );

        hud.mouseClicked(waitTurnButton.buttonArea.getLeft(), waitTurnButton.buttonArea.getTop());

        expect(hud.wasActivitySelected()).toBeTruthy();
        expect(hud.getSelectedActivity()).toBeInstanceOf(SquaddieEndTurnActivity);

        hud.reset();
        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();
    });
});
