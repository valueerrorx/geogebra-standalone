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


/**
 * This is the ELECTRON main file that actually opens the electron window
 */

import { app, BrowserWindow, powerSaveBlocker, nativeTheme, globalShortcut} from 'electron'

if (!app.requestSingleInstanceLock()) {  // allow only one instance of the app per client
    app.quit()
    process.exit(0)
 }

import { release } from 'os'
// import { disableRestrictions} from './scripts/platformrestrictions.js';
import WindowHandler from './scripts/windowhandler.js'
import IpcHandler from './scripts/ipchandler.js'
import config from './config.js';
import path from 'path'
import fs from 'fs'
import os from 'os'
import log from 'electron-log/main';


config.electron = true
config.homedirectory = os.homedir()
config.workdirectory = path.join(os.homedir(), config.examdirectory)
config.tempdirectory = path.join(os.tmpdir(), 'geogebra-tmp')
if (!fs.existsSync(config.workdirectory)){ fs.mkdirSync(config.workdirectory); }
if (!fs.existsSync(config.tempdirectory)){ fs.mkdirSync(config.tempdirectory); }


app.commandLine.appendSwitch('lang', 'de')
app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer')
app.commandLine.appendSwitch('disable-web-security')
app.commandLine.appendSwitch('enable-webgl')
app.commandLine.appendSwitch('ignore-gpu-blacklist')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('disable-features', 'WaylandColorManagement')


fs.rmSync(config.tempdirectory, { recursive: true, force: true })
fs.mkdirSync(config.tempdirectory, { recursive: true })

WindowHandler.init(config)  // mainwindow, examwindow, blockwindow
IpcHandler.init(false, config, WindowHandler)  //controll all Inter Process Communication

log.initialize(); // initialize the logger for any renderer process
let logfile = `${WindowHandler.config.workdirectory}/geogebra.log`
log.transports.file.resolvePathFn = (config) => { return logfile  }
log.eventLogger.startLogging();
log.errorHandler.startCatching();
log.warn(`-------------------`)
log.warn(`main: starting GeoGebra "${config.version} ${config.info}"`)
log.info(`main: Logfile: ${logfile}`)
log.info('main: Logger initialized...');



  ////////////////////////////////
 // APP handling (Backend) START
////////////////////////////////

// Disable GPU Acceleration for Windows 7 (NT kernel 6.1)
if (process.platform === 'win32' && release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') {  app.setAppUserModelId(app.getName())}



app.on('window-all-closed', () => {  // if window is closed
    WindowHandler.mainwindow = null
    app.quit()
})

app.on('second-instance', () => {
    if (WindowHandler.mainwindow) {
        if (WindowHandler.mainwindow.isMinimized()) WindowHandler.mainwindow.restore() // Focus on the main window if the user tried to open another
        WindowHandler.mainwindow.focus()
    }
})

app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) { allWindows[0].focus() } 
    else { WindowHandler.createMainWindow() }
})

app.whenReady()
.catch((e) => { log.error('main: whenReady error', e) })
.then(()=>{
    log.info('main: app ready, creating window...')
    nativeTheme.themeSource = 'light'
    powerSaveBlocker.start('prevent-display-sleep')
    WindowHandler.createMainWindow()
    log.info('main: window created')



    // globalShortcut.register('CommandOrControl+R', () => {});
    // globalShortcut.register('F5', () => {});  //reload page
    // globalShortcut.register('CommandOrControl+Shift+R', () => {});
    // globalShortcut.register('Alt+F4', () => {});  //exit app

    // globalShortcut.register('CommandOrControl+W', () => {});
    // globalShortcut.register('CommandOrControl+Q', () => {});  //quit
    // globalShortcut.register('CommandOrControl+D', () => {});  //show desktop
    // globalShortcut.register('CommandOrControl+L', () => {});  //lockscreen
    // globalShortcut.register('CommandOrControl+P', () => {});  //change screen layout
    // globalShortcut.register('Alt+Left', () => {
    //     console.log('Versuch, mit Alt+Left zurückzunavigieren, wurde blockiert.');
    // });

})




  ////////////////////////////////
 // APP handling (Backend) END
////////////////////////////////