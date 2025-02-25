import { ResourceHandler } from "../../resource/resourceHandler"
import { MessageBoard } from "../../message/messageBoard"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"

export class ResourceHandlerBlocker {
    resourceHandler: ResourceHandler
    messageBoard: MessageBoard

    private _resourceKeysToLoad: string[]
    private _startsLoading: boolean
    private _finishesLoading: boolean

    constructor(resourceHandler: ResourceHandler, messageBoard: MessageBoard) {
        this.resourceHandler = resourceHandler
        this.messageBoard = messageBoard
        this._resourceKeysToLoad = []
        this._startsLoading = false
        this._finishesLoading = false
    }

    get resourceKeysToLoad(): string[] {
        return this._resourceKeysToLoad
    }

    get startsLoading(): boolean {
        return this._startsLoading
    }

    get finishesLoading(): boolean {
        return this._finishesLoading
    }

    beginLoading() {
        if (this.startsLoading) return
        if (this.finishesLoading) return
        if (this._resourceKeysToLoad.length == 0) return
        this._startsLoading = true
        this._resourceKeysToLoad.forEach((key) => {
            this.resourceHandler.loadResource(key)
        })
        this.messageBoard.sendMessage({
            type: MessageBoardMessageType.LOAD_BLOCKER_BEGINS_LOADING_RESOURCES,
        })
        this.checkResourcesHaveFinishedLoading()
    }

    queueResourceToLoad(resourceKey: string | string[]) {
        if (this.startsLoading) {
            throw new Error(
                `[LoadBlocker.queueResourceToLoad] already started loading, will not add ${resourceKey}`
            )
        }

        let keysToAdd: string[] =
            typeof resourceKey === "string" ? [resourceKey] : [...resourceKey]

        let alreadyAddedKeys: { [k: string]: boolean } = {}
        this._resourceKeysToLoad.forEach((key) => {
            alreadyAddedKeys[key] = true
        })

        keysToAdd
            .filter((key) => !alreadyAddedKeys[key])
            .forEach((key) => {
                this._resourceKeysToLoad.push(key)
            })
    }

    checkResourcesHaveFinishedLoading() {
        if (this._resourceKeysToLoad.length > 0) return
        this._finishesLoading = true
        this.messageBoard.sendMessage({
            type: MessageBoardMessageType.LOAD_BLOCKER_FINISHES_LOADING_RESOURCES,
        })
    }

    updateLoadingStatus() {
        this._resourceKeysToLoad = this._resourceKeysToLoad.filter(
            (key) => !this.resourceHandler.isResourceLoaded(key)
        )
        this.checkResourcesHaveFinishedLoading()
    }
}
