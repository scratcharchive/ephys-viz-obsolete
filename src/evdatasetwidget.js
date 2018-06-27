exports.EVDatasetWidget = EVDatasetWidget;

const TimeseriesModel = require(__dirname + '/timeseriesmodel.js').TimeseriesModel;
const KBClient = require('kbclient').v1;

const GeomWidget = require(__dirname + '/geomwidget.js').GeomWidget;
const TimeseriesWidget = require(__dirname + '/timeserieswidget.js').TimeseriesWidget;

const EventEmitter = require('events');

class MyEmitter extends EventEmitter {};

function EVDatasetWidget() {
  var that = this;

  this.element = function() {
    return m_element;
  };
  this.setDatasetDirectory = function(dataset_directory) {
    if (m_dataset_directory == dataset_directory) return;
    m_dataset_directory = dataset_directory;
    m_dataset.setDirectory(m_dataset_directory);
    m_dataset.initialize();
  };
  this.setSize = function(W, H) {
    m_width = W;
    m_height = H;
  };

  let m_element = $(`
        <div class="EVDatasetWidget ml-hlayout">
        <div class="ml-hlayout-item" style="flex:0 0 300px; background-color:lightgray">
            <span id=left_panel>
            </span>
        </div>
        <div class="ml-hlayout-item" style="flex:1">
            <span id=view_holder></span>
        </div>
        </div>
    `);
  let m_dataset_directory = '';
  let m_width = 0;
  let m_height = 0;
  let m_params = {};
  let m_dataset = new EVDataset();

  let view_context = {
    dataset: m_dataset
  };

  let m_views = [];
  m_views.push(new _SummaryView(view_context));
  m_views.push(new _GeometryView(view_context));
  m_views.push(new _TimeseriesView(view_context));

  let m_left_panel = new LeftPanel(m_views);
  m_left_panel.onOpenView(open_view);
  m_element.find('#left_panel').append(m_left_panel.element());

  function initialize() {
    m_dataset.initialize();
  }

  function setSize(W, H) {
    m_width = W;
    m_height = H;
  }

  function open_view(V) {
    for (var i in m_views) {
      let V0 = m_views[i];
      if (V0._initialized)
        V0.element().detach();
    }
    if (!V._initialized) {
      V.initialize();
      V._initialized = true;
    }
    m_element.find('#view_holder').empty();
    m_element.find('#view_holder').append(V.element());
  }
}

function LeftPanel(views) {
  this.element = function() {
    return m_element;
  };
  let m_emitter = new MyEmitter();
  this.onOpenView = function(handler) {
    m_emitter.on('open_view', handler);
  };

  let m_element = $(`
        <div class="ml-vlayout LeftPanel">
            <ul id=view_list>
            <ul>
        </div>
        `);

  var ul = m_element.find('#view_list');
  for (let i in views) {
    let V = views[i];
    let link = create_view_link(V);
    let li = $('<li />');
    li.append(link);
    ul.append(li);
  }

  function create_view_link(V) {
    let link = $(`<a href=#>${V.label()}</a>`);
    link.click(function() {
      m_emitter.emit('open_view', V);
    });
    return link;
  }
}

function _SummaryView(view_context) {
  this.initialize = function() {
    initialize();
  };
  this.element = function() {
    return m_summary_view.element();
  };
  this.label = function() {
    return 'Dataset summary';
  };

  let m_summary_view = null;

  function initialize() {
    m_summary_view = new EVDatasetSummaryView(view_context.dataset);
    view_context.dataset.onChanged(function() {
      m_summary_view.refresh();
    });
    m_summary_view.refresh();
  }
}

function _GeometryView(view_context) {
  this.initialize = function() {
    initialize();
  };
  this.element = function() {
    return m_geom_widget.div();
  };
  this.label = function() {
    return 'Geometry';
  };

  let m_geom_widget = null;

  function initialize() {
    m_geom_widget = new GeomWidget();
    view_context.dataset.onChanged(function() {
      refresh();
    });
    refresh();
  }

  function refresh() {
    view_context.dataset.getGeomText(function(txt) {
      if (txt) {
        m_geom_widget.setGeomText(txt);
      }
    });
  }
}

function _TimeseriesView(view_context) {
  this.initialize = function() {
    initialize();
  };
  this.element = function() {
    return m_timeseries_widget.div();
  };
  this.label = function() {
    return 'Timeseries';
  };

  let m_timeseries_widget = null;

  function initialize() {
    m_timeseries_widget = new TimeseriesWidget();
    let X = new TimeseriesModel(view_context.dataset.directory() + '/raw.mda', view_context.dataset.params());
    X.initialize(function(err) {
      if (err) {
        throw 'Error initializing timeseries model: ' + err;
      }
      m_timeseries_widget.setTimeseriesModel(X);
    });
  }

  function refresh() {
    view_context.dataset.getGeomText(function(txt) {
      if (txt) {
        m_geom_widget.setGeomText(txt);
      }
    });
  }
}

function EVDataset() {
  this.setDirectory = function(directory) {
    m_directory = directory;
  };
  this.initialize = function() {
    initialize();
  };
  this.directory = function() {
    return m_directory;
  };
  this.params = function() {
    return JSON.parse(JSON.stringify(m_params));
  };
  this.onChanged = function(handler) {
    m_emitter.on('changed', handler);
  };
  this.getGeomText = function(callback) {
    getGeomText(callback);
  };

  let m_params = {};
  let m_emitter = new MyEmitter();
  let m_files = {};
  let m_dirs = {};

  function initialize() {
    let KBC = new KBClient();
    KBC.readDir(m_directory, {})
      .then(function(xx) {
        m_files = xx.files;
        if (m_files['params.json']) {
          load_params_file(m_directory + '/params.json', function() {
            initialize_params();
          });
        } else {
          initialize_params();
        }
      })
      .catch(function(err) {
        console.error('Error reading directory: ' + err);
      });
  }

  function initialize_params() {
    if (m_files['raw.mda']) {
      let X = new TimeseriesModel(m_directory + '/raw.mda', m_params);
      X.initialize(function(err) {
        if (err) {
          throw 'Error initializing timeseries model: ' + err;
        }
        m_params['num_channels'] = X.numChannels();
        m_params['num_samples'] = X.numTimepoints();
        m_params['dtype'] = X.dtype();
        m_emitter.emit('changed');
      });
    }
  }

  function load_params_file(params_fname, callback) {
    let KBC = new KBClient();
    KBC.readTextFile(params_fname)
      .then(function(txt) {
        m_params = JSON.parse(txt);
        m_emitter.emit('changed');
        callback();
      })
      .catch(function(err) {
        console.error('Error loading parameter file: ' + err);
        return;
      });
  }

  function getGeomText(callback) {
    if (!m_files['geom.csv']) {
      callback(null);
      return;
    }
    let KBC = new KBClient();
    KBC.readTextFile(m_directory + '/geom.csv')
      .then(function(txt) {
        callback(txt);
      })
      .catch(function(err) {
        console.error('Error loading geom file: ' + err);
        callback(null);
      });
  }
}

function EVDatasetSummaryView(EVD) {
  this.element = function() {
    return m_element;
  };
  this.refresh = function() {
    refresh();
  };
  let m_element = $(`
        <div>
        <table class=table>
            <tr>
                <th>num_channels</th>
                <td><span id=num_channels></span></td>
            </tr>
            <tr>
                <th>num_samples</th>
                <td><span id=num_samples></span></td>
            </tr>
            <tr>
                <th>samplerate (Hz)</th>
                <td><span id=samplerate></span></td>
            </tr>
            <tr>
                <th>dtype</th>
                <td><span id=dtype></span></td>
            </tr>
            <tr>
                <th>spike_sign</th>
                <td><span id=spike_sign></span></td>
            </tr>
        </table>
        </div>
    `);

  m_element.find('th').css({
    "max-width": "30px"
  });

  function refresh() {
    m_element.find('#num_channels').html(EVD.params().num_channels || undefined);
    m_element.find('#num_samples').html(EVD.params().num_samples || undefined);
    m_element.find('#samplerate').html(EVD.params().samplerate || undefined);
    m_element.find('#dtype').html(EVD.params().dtype || undefined);
    m_element.find('#spike_sign').html(EVD.params().spike_sign || EVD.params().detect_sign || undefined);
  }
}