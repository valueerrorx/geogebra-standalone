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

import { app, BrowserWindow} from 'electron'
import { join } from 'path'
import log from 'electron-log/main';
import { exec } from 'child_process';

  ////////////////////////////////////////////////////////////
 // Window handling (ipcRenderer Process - Frontend) START
////////////////////////////////////////////////////////////

class WindowHandler {
    constructor () {
      this.mainwindow = null
      this.config = null
    }

    init ( config) {
        this.config = config
    }


    /**
     * the main window
     */
    async createMainWindow() {
        this.mainwindow = new BrowserWindow({
            title: 'Main window',
            icon: join(__dirname, '../../public/icons/icon.png'),
            center:true,
            width: 1200,
            height: 800,
            minWidth: 760,
            minHeight: 600,
            show: false,
            webPreferences: {
                preload: join(__dirname, '../preload/preload.cjs'),
                spellcheck: false,
                webviewTag: true,
            }
        })

        this.mainwindow.kiosk = false

        const useBuiltRenderer = app.isPackaged || app.commandLine.hasSwitch('geogebra-dist')
        if (useBuiltRenderer) {
            this.mainwindow.removeMenu()
            this.mainwindow.loadFile(join(__dirname, '../renderer/index.html'))
        } else {
            const url = `http://${process.env.VITE_DEV_SERVER_HOST}:${process.env.VITE_DEV_SERVER_PORT}`
            this.mainwindow.removeMenu()
            this.mainwindow.loadURL(url)
        }

        const viteDevSession = Boolean(process.env.VITE_DEV_SERVER_HOST && process.env.VITE_DEV_SERVER_PORT)
        if (viteDevSession || this.config.showdevtools) { this.mainwindow.webContents.openDevTools() }

        this.mainwindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, url) => {
            log.error(`windowhandler @ did-fail-load: ${errorCode} ${errorDescription} ${url}`)
        })

        this.mainwindow.webContents.once('did-finish-load', () => {
            this.mainwindow.show()
            this.mainwindow.focus();
        })

        this.mainwindow.on('close', async  (e) => {
            if (  this.mainwindow.kiosk == true) {
                 e.preventDefault();
            }
        });
    }


    async blurevent() { 
        log.info("windowhandler @ blurevent: student tried to leave exam window")

        this.mainwindow.moveTop();
        this.mainwindow.setKiosk(true);
        this.mainwindow.show();  
        this.mainwindow.focus();    // we keep focus on the window.. no matter what

        //turn volume up ^^
        try{
            if (process.platform === 'linux') { 
               // exec('amixer set Master 100% ');
                exec('pactl set-sink-mute `pactl get-default-sink` 0');
                exec('pactl set-sink-volume "$(pactl get-default-sink)" 100%');
            }
       }
        catch(e){
            log.warn(`windowhandler @ blurevent: couldn't turn volume up`)
        }
        // send info to frontend
        this.mainwindow.webContents.send('attention');
    }
}

export default new WindowHandler()
 








