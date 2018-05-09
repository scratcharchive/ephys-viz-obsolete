exports.load_binary_file_part=load_binary_file_part;

function is_url(fname_or_url) {
	return ((fname_or_url.indexOf('http:')==0)||(fname_or_url.indexOf('https:')==0));
}

function load_binary_file_part(url_or_path,start,end,callback) {
	if (!is_url(url_or_path)) {
		window.electron_resources.load_binary_file_part(url_or_path,start,end,callback);
	}	
	else {
		var url=url_or_path;
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