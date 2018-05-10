exports.load_text_file=load_text_file;

function is_url(fname_or_url) {
	return ((fname_or_url.indexOf('http:')==0)||(fname_or_url.indexOf('https:')==0));
}

function load_text_file(url_or_path,callback) {
	if (!is_url(url_or_path)) {
		window.electron_resources.load_text_file(url_or_path,callback);
	}	
	else {
		var url=url_or_path;
		$.get(url,function(text) {
			callback(null,text);
		});
	}
}

