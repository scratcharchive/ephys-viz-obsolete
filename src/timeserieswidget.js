var d3 = require('d3');

function TimeseriesWidget() {
  var that=this;
  this.div=function() {return m_div;};
  this.setTimeseriesModel=function(X) {setTimeseriesModel(X);};
  this.setSampleRate=function(s) {m_samplerate=s; schedule_refresh();};
  this.setTimepointRange=function(range) {setTimepointRange(range);};
  this.currentTimepoint=function() {return m_current_timepoint;};
  this.setCurrentTimepoint=function(t) {m_current_timepoint=t; schedule_refresh();};
  this.setSize=function(W,H) {m_width=W; m_height=H; schedule_refresh();};
    
  var m_timeseries_model=null;
  var m_width=300;
  var m_height=300;
  var m_samplerate=20000;
  var m_amp_factor=1;
  var m_timepoint_range=[0,100];
  var m_max_timepoint_range=15000;
  var m_min_timepoint_range=100;
  var m_current_timepoint=40;
  var m_timeseries_stats=null; //{channel_means:[],channel_stdevs:[],overall_stdev:0};
  var m_drag_anchor=-1;
  var m_drag_anchor_timepoint_range;
  var m_dragging=false;
  var m_xscale=null;
  
  var top_panel_height=35;
  var m_div=$(`
  <div class="ml-vlayout">
    <div class="ml-vlayout-item" style="flex:0 0 ${top_panel_height}px">
      <button class="btn" id=amp_down><span class="octicon octicon-arrow-down"></span></button>
      <button class="btn" id=amp_up><span class="octicon octicon-arrow-up"></span></button>
      <button class="btn" id=time_zoom_in><span class="octicon octicon-plus"></span></button>
      <button class="btn" id=time_zoom_out><span class="octicon octicon-dash"></span></button>
    </div>
    <div class="ml-vlayout-item" style="flex:1">
      <svg id=holder></svg>
    </div>
  </div>
  `);
  m_div.find('#amp_down').attr('title','Scale amplitude down').click(amp_down);
  m_div.find('#amp_up').attr('title','Scale amplitude up').click(amp_up);
  m_div.find('#time_zoom_in').attr('title','Time zoom in [mousewheel up]').click(time_zoom_in);
  m_div.find('#time_zoom_out').attr('title','Time zoom out [mousewheel down]').click(time_zoom_out);
  
  m_div.bind('mousewheel', function(e){
    if(e.originalEvent.wheelDelta /120 > 0) {
      time_zoom_in(); //scrolling up
    }
    else{
      time_zoom_out(); //scrolling down
    }
  });

  //var svg = d3.select(holder.find('svg')[0]);
  var svg = d3.select(m_div.find('svg')[0]);
  svg.on("mousedown", function() {
    if (!m_xscale) return;
    window.event.preventDefault();
    var pt=d3.mouse(this);
    var t0=m_xscale.invert(pt[0])*m_samplerate;
    m_drag_anchor=pt[0];
    m_drag_anchor_timepoint_range=JSON.parse(JSON.stringify(m_timepoint_range));
    //on_click_timepoint(t0);
  });
  svg.on("mouseup", function(evt) {
    if (!m_xscale) return;
    window.event.preventDefault();
    var pt=d3.mouse(this);
    var t0=m_xscale.invert(pt[0])*m_samplerate;
    if (!m_dragging) {
      on_click_timepoint(t0);
    }
    m_drag_anchor=-1;
    m_dragging=false;
  });
  svg.on("mousemove", function() {
    if (!m_xscale) return;
    var pt=d3.mouse(this);
    var t0=m_xscale.invert(pt[0])*m_samplerate;
    if (m_drag_anchor>=0) {
      if (Math.abs(m_drag_anchor-pt[0])>5) {
        m_dragging=true;
        var drag_anchor_t0=m_xscale.invert(m_drag_anchor)*m_samplerate;
        var offset=Math.floor(drag_anchor_t0-t0);
        if (m_drag_anchor_timepoint_range[0]+offset<0) {
          offset=-m_drag_anchor_timepoint_range[0];
        }
        if (m_drag_anchor_timepoint_range[1]+offset>=m_timeseries_model.numTimepoints()) {
          offset=-m_drag_anchor_timepoint_range[1]+m_timeseries_model.numTimepoints()-1;
        }
        var t1=m_drag_anchor_timepoint_range[0]+offset;
        var t2=m_drag_anchor_timepoint_range[1]+offset;
        t1=Math.max(t1,0);
        t2=Math.min(t2,m_timeseries_model.numTimepoints()-1);
        that.setTimepointRange([t1,t2]);
      }  
    }
  });
  svg.on("mouseleave", function() {
    m_drag_anchor=-1;
  });
 
  var refresh_timestamp=0;
  var refresh_scheduled=false;
  function schedule_refresh() {
    if (refresh_scheduled) return;
    refresh_scheduled=true;
    var msec=100;
    var elapsed=(new Date())-refresh_timestamp;
    if (elapsed>100) msec=0;
    setTimeout(function() {
      refresh_scheduled=false;
      do_refresh();
      refresh_timestamp=new Date();
    },msec);
  }
  function do_refresh() {
    if (!m_timeseries_stats) {
      schedule_compute_timeseries_stats();
      return;
    }

    var timer=new Date();
    
    var holder=m_div.find('#holder');
    var TS=m_timeseries_model;
    
    var padding_left=50;
    var padding_right=20;
    var padding_top=20;
    var padding_bottom=50;
    var spacing=0; //between channels
    
    var width=m_width;
    var height=m_height-top_panel_height;
    var samplerate=m_samplerate;
    
    var M=TS.numChannels();
    holder.empty();
    
    var gg = d3.select(holder[0])
      .attr("width", width)
      .attr("height", height)
      .append("g");

    /*
    var gg = d3.select(holder[0])
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g");
      */
    
    /*
    gg.call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended));
    
    function dragstarted(a,b,c) {
      var pt=d3.mouse(svg.node());
      m_drag_anchor=pt[0];
      m_drag_anchor_timepoint_range=JSON.parse(JSON.stringify(m_timepoint_range));
      console.log ('dragstarted',m_drag_anchor);
    }
    function dragged(a,b,c) {
      var pt=d3.mouse(svg.node());
      var new_timepoint=pt[0];
      console.log ('dragged',m_drag_anchor,new_timepoint);
    }
    function dragended(a,b,c) {
      m_drag_anchor=-1;
      console.log ('dragended',a,b,c);
    }
    */
    
    var t1=m_timepoint_range[0];
    var t2=m_timepoint_range[1];
    var chunk=m_timeseries_model.getChunk({t1:t1,t2:t2+1});
    if (!chunk) {
      //unable to get chunk... perhaps it has not yet been loaded
      schedule_refresh();
      return;
    }
    
    var xdata=d3.range(t1,t2+1);
    for (var i=0; i<xdata.length; i++) {
      xdata[i]=xdata[i]/samplerate;
    }
    
    var channel_colors=mv_default_channel_colors();

    var xdomain=d3.extent(xdata);
    var xrange=[padding_left,width-padding_right];
    m_xscale = d3.scaleLinear().domain(xdomain).range(xrange);
    var x_axis=d3.axisBottom().scale(m_xscale).ticks(5);
    var X=gg.append("g") // Add the X Axis
      .attr("class", "x axis")
      .attr("transform",'translate('+(0)+', '+(height-padding_bottom)+')')
      .call(x_axis);

    if (m_current_timepoint>=0) {
      var yscale=d3.scaleLinear().domain([0,1]).range([padding_top,height-padding_bottom]);
      draw_current_timepoint(gg,m_xscale,yscale);
    }
    holder.find('.axis path, .axis line').css({fill:'none','shape-rendering':'crispEdges',stroke:'#BBB','stroke-width':1});
    holder.find('.axis text').css({fill:'#766','font-size':'12px'});
    
    var full_yrange=[padding_top,height-padding_bottom];

    for (var m=0; m<M; m++) {
      var color=channel_colors[m%channel_colors.length];
      var aa=full_yrange[0];
      var bb=full_yrange[1]-full_yrange[0];
      var hh=(bb-(M-1)*spacing)/M;
      var y0range=[aa+m*(hh+spacing),aa+m*(hh+spacing)+hh];
      var ymu=m_timeseries_stats.channel_means[m];
      //var ysig=m_timeseries_stats.channel_stdevs[m];
      var ysig=m_timeseries_stats.overall_stdev;
      var y0domain=[ymu-7*ysig/m_amp_factor,ymu+7*ysig/m_amp_factor];
      var y0scale = d3.scaleLinear().domain(y0domain).range(y0range);
      var y0_axis=d3.axisLeft().scale(y0scale).ticks(1);
      gg.append("g") // Add the Y Axis
        .attr("class", "y axis")
        .attr("transform",'translate('+(padding_left-5)+', '+(0)+')')
        .call(y0_axis);
      // text label for the y axis
      gg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - (padding_left))
      .attr("x",0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Ch. "+(m+1));  
      var ydata0=d3.range(t2-t1+1); //todo: use something like d3.zeros
      var data0=[];
      for (var i=0; i<t2-t1+1; i++) {
        if (t1+i<TS.numTimepoints()) {
          data0.push({x:xdata[i],y:chunk.value(m,t1+i-t1)});
        }
      }
      var line=d3.line()
        .x(function(d) {return m_xscale(d.x);})
        .y(function(d) {return y0scale(d.y);});
      var path=gg.append("path") // Add the line path from the data
        .attr("d", line(data0));
      $(path.node()).css({fill:"none",stroke:color,"stroke-width":1});
    }
  }
  function setTimepointRange(range) {
    var t1=range[0];
    var t2=range[1];
    if (t2-t1>m_max_timepoint_range) {
      return;
    }
    if (t2-t1<m_min_timepoint_range) {
      return;
    }
    m_timepoint_range=[t1,t2];
    schedule_refresh();
  }
  function draw_current_timepoint(gg,xscale,yscale) {
    var data=[{x:m_current_timepoint/m_samplerate,y:0},{x:m_current_timepoint/m_samplerate,y:1}];
    var line=d3.line()
        .x(function(d) {return xscale(d.x);})
        .y(function(d) {return yscale(d.y);});
      var path=gg.append("path")
        .attr("d", line(data));
      $(path.node()).css({fill:"none",stroke:'lightgreen',"stroke-width":2});
  }
  var compute_timeseries_stats_timestamp=0;
  var compute_timeseries_stats_scheduled=false;
  function schedule_compute_timeseries_stats() {
    if (compute_timeseries_stats_scheduled) return;
    compute_timeseries_stats_scheduled=true;
    var msec=100;
    var elapsed=(new Date())-compute_timeseries_stats_timestamp;
    if (elapsed>100) msec=0;
    setTimeout(function() {
      compute_timeseries_stats_scheduled=false;
      do_compute_timeseries_stats();
      compute_timeseries_stats_timestamp=new Date();
    },msec);
  }
  function do_compute_timeseries_stats() {
    var M=m_timeseries_model.numChannels();
    var N=m_timeseries_model.numTimepoints();
    m_timeseries_stats={};
    var S=m_timeseries_stats;
    S.channel_means=[];
    S.channel_stdevs=[];
    S.overall_stdev=0;
    for (var m=0; m<M; m++) {
      S.channel_means.push(0);
      S.channel_stdevs.push(0);
    }

    var chunk=m_timeseries_model.getChunk({t1:0,t2:Math.min(N-1,30000)});
    if (!chunk) {
      //perhaps has not been retrieved yet
      schedule_compute_timeseries_stats();
      return;
    }
    var count=0;
    var overall_count=0,overall_sum=0,overall_sumsqr=0;
    for (var n=0; n<chunk.N2(); n++) {
      count++;
      for (var m=0; m<chunk.N1(); m++) {
        var val=chunk.value(m,n);
        S.channel_means[m]+=val; //sum for now
        S.channel_stdevs[m]+=val*val; //sum of squares for now
        overall_sum+=val;
        overall_sumsqr+=val*val;
        overall_count++;
      }
    }

    /*
    var sampling_interval=Math.max(1,Math.ceil(N/1000));
    var count=0;
    var overall_count=0,overall_sum=0,overall_sumsqr=0;
    for (var n=0; n<N; n+=sampling_interval) {
      count++;
      for (var m=0; m<M; m++) {
        var val=m_timeseries_model.value(m,n);
        S.channel_means[m]+=val; //sum for now
        S.channel_stdevs[m]+=val*val; //sum of squares for now
        overall_sum+=val;
        overall_sumsqr+=val*val;
        overall_count++;
      }
    }
    */

    for (var m=0; m<M; m++) {
      var a=S.channel_means[m];
      var b=S.channel_stdevs[m];
      S.channel_means[m]=a/count;
      S.channel_stdevs[m]=Math.sqrt(b/count-a*a/(count*count));
    }
    S.overall_stdev=Math.sqrt(overall_sumsqr/overall_count-overall_sum*overall_sum/(overall_count*overall_count));
    schedule_refresh()
  }
  function setTimeseriesModel(X) {
    m_timeseries_model=X;
    console.log ('Computing timeseries stats...');
    schedule_refresh();
  }
  function on_click_timepoint(t0) {
    that.setCurrentTimepoint(Math.floor(t0));
  }
  function amp_down() {
    m_amp_factor/=1.2;
    schedule_refresh();
  }
  function amp_up() {
    m_amp_factor*=1.2;
    schedule_refresh();
  }
  function time_zoom_in() {
    time_zoom(1.2);
  }
  function time_zoom_out() {
    time_zoom(1/1.2);
  }
  function time_zoom(factor) {
    var tmid=(m_timepoint_range[0]+m_timepoint_range[1])/2;
    if (m_current_timepoint) tmid=m_current_timepoint;
    var t1=Math.floor(tmid+(m_timepoint_range[0]-tmid)/factor);
    var t2=Math.ceil(tmid+(m_timepoint_range[1]-tmid)/factor);
    t1=Math.max(t1,0);
    t2=Math.min(t2,m_timeseries_model.numTimepoints()-1);
    that.setTimepointRange([t1,t2]);
  }
}

function mv_default_channel_colors() {
    var ret=[];
    ret.push('rgb(40,40,40)');
    ret.push('rgb(64,32,32)');
    ret.push('rgb(32,64,32)');
    ret.push('rgb(32,32,112)');
    return ret;
}

function test(opts) {
  opts.data=
    {
        "array": {
            "prv": {
                "original_checksum": "f917f9dfa1864aa9ebb72987d5f0a2f811d5e1a1",
                "original_fcs": "head1000-8e16d93118ad0809b3c99740e0ad5176c8b0c7a8",
                "original_path": "tet_K=30_1.mda",
                "original_size": 257589652,
                "prv_version": "0.11"
            }
        },
        "options": {}
    };
  require('standard_views').show_timeseries(opts);
}