import {RectAreaService} from "../../../ui/rectArea";
import {SquaddieEmotion} from "./actionAnimationConstants";
import {ScreenDimensions} from "../../../utils/graphics/graphicsConfig";
import {ResourceHandler} from "../../../resource/resourceHandler";
import {ImageUI} from "../../../ui/imageUI";
import {GraphicImage, GraphicsContext} from "../../../utils/graphics/graphicsContext";

let defaultImage: ImageUI;

export class SquaddieSprite {
    private readonly _actionSpritesByEmotion: { [key in SquaddieEmotion]?: ImageUI };
    private readonly _actionSpritesResourceKeysByEmotion: { [key in SquaddieEmotion]?: string };
    private readonly _resourceHandler: ResourceHandler;

    constructor({resourceHandler, actionSpritesResourceKeysByEmotion}: {
        resourceHandler: ResourceHandler,
        actionSpritesResourceKeysByEmotion: { [key in SquaddieEmotion]?: string }
    }) {
        this._resourceHandler = resourceHandler;
        this._actionSpritesResourceKeysByEmotion = actionSpritesResourceKeysByEmotion;
        this._actionSpritesByEmotion = {};
    }

    get actionSpritesByEmotion(): { [key in SquaddieEmotion]?: ImageUI } {
        return this._actionSpritesByEmotion;
    }

    get actionSpritesResourceKeysByEmotion(): { [key in SquaddieEmotion]?: string } {
        return this._actionSpritesResourceKeysByEmotion;
    }

    private _createdImages: boolean;

    get createdImages(): boolean {
        return this._createdImages;
    }

    get resourceHandler(): ResourceHandler {
        return this._resourceHandler;
    }

    public beginLoadingActorImages() {
        this.resourceHandler.loadResources(Object.values(this.actionSpritesResourceKeysByEmotion));
    }

    public createActorImagesWithLoadedData(): {
        justCreatedImages: boolean
    } {
        if (this.resourceHandler.areAllResourcesLoaded(Object.values(this.actionSpritesResourceKeysByEmotion)) !== true) {
            return {justCreatedImages: false};
        }
        if (this.createdImages) {
            return {justCreatedImages: false};
        }

        for (let emotionStr in this.actionSpritesResourceKeysByEmotion) {
            const emotion = emotionStr as SquaddieEmotion;
            const resourceKey = this.actionSpritesResourceKeysByEmotion[emotion];
            const image = this.resourceHandler.getResource(resourceKey);
            this.actionSpritesByEmotion[emotion] = new ImageUI({
                graphic: image,
                area: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: image.width,
                    height: image.height,
                })
            })
        }

        this._createdImages = true;
        return {justCreatedImages: true};
    }

    public getSpriteBasedOnEmotion(emotion: SquaddieEmotion, graphicsContext: GraphicsContext): ImageUI {
        if (emotion in this.actionSpritesByEmotion) {
            return this.actionSpritesByEmotion[emotion];
        }

        if (SquaddieEmotion.NEUTRAL in this.actionSpritesByEmotion) {
            return this.actionSpritesByEmotion[SquaddieEmotion.NEUTRAL];
        }

        return this.defaultEmptyImage(graphicsContext);
    }

    private defaultEmptyImage(graphicsContext: GraphicsContext): ImageUI {
        if (defaultImage) {
            return defaultImage;
        }

        const emptyImage: GraphicImage = graphicsContext.createImage(1, 1);
        emptyImage.loadPixels();

        defaultImage = new ImageUI({
            area: RectAreaService.new({
                left: 0,
                top: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                width: emptyImage.width,
                height: emptyImage.height,
            }),
            graphic: emptyImage,
        })

        return defaultImage;
    }
}
