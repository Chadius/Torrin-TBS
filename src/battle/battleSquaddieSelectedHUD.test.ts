import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {MissionMap} from "../missionMap/missionMap";
import {ResourceHandler, ResourceType} from "../resource/resourceHandler";
import {BattleSquaddieSelectedHUD} from "./battleSquaddieSelectedHUD";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieId} from "../squaddie/id";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {SquaddieTurn} from "../squaddie/turn";
import {stubImmediateLoader} from "../resource/resourceHandlerTestUtils";
import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {ActivityButton} from "../squaddie/activityButton";
import {SquaddieActivity} from "../squaddie/activity";
import {TargetingShape} from "./targeting/targetingShapeGenerator";
import {SquaddieEndTurnActivity} from "./history/squaddieEndTurnActivity";
import {RectArea} from "../ui/rectArea";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {TraitStatusStorage} from "../trait/traitStatusStorage";

describe('BattleSquaddieSelectedHUD', () => {
    let hud: BattleSquaddieSelectedHUD;
    let squaddieRepository: BattleSquaddieRepository;
    let missionMap: MissionMap;
    let resourceHandler: ResourceHandler;
    let playerSquaddieDynamicID: string = "player_squaddie_0";
    let longswordActivity: SquaddieActivity;
    let warnUserNotEnoughActionsToPerformActionSpy: jest.SpyInstance;

    beforeEach(() => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        })

        squaddieRepository = new BattleSquaddieRepository();

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
            traits: new TraitStatusStorage(),
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
        warnUserNotEnoughActionsToPerformActionSpy = jest.spyOn((hud as any), "warnUserNotEnoughActionsToPerformAction").mockReturnValue(null);
    });

    it('generates a button for each squaddie activity', () => {
        hud.selectSquaddieAndDrawWindow({dynamicID: playerSquaddieDynamicID, repositionWindow: {mouseX: 0, mouseY: 0}});

        const activityButtons: ActivityButton[] = hud.getActivityButtons();
        expect(activityButtons).toBeTruthy();

        expect(activityButtons.find((button) =>
            button.activity instanceof SquaddieActivity
            && button.activity.name === longswordActivity.name
        )).toBeTruthy();
    });

    it('reports when an activity button is selected', () => {
        hud.selectSquaddieAndDrawWindow({dynamicID: playerSquaddieDynamicID, repositionWindow: {mouseX: 0, mouseY: 0}});
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
        hud.selectSquaddieAndDrawWindow({dynamicID: playerSquaddieDynamicID, repositionWindow: {mouseX: 0, mouseY: 0}});

        const activityButtons: ActivityButton[] = hud.getActivityButtons();
        expect(activityButtons).toBeTruthy();

        const waitTurnButton = activityButtons.find((button) =>
            button.activity instanceof SquaddieEndTurnActivity
        );
        expect(waitTurnButton).toBeTruthy();
    });

    it('reports when a Wait Turn activity button was clicked on', () => {
        hud.selectSquaddieAndDrawWindow({dynamicID: playerSquaddieDynamicID, repositionWindow: {mouseX: 0, mouseY: 0}});
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

    it('can reopen the window in the previous position if no mouse location is given', () => {
        hud.selectSquaddieAndDrawWindow({dynamicID: playerSquaddieDynamicID, repositionWindow: {mouseX: 0, mouseY: 0}});
        const initialWindowPosition: RectArea = new RectArea({...hud.background.area});
        hud.selectSquaddieAndDrawWindow({dynamicID: playerSquaddieDynamicID});
        expect(hud.background.area).toStrictEqual(initialWindowPosition);
    });

    it('will warn the user if the squaddie does not have enough actions to perform the activity', () => {
        let notEnoughActionsActivity: SquaddieActivity;
        notEnoughActionsActivity = new SquaddieActivity({
            name: "not enough actions",
            id: "not enough actions",
            traits: new TraitStatusStorage(),
            actionsToSpend: 9001,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        });
        const {staticSquaddie} = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicID(playerSquaddieDynamicID));
        staticSquaddie.addActivity(notEnoughActionsActivity);

        hud.selectSquaddieAndDrawWindow({dynamicID: playerSquaddieDynamicID, repositionWindow: {mouseX: 0, mouseY: 0}});
        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();

        const notEnoughActionsButton = hud.getActivityButtons().find((button) =>
            button.activity instanceof SquaddieActivity && button.activity.name === "not enough actions"
        );

        hud.mouseClicked(notEnoughActionsButton.buttonArea.getLeft(), notEnoughActionsButton.buttonArea.getTop());

        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();
        expect(warnUserNotEnoughActionsToPerformActionSpy).toBeCalled();
    });
});
