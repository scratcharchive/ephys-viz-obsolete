var remote = require('electron').remote;
var params = remote.getGlobal('sharedObject').params;

function read_binary_file_part(path,start,end,callback) {
	var headers={};
	if ((start!==undefined)&&(end!==undefined)) {
		headers['range']=`bytes=${start}-${end-1}`;
	}
	if (is_url(path)) {
		var opts = {
		    method: 'GET',
		    url: path,
		    encoding: null, // See https://stackoverflow.com/questions/14855015/getting-binary-content-in-node-js-using-request
		    headers:headers
		};
		require('request')(opts, function(error, response, body) {
		    if (error) {
		    	callback(error.message);
		    	return;
		    }

		    // The following is sadly necessary because the body is returned
		    // with an underlying buffer that holds 32-bit integers. Can you believe it??
		    // TODO: fix this by using utf8 and charcodes or something
		    var AA=new Uint8Array(body.length);
		    for (var jj=0; jj<body.length; jj++) {
		    	AA[jj]=body[jj];
		    }

		    callback(null,AA.buffer);
		});
	}
	else {
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
}

//var fname='/tmp/mountainlab-tmp/output_813e1ace5ed51aab7ec230c65e6385abcd23840c_timeseries_out.mda';
var templates_fname=params.templates_fname;
read_binary_file_part(templates_fname,undefined,undefined,function(err,buf) {
	if (err) {
		throw new Error('Error reading file: '+templates_fname);
		return;
	}
	var X=new Mda();
	X.setFromArrayBuffer(buf);

	var W=new TemplatesWidget();

	W.setTemplates(X);

	W.setSize(400,400);
	W.setViewRange([-1,-1]);
	$('#content').append(W.div());
	$(window).resize(update_size);
	update_size();
	function update_size() {
		W.setSize($('#content').width(),$('#content').height());
	}
});

function is_url(fname_or_url) {
	return ((fname_or_url.indexOf('http:')==0)||(fname_or_url.indexOf('https:')==0));
}

function get_file_size(fname) {
	return require('fs').statSync(fname).size;
}