var express = require('express');

var app = express();
app.set('port', (process.env.PORT || 5088));
app.use(express.static(__dirname+'/web'));

app.listen(app.get('port'), function() {
	console.info('ephys-viz web server is running on port:: '+app.get('port'), {port:app.get('port')});
});

