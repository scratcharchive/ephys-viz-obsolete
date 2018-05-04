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

function print_usage() {
  console.log ('Usage:');
  console.log ('ev-view-timeseries [timeseries].mda[.prv]');
  console.log ('ev-view-timeseries [timeseries].mda[.prv] --firings [firings].mda[.prv]');
}

var params={};
var CLP=new CLParams(process.argv);
if (!CLP.unnamedParameters[0]) {
  print_usage();
  app.quit();
  return;
}
params.fname=CLP.unnamedParameters[0];
if (!fs.existsSync(params.fname)) {
  throw new Error("File does not exist: "+params.fname);
}
var original_fname=params.fname;
params.fname=resolve_prv(params.fname);

//firings
if ('firings' in CLP.namedParameters) {
  params.firings=resolve_prv(CLP.namedParameters['firings']);
  if (!fs.existsSync(params.firings)) {
    throw new Error("File does not exist: "+params.firings);
  }
}

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
    title: 'ephys-viz (view_timeseries) '+original_fname
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
        this.namedParameters[arg0]='';
        if (i+1<args.length) {
          var str=args[i+1];
          if (str.indexOf('-')!=0) {
            this.namedParameters[arg0]=str;
            i++;  
          }
        }
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

function ends_with(str,str2) {
  return (str.slice(str.length-str2.length)==str2);
}

function resolve_prv(fname) {
  if (ends_with(fname,'.prv')) {
    if (!fs.existsSync(fname)) {
      throw new Error('File does not exist: '+fname);
      return;
    }
    var fname2 = require('child_process').execSync("ml-prv-locate "+fname).toString().trim();
    if (!fname2) {
      throw new Error('Unable to find file for: '+fname);
    }
    if (!fs.existsSync(fname2)) {
      throw new Error('Failure of prv-locate: '+fname2);
    }
    return fname2;
  }
  return fname;
}