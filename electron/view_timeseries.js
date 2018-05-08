"use strict";

var init_electron=require('./init_electron.js').init_electron;

var url=`file://${__dirname}/../web/view_timeseries.html`;
init_electron(url);