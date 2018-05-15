var ClusterMetricsWidget=require('./clustermetricswidget.js').ClusterMetricsWidget;
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

var METRICS=null;

window.open_view_cluster_metrics=open_view_cluster_metrics;
function open_view_cluster_metrics() {
	var metrics=PARAMS.metrics;
	load_metrics(metrics,function() {
		start_app();
	});

	function load_metrics(metrics,callback) {
		load_text_file(metrics,function(err,txt) {
			if (err) {
				throw new Error(err);
				return;
			}
			METRICS=JSON.parse(txt);
			callback();
		});
		
	}

	function start_app() {
		var W=new ClusterMetricsWidget();
		W.setObject(METRICS);

		$('#content').append(W.div());
		$(window).resize(update_size);
		update_size();
		function update_size() {
			//W.setSize($('#content').width(),$('#content').height());
			//var W=Math.min(600,$(window).width());
			//var H=Math.min(600,$(window).height());
			//W.setSize(W,H);
		}
	}
}
