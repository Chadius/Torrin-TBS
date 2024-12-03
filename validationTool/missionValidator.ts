import { MissionFileValidationService } from "./missionFileValidation"
import { MissionFileFormat } from "../src/dataLoader/missionLoader"
import fs from "node:fs"

const loadJSONAndDeserializeIntoMissionFile = async (
    filename: string
): Promise<MissionFileFormat> => {
    const rawJSON = fs.readFileSync(filename, "utf8")
    MissionFileValidationService.validateJSON(rawJSON)
    return JSON.parse(rawJSON)
}

const validateMissionFile = (missionData: MissionFileFormat) => {
    MissionFileValidationService.validateMissionFileFormat(missionData)
}

const args = process.argv.slice(2)
let filename = "forgot to specify the file"

const filenameArgIndex = args.findIndex((a) => a === "--filename")
if (filenameArgIndex >= 0) {
    filename = args[filenameArgIndex + 1]
}

loadJSONAndDeserializeIntoMissionFile(filename).then((missionData) => {
    console.log(`Validating Mission file "${filename}"`)
    try {
        validateMissionFile(missionData)
        console.log("No validation errors, looks good to go")
    } catch (err) {
        console.log("Errors found")
    }
})
