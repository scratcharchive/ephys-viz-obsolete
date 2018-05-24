

if (using_electron()) {
	// It is annoying that we need to do this, but apparently necessary
	window.$ = window.jQuery = require('jquery');

	window.electron_resources={
		load_binary_file_part:_load_binary_file_part,
		load_text_file:_load_text_file
	};
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

function get_file_size(fname) {
	return require('fs').statSync(fname).size;
}
