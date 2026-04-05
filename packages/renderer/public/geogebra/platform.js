/* eslint-disable-next-line no-unused-vars */
/* globals defaultParams, appOnline:writable, startDelay:writable */
defaultParams.laf = "bundle";
startDelay = 500;
appOnline = false;

/* eslint-disable-next-line no-unused-vars */
function ggbExamMode(exam) {
    return false
}

/* eslint-disable-next-line no-unused-vars */
function setUnsavedMessage(message, save, noSave, cancel){
   return false
}

// console.log = function(message) {
//     return false
// }

const defaultOpen = window.open;

window.open = function(url, features) {
    return false
}

const blobToBase64 = blob => {
    return false
};

window.showSaveFilePicker = function(options) {

    return false
}
