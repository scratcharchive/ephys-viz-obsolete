var Dat;

if (using_electron()) {
	// It is annoying that we need to do this, but apparently necessary
	window.$ = window.jQuery = require('jquery');

	window.electron_resources={
		load_binary_file_part:_load_binary_file_part,
		load_text_file:_load_text_file,
		load_binary_file_part_from_dat:_load_binary_file_part_from_dat
	};
	Dat=require('dat-node');
}

function using_electron() {
	var userAgent = navigator.userAgent.toLowerCase();
	if (userAgent.indexOf(' electron/') > -1) {
	   return true;
	}
	return false;
}

function _load_binary_file_part(path,start,end,callback) {
	require('fs').open(path, 'r', function(err, fd) {
		if (err) {
		    callback(err.message);
		    return;
		}
		if ((start===undefined)&&(end===undefined)) {
			start=0;
			end=get_file_size(path);
		}
		var buffer = new Buffer(end-start);
		require('fs').read(fd, buffer, 0, end-start, start, function(err, num) {
			if (err) {
				callback(err.message);
				return;
			}
			callback(null,buffer.buffer);
		});
	});
}

function _load_text_file(path,callback) {
	require('fs').readFile(path, 'utf8', function(err, data) {
	  if (err) {
	  	callback('Error loading text file: '+err);
	  	return;
	  }
	  callback(null,data);
	});
}

var s_loaded_dats={};
var s_failed_dats={};
function _load_dat(dat_key,callback) {
	if (dat_key in s_loaded_dats) {
		callback(null,s_loaded_dats[dat_key]);
		return;
	}
	if (dat_key in s_failed_dats) {
		callback('Previously failed. Not retrying.');
		return;
	}
	var dat_path=__dirname+'/../does-exist'; // Note: we don't expect anything to get written here
	Dat(dat_path, {
		key:dat_key,
		sparse:true,
		temp:false
	}, function (err, dat) {
		if (err) {
			s_failed_dats[dat_key]=true;
			callback(`Error initializing dat: `+err.message);
			return;
		}
		console.log (`Joining network (${dat_key})...`);
		dat.joinNetwork(function(err) {
			if (err) {
				s_failed_dats[dat_key]=true;
				callback('Error joining network: '+err.message);
				return;
			}
			console.log('joined');
			s_loaded_dats[dat_key]=dat;
			callback(null,dat);
		});
	});
}

function _load_binary_file_part_from_dat(dat_key,file_path,start,end,callback) {
	console.log('load_binary_file_part_from_dat',dat_key,file_path,start,end);
	_load_dat(dat_key,function(err,dat) {
		console.log('test A',err,dat);
		if (err) {
			callback('Error loading dat: '+err);
			return;
		}
		console.log('creating read stream...',start,end);
		var stream = dat.archive.createReadStream(file_path, {
			start:start,
			end:end-1
		});
		var chunks = [];
		stream.on('data', function (chunk) {
			console.log('on_data');
		    chunks.push(chunk);
		});
		stream.on('end', function () {
			console.log('on_end');
		  	var buf=Buffer.concat(chunks);
		  	//Not sure exactly why the following is necessary:
		  	var buf2=new Uint8Array(buf.length);
		  	for (var i=0; i<buf.length; i++) {
		  		buf2[i]=buf[i];
		  	}
		  	console.log(buf);
		  	console.log(buf2);
		  	window.debug_buf=buf;
		  	window.debug_buf2=buf2;
		    if (callback) callback(null,buf2.buffer);
		    callback=null;
		});
		stream.on('error',function(err) {
			console.log('on_error');
			if (callback) callback('Error: '+err);
			callback=null;
		});
		console.log('test');
	});
}


function get_file_size(fname) {
	return require('fs').statSync(fname).size;
}
