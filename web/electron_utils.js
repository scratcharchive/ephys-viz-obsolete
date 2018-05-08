if (using_electron()) {
	/*
	var remote = require('electron').remote;
	window.RESOURCES={};
	//window.RESOURCES.d3=require('d3');
	window.RESOURCES.params=remote.getGlobal('sharedObject').params;
	window.RESOURCES.load_binary_file_part=electron__load_binary_file_part;
	*/

	// It is annoying that we need to do this, but apparently necessary
	window.$ = window.jQuery = require('jquery');
}

function using_electron() {
	var userAgent = navigator.userAgent.toLowerCase();
	if (userAgent.indexOf(' electron/') > -1) {
	   return true;
	}
	return false;
}