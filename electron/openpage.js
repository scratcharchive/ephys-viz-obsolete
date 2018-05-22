"use strict";

var init_electron=require('./init_electron.js').init_electron;

console.log(process.argv);

var CLP=new CLParams(process.argv);
var html_fname=CLP.unnamedParameters[0]||'';
if (!html_fname) {
  throw new Error("Missing argument for html_fname");
}

var params=CLP.namedParameters;
for (var jj=1; jj<CLP.unnamedParameters.length; jj++) {
  params['arg'+(jj)]=CLP.unnamedParameters[jj];
}

var url=`file://${__dirname}/../web/${html_fname}`;
init_electron(url,params);

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
