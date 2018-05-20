var Mda=require('./mda.js').Mda;
var TimeseriesWidget=require('./timeserieswidget.js').TimeseriesWidget;

var TimeseriesModel=require('./timeseriesmodel.js').TimeseriesModel;
var FiringsModel=require('./firingsmodel.js').FiringsModel;

// the following is not needed once we allow passing path to firings model:
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


var TSM=null;
var FM=null;

window.open_view_timeseries=open_view_timeseries;
function open_view_timeseries() {
	var timeseries=PARAMS.timeseries;
	var firings=PARAMS.firings;
	load_timeseries_model(timeseries,function() {
		load_firings_model(firings,function() {
			start_app();
		});
	});

	function load_timeseries_model(timeseries,callback) {
		TSM=new TimeseriesModel(timeseries);
		TSM.initialize(function(err) {
			if (err) {
				throw new Error(`Error initializing timeseries model for ${timeseries}: ${err}`);
				return;
			}
			callback();
		});
	}

	function load_firings_model(firings,callback) {
		if (firings) {
			load_binary_file_part(firings,undefined,undefined,function(err,buf) {
				if (err) {
					throw new Error(`Error loading firings file: ${firings}`);
					return;
				}
				var X=new Mda();
				X.setFromArrayBuffer(buf);
				FM=new FiringsModel(X);
				callback();
			});
		}
		else {
			callback();
		}
	}

	function start_app() {
		var W=new TimeseriesWidget();
		W.setTimeseriesModel(TSM);

		W.setSampleRate(Number(PARAMS.samplerate)||1);

		W.setSize(400,400);
		W.setViewRange([0,1000]);
		$('#content').append(W.div());
		$(window).resize(update_size);
		update_size();
		function update_size() {
			//W.setSize($('#content').width(),$('#content').height());
			W.setSize($(window).width(),$(window).height());
		}
		if (FM) {
			W.setFiringsModel(FM);
		}
	}


}
