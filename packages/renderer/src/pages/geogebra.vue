 <!-- 
    Made with GeoGebra https://www.geogebra.org
    License Information: 
        https://stage.geogebra.org/license#NonCommercialLicenseAgreement
        https://www.gnu.org/licenses/gpl-3.0.html

    This page allows you to use geogebra classic and geogebra suite in the context of next-exam 
    Some features of geogebra are hidden because of the restrictive nature of the digital exam environment
    Tracking features have been removed to comply with dsgvo regulations
  -->
 
 
 <template> 


    <!-- filelist start - show local files from workfolder (pdf and gbb only)-->
    <div id="toolbar" class="d-inline p-1 pb-0">  
        <button title="backup" @click="saveContent(true); " class="btn  d-inline btn-success p-1 ms-2 mb-1 btn-sm"><img src="/src/assets/img/svg/document-save.svg" class="white" width="20" height="20" ></button>
        <button title="delete" @click="clearAll(); " class="btn  d-inline btn-danger p-1 ms-2 mb-1 btn-sm"><img src="/src/assets/img/svg/edit-delete.svg" class="white" width="20" height="20" ></button>
        <button title="paste" @click="showClipboard(); " class="btn  d-inline btn-secondary p-1 ms-2 mb-1 btn-sm"><img src="/src/assets/img/svg/edit-paste-style.svg" class="white" width="20" height="20" ></button>
        <div class="btn-group  ms-2 " role="group">
            <div class="btn btn-outline-info btn-sm  mb-1" @click="setsource('suite')"> <img src="/src/assets/img/svg/formula.svg" class="" width="20" height="20" >suite</div>
            <div class="btn btn-outline-info btn-sm  mb-1" @click="setsource('classic')"> <img src="/src/assets/img/svg/formula.svg" class="" width="20" height="20" >classic</div>
        </div>
        
        <div v-for="file in localfiles" class="d-inline">
            <div v-if="(file.type == 'pdf')" class="btn btn-secondary ms-2 mb-1 btn-sm" @click="selectedFile=file.name; loadPDF(file.name)"><img src="/src/assets/img/svg/document-replace.svg" class="" width="20" height="20" > {{file.name}} </div>
            <div v-if="(file.type == 'ggb')" class="btn btn-info ms-2 mb-1  btn-sm" @click="selectedFile=file.name; loadGGB(file.name)"><img src="/src/assets/img/svg/document-replace.svg" class="" width="20" height="20" > {{file.name}} </div>
        </div>
    </div>
    <!-- filelist end -->
    


   

    <div id="content">
        <iframe id="geogebraframe" src="./geogebra/classic.html"></iframe>
    </div>


    <div v-if="isClipboardVisible" class="customClipboard">
      <button class="btn btn-sm btn-outline-success m-1" style="display: block; width:132px" v-for="(item, index) in customClipboard" :key="index" @click="insertFromClipboar(item)">
        <img src="/src/assets/img/svg/edit-paste-style.svg" class="white" width="16" height="16" >{{ item }}
      </button>
    </div>


</template>

<script>


export default {
    data() {
        return {
            componentName: 'GeoGebra',
            online: true,
            focus: true,
            exammode: false,
            currentFile:null,
            fetchinterval: null,
            fetchinfointerval: null,
            loadfilelistinterval: null,
            clockinterval: null,
            servername: this.$route.params.servername,
            servertoken: this.$route.params.servertoken,
            serverip: this.$route.params.serverip,
            token: this.$route.params.token,
            clientname: this.$route.params.clientname,
            serverApiPort: this.$route.params.serverApiPort,
            clientApiPort: this.$route.params.clientApiPort,
            
            electron: this.$route.params.electron,
            pincode : this.$route.params.pincode,
            clientinfo: null,
            entrytime: 0,
            timesinceentry: 0,
            currenttime : 0,
            now : new Date().getTime(),
            localfiles: null,
            battery: null,
            customClipboard: [],
            isClipboardVisible: false
        }
    }, 
    components: {  },  
    mounted() {

        this.redefineConsole()  // overwrite console log to grep specific outputs and store as clipboard entry

        this.currentFile = this.clientname
        this.entrytime = new Date().getTime()  
         
        if (this.electron){
            this.saveEvent = ipcRenderer.on('save', () => {  //trigger document save by signal "save" sent from data.js
                console.log("EVENT RECEIVED")
                this.saveContent() 
            }); 

            ipcRenderer.on('fileerror', (event, msg) => {
                console.log('geogebra @ fileerror: writing/deleting file error received');
                this.$swal.fire({
                        title: "Error",
                        text: msg.message,
                        icon: "error",
                        //timer: 30000,
                        showCancelButton: false,
                        didOpen: () => { this.$swal.showLoading(); },
                })
            });
        }
        this.$nextTick(function () { // Code that will run only after the entire view has been rendered
            this.loadfilelistinterval = setInterval(() => { this.loadFilelist() }, 10000)   // zeigt html dateien (angaben, eigene arbeit) im header
            this.loadFilelist()
        })
    },
    methods: { 
        redefineConsole(){
            const ggbIframe = document.getElementById('geogebraframe');
            const iframeWindow = ggbIframe.contentWindow;  // Zugriff auf den Kontext des iframe
            const originalIframeConsoleLog = iframeWindow.console.log;  // Speichern der originalen console.log Funktion des iframe

            iframeWindow.console.log = (message) => {
                // Prüfen, ob die Nachricht ein GeoGebra-spezifisches Muster enthält
                if (typeof message === "string" && message.includes("existing")) {
                    const partAfterExistingGeo = message.split("existing geo:")[1].trim();
                    const extractedText = partAfterExistingGeo.split("=")[1].trim();
                    this.customClipboard.push( extractedText )
                    if (this.customClipboard.length > 10) {    this.customClipboard.shift();     }   //customclipboard länge begrenzen
                } 
                else {
                    // geogebra spammed jede aktion in die console daher unterdrücken wir das erstmal
                    //originalIframeConsoleLog.apply(iframeWindow.console, arguments);      // Aufrufen der ursprünglichen Funktion für alle anderen Nachrichten
                }
            };
        },
 


        // fetch file from disc - show preview
        async loadPDF(file){
            let data = await ipcRenderer.invoke('getpdfasync', file )
            let url =  URL.createObjectURL(new Blob([data], {type: "application/pdf"})) 

            document.querySelector("#pdfembed").setAttribute("src", `${url}#toolbar=0&navpanes=0&scrollbar=0`);
            document.querySelector("#preview").style.display = 'block';

        },


        async loadFilelist(){
            let filelist = await ipcRenderer.invoke('getfilesasync', null)
            this.localfiles = filelist;
        },
        setsource(source){
            let iFrame = document.getElementById('geogebraframe')
            if (source === "suite")   { iFrame.src = `./geogebra/suite.html`  }
            if (source === "classic") { iFrame.src = `./geogebra/classic.html`}
            iFrame.parentNode.replaceChild(iFrame.cloneNode(), iFrame);
            this.redefineConsole()
        },  
        showClipboard() {
            this.isClipboardVisible = this.isClipboardVisible ? false: true;
        },
        insertFromClipboar(value){
            const ggbIframe = document.getElementById('geogebraframe');
            const ggbApplet = ggbIframe.contentWindow.ggbApplet;   // get the geogebra applet and all of its methods
            
            ggbApplet.evalCommand(value);
        },

        clearAll(){
            const ggbIframe = document.getElementById('geogebraframe');
            const ggbApplet = ggbIframe.contentWindow.ggbApplet;   // get the geogebra applet and all of its methods
            this.$swal({
                title: "",
                text: this.$t("math.clear") ,
                showCancelButton: true,
                inputAttributes: {
                    maxlength: 20,
                },
                confirmButtonText: 'Ok',
                cancelButtonText: this.$t("editor.cancel")
         
             })
            .then((result) => {
                if (result.isConfirmed) { 
                    ggbApplet.reset()
                }
                else {return; }
            });
        },

         /** Saves Content as GGB */
        async saveContent(manual) {  
            const ggbIframe = document.getElementById('geogebraframe');
            const ggbApplet = ggbIframe.contentWindow.ggbApplet;   // get the geogebra applet and all of its methods
            let filename = `${this.clientname}.ggb`
            if (manual){ 
                await this.$swal({
                    title: this.$t("math.filename") ,
                    input: 'text',
                    inputPlaceholder: 'Type here...',
                    showCancelButton: true,
                    inputAttributes: {
                        maxlength: 20,
                    },
                    confirmButtonText: 'Ok',
                    cancelButtonText: this.$t("editor.cancel"),
                    inputValidator: (value) => {
                        const regex = /^[A-Za-z0-9]+$/;
                        if (!value.match(regex)) {
                            return  this.$t("math.nospecial") ;
                        }                   
                     },
                 }).then((result) => {
                    if (result.isConfirmed) { filename = `${result.value}-bak.ggb`}
                    else {return; }
                });
            }
            
            ggbApplet.getBase64( async (base64GgbFile) => {
                let response = await ipcRenderer.invoke('saveGGB', {filename: filename, content: base64GgbFile})   // send base64 string to backend for saving
                if (response.status === "success" && manual){  // we wait for a response - only show feed back if manually saved
                    this.loadFilelist()
                    this.$swal.fire({
                        title: this.$t("editor.saved"),
                        text: filename,
                        icon: "info"
                    })
                }
            })
        },



        // get file from local workdirectory and replace editor content with it
        async loadGGB(file){
            this.$swal.fire({
                title: this.$t("editor.replace"),
                html:  `${this.$t("editor.replacecontent1")} <b>${file}</b> ${this.$t("editor.replacecontent2")}`,
                icon: "question",
                showCancelButton: true,
                cancelButtonText: this.$t("editor.cancel"),
                reverseButtons: true
            })
            .then(async (result) => {
                if (result.isConfirmed) {

                    const result = await ipcRenderer.invoke('loadGGB', file);
                    if (result.status === "success") {
                        const base64GgbFile = result.content;
                        const ggbIframe = document.getElementById('geogebraframe');
                        const ggbApplet = ggbIframe.contentWindow.ggbApplet;
                        ggbApplet.setBase64(base64GgbFile);
                    } else {
                        console.error('Error loading file');
                    }
                } 
            }); 
        },
       
    },
    beforeUnmount() {
        clearInterval( this.loadfilelistinterval )
    },
}

</script>

<style scoped>

.customClipboard {
    z-index: 1000000;
    width: 160px;
    height: 380px;
    position: absolute;
    top: 100px;
    left: 50%;
    margin-left: -100px;
    background-color: rgb(33,37,41);
    border-radius: 5px;
    padding: 10px;
    box-shadow: 0 0 15px rgba(0,0,0,0.8);

}


#suiteAppPicker {
    visibility: visible !important;
}

@media print{
    #apphead {
        display: none !important;
    }
    #content {
        height: 100vh !important;
        width: 100vw !important;
        border-radius:0px !important;
    }
    #geogebraframe{
        height: 100% !important;
        width: 100% !important;
    }
    #app {
        display:block !important;
        height: 100% !important;
       
    }
    ::-webkit-scrollbar {
        display: none;
    }
}





#localfiles {
    position: relative;
   

}
#preview {
    display: none;
    position: absolute;
    top:0;
    left: 0;
    width:100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.4);
    z-index:100000;
}

#pdfembed { 
    position: absolute;
    top: 50%;
    left: 50%;
    margin-left: -30vw;
    margin-top: -45vh;
    width:60vw;
    height: 90vh;
    padding: 10px;
    background-color: rgba(255, 255, 255, 1);
    border: 0px solid rgba(255, 255, 255, 0.589);
    box-shadow: 0 0 15px rgba(22, 9, 9, 0.589);
    padding: 10px;
    border-radius: 6px;
}

</style>
