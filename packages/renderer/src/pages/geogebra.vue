 <!-- 
    Made with GeoGebra https://www.geogebra.org
    License Information: 
        https://stage.geogebra.org/license#NonCommercialLicenseAgreement
        https://www.gnu.org/licenses/gpl-3.0.html

    This page allows you to use geogebra classic and geogebra suite on linux desktop.
    Some features of geogebra are hidden because of the restrictive nature of the software.
  -->
 
 
 <template> 


    <!-- filelist start - show local files from workfolder (pdf and gbb only)-->
    <div id="toolbar" class="d-inline p-1 pb-0">  
        <button title="backup" @click="saveContent(true); " class="btn  d-inline btn-success p-1 ms-2 mb-1 btn-sm"><img src="/src/assets/img/svg/document-save.svg" class="white" width="20" height="20" ></button>
        <button title="delete" @click="clearAll(); " class="btn  d-inline btn-secondary p-1 ms-2 mb-1 btn-sm"><img src="/src/assets/img/svg/edit-delete.svg" class="white" width="20" height="20" ></button>
        <button title="paste" @click="showClipboard(); " class="btn  d-inline btn-secondary p-1 ms-2 mb-1 btn-sm"><img src="/src/assets/img/svg/edit-paste-style.svg" class="white" width="20" height="20" ></button>

        
        <div class="btn-group  ms-2 " role="group">
            <div class="btn btn-outline-info btn-sm  mb-1" @click="setsource('suite')"> <img src="/src/assets/img/svg/formula.svg" class="" width="20" height="20" >suite</div>
            <div class="btn btn-outline-info btn-sm  mb-1" @click="setsource('classic')"> <img src="/src/assets/img/svg/formula.svg" class="" width="20" height="20" >classic</div>
        </div>
        
        <div v-for="file in localfiles" class="d-inline">
            <div v-if="(file.type == 'ggb')" class="btn btn-info ms-2 mb-1  btn-sm" @click="selectedFile=file.name; loadGGB(file.name)"><img src="/src/assets/img/svg/document-replace.svg" class="" width="20" height="20" > {{file.name}} </div>
        </div>


        <button style="float: right;" title="Prüfungsmodus" @click="activateKiosk(); " class="btn  d-inline btn-danger p-1 ms-2 mb-1 btn-sm"><img src="/src/assets/img/svg/shield-lock.svg" class="white" width="20" height="20" ></button>

    </div>
    <!-- filelist end -->
    


   

    <div id="content">
        <webview id="geogebraframe" src="./geogebra/classic.html" style="visibility:hidden"></webview>
    </div>


    <Transition name="clipboard-slide">
      <aside
        v-if="isClipboardVisible"
        class="customClipboard"
        aria-label="Clipboard"
      >
        <div class="customClipboard__header">
          <span class="customClipboard__title">Schnell einfügen</span>
          <button
            type="button"
            class="customClipboard__close"
            aria-label="Schließen"
            @click="showClipboard()"
          >
            ×
          </button>
        </div>
        <div class="customClipboard__list">
          <button
            v-for="(item, index) in customClipboard"
            :key="index"
            type="button"
            class="customClipboard__item"
            @click="insertFromClipboar(item)"
          >
            <img
              src="/src/assets/img/svg/edit-paste-style.svg"
              alt=""
              width="16"
              height="16"
              class="customClipboard__item-icon"
            />
            <span class="customClipboard__item-text">{{ item }}</span>
          </button>
          <p v-if="!customClipboard.length" class="customClipboard__empty">Noch keine Einträge</p>
        </div>
      </aside>
    </Transition>


</template>

<script>


export default {
    data() {
        return {
            componentName: 'GeoGebra',
            currentFile:null,
            loadfilelistinterval: null,
            entrytime: 0,
            localfiles: null,
            customClipboard: [],
            isClipboardVisible: false,
            kiosk: false,

            // ─── CSS-Injection ───────────────────────────────────────────
            // Hier CSS eintragen das in classic.html / suite.html injiziert werden soll.
            // Wird nach jedem Laden (auch bei setsource) automatisch eingefügt,
            // bevor der webview sichtbar wird.
            customCSS: `
                #buttonsID { display: none !important; }
                /* Bild-Tool (mode 26) und Hilfe-Button in der Werkzeug-Seitenleiste */
                button[id="mode26"],
                button[aria-label="Hilfe"],
                button[aria-label="Help"] { display: none !important; }
                /* Hilfe-Button im Perspektiven-Popup-Header */
                button.helpBtn { display: none !important; }
                /* Hilfe & Feedback, Anmelden, Datei - ganze li Elemente */
                li[aria-label="Hilfe & Feedback"],
                li[aria-label="Help & Feedback"],
                li[aria-label="Anmelden"],
                li[aria-label="Sign In"],
                li[aria-label="Datei"],
                li[aria-label="File"] { display: none !important; }
            `,
            // Menüeinträge die im GeoGebra-Hamburger-Menü ausgeblendet werden sollen (exakter Text)
            hideMenuTexts: [
                'Neu', 'New',
                'Prüfungsmodus', 'Exam Calculator',
                'Hilfe & Feedback', 'Help & Feedback',
                'Anmelden', 'Sign In',
                'Bild exportieren', 'Export Image',
                'Online speichern', 'Save Online',
                'Öffnen', 'Open',
                'Auf dem Computer speichern', 'Save to Device',
                'Teilen', 'Share',
                'Druckvorschau', 'Print Preview',
                'Austeilen', 'Assign',
                'Herunterladen als', 'Herunterladen als…', 'Download as', 'Download as…',
                'Download',
                'Bild', 'Image',
                'Hilfe', 'Help',
            ],
            // ─────────────────────────────────────────────────────────────
        }
    },
    components: {  },  
    mounted() {

        this.currentFile = this.clientname
        this.entrytime = new Date().getTime()  
         
       
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


        ipcRenderer.on('attention', (event, msg) => {
            console.log('student tried to leave kiosk mode');
            const audio = new Audio("attention.wav");
            audio.play()
            document.getElementById("toolbar").style.backgroundColor = "red"
        });





        
        this.$nextTick(() => {
            this.loadfilelistinterval = setInterval(() => { this.loadFilelist() }, 10000)
            this.loadFilelist()

            // CSS-Injection: nach jedem Laden des webview CSS einschleusen, dann sichtbar machen
            const wv = this.ggbWebview()
            if (wv) {
                this._cssInjectBound = () => this.injectCSS()
                wv.addEventListener('did-finish-load', this._cssInjectBound)
                // console-message events only work after dom-ready
                this._domReadyBound = () => {
                    this.redefineConsole()
                    if (import.meta.env.DEV) {
                        const g = this.ggbWebview()
                        if (g) g.openDevTools()
                    }
                }
                wv.addEventListener('dom-ready', this._domReadyBound)
            }
        })
    },
    methods: { 

        ggbWebview() {
            const el = document.getElementById('geogebraframe')
            return el && el.tagName === 'WEBVIEW' ? el : null
        },

        // kiosk mode mit ipc invoke aktuvieren für electron
        activateKiosk(){
            if (this.kiosk){
                this.$swal({
                    title: "Prüfungsmodus deaktivieren",
                    text: "Möchten Sie den Prüfungsmodus wirklich verlassen? \nDie Prüfung darf danach nicht mehr fortgesetzt werden",
                    showCancelButton: true,
                    confirmButtonText: 'Ok',
                    cancelButtonText: 'Abbrechen',
                 }).then((result) => {
                    if (result.isConfirmed) {
                        this.kiosk = false;
                        ipcRenderer.invoke('kioskmode', false );
                        const audio = new Audio("leave.oga");
                        audio.play()
                        this.injectCSS()
                    }
                    else {return; }
                });  
            }
            else {
                this.$swal({
                    title: "Prüfungsmodus aktivieren",
                    showCancelButton: true,
                    confirmButtonText: 'Ok',
                    cancelButtonText: 'Abbrechen',
                 }).then((result) => {
                    if (result.isConfirmed) {
                        this.kiosk = true;
                        ipcRenderer.invoke('kioskmode', true );
                        document.getElementById("toolbar").style.backgroundColor = "#1a4b1c"
                        this.injectCSS()
                    }
                    else {return; }
                });  

            }
        },



        redefineConsole() {
            const wv = this.ggbWebview()
            if (!wv) return
            if (this._ggbConsoleBound) wv.removeEventListener('console-message', this._ggbConsoleBound)
            this._ggbConsoleBound = (e) => {
                const message = e.message
                if (typeof message === 'string' && message.includes('existing geo:')) {
                    const partAfterExistingGeo = message.split('existing geo:')[1].trim()
                    const extractedText = partAfterExistingGeo.split('=')[1].trim()
                    if (!this.customClipboard.includes(extractedText)) {
                        this.customClipboard.push(extractedText)
                        if (this.customClipboard.length > 10) this.customClipboard.shift()
                    }
                }
            }
            wv.addEventListener('console-message', this._ggbConsoleBound)
        },
 

        async loadFilelist(){
            let filelist = await ipcRenderer.invoke('getfilesasync', null)
            this.localfiles = filelist;
        },
        async injectCSS() {
            const wv = this.ggbWebview()
            if (!wv) return
            const escaped = this.kiosk ? this.customCSS.replace(/`/g, '\\`').replace(/\\/g, '\\\\').replace(/\$/g, '\\$') : ''
            const hideTexts = this.kiosk ? JSON.stringify(this.hideMenuTexts) : '[]'
            await wv.executeJavaScript(`
                (function() {
                    // 1) Custom CSS (nur im Prüfungsmodus)
                    var existing = document.getElementById('__ggb_custom_css__')
                    if (existing) existing.remove()
                    var s = document.createElement('style')
                    s.id = '__ggb_custom_css__'
                    s.textContent = \`${escaped}\`
                    document.head.appendChild(s)

                    // 2) Menüeinträge per Text ausblenden (nur im Prüfungsmodus)
                    var hideTexts = ${hideTexts}
                    function hideMenuItems(menu) {
                        menu.querySelectorAll('li.gwt-MenuItem').forEach(function(li) {
                            var txt = li.textContent.trim()
                            if (hideTexts.indexOf(txt) !== -1) {
                                li.style.setProperty('display', 'none', 'important')
                            }
                        })
                    }
                    if (window.__ggbMenuObserver__) {
                        window.__ggbMenuObserver__.disconnect()
                        window.__ggbMenuObserver__ = null
                    }
                    if (hideTexts.length > 0) {
                        window.__ggbMenuObserver__ = new MutationObserver(function(mutations) {
                            mutations.forEach(function(m) {
                                m.addedNodes.forEach(function(node) {
                                    if (node.nodeType !== 1) return
                                    var menus = node.classList && node.classList.contains('gwt-MenuBar-vertical')
                                        ? [node]
                                        : Array.from(node.querySelectorAll('.gwt-MenuBar-vertical'))
                                    menus.forEach(hideMenuItems)
                                })
                            })
                        })
                        window.__ggbMenuObserver__.observe(document.body, { childList: true, subtree: true })
                        document.querySelectorAll('.gwt-MenuBar-vertical').forEach(hideMenuItems)
                    }
                })()
            `)
            wv.style.visibility = 'visible'
        },

        setsource(source) {
            const wv = this.ggbWebview()
            if (!wv) return
            wv.style.visibility = 'hidden'
            if (source === 'suite') wv.src = './geogebra/suite.html'
            if (source === 'classic') wv.src = './geogebra/classic.html'
            this.redefineConsole()
        },
        showClipboard() {
            this.isClipboardVisible = this.isClipboardVisible ? false: true;
        },
        async insertFromClipboar(value) {
            const wv = this.ggbWebview()
            if (!wv) return
            await wv.executeJavaScript(`window.ggbApplet && window.ggbApplet.evalCommand(${JSON.stringify(value)})`)
        },

        clearAll() {
            this.$swal({
                title: '',
                text: 'Alle Berechnungen löschen?',
                showCancelButton: true,
                inputAttributes: {
                    maxlength: 20,
                },
                confirmButtonText: 'Ok',
                cancelButtonText: 'Abbrechen',
            }).then(async (result) => {
                if (!result.isConfirmed) return
                const wv = this.ggbWebview()
                if (wv) await wv.executeJavaScript('window.ggbApplet && window.ggbApplet.reset()')
            })
        },

         /** Saves Content as GGB */
        async saveContent(manual) {
            const wv = this.ggbWebview()
            if (!wv) return
            let filename = `${this.clientname}.ggb`
            if (manual) {
                const dlg = await this.$swal({
                    title: 'Dateiname',
                    input: 'text',
                    inputPlaceholder: 'Type here...',
                    showCancelButton: true,
                    inputAttributes: {
                        maxlength: 20,
                    },
                    confirmButtonText: 'Ok',
                    cancelButtonText: 'Abbrechen',
                    inputValidator: (value) => {
                        const regex = /^[A-Za-z0-9]+$/
                        if (!value.match(regex)) return 'Bitte geben Sie nur Buchstaben oder Zahlen ein.'
                    },
                })
                if (!dlg.isConfirmed) return
                filename = `${dlg.value}-bak.ggb`
            }
            let base64GgbFile
            try {
                base64GgbFile = await wv.executeJavaScript(`new Promise((resolve, reject) => {
                    if (!window.ggbApplet) reject(new Error('no ggbApplet'))
                    else window.ggbApplet.getBase64(resolve)
                })`)
            } catch (e) {
                console.error('geogebra @ saveContent:', e)
                return
            }
            const response = await ipcRenderer.invoke('saveGGB', { filename, content: base64GgbFile })
            if (response.status === 'success' && manual) {
                this.loadFilelist()
                this.$swal.fire({
                    title: 'Gespeichert',
                    text: filename,
                    icon: 'info',
                })
            }
        },



        // get file from local workdirectory and replace editor content with it
        async loadGGB(file){
            this.$swal.fire({
                title: "Ersetzen",
                html:  `${"Wollen Sie den Inhalt der Datei"} <b>${file}</b> ${"ersetzen?"}`,
                icon: "question",
                showCancelButton: true,
                cancelButtonText: "Abbrechen",
                reverseButtons: true
            })
            .then(async (result) => {
                if (result.isConfirmed) {

                    const result = await ipcRenderer.invoke('loadGGB', file);
                    if (result.status === 'success') {
                        const base64GgbFile = result.content
                        const wv = this.ggbWebview()
                        if (wv) {
                            await wv.executeJavaScript(`window.ggbApplet && window.ggbApplet.setBase64(${JSON.stringify(base64GgbFile)})`)
                        }
                    } else {
                        console.error('Error loading file');
                    }
                } 
            }); 
        },
       
    },
    beforeUnmount() {
        clearInterval(this.loadfilelistinterval)
        const wv = document.getElementById('geogebraframe')
        if (wv) {
            if (this._ggbConsoleBound) wv.removeEventListener('console-message', this._ggbConsoleBound)
            if (this._cssInjectBound) wv.removeEventListener('did-finish-load', this._cssInjectBound)
            if (this._domReadyBound) wv.removeEventListener('dom-ready', this._domReadyBound)
        }
    },
}

</script>

<style scoped>

.clipboard-slide-enter-active,
.clipboard-slide-leave-active {
    transition:
        transform 0.38s cubic-bezier(0.22, 1, 0.36, 1),
        opacity 0.32s ease,
        box-shadow 0.38s ease;
}

.clipboard-slide-enter-from,
.clipboard-slide-leave-to {
    transform: translateX(100%);
    opacity: 0;
    box-shadow: -4px 0 24px rgba(15, 23, 42, 0);
}

.customClipboard {
    position: fixed;
    top: 56px;
    right: 0;
    bottom: 0;
    z-index: 1000000;
    width: min(280px, 86vw);
    display: flex;
    flex-direction: column;
    padding: 0;
    margin: 0;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-left: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: -8px 0 32px rgba(15, 23, 42, 0.12);
    border-radius: 12px 0 0 0;
}

.customClipboard__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px 10px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    flex-shrink: 0;
}

.customClipboard__title {
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: rgba(15, 23, 42, 0.75);
    text-transform: uppercase;
}

.customClipboard__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.06);
    color: rgba(15, 23, 42, 0.55);
    font-size: 1.35rem;
    line-height: 1;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
}

.customClipboard__close:hover {
    background: rgba(15, 23, 42, 0.1);
    color: rgba(15, 23, 42, 0.85);
}

.customClipboard__list {
    flex: 1;
    overflow-y: auto;
    padding: 10px 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.customClipboard__empty {
    margin: 24px 8px 0;
    font-size: 0.875rem;
    color: rgba(15, 23, 42, 0.45);
    text-align: center;
}

.customClipboard__item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.65);
    color: rgba(15, 23, 42, 0.88);
    font-size: 0.8125rem;
    line-height: 1.35;
    cursor: pointer;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        box-shadow 0.15s ease;
}

.customClipboard__item:hover {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(13, 110, 253, 0.25);
    box-shadow: 0 2px 12px rgba(13, 110, 253, 0.08);
}

.customClipboard__item-icon {
    flex-shrink: 0;
    margin-top: 2px;
    opacity: 0.65;
}

.customClipboard__item-text {
    word-break: break-word;
    min-width: 0;
}

#content {
    width: 100%;
    height: calc(100vh - 56px);
}

#geogebraframe {
    display: inline-flex;
    width: 100%;
    height: 100%;
}

#suiteAppPicker {
    visibility: visible !important;
}

@media print{
    .customClipboard {
        display: none !important;
    }
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
</style>
