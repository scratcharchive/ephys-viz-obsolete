window.init_ephys_viz=function(PARAMS) {
	if (PARAMS.view=='timeseries') {
		require('./view_timeseries').view_timeseries(PARAMS);
	}
	else if (PARAMS.view=='templates') {
		require('./view_templates').view_templates(PARAMS);
	}
	else if (PARAMS.view=='sort_comparison') {
		require('./view_sort_comparison').view_sort_comparison(PARAMS);
	}
	else if (PARAMS.view=='cluster_metrics') {
		require('./view_cluster_metrics').view_cluster_metrics(PARAMS);
	}
	else if (PARAMS.view=='geometry') {
		require('./view_geometry').view_geometry(PARAMS);
	}
	else {
		throw Error('Unknown view: '+PARAMS.view);
	}
}

/*
require('./timeserieswidget.js');
require('./templateswidget.js');
require('./geomwidget.js');
require('./clustermetricswidget.js');
require('./sortcomparisonwidget.js');

require('./view_timeseries.js');
require('./view_templates.js');
require('./view_geometry.js');
require('./view_cluster_metrics.js');
require('./view_sort_comparison.js');

*/