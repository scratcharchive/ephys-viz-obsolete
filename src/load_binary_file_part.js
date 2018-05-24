exports.load_binary_file_part=load_binary_file_part;

/*
Alex M: I know this is silly... I should be finding the protocol properly, but oh well...
*/

function is_url(fname_or_url) {
	if (is_dat(fname_or_url)) return true;
	return ((fname_or_url.indexOf('http://')==0)||(fname_or_url.indexOf('https://')==0));
}

function is_dat(fname_or_dat) {
	return (fname_or_dat.indexOf('dat://')==0);
}

function load_binary_file_part(url_or_dat_or_path,start,end,callback) {
	if (is_url(url_or_dat_or_path)) {
		var url=url_or_dat_or_path;
		var headers={};
		if ((start!==undefined)&&(end!==undefined)) {
			headers['range']=`bytes=${start}-${end-1}`;
		}
		$.ajax({
			url: url,
			type: "GET",
			dataType: "binary",
			processData: false,
			responseType: 'arraybuffer',
			headers:headers,
			error: function(jqXHR, textStatus, errorThrown) {
				if (callback) {
					callback('Error loading binary file part: '+textStatus+': '+errorThrown);
					callback=null;
				}
			},
			success: function(result) {
				if (callback) {
					callback(null,result);
					callback=null;
				}
			}
		});
	}
	else if (is_dat(url_or_dat_or_path)) {
		var dat=url_or_dat_or_path;
		dat=dat.slice(('dat://').length);
		var ind=dat.indexOf('/');
		if (ind<0) {
			callback('Problem with dat link: '+dat);
			return;
		}
		var dat_key=dat.slice(0,ind);
		var file_path=dat.slice(ind+1);
		load_binary_file_part_from_dat(dat_key,file_path,callback);
	}
	else {
		var path=url_or_dat_or_path;
		window.electron_resources.load_binary_file_part(path,start,end,callback);
	}
}

//var Dat=require('dat-js');
var concat=require('concat-stream');
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
	var dat_path=__dirname+'/does-not-exist'; // Note: we don't expect anything to get written here
	Dat(dat_path, {
		key:dat_key,
		sparse:true,
		temp:true
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

function load_binary_file_part_from_dat(dat_key,file_path,start,end,callback) {
	console.log('load_binary_file_part_from_dat',dat_key,file_path);
	var dat = Dat();
	dat.add(dat_key, function (repo) {
	  var readStream = repo.archive.createFileReadStream(file_path);
	  concat(readStream, function (data) {
	    console.log(data)
	    callback(null,data);
	  });
	});
	/*
	_load_dat(dat_key,function(err,dat) {
		console.log('test A',err,dat);
		if (err) {
			callback('Error loading dat: '+err);
			return;
		}
		console.log('creating read stream...');
		var stream = dat.archive.createReadStream(file_path, {
			start:start,
			end:end			
		});
		console.log(stream);
		var chunks = [];
		stream.on('data', function (chunk) {
			console.log('on_data');
		    chunks.push(chunk);
		});
		stream.on('end', function () {
			console.log('on_end');
		  	var buf=Buffer.concat(bufs);
		    if (callback) callback(null,buf.buffer);
		    callback=null;
		});
		stream.on('error',function(err) {
			console.log('on_error');
			if (callback) callback('Error: '+err);
			callback=null;
		});
		console.log('test');
	});
	*/
}


$.ajaxTransport("+binary", function(options, originalOptions, jqXHR){
    // check for conditions and support for blob / arraybuffer response type
    if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob)))))
    {
        return {
            // create new XMLHttpRequest
            send: function(headers, callback){
		// setup all variables
                var xhr = new XMLHttpRequest(),
		url = options.url,
		type = options.type,
		async = options.async || true,
		// blob or arraybuffer. Default is blob
		dataType = options.responseType || "blob",
		data = options.data || null,
		username = options.username || null,
		password = options.password || null;
					
                xhr.addEventListener('load', function(){
			var data = {};
			data[options.dataType] = xhr.response;
			// make callback and send data
			callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
                });
 
                xhr.open(type, url, async, username, password);
				
		// setup custom headers
		for (var i in headers ) {
			xhr.setRequestHeader(i, headers[i] );
		}
				
                xhr.responseType = dataType;
                xhr.send(data);
            },
            abort: function(){
                jqXHR.abort();
            }
        };
    }
});