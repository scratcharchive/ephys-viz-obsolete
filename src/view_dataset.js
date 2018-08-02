exports.view_dataset=view_dataset;

const EVDatasetWidget=require(__dirname+'/evdatasetwidget.js').EVDatasetWidget;

function view_dataset(PARAMS) {
	var dataset_directory=PARAMS.dataset||PARAMS.arg1;
	let firings=PARAMS.firings||'';
	start_app();

	function start_app() {
		var W=new EVDatasetWidget();
		W.setDatasetDirectory(dataset_directory);
		if (firings)
			W.setFirings(firings);

		W.setSize(400,400);
		$('#content').append(W.element());
		$(window).resize(update_size);
		update_size();
		function update_size() {
			//W.setSize($('#content').width(),$('#content').height());
			W.setSize($(window).width(),$(window).height());
		}
	}
}
