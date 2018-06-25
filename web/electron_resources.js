//var Dat;
const async = require('async');

if (using_electron()) {
  // It is annoying that we need to do this, but apparently necessary
  window.$ = window.jQuery = require('jquery');

  window.fs=require('fs');

  window.electron_resources = {
    load_binary_file_part: _load_binary_file_part,
    load_text_file: _load_text_file,
    //load_binary_file_part_from_dat: _load_binary_file_part_from_dat,
    lsdir: _lsdir
  };
  //Dat = require('dat-node');
}

function using_electron() {
  var userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.indexOf(' electron/') > -1) {
    return true;
  }
  return false;
}

function _lsdir(path, callback) {
  require('fs').readdir(path, function(err, list) {
    if (err) {
      callback(err);
      return;
    }
    let files = {};
    let dirs = {};
    async.eachSeries(list, function(item, cb) {
      if ((item == '.') || (item == '..')) {
        cb();
        return;
      }
      var item_path = require('path').join(path, item);
      if (ends_with(item_path, '.prv')) {
        var item_path_1 = item_path.slice(0, item_path.length - ('.prv').length);
        if (exists_sync(item_path_1)) {
          //don't need to worry about it... the actual file with be handled separately
          cb();
        } else {
          var file0 = {
            name: item.slice(0, item.length - ('.prv').length),
            size: 0
          };
          var prv_obj = read_json_file(item_path);
          if (prv_obj) {
            file0.size = prv_obj.original_size;
          } else {
            console.warn('Unable to read file: ' + item_path);
          }
          files[file0.name] = file0;
          cb();
        }
      } else {
        require('fs').stat(item_path, function(err0, stat0) {
          if (err0) {
            callback(`Error in stat of file ${item}: ${err0.message}`);
            return;
          }
          if (stat0.isFile()) {
            var file0 = {
              name: item,
              size: stat0.size,
            };
            files[file0.name] = file0;
          } else if (stat0.isDirectory()) {
            dirs[item] = {
              name: item
            };
          }
          cb();
        });
      }
    }, function() {
      callback(null, files, dirs);
    });
  });
}

function _load_binary_file_part(path, start, end, callback) {
  require('fs').open(path, 'r', function(err, fd) {
    if (err) {
      callback(err.message);
      return;
    }
    if ((start === undefined) && (end === undefined)) {
      start = 0;
      end = get_file_size(path);
    }
    var buffer = new Buffer(end - start);
    require('fs').read(fd, buffer, 0, end - start, start, function(err, num) {
      if (err) {
        callback(err.message);
        return;
      }
      callback(null, buffer.buffer);
    });
  });
}

function _load_text_file(path, callback) {
  require('fs').readFile(path, 'utf8', function(err, data) {
    if (err) {
      callback('Error loading text file: ' + err);
      return;
    }
    callback(null, data);
  });
}

/*
var s_loaded_dats = {};
var s_failed_dats = {};

function _load_dat(dat_key, callback) {
  if (dat_key in s_loaded_dats) {
    callback(null, s_loaded_dats[dat_key]);
    return;
  }
  if (dat_key in s_failed_dats) {
    callback('Previously failed. Not retrying.');
    return;
  }
  var dat_path = __dirname + '/../does-not-exist'; // Note: we don't expect anything to get written here
  Dat(dat_path, {
    key: dat_key,
    sparse: true,
    temp: true
  }, function(err, dat) {
    if (err) {
      s_failed_dats[dat_key] = true;
      callback(`Error initializing dat: ` + err.message);
      return;
    }
    console.info(`Joining dat network (${dat_key})...`);
    dat.joinNetwork(function(err) {
      if (err) {
        s_failed_dats[dat_key] = true;
        callback('Error joining network: ' + err.message);
        return;
      }
      console.info('joined dat network.');
      s_loaded_dats[dat_key] = dat;
      callback(null, dat);
    });
  });
}
*/

/*
function _load_binary_file_part_from_dat(dat_key, file_path, start, end, callback) {
  _load_dat(dat_key, function(err, dat) {
    if (err) {
      callback('Error loading dat: ' + err);
      return;
    }
    var stream = dat.archive.createReadStream(file_path, {
      start: start,
      end: end - 1
    });
    var chunks = [];
    stream.on('data', function(chunk) {
      chunks.push(chunk);
    });
    stream.on('end', function() {
      var buf = Buffer.concat(chunks);
      //Not sure exactly why the following is necessary:
      var buf2 = new Uint8Array(buf.length);
      for (var i = 0; i < buf.length; i++) {
        buf2[i] = buf[i];
      }
      if (callback) callback(null, buf2.buffer);
      callback = null;
    });
    stream.on('error', function(err) {
      if (callback) callback('Error: ' + err);
      callback = null;
    });
  });
}
*/

function get_file_size(fname) {
  return require('fs').statSync(fname).size;
}

function ends_with(str, str2) {
  return (str.slice(str.length - str2.length) == str2);
}

function exists_sync(path) {
  try {
    return require('fs').existsSync(path);
  } catch (err) {
    return false;
  }
}

function read_json_file(fname) {
  try {
    var txt = require('fs').readFileSync(fname, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    return null;
  }
}