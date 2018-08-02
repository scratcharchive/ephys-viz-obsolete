#!/bin/bash
npm run webpack
while inotifywait -e modify -e delete -r $PWD; do
  npm run webpack
done

