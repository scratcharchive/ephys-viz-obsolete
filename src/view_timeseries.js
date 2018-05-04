var remote = require('electron').remote;
var params = remote.getGlobal('sharedObject').params;

function TimeseriesModel_Memory(X) {
	this.getChunk=function(opts) {return getChunk(opts);};
	this.numChannels=function() {return X.N1();};
	this.numTimepoints=function() {return X.N2();};

	function getChunk(opts) {
		return X.subArray(0,opts.t1,X.N1(),opts.t2-opts.t1+1);
	}
}

function partialFSReadSync(path, start, end) {
  if (start < 0 || end < 0 || end < start || end - start > 0x3fffffff)
    throw new Error('bad start, end');
  if (end - start === 0)
    return new Buffer(0);

  var buf = new Buffer(end - start);
  var fd = require('fs').openSync(path, 'r');
  require('fs').readSync(fd, buf, 0, end - start, start);
  require('fs').closeSync(fd);
  return buf.buffer;
}

function read_binary_file_part(path,start,end,callback) {
	if (is_url(path)) {
		var opts = {
		    method: 'GET',
		    url: path,
		    encoding: null, // See https://stackoverflow.com/questions/14855015/getting-binary-content-in-node-js-using-request
		    headers:{
		    	"range":`bytes=${start}-${end-1}`
		    }
		};
		require('request')(opts, function(error, response, body) {
		    if (error) {
		    	callback(error.message);
		    	return;
		    }

		    // The following is sadly necessary because the body is returned
		    // with an underlying buffer that holds 32-bit integers. Can you believe it??
		    // TODO: fix this by using utf8 and charcodes or something
		    var AA=new Uint8Array(body.length);
		    for (var jj=0; jj<body.length; jj++) {
		    	AA[jj]=body[jj];
		    }

		    callback(null,AA.buffer);
		});
	}
	else {
		require('fs').open(path, 'r', function(err, fd) {
			if (err) {
			    callback(err.message);
			    return;
			}
			var buffer = new Buffer(end-start);
			require('fs').read(fd, buffer, 0, end-start, start, function(err, num) {
				if (err) {
					callback(err.message);
					return;
				}
				callback(null,buffer.buffer);
			});
		});
	}
}

function TimeseriesModel_DiskOrUrl(path) {
	var that=this;

	this.initialize=function(callback) {initialize(callback);};
	this.getChunk=function(opts) {return getChunk(opts);};
	this.numChannels=function() {return numChannels();};
	this.numTimepoints=function() {return numTimepoints();};

	var m_header=null;
	var m_array=null;

	var m_chunk_size=10000;
	var m_loaded_chunks={};

	function load_chunk(i) {
		if (!m_header) {
			throw new Error('Cannot use TimeseriesModel_Memory before it has been initialized');
			return;
		}
		if (m_loaded_chunks[i]) {
			return m_loaded_chunks[i];
		}
		m_loaded_chunks[i]={
			status:'loading'
		};
		do_load_chunk(i,function(chunk) {
			m_loaded_chunks[i].status='loaded';
			m_loaded_chunks[i].chunk=chunk;
		});
		return m_loaded_chunks[i];
	}

	function do_load_chunk(i,callback) {
		var M=that.numChannels();
		var i1=M*i*m_chunk_size;
		var i2=M*(i+1)*m_chunk_size;
		if (i2>M*that.numTimepoints())
			i2=M*that.numTimepoints();
		var pos1=m_header.header_size+i1*m_header.num_bytes_per_entry;
		var pos2=m_header.header_size+i2*m_header.num_bytes_per_entry;
		read_binary_file_part(path,pos1,pos2,function(err,buf) {
			if (err) {
				console.error(`Error reading part of file ${path}: `+err);
				return;
			}
			var dtype=m_header.dtype;
			var data=null;
			if (dtype=='float32') {
				data=new Float32Array(buf);
			}
			else if (dtype=='float64') {
				data=new Float64Array(buf);
			}
			else if (dtype=='int16') {
				data=new Int16Array(buf);
			}
			else {
				console.error('Unsupported dtype: '+dtype);
				return false;
			}
			var chunk=new Mda();
			chunk.allocate(M,(i2-i1)/M);
			chunk.setData(data);
			callback(chunk);
		});
	}

	function getChunk(opts) {
		if (!m_header) {
			throw new Error('Cannot use TimeseriesModel_Memory before it has been initialized');
			return;
		}
		var i1=Math.floor(opts.t1/m_chunk_size);
		var i2=Math.floor(opts.t2/m_chunk_size);
		var chunks={};
		for (var ii=i1; ii<=i2; ii++) {
			chunks[ii]=load_chunk(ii);
			if (chunks[ii].status!='loaded') {
				return null;
			}
		}
		var M=that.numChannels();
		var ret=new Mda();
		ret.allocate(M,opts.t2-opts.t1);
		for (var t=opts.t1; t<opts.t2; t++) {
			var i=Math.floor(t/m_chunk_size);
			var chunk_i=chunks[i].chunk;
			var jj=t-(i*m_chunk_size);
			for (var m=0; m<M; m++) {
				var val=chunk_i.value(m,jj);
				ret.setValue(val,m,t-opts.t1);
			}
		}
		return ret;
	}
	function numChannels() {
		if (!m_header) {
			throw new Error('Cannot use TimeseriesModel_Memory before it has been initialized');
			return;
		}
		return m_header.dims[0];
	}
	function numTimepoints() {
		if (!m_header) {
			throw new Error('Cannot use TimeseriesModel_Memory before it has been initialized');
			return;
		}
		return m_header.dims[1];
	}
	function initialize(callback) {
		m_header=null;
		read_binary_file_part(path,0,64,function(err,buf) {
			if (err) {
				callback(err);
				return;
			}
			m_header={};
			var X=new Int32Array(buf);
			m_header.num_bytes_per_entry=X[1];
			m_header.num_dims=X[2];
			m_header.dims=[];
			if ((m_header.num_dims<2)||(m_header.num_dims>5)) {
				callback('Invalid number of dimensions **: '+m_header.num_dims);
				return;
			} 
			for (var i=0; i<m_header.num_dims; i++) {
				m_header.dims.push(X[3+i]);
			}
			m_header.dtype=get_dtype_string(X[0]);
			m_header.header_size=(m_header.num_dims+3)*4;
			callback(null);

			function get_dtype_string(num) {
				if (num==-2) return 'byte';
				if (num==-3) return 'float32';
				if (num==-4) return 'int16';
				if (num==-5) return 'int32';
				if (num==-6) return 'uint16';
				if (num==-7) return 'float64';
				return '';
			}
		});
	}
}

function FiringsModel_Memory(X) {
	this.getChunk=function(opts) {return getChunk(opts);};
	this.numEvents=function() {return m_all_times.length;};

	var m_all_times=[];
	var m_all_labels=[];

	for (var i=0; i<X.N2(); i++) {
		var t0=X.value(1,i);
		var k0=X.value(2,i);
		m_all_times.push(t0);
		m_all_labels.push(k0);
	}
	// TODO: sort by time for better efficiency
	X=0; //free memory (I think)

	function getChunk(opts) {
		var ret={
			times:[],
			labels:[]
		}
		// TODO: sort for better efficiency
		for (var i=0; i<m_all_times.length; i++) {
			var t0=m_all_times[i];
			if ((opts.t1<=t0)&&(t0<opts.t2)) {
				ret.times.push(t0);
				ret.labels.push(m_all_labels[i]);
			}
		}
		return ret;
	}
}


//var fname='/tmp/mountainlab-tmp/output_813e1ace5ed51aab7ec230c65e6385abcd23840c_timeseries_out.mda';
var fname=params.fname;
//var buf=require('fs').readFileSync(fname).buffer;
//var X=new Mda();
//X.setFromArrayBuffer(buf);
//var TSM=new TimeseriesModel_Memory(X);
var TSM;
TSM=new TimeseriesModel_DiskOrUrl(fname);
TSM.initialize(function(err) {
	if (err) {
		throw new Error(`Error initializing timeseries model for ${fname}: ${err}`);
		return;
	}
	var W=new TimeseriesWidget();
	W.setTimeseriesModel(TSM);

	W.setSampleRate(Number(params.samplerate)||1);

	if (params.firings) {
		var buf=require('fs').readFileSync(params.firings).buffer;
		var X=new Mda();
		X.setFromArrayBuffer(buf);
		var FM=new FiringsModel_Memory(X);
		W.setFiringsModel(FM);
	}

	W.setSize(400,400);
	W.setTimepointRange([0,1000]);
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