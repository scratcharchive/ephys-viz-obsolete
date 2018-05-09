exports.TimeseriesWidget=TimeseriesWidget;

function EVTimeDisplay(O) {
  // O is the subclass
  O=O||this;
  O.div=function() {return m_div;};
  O.setSampleRate=function(s) {m_samplerate=s; schedule_refresh();};
  O.setTimepointRange=function(range) {setTimepointRange(range);};
  O.currentTimepoint=function() {return m_current_timepoint;};
  O.setCurrentTimepoint=function(t) {m_current_timepoint=t; schedule_refresh();};
  O.setSize=function(W,H) {m_width=W; m_height=H; schedule_refresh();};
  O.samplerate=function() {return m_samplerate;};
  O.timepointRange=function() {return JSON.parse(JSON.stringify(m_timepoint_range));};
  //O.setContext=function(context) {setContext(context);};
  O.setContext=setContext;

  // to be used by subclasses
  O._setNumTimepoints=function(num) {m_num_timepoints=num;};
  O._onRefresh=function(handler) {m_refresh_handlers.push(handler);};
  O._scheduleRefresh=function() {schedule_refresh();};


  function setContext(context) {
    m_context=context;
    m_context.onCurrentTemplateChanged(O._scheduleRefresh);
  }
  var m_context=null;

  var m_width=300;
  var m_height=300;
  var m_samplerate=20000;
  var m_timepoint_range=[0,100];
  var m_max_timepoint_range=15000;
  var m_min_timepoint_range=100;
  var m_current_timepoint=40;
  var m_drag_anchor=-1;
  var m_drag_anchor_timepoint_range;
  var m_dragging=false;
  var m_xscale=null;
  var m_num_timepoints=0;
  var m_refresh_handlers=[];
  
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
        if (m_drag_anchor_timepoint_range[1]+offset>=m_num_timepoints) {
          offset=-m_drag_anchor_timepoint_range[1]+m_num_timepoints-1;
        }
        var t1=m_drag_anchor_timepoint_range[0]+offset;
        var t2=m_drag_anchor_timepoint_range[1]+offset;
        t1=Math.max(t1,0);
        t2=Math.min(t2,m_num_timepoints-1);
        O.setTimepointRange([t1,t2]);
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

    var timer=new Date();
    
    var holder=m_div.find('#holder');
    
    var padding_left=70;
    var padding_right=20;
    var padding_top=40;
    var padding_bottom=60;
    
    var width=m_width;
    var height=m_height-top_panel_height;
    var samplerate=m_samplerate;
    
    holder.empty();
    
    var gg = d3.select(holder[0])
      .attr("width", width)
      .attr("height", height)
      .append("g");
    
    var t1=m_timepoint_range[0];
    var t2=m_timepoint_range[1];

    var xdomain=[t1/samplerate,t2/samplerate];
    var xrange=[padding_left,width-padding_right];
    m_xscale = d3.scaleLinear().domain(xdomain).range(xrange);
    var x_axis=d3.axisBottom().scale(m_xscale).ticks(5);
    var X=gg.append("g") // Add the X Axis
      .attr("class", "x axis")
      .attr("transform",'translate('+(0)+', '+(height-padding_bottom)+')')
      .call(x_axis);

    // text label for the x axis
    gg.append('text')
        .attr("transform",'translate('+(xrange[0]+xrange[1])/2+', '+(height-padding_bottom+50)+')')
        .style("text-anchor", "middle")
        .text("Time (sec)");

    if (m_current_timepoint>=0) {
      var yscale=d3.scaleLinear().domain([0,1]).range([padding_top,height-padding_bottom]);
      draw_current_timepoint(gg,m_xscale,yscale);
    }
    holder.find('.axis path, .axis line').css({fill:'none','shape-rendering':'crispEdges',stroke:'#BBB','stroke-width':1});
    holder.find('.axis text').css({fill:'#766','font-size':'12px'});

    for (var i in m_refresh_handlers) {
      var info={
        xscale:m_xscale,
        padding_top:padding_top,
        padding_bottom:padding_bottom,
        padding_left:padding_left,
        padding_right:padding_right,
        width:width,
        height:height
      };
      m_refresh_handlers[i](holder,gg,info);
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
  function on_click_timepoint(t0) {
    O.setCurrentTimepoint(Math.floor(t0));
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
    t2=Math.min(t2,m_num_timepoints-1);
    O.setTimepointRange([t1,t2]);
  } 
}

function TimeseriesWidget() {
  EVTimeDisplay(this);
  var that=this;
  this.setTimeseriesModel=function(X) {setTimeseriesModel(X);};
  this.setFiringsModel=function(X) {setFiringsModel(X);};
    
  var m_timeseries_model=null;
  var m_firings_model=null;
  var m_amp_factor=1;
  var m_timeseries_stats=null; //{channel_means:[],channel_stdevs:[],overall_stdev:0};
  var m_drag_anchor=-1;
  var m_drag_anchor_timepoint_range;
  var m_dragging=false;
  var m_xscale=null;

  //todo: move these html elements to this subclass
  that.div().find('#amp_down').attr('title','Scale amplitude down').click(amp_down);
  that.div().find('#amp_up').attr('title','Scale amplitude up').click(amp_up);
 
  that._onRefresh(refresh_view);


  function refresh_view(holder,gg,info) {
    if (!m_timeseries_stats) {
      schedule_compute_timeseries_stats();
      return;
    }

    var spacing=0; //between channels

    var timer=new Date();
    
    var TS=m_timeseries_model;
    
    var samplerate=that.samplerate();
    
    var M=TS.numChannels();
    
    var gg = d3.select(holder[0])
      .append("g");

    var timepoint_range=that.timepointRange();
    
    var t1=timepoint_range[0];
    var t2=timepoint_range[1];
    var chunk=m_timeseries_model.getChunk({t1:t1,t2:t2+1});
    if (!chunk) {
      //unable to get chunk... perhaps it has not yet been loaded
      that._scheduleRefresh();
      return;
    }

    var firings=null;
    if (m_firings_model) {
      firings=m_firings_model.getChunk({t1:t1,t2:t2+1});
      if (!firings) {
        //unable to get firings chunk... perhaps it has not yet been loaded
        that._scheduleRefresh();
        return;
      }
    }
    
    var xdata=d3.range(t1,t2+1);
    for (var i=0; i<xdata.length; i++) {
      xdata[i]=xdata[i]/samplerate;
    }
    
    var channel_colors=mv_default_channel_colors();
    
    var full_yrange=[info.padding_top,info.height-info.padding_bottom];

    if (firings) {
      var line=d3.line()
        .x(function(d) {return info.xscale(d.x);})
        .y(function(d) {return d.y;});
      for (var i=0; i<firings.times.length; i++) {
        var data0=[];
        data0.push({x:firings.times[i]/samplerate,y:info.padding_top});
        data0.push({x:firings.times[i]/samplerate,y:info.height-info.padding_bottom});
        var path=gg.append("path") // Add the line path from the data
          .attr("d", line(data0));
        $(path.node()).css({fill:"none",stroke:'pink',"stroke-width":1});

        gg.append("text")
          .attr("transform",'translate('+(info.xscale(firings.times[i]/samplerate))+', '+(info.padding_top-10)+')')
          .style("text-anchor", "middle")
          .style('font-size','12px')
          .style('fill','pink')
          .text(firings.labels[i]);
      }
    }

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
      var y0_axis=d3.axisLeft().scale(y0scale).ticks(0);
      
      gg.append("g") // Add the Y Axis
        .attr("class", "y axis")
        .attr("transform",'translate('+(info.padding_left-5)+', '+(0)+')')
        .call(y0_axis);
      
      // text label for the y axis
      gg.append('text')
        .attr("transform",'translate('+(info.padding_left-15)+', '+(y0range[0]+y0range[1])/2+')')
        .style("text-anchor", "end")
        .text("Ch. "+(m+1));

      var ydata0=d3.range(t2-t1+1); //todo: use something like d3.zeros
      var data0=[];
      for (var i=0; i<t2-t1+1; i++) {
        if (t1+i<TS.numTimepoints()) {
          data0.push({x:xdata[i],y:chunk.value(m,t1+i-t1)});
        }
      }
      var line=d3.line()
        .x(function(d) {return info.xscale(d.x);})
        .y(function(d) {return y0scale(d.y);});
      var path=gg.append("path") // Add the line path from the data
        .attr("d", line(data0));
      $(path.node()).css({fill:"none",stroke:color,"stroke-width":1});
    }
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
    that._scheduleRefresh();
  }
  function amp_down() {
    m_amp_factor/=1.2;
    that._scheduleRefresh();
  }
  function amp_up() {
    m_amp_factor*=1.2;
    that._scheduleRefresh();
  }
  function setTimeseriesModel(X) {
    m_timeseries_model=X;
    that._setNumTimepoints(X.numTimepoints());
    that._scheduleRefresh();
  }
  function setFiringsModel(X) {
    m_firings_model=X;
    that._scheduleRefresh();
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
