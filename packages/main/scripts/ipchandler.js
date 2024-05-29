/**
 * @license GPL LICENSE
 * Copyright (c) 2021 Thomas Michael Weissel
 * 
 * This program is free software: you can redistribute it and/or modify it 
 * under the terms of the GNU General Public License as published by the Free Software Foundation,
 * either version 3 of the License, or any later version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 * 
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <http://www.gnu.org/licenses/>
 */


import path from 'path'
import fs from 'fs'
import ip from 'ip'
import axios from 'axios'
import i18n from '../../renderer/src/locales/locales.js'
const {t} = i18n.global
import{ipcMain} from 'electron'
import os from 'os'
import log from 'electron-log/main';

  ////////////////////////////////
 // IPC handling (Backend) START
////////////////////////////////

class IpcHandler {
    constructor () {
        this.multicastClient = null
        this.config = null
        this.WindowHandler = null
    }
    init (mc, config, wh) {
        this.multicastClient = mc
        this.config = config
        this.WindowHandler = wh  


        /**
         * Returns the main config object
         */ 
        ipcMain.on('getconfig', (event) => {   event.returnValue = this.config   })


        /**
         * Store content from Geogebra as ggb file - as backup 
         * @param args contains an object with  { filename:`${this.clientname}.ggb`, content: base64 }
         */
        ipcMain.handle('saveGGB', (event, args) => {   
            const content = args.content
            const filename = args.filename
            const ggbFilePath = path.join(this.config.workdirectory, filename);
            if (content) { 
                //log.info("ipchandler @ saveGGB: saving students work to disk...")
                const fileData = Buffer.from(content, 'base64');

                try {
                    fs.writeFileSync(ggbFilePath, fileData);
                    return  { sender: "client", message:t("data.filestored") , status:"success" }
                }
                catch(err){
                    this.WindowHandler.examwindow.webContents.send('fileerror', err)  
                 
                    log.error(`ipchandler @ saveGGB: ${err}`)
                    return { sender: "client", message:err , status:"error" }
                }
            }
        })



        /**
         * load content from ggb file and send it to the frontend 
         * @param args contains an object { filename:`${this.clientname}.ggb` }
         */
        ipcMain.handle('loadGGB', (event, filename) => {   
            const ggbFilePath = path.join(this.config.workdirectory, filename);
            try {
                // Read the file and convert it to base64
                const fileData = fs.readFileSync(ggbFilePath);
                const base64GgbFile = fileData.toString('base64');
                return { sender: "client", content:base64GgbFile, status:"success" }
            } 
            catch (error) {
                return { sender: "client", content: false , status:"error" }
            }     
        })


        /**
         * GET PDF from Work directory
         * @param filename if set the content of the file is returned
         */ 
        ipcMain.handle('getpdfasync', (event, filename) => {   
            const workdir = path.join(config.workdirectory,"/")
            if (filename) { //return content of specific file
                let filepath = path.join(workdir,filename)
                try {
                    let data = fs.readFileSync(filepath)
                    return data
                } 
                catch (error) {
                    return { sender: "client", content: false , status:"error" }
                }    
            }
        })


        /**
         * ASYNC GET FILE-LIST from workdirectory
         * @param filename if set the content of the file is returned
         */ 
        ipcMain.handle('getfilesasync', (event, filename, audio=false) => {   
            const workdir = path.join(config.workdirectory,"/")

            if (filename) { //return content of specific file as string (html) to replace in editor)
                let filepath = path.join(workdir,filename)
                //log.info(filepath)
                if (audio){
                    const audioData = fs.readFileSync(filepath);
                    return audioData.toString('base64');
                }
                else {
                    try {
                        let data = fs.readFileSync(filepath, 'utf8')
                        return data
                    }
                    catch (err) {
                        log.error(`ipchandler @ getfilesasync: ${err}`); 
                        return false
                    }
                }
            }
            else {  // return file list of exam directory
                try {
                    if (!fs.existsSync(workdir)){ fs.mkdirSync(workdir, { recursive: true });  } //do not crash if the directory is deleted after the app is started ^^
                    let filelist =  fs.readdirSync(workdir, { withFileTypes: true })
                        .filter(dirent => dirent.isFile())
                        .map(dirent => dirent.name)
                     
                    
                    let files = []
                    filelist.forEach( file => {
                        let modified = fs.statSync(   path.join(workdir,file)  ).mtime
                        let mod = modified.getTime()
                        if  (path.extname(file).toLowerCase() === ".ggb"){ files.push( {name: file, type: "ggb", mod: mod})   }  // geogebra
                    })
                   
                    return files
                }
                catch (err) { 
                    log.error(`ipchandler @ getfilesasync: ${err}`); 
                    return false; 
                }
            }
        })


    }
}
 
export default new IpcHandler()
