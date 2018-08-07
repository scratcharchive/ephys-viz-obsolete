#!/bin/bash
npm run webpack
npm run update_jp_ephys_viz
while inotifywait -e modify -e delete -r $PWD/src; do
  npm run webpack
  npm run update_jp_ephys_viz
done

