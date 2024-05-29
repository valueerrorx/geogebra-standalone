import pjson from "../../package.json"


const config = {
    development: false,  // disable kiosk mode on exam mode and other stuff (autofill input fields)
    showdevtools: false,

    workdirectory : "",   // (desktop path + examdir)
    tempdirectory : "",   // (desktop path + 'tmp')
    homedirectory : "",   // set in main.ts
    examdirectory: "GeoGebra-Files",

    version: pjson.version,
    info: "OSOS Test Version"
}
export default config
