var Mda=require('./mda.js').Mda;
var TemplatesWidget=TemplatesWidget=require('./templateswidget.js').TemplatesWidget;

var load_binary_file_part=require('./load_binary_file_part.js').load_binary_file_part;

function parse_url_params() {
	var match;
	var pl     = /\+/g;  // Regex for replacing addition symbol with a space
	var search = /([^&=]+)=?([^&]*)/g;
	var decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };
	var query  = window.location.search.substring(1);
	var url_params = {};
	while (match = search.exec(query))
		url_params[decode(match[1])] = decode(match[2]);
	return url_params;
}
var PARAMS=parse_url_params();
console.log(PARAMS);

var templates=null;

window.open_view_templates=open_view_templates;
function open_view_templates() {
	console.log('open_view_templates');
	var templates_path=PARAMS.templates;
	console.log(templates_path);
	load_templates(templates_path,function() {
		start_app();
	});

	function load_templates(templates_path,callback) {
		console.log(templates_path);
		load_binary_file_part(templates_path,undefined,undefined,function(err,buf) {
			console.log(buf);
			if (err) {
				throw new Error(`Error loading templates file: ${templates_path}`);
				return;
			}
			templates=new Mda();
			templates.setFromArrayBuffer(buf);
			callback();
		});
	}

	function start_app() {
		var W=new TemplatesWidget();
		W.setTemplates(templates);

		W.setSize(400,400);
		W.setViewRange([-1,-1]);
		$('#content').append(W.div());
		$(window).resize(update_size);
		update_size();
		function update_size() {
			//W.setSize($('#content').width(),$('#content').height());
			W.setSize($(window).width(),$(window).height());
		}
	}
}





















/*

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

*/