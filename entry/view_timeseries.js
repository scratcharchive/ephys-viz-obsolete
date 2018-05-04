"use strict";

const isOSX = process.platform === 'darwin';
const isDevMode = process.env.NODE_ENV === 'development';

const electron = require('electron');
const webContents = electron.webContents;
const path = require('path');
const fs = require('fs');

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
let mainWindow = null;
let mainWebContents = null;

var params={};
var CLP=new CLParams(process.argv);
if (!CLP.unnamedParameters[0]) {
  throw new Error("Missing required file name");
}
params.fname=CLP.unnamedParameters[0];
global.sharedObject = {params: params}

function createWindow() {
  const {width: screenWidth, height: screenHeight} = electron.screen.getPrimaryDisplay().workAreaSize;
  const space = 50;
  const x = space;
  const y = space;
  const width = Math.min(1200,screenWidth - space * 2);
  const height = Math.min(800,screenHeight - space * 2);

  mainWindow = new BrowserWindow({
    defaultEncoding: "utf8",
    // setting to true doesn't work in Windows
    // https://github.com/electron/electron/issues/6036
    // fullscreen: false,
    fullscreenable: true,
    defaultEncoding: "utf8",
    x: x,
    y: y,
    width: width,
    height: height,
  });

  mainWindow.on('closed', () => {
      mainWindow=null;
      console.log ('Window has been closed.');
      app.quit();
  });

  mainWindow.loadURL(`file://${__dirname}/../src/view_timeseries.html`);
  if (isDevMode) {
    mainWindow.webContents.openDevTools();
  }

  // open links in browser
  mainWebContents = mainWindow.webContents;
  const handleRedirect = (e, url) => {
    if(url != mainWebContents.getURL()) {
      e.preventDefault();
      electron.shell.openExternal(url);
    }
  };

  mainWebContents.on('will-navigate', handleRedirect);
  mainWebContents.on('new-window', handleRedirect);
  mainWebContents.on('dom-ready', () => {
    if (!isDevMode) {
      //mainWindow.setFullScreen(true);
    }
  });
}

app.on('ready', () => {
  setupMenus();
  createWindow();
});

app.on('window-all-closed', () => {
  mainWebContents = null;
});

function setupMenus() {
  const menuTemplate = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: isOSX ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click(item, focusedWindow) {
            if (focusedWindow)
              focusedWindow.webContents.toggleDevTools();
          }
        },
      ]
    },
  ];


  /*
  if (isOSX) {
    const name = electron.app.getName();
    menuTemplate.unshift({
      label: name,
      submenu: [
        {
          label: 'About ' + name,
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click() { app.quit(); }
        },
      ]
    });
  }
  */

  const menu = electron.Menu.buildFromTemplate(menuTemplate);
  electron.Menu.setApplicationMenu(menu);
}

function CLParams(argv) {
  this.unnamedParameters=[];
  this.namedParameters={};

  var args=argv.slice(2);
  for (var i=0; i<args.length; i++) {
    var arg0=args[i];
    if (arg0.indexOf('--')===0) {
      arg0=arg0.slice(2);
      var ind=arg0.indexOf('=');
      if (ind>=0) {
        this.namedParameters[arg0.slice(0,ind)]=arg0.slice(ind+1);
      }
      else {
        //this.namedParameters[arg0]=args[i+1]||'';
        //i++;
        this.namedParameters[arg0]='';
      }
    }
    else if (arg0.indexOf('-')===0) {
      arg0=arg0.slice(1);
      this.namedParameters[arg0]='';
    }
    else {
      this.unnamedParameters.push(arg0);
    }
  }
};