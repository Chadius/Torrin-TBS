import {RectArea} from "../../ui/rectArea";
import {ResourceLocator, ResourceType} from "../../resource/resourceHandler";
import {CutsceneAction} from "../cutsceneAction";
import {DialogueTextBox} from "./dialogueTextBox";
import {DialogueSpeakerNameBox} from "./dialogueSpeakerNameBox";
import {DialogueSpeakerImage} from "./dialogueSpeakerImage";
import {DialogueAnswerButton} from "./dialogueAnswerButton";
import {GraphicImage, GraphicsContext} from "../../utils/graphics/graphicsContext";
import {SubstituteText, TextSubstitutionContext} from "../../textSubstitution/textSubstitution";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";

export class DialogueBox implements CutsceneAction {
    id: string;
    screenDimensions: [number, number];
    dialogFinished: boolean;
    startTime: number;
    animationDuration: number;
    answers: string[];
    answerSelected: number;
    answerButtons: DialogueAnswerButton[];
    textBox: DialogueTextBox;
    speakerNameBox: DialogueSpeakerNameBox;
    speakerPortrait: GraphicImage;
    speakerPortraitResourceKey: string;
    speakerImage: DialogueSpeakerImage;
    private readonly _originalText: string;
    private readonly _originalName: string;

    constructor({
                    id,
                    name,
                    text,
                    portrait,
                    portraitResourceKey,
                    animationDuration,
                    answers,
                    screenDimensions,
                    context
                }: {
        id: string;
        name?: string;
        text?: string;
        portrait?: GraphicImage;
        portraitResourceKey?: string;
        animationDuration?: number;
        answers?: string[];
        screenDimensions?: [number, number];
        context?: TextSubstitutionContext;
    }) {
        this.id = id;
        this.answers = answers || [];
        this.animationDuration = animationDuration;
        this.speakerPortrait = portrait;
        this.speakerPortraitResourceKey = portraitResourceKey;
        this.screenDimensions = screenDimensions || [0, 0];

        this.answerSelected = -1;
        this.dialogFinished = false;

        this._originalText = text;
        this._originalName = name;
    }

    get originalText(): string {
        return this._originalText;
    }

    get originalName(): string {
        return this._originalName;
    }

    getId(): string {
        return this.id;
    }

    createUIObjects(context: TextSubstitutionContext) {
        this.textBox = new DialogueTextBox({
            text: SubstituteText(this.originalText, context),
            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT]
        });
        this.speakerNameBox = new DialogueSpeakerNameBox({
                name: this.originalName,
                screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT]
            }
        );

        const answerButtonPositions: RectArea[] = this.getAnswerButtonPositions();
        this.answerButtons = answerButtonPositions.map((position, index) => new DialogueAnswerButton({
            answer: SubstituteText(this.answers[index], context),
            position: position,
            screenDimensions: this.screenDimensions
        }));

        this.setSpeakerUI();
    }

    setSpeakerUI() {
        if (this.speakerPortrait) {
            this.speakerImage = new DialogueSpeakerImage({
                speakerPortrait: this.speakerPortrait,
                screenDimensions: this.screenDimensions
            });
        }
    }

    getResourceLocators(): ResourceLocator[] {
        return [
            {
                type: ResourceType.IMAGE,
                key: this.speakerPortraitResourceKey
            }
        ]
    }

    setImageResource(image: GraphicImage) {
        this.setPortrait(image);
    }

    setPortrait(portrait: GraphicImage) {
        this.speakerPortrait = portrait;
        this.setSpeakerUI();
    }

    draw(graphicsContext: GraphicsContext) {
        graphicsContext.push();

        this.textBox?.draw(graphicsContext);
        this.speakerNameBox?.draw(graphicsContext);
        this.speakerImage?.draw(graphicsContext);
        this.answerButtons.forEach((answer) => answer.draw(graphicsContext));

        graphicsContext.pop();
    }

    start(context: TextSubstitutionContext): void {
        this.dialogFinished = false;
        this.startTime = Date.now();
        this.createUIObjects(context);
    }

    getAnswerButtonPositions(): RectArea[] {
        if (!this.asksUserForAnAnswer()) {
            return [];
        }

        const buttonTop = this.screenDimensions[1] * 0.9;
        const buttonHeight = this.screenDimensions[1] * 0.1;

        if (this.answers.length == 1) {
            return [
                new RectArea({
                    left: 0,
                    top: buttonTop,
                    width: this.screenDimensions[0],
                    height: buttonHeight
                })
            ];
        }

        const BUTTON_GAP_WHITESPACE_PERCENTAGE = 25;
        const BUTTON_GAP_PIXEL_MINIMUM = 50;

        let numberOfGaps = this.answers.length - 1;
        let rawTotalButtonGapSpace = this.screenDimensions[0] * BUTTON_GAP_WHITESPACE_PERCENTAGE / 100;

        let buttonGapWidth = rawTotalButtonGapSpace / numberOfGaps;
        if (buttonGapWidth < BUTTON_GAP_PIXEL_MINIMUM) {
            buttonGapWidth = BUTTON_GAP_PIXEL_MINIMUM;
        }

        let totalButtonGap = buttonGapWidth * (this.answers.length - 1);
        let totalButtonSpace = this.screenDimensions[0] - totalButtonGap;
        let buttonWidth = totalButtonSpace / this.answers.length;

        return this.answers.map((text, index): RectArea => {
            return new RectArea({
                left: (buttonWidth + buttonGapWidth) * index,
                top: buttonTop,
                width: buttonWidth,
                height: buttonHeight
            });
        });
    }

    mouseClicked(mouseX: number, mouseY: number) {
        if (this.asksUserForAnAnswer()) {
            const answerSelected: number | null = this.answerButtons.findIndex((answerButton) => {
                return answerButton.buttonWasClicked(mouseX, mouseY);
            });

            if (answerSelected !== -1) {
                this.dialogFinished = true;
                this.answerSelected = answerSelected;
            }
            return;
        }

        if (this.isAnimating() && !this.asksUserForAnAnswer()) {
            this.dialogFinished = true;
        }
    }

    isTimeExpired(): boolean {
        return Date.now() >= this.startTime + this.animationDuration
    }

    asksUserForAnAnswer(): boolean {
        return this.answers.length > 0;
    }

    isAnimating(): boolean {
        if (this.isTimeExpired() && !this.asksUserForAnAnswer()) {
            return false;
        }

        return !this.dialogFinished;
    }

    isFinished(): boolean {
        return !this.isAnimating() || this.dialogFinished;
    }
}
