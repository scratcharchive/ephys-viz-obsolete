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
	console.log(path,start,end);
	require('fs').open(path, 'r', function(err, fd) {
		if (err) {
		    callback(err.message);
		    return;
		}
		var buffer = new Buffer(end-start);
		console.log('test');
		require('fs').read(fd, buffer, 0, end-start, start, function(err, num) {
			console.log('test2');
			if (err) {
				callback(err.message);
				return;
			}
			callback(null,buffer.buffer);
		});
	});
}

function TimeseriesModel_Disk(path) {
	var that=this;

	this.getChunk=function(opts) {return getChunk(opts);};
	this.numChannels=function() {return numChannels();};
	this.numTimepoints=function() {return numTimepoints();};

	var m_header=null;
	var m_array=null;

	var m_chunk_size=10000;
	var m_loaded_chunks={};

	function load_chunk(i) {
		if (m_loaded_chunks[i]) {
			return m_loaded_chunks[i];
		}
		m_loaded_chunks[i]={
			status:'loading'
		};
		do_load_chunk(i,function(chunk) {
			console.log(chunk.N1(),chunk.N2());
			m_loaded_chunks[i].status='loaded';
			m_loaded_chunks[i].chunk=chunk;
		});
		return m_loaded_chunks[i];
	}

	function do_load_chunk(i,callback) {
		console.log('do_load_chunk',i);
		var M=that.numChannels();
		var i1=M*i*m_chunk_size;
		var i2=M*(i+1)*m_chunk_size;
		if (i2>M*that.numTimepoints())
			i2=M*that.numTimepoints();
		var pos1=(m_header.header_size+i1)*m_header.num_bytes_per_entry;
		var pos2=(m_header.header_size+i2)*m_header.num_bytes_per_entry;
		console.log(path,pos1,pos2);
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
			console.log(data);
			var chunk=new Mda();
			chunk.allocate(M,(i2-i1)/M);
			chunk.setData(data);
			callback(chunk);
		});
	}

	function getChunk(opts) {
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
	function load_header() {
		m_header={};
		var buf=partialFSReadSync(path,0,64);
		var X=new Int32Array(buf);
		m_header.num_bytes_per_entry=X[1];
		m_header.num_dims=X[2];
		m_header.dims=[];
		if ((m_header.num_dims<2)||(m_header.num_dims>5)) {
			console.error('Invalid number of dimensions **: '+m_header.num_dims);
			return false;
		} 
		for (var i=0; i<m_header.num_dims; i++) {
			m_header.dims.push(X[3+i]);
		}
		m_header.dtype=get_dtype_string(X[0]);
		m_header.header_size=(m_header.num_dims+3)*4;
		function get_dtype_string(num) {
			if (num==-2) return 'byte';
			if (num==-3) return 'float32';
			if (num==-4) return 'int16';
			if (num==-5) return 'int32';
			if (num==-6) return 'uint16';
			if (num==-7) return 'float64';
			return '';
		}
	}
	function numChannels() {
		if (!m_header) load_header();
		return m_header.dims[0];
	}
	function numTimepoints() {
		if (!m_header) load_header();
		return m_header.dims[1];
	}
}

//var fname='/tmp/mountainlab-tmp/output_813e1ace5ed51aab7ec230c65e6385abcd23840c_timeseries_out.mda';
var fname=params.fname;
//var buf=require('fs').readFileSync(fname).buffer;
//var X=new Mda();
//X.setFromArrayBuffer(buf);
//var TSM=new TimeseriesModel_Memory(X);
var TSM=new TimeseriesModel_Disk(fname)
var W=new TimeseriesWidget();
W.setSampleRate(30000);
W.setTimeseriesModel(TSM);
W.setSize(400,400);
W.setTimepointRange([0,1000]);
$('#content').append(W.div());
$(window).resize(update_size);
update_size();
function update_size() {
	console.log('update_size');
	W.setSize($('#content').width(),$('#content').height());
}
