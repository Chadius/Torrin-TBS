import {ActorTextWindow} from "./actorTextWindow";
import {SquaddieAffiliation} from "../../../squaddie/squaddieAffiliation";
import {Trait, TraitStatusStorageHelper} from "../../../trait/traitStatusStorage";
import {DefaultArmyAttributes} from "../../../squaddie/armyAttributes";
import {TargetingShape} from "../../targeting/targetingShapeGenerator";
import {SquaddieTemplate} from "../../../campaign/squaddieTemplate";
import {SquaddieAction} from "../../../squaddie/action";
import {MockedP5GraphicsContext} from "../../../utils/test/mocks";
import {ActionTimer} from "./actionTimer";
import {ActionAnimationPhase} from "./actionAnimationConstants";

describe('ActorTextWindow', () => {
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    let mockedActionTimer: ActionTimer;

    let actorTemplate: SquaddieTemplate;
    let attackThatUsesAttackRoll: SquaddieAction;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        mockedActionTimer = new ActionTimer();

        actorTemplate = {
            squaddieId: {
                templateId: "actor id",
                name: "Actor",
                resources: undefined,
                traits: TraitStatusStorageHelper.newUsingTraitValues({}),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            attributes: DefaultArmyAttributes(),
            actions: [],
        };
        attackThatUsesAttackRoll = {
            id: "action Id",
            name: "Action",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
            }),
            damageDescriptions: {},
            healingDescriptions: {},
            targetingShape: TargetingShape.SNAKE,
            actionPointCost: 1,
            minimumRange: 1,
            maximumRange: 1,
        };

    });

    it('initially shows the actor and their action', () => {
        const window = new ActorTextWindow();

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: undefined,
            action: attackThatUsesAttackRoll,
            results: undefined,
        });

        expect(window.actorUsesActionDescriptionText).toBe(
            "Actor uses\nAction"
        );
    });

    it('will show the rolls if the actor had to make rolls', () => {
        const window = new ActorTextWindow();

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: undefined,
            action: attackThatUsesAttackRoll,
            results: {
                resultPerTarget: {},
                actingBattleSquaddieId: "",
                targetedBattleSquaddieIds: [],
                actingSquaddieRoll: {
                    occurred: true,
                    rolls: [1, 5],
                }
            }
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.DURING_ACTION);

        window.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(window.actorUsesActionDescriptionText).toBe(
            "Actor uses\nAction\n\n   rolls(1, 5)"
        );
    });

    it('will not show rolls if the actor did not need them', () => {
        const window = new ActorTextWindow();

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: undefined,
            action: attackThatUsesAttackRoll,
            results: {
                resultPerTarget: {},
                actingBattleSquaddieId: "",
                targetedBattleSquaddieIds: [],
                actingSquaddieRoll: {
                    occurred: false,
                    rolls: [],
                }
            }
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.DURING_ACTION);

        window.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(window.actorUsesActionDescriptionText).toBe(
            "Actor uses\nAction"
        );
    });

    it('will indicate a critical hit if the actor rolled critical', () => {
        const window = new ActorTextWindow();

        window.start({
            actorTemplate: actorTemplate,
            actorBattle: undefined,
            action: attackThatUsesAttackRoll,
            results: {
                resultPerTarget: {},
                actingBattleSquaddieId: "",
                targetedBattleSquaddieIds: [],
                actingSquaddieRoll: {
                    occurred: true,
                    rolls: [6, 6],
                }
            }
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.DURING_ACTION);

        window.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(window.actorUsesActionDescriptionText).toBe(
            "Actor uses\nAction\n\n   rolls(6, 6)\n\nCRITICAL HIT!"
        );
    });
});