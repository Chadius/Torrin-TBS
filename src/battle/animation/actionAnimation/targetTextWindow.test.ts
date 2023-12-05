import {TargetTextWindow} from "./targetTextWindow";
import {SquaddieTemplate} from "../../../campaign/squaddieTemplate";
import {SquaddieAffiliation} from "../../../squaddie/squaddieAffiliation";
import {TraitStatusStorageHelper} from "../../../trait/traitStatusStorage";
import {DefaultArmyAttributes} from "../../../squaddie/armyAttributes";
import {BattleSquaddie} from "../../battleSquaddie";
import {SquaddieTurnHandler} from "../../../squaddie/turn";
import {InBattleAttributesHandler} from "../../stats/inBattleAttributes";
import {ActionResultPerSquaddie, DegreeOfSuccess} from "../../history/actionResultPerSquaddie";
import {ActionAnimationPhase} from "./actionAnimationConstants";
import {MockedP5GraphicsContext} from "../../../utils/test/mocks";
import {ActionTimer} from "./actionTimer";

describe('TargetTextWindow', () => {
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    let mockedActionTimer: ActionTimer;

    let targetWindow: TargetTextWindow;
    let targetSquaddie: SquaddieTemplate;
    let targetBattle: BattleSquaddie;
    let targetResultTakenDamage: ActionResultPerSquaddie;
    let targetResultHealingReceived: ActionResultPerSquaddie;

    beforeEach(() => {
        targetSquaddie = {
            squaddieId: {
                name: "Target",
                affiliation: SquaddieAffiliation.UNKNOWN,
                resources: {
                    actionSpritesByEmotion: {},
                    mapIconResourceKey: ""
                },
                templateId: "targetTemplateId",
                traits: TraitStatusStorageHelper.newUsingTraitValues({}),
            },
            actions: [],
            attributes: DefaultArmyAttributes(),
        };

        targetBattle = {
            squaddieTemplateId: targetSquaddie.squaddieId.templateId,
            squaddieTurn: SquaddieTurnHandler.new(),
            battleSquaddieId: "targetBattleId",
            inBattleAttributes: InBattleAttributesHandler.new(),
        }

        targetResultTakenDamage = {
            healingReceived: 0,
            damageTaken: 2,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
        }

        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        mockedActionTimer = new ActionTimer();

        targetWindow = new TargetTextWindow();
    });

    it('shows the target name', () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultTakenDamage,
        });

        expect(targetWindow.targetLabel.textBox.text).toBe(targetSquaddie.squaddieId.name);
    });

    it('shows the damage taken', () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultTakenDamage,
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.TARGET_REACTS);
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(targetWindow.targetLabel.textBox.text).toBe(`${targetSquaddie.squaddieId.name}\n${targetResultTakenDamage.damageTaken} damage`);
    });

    it('shows if the actor missed', () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: {
                actorDegreeOfSuccess: DegreeOfSuccess.FAILURE,
                damageTaken: 0,
                healingReceived: 0,
            },
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.TARGET_REACTS);
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(targetWindow.targetLabel.textBox.text).toBe(`${targetSquaddie.squaddieId.name}\nMISS`);
    });

    it('shows if the actor hit but dealt 0 damage', () => {
        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: {
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                damageTaken: 0,
                healingReceived: 0,
            },
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.TARGET_REACTS);
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(targetWindow.targetLabel.textBox.text).toBe(`${targetSquaddie.squaddieId.name}\nNO DAMAGE`);
    });

    it('shows the healing received', () => {
        targetResultHealingReceived = {
            healingReceived: 2,
            damageTaken: 0,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
        }

        targetWindow.start({
            targetTemplate: targetSquaddie,
            targetBattle: targetBattle,
            result: targetResultHealingReceived,
        });

        const timerSpy = jest.spyOn(mockedActionTimer, "currentPhase", "get").mockReturnValue(ActionAnimationPhase.TARGET_REACTS);
        targetWindow.draw(mockedP5GraphicsContext, mockedActionTimer);
        expect(timerSpy).toBeCalled();

        expect(targetWindow.targetLabel.textBox.text).toBe(`${targetSquaddie.squaddieId.name}\n${targetResultTakenDamage.damageTaken} healed`);
    });
});
