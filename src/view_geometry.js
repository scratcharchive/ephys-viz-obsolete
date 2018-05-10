var Mda=require('./mda.js').Mda;
var GeomWidget=require('./geomwidget.js').GeomWidget;
var load_text_file=require('./load_text_file.js').load_text_file;

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

var GEOM=null;

window.open_view_geometry=open_view_geometry;
function open_view_geometry() {
	var geometry=PARAMS.geometry;
	load_geometry(geometry,function() {
		start_app();
	});

	function load_geometry(geometry,callback) {
		load_text_file(geometry,function(err,txt) {
			if (err) {
				throw new Error(err);
				return;
			}
			GEOM=txt;
			callback();
		});
		
	}

	function start_app() {
		var W=new GeomWidget();
		W.setGeomText(GEOM);

		$('#content').append(W.div());
		$(window).resize(update_size);
		update_size();
		function update_size() {
			//W.setSize($('#content').width(),$('#content').height());
			var W=Math.minimum(400,$(window).width());
			var H=Math.minimum(400,$(window).height());
			W.setSize(W,H);
		}
	}
}