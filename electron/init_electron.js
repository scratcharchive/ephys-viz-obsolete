"use strict";

const isOSX = process.platform === 'darwin';
const isDevMode = process.env.NODE_ENV === 'development';

const electron = require('electron');
const webContents = electron.webContents;
const path = require('path');
const fs = require('fs');

exports.init_electron=function(url,params) {
  console.info('init_electron',url,params);
  const app = electron.app;
  const BrowserWindow = electron.BrowserWindow;
  let mainWindow = null;
  let mainWebContents = null;

  /*
  function print_usage() {
    console.log ('Usage:');
    console.log ('ev-view-timeseries [timeseries].mda[.prv] --samplerate=[30000]');
    console.log ('ev-view-timeseries [timeseries].mda[.prv] --firings [firings].mda[.prv] --samplerate=[30000]');
  }
  */
  
  //if (!exists_or_is_url(params.timeseries)) {
  //  throw new Error("File does not exist: "+params.timeseries);
  //}
  //var original_timeseries=params.timeseries;

  if ('help' in params) {
    show_help();
    process.exit(0);
  }

  var search_remote=('remote' in params)||('search_remote' in params);
  resolve_prvs(params,{search_remote:search_remote});

  var query_string=require('querystring').stringify(params);
  var url0=`${url}?${query_string}`;
  console.info(url0);

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
      title: 'ephys-viz'//+original_timeseries
    });

    mainWindow.on('closed', () => {
        mainWindow=null;
        console.log ('Window has been closed.');
        app.quit();
    });

    mainWindow.loadURL(url0);
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
}

function ends_with(str,str2) {
  return (str.slice(str.length-str2.length)==str2);
}

function resolve_prvs(params,opts) {
  for (var key in params) {
    params[key]=resolve_prv(params[key],opts);
  }
}

function resolve_prv(fname,opts) {
  opts=opts||{};
  if (!is_url(fname)) {
    if ((!fs.existsSync(fname))&&(fs.existsSync(fname+'.prv')))
      fname+='.prv';
  }
  if ((fname)&&(ends_with(fname,'.prv'))) {
    if (!fs.existsSync(fname)) {
      throw new Error('File does not exist: '+fname);
      return;
    }
    let obj=read_json_file(fname);
    if (!obj) {
      throw new Error('Error parsing json of prv file: '+fname);
    }
    fname='sha1://'+obj.original_checksum;
  }
  return fname;
}

function exists_or_is_url(fname_or_url) {
  if (is_url(fname_or_url)) return true;
  return fs.existsSync(fname_or_url);
}

function is_url(fname_or_url) {
  return ((fname_or_url.indexOf('http:')==0)||(fname_or_url.indexOf('https:')==0));
}

function read_json_file(fname) {
  try {
    var txt = fs.readFileSync(fname, 'utf8')
    return JSON.parse(txt);
  } catch (err) {
    return null;
  }
}
