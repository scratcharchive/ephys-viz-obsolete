dir="$(dirname $0)"

set -e

cp $dir/../../web/bundle.js $dir/../jp_ephys_viz/javascript/
cp $dir/../../node_modules/jquery/dist/jquery.min.js $dir/../jp_ephys_viz/javascript/
cp $dir/../../node_modules/d3/dist/d3.min.js $dir/../jp_ephys_viz/javascript/

cp $dir/../../web/*.css $dir/../jp_ephys_viz/css/
cp $dir/../../node_modules/bootstrap/dist/css/bootstrap.min.css $dir/../jp_ephys_viz/css/
