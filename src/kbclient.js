exports.KBClient = KBClient;

const fs = window.fs;
var axios = require('axios');
var async = require('async');

function KBClient() {
  this.readDir = function(path, opts, callback) {
    readDir(path, opts, callback);
  };
  this.readTextFile = function(path, callback) {
    readTextFile(path, callback);
  };
  this.readBinaryFilePart = function(path, opts, callback) {
    readBinaryFilePart(path, opts, callback);
  };

  function readTextFile(path, callback) {
    resolve_file_path(path, {}, function(err, path2) {
      if (err) {
        callback(err);
        return;
      }
      if (is_url(path2)) {
        http_get_text(path2, callback);
        return;
      }
      try {
        var txt = fs.readFileSync(path2, 'utf8');
        callback(null, txt);
      } catch (err) {
        callback(`Error reading text file (${err.message}): ${path2}`);
      }
    });
  }

  function readBinaryFilePart(path, opts, callback) {
    resolve_file_path(path, {}, function(err, path2) {
      if (err) {
        callback(err);
        return;
      }
      if (is_url(path2)) {
        http_get_binary(path2, opts, callback);
        return;
      }
      let start = opts.start;
      let end = opts.end;
      fs.open(path2, 'r', function(err, fd) {
        if (err) {
          callback(err.message);
          return;
        }
        if ((start === undefined) && (end === undefined)) {
          start = 0;
          end = get_file_size(path2);
        }
        var buffer = new Buffer(end - start);
        fs.read(fd, buffer, 0, end - start, start, function(err, num) {
          if (err) {
            callback(err.message);
            return;
          }
          callback(null, buffer.buffer);
        });
      });
    });
  }

  function readDir(path, opts, callback) {
    if (!callback) {
      callback = opts;
      opts = {};
    }
    if (path.startsWith('kbucket://')) {
    	let str=path.slice(('kbucket://').length);
    	let ind0=str.indexOf('/');
    	let kbhub_id,subdirectory;
    	if (ind0<0) {
    		kbhub_id=str;
    		subdirectory='';
    		return;
    	}
    	else {
    		kbhub_id=str.slice(0,ind0);
    		subdirectory=str.slice(ind0+1);
    	}
      let HKBC = new HttpKBucketClient();
      HKBC.readDir(kbhub_id,subdirectory,function(err,files,dirs) {
      	if (err) {
      		callback('Error reading directory of kbucket hub: '+err);
      		return;
      	}
      	let files2={};
      	for (let ii in files) {
      		files2[files[ii].name]=files[ii];
      	}
      	let dirs2={};
      	for (let ii in dirs) {
      		dirs2[dirs[ii].name]=dirs[ii];
      	}
      	callback(null,files2,dirs2);
      });
      return;
    }

    fs.readdir(path, function(err, list) {
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
          fs.stat(item_path, function(err0, stat0) {
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

  function resolve_file_path(path, opts, callback) {
    if (path.startsWith('sha1://')) {
      let sha1 = path.slice(('sha1://').length);
      let HKBC = new HttpKBucketClient();
      let kbucket_url = 'https://kbucket.flatironinstitute.org';
      HKBC.setKBucketUrl(kbucket_url);
      HKBC.findFile(sha1, opts, function(err, resp) {
        if (err) {
          callback('Error searching for file on kbucket: ' + err);
          return;
        }
        if (!resp.found) {
          callback('File not found on kbucket.');
          return;
        }
        callback(null, resp.url);
      });
      return;
    }
    if (path.startsWith('kbucket://')) {
    	let str=path.slice(('kbucket://').length);
    	let ind0=str.indexOf('/');
    	if (ind0<0) {
    		callback('Improper kbucket:// path: '+path);
    		return;
    	}
    	let kbshare_id=str.slice(0,ind0);
      let HKBC = new HttpKBucketClient();
      HKBC.findLowestAccessibleHubUrl(kbshare_id,function(err,hub_url) {
      	if (err) {
      		callback('Error finding kbucket share: '+err);
      		return;
      	}
      	let url=hub_url+'/'+kbshare_id+'/download/'+str.slice(ind0+1);
      	callback(null,url);
      	return;
      });
      return;
    }
    if (ends_with(path, '.prv')) {
      let obj = read_json_file(path);
      if (!obj) {
        callback('Error reading .prv file: ' + path);
        return;
      }
      opts.filename = require('path').basename(path);
      resolve_file_path('sha1://' + obj.original_checksum, opts, callback);
      return;
    }
    if ((!fs.existsSync(path)) && (fs.existsSync(path + '.prv'))) {
      resolve_file_path(path + '.prv', opts, callback);
      return;
    }

    callback(null, path);
  }
}

var s_kbucket_client_data = {
  infos_by_sha1: {}
}

function HttpKBucketClient() {
  const that = this;
  this.setKBucketUrl = function(url) {
    m_kbucket_url = url;
  };
  this.findFile = function(sha1, opts, callback) {
    findFile(sha1, opts, callback);
  };
  this.clearCacheForFile = function(sha1) {
    clearCacheForFile(sha1);
  };
  this.clearCache = function() {
    s_kbucket_client_data.infos_by_sha1 = {};
  };
  this.getNodeInfo = function(kbnode_id, callback) {
    getNodeInfo(kbnode_id, callback);
  };
  this.readDir = function(kbnode_id, subdirectory, callback) {
    readDir(kbnode_id, subdirectory, callback);
  };
  this.findLowestAccessibleHubUrl=function(kbnode_id,callback) {
  	find_lowest_accessible_hub_url(kbnode_id,callback);
  };

  //var m_kbucket_url='https://kbucket.org';
  var m_kbucket_url = 'https://kbucket.flatironinstitute.org';

  function clearCacheForFile(sha1) {
    if (sha1 in s_kbucket_client_data.infos_by_sha1) {
      delete s_kbucket_client_data.infos_by_sha1[sha1];
    }
  }

  function findFile(sha1, opts, callback) {
    if (typeof(opts) == 'string') {
      opts = {
        filename: opts
      };
    }
    find_file(sha1, opts, function(err, resp) {
      if (err) {
        callback(err);
        return;
      }
      if (resp.found) {
        callback(null, resp);
        return;
      }
      if (resp.alt_hub_url) {
        var opts2 = JSON.parse(JSON.stringify(opts));
        opts2.kbucket_url = resp.alt_hub_url;
        find_file(sha1, opts2, callback);
        return;
      }
      callback(null, resp);
    });
  }

  function find_file(sha1, opts, callback) {
    if (s_kbucket_client_data.infos_by_sha1[sha1]) {
      callback(null, s_kbucket_client_data.infos_by_sha1[sha1]);
      return;
    }
    if (!m_kbucket_url) {
      callback('KBucketClient: kbucket url not set.');
      return;
    }
    var url0 = opts.kbucket_url || m_kbucket_url;
    var url1 = url0 + '/find/' + sha1;
    if (opts.filename) {
      url1 += '/' + opts.filename;
    }
    http_get_json(url1, function(err, obj) {
      if (err) {
        callback(`Error in http_get_json (${url1}): ` + err, null);
        return;
      }
      if (!obj.found) {
        callback(null, obj);
        return;
      }
      var url = '';
      var candidate_urls = obj.urls || [];
      //should this be done in series or parallel?
      async.eachSeries(candidate_urls, function(candidate_url, cb) {
        url_exists(candidate_url, function(exists) {
          if (exists) {
            url = candidate_url;
            finalize();
            return;
          }
          cb();
        })
      }, function() {
        finalize();
      });

      function finalize() {
        if (!url) {
          console.warn('Found file, but none of the urls actually work.', candidate_urls);
          callback(null, {
            found: false
          });
          return;
        }
        var info0 = {
          found: true,
          url: url,
          size: obj.size
        };
        s_kbucket_client_data.infos_by_sha1[sha1] = info0;
        callback(null, info0);
      }
    });
  }

  function getNodeInfo(kbnode_id, callback) {
    var url0 = `${m_kbucket_url}/${kbnode_id}/api/nodeinfo`;
    http_get_json(url0, function(err, resp) {
      if (err) {
        callback(err);
        return;
      }
      if (!resp.info) {
        callback('No info field in response to nodeinfo.');
        return;
      }
      //check accessible
      var check_url = `${resp.info.listen_url}/${kbnode_id}/api/nodeinfo`;
      console.info(`Checking whether node ${kbnode_id} is accessible from this location...`, check_url);
      url_exists(check_url,function(accessible) {
      	callback(err, resp.info,resp.parent_hub_info,accessible);
      });
    });
  }

  function readDir(kbnode_id, subdirectory, callback) {
    var url0 = `${m_kbucket_url}/${kbnode_id}/api/readdir/${subdirectory}`;
    http_get_json(url0, function(err, resp) {
      if (err) {
        callback(err);
        return;
      }
      if (resp.error) {
        callback(resp.error);
        return;
      }
      callback(null, resp.files, resp.dirs);
    });
  }

  function find_lowest_accessible_hub_url(kbnode_id, callback) {
    that.getNodeInfo(kbnode_id, function(err, info, parent_hub_info, accessible) {
      if (err) {
        callback(err);
        return;
      }
      if ((accessible) && (info.kbnode_type == 'hub')) {
        callback(null, info.listen_url);
        return;
      }
      if (!parent_hub_info) {
        callback(`Unable to find accessible hub (id=${kbnode_id}).`);
        return;
      }
      find_lowest_accessible_hub_url(parent_hub_info.kbnode_id, callback);
    });
  }
}

function http_get_json(url, callback) {
  axios.get(url, {
      responseType: 'json'
    })
    .then(function(response) {
      setTimeout(function() { // so we don't catch an error from the timeout
        callback(null, response.data);
      }, 0);
    })
    .catch(function(error) {
      callback(error.message);
    });
}

function http_get_text(url, callback) {
  axios.get(url, {
      responseType: 'arraybuffer'
    })
    .then(function(response) {
      setTimeout(function() { // so we don't catch an error from the timeout
        let buffer = new Buffer(response.data, 'binary');
        let txt = buffer.toString('utf8');
        callback(null, txt);
      }, 0);
    })
    .catch(function(error) {
      callback(error.message);
    });
}

function http_get_binary(url, opts, callback) {
  let headers = {};
  if ((opts.start !== undefined) && (opts.end !== undefined)) {
    headers['range'] = `bytes=${opts.start}-${opts.end-1}`;
  }
  axios.get(url, {
      headers: headers,
      responseType: 'arraybuffer'
    })
    .then(function(response) {
      setTimeout(function() { // so we don't catch an error from the timeout
        callback(null, response.data);
      }, 0);
    })
    .catch(function(error) {
      callback(error.message);
    });
}

function url_exists(url, callback) {
  axios.head(url)
    .then(function(response) {
      setTimeout(function() { // so we don't catch an error from the timeout
        callback(response.status == 200);
      }, 0);
    })
    .catch(function(error) {
      callback(false);
    });
}

function is_url(fname_or_url) {
  return ((fname_or_url.indexOf('http://') == 0) || (fname_or_url.indexOf('https://') == 0));
}

function ends_with(str, str2) {
  return (str.slice(str.length - str2.length) == str2);
}

function exists_sync(path) {
  try {
    return fs.existsSync(path);
  } catch (err) {
    return false;
  }
}

function read_json_file(fname) {
  try {
    var txt = fs.readFileSync(fname, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    return null;
  }
}