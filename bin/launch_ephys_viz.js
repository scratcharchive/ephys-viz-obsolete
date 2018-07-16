exports.launch=launch;

function launch(args_in) {
	const electron=require('electron');
	 
	let args=[`${__dirname}/../electron/openpage.js`,'index.html'];
	args=args.concat(args_in);

	require('child_process').spawn(electron,args,{
		stdio: ['pipe', process.stdout, process.stderr]
	});
}