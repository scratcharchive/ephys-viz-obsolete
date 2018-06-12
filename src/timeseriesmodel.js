exports.TimeseriesModel=TimeseriesModel;

var Mda=require('./mda.js').Mda;
var load_binary_file_part=require('./load_binary_file_part.js').load_binary_file_part;

function TimeseriesModel(path_url_or_mda,params) {
	var that=this;

	if (typeof(path_url_or_mda)!='string') {
		//in memory
		var X=path_url_or_mda;
		this.initialize=function(callback) {callback(null);};
		this.getChunk=function(opts) {return getChunkFromX(opts);};
		this.numChannels=function() {return X.N1();};
		this.numTimepoints=function() {return X.N2();};

		function getChunkFromX(opts) {
			return X.subArray(0,opts.t1,X.N1(),opts.t2-opts.t1+1);
		}
		return;
	}

	var path_or_url=path_url_or_mda;

	this.initialize=function(callback) {initialize(callback);};
	this.getChunk=function(opts) {return getChunk(opts);};
	this.numChannels=function() {return numChannels();};
	this.numTimepoints=function() {return numTimepoints();};

	var m_header=null;

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
		load_binary_file_part(path_or_url,pos1,pos2,function(err,buf) {
			if (err) {
				console.error(`Error reading part of file ${path_or_url}: `+err);
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

		if (params.num_channels) {
			var nc=Number(params.num_channels);
			m_header={};
			m_header.num_bytes_per_entry=2;
			m_header.num_dims=2;
			m_header.dims=[nc,1000];
			m_header.dtype='int16';
			m_header.header_size=0;
			callback(null);
			return;
		}

		m_header=null;
		load_binary_file_part(path_or_url,0,64,function(err,buf) {
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
