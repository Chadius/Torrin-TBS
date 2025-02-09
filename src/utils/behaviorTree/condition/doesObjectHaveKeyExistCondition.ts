import { DataBlob, DataBlobService } from "../../dataBlob/dataBlob"
import { BehaviorTreeTask } from "../task"

export class DoesObjectHaveKeyExistCondition<T> implements BehaviorTreeTask {
    dataBlob: DataBlob
    dataObjectName: string
    objectKey: string

    constructor({
        data,
        dataObjectName,
        objectKey,
    }: {
        data: DataBlob
        dataObjectName: string
        objectKey: string
    }) {
        this.dataBlob = data
        this.dataObjectName = dataObjectName
        this.objectKey = objectKey
    }

    clone(): DoesObjectHaveKeyExistCondition<T> {
        return new DoesObjectHaveKeyExistCondition<T>({
            data: this.dataBlob,
            dataObjectName: this.dataObjectName,
            objectKey: this.objectKey,
        })
    }

    run(): boolean {
        const dataObject = DataBlobService.get<T>(
            this.dataBlob,
            this.dataObjectName
        )
        if (!dataObject) return false
        return (
            dataObject[this.objectKey as keyof typeof dataObject] !== undefined
        )
    }
}
