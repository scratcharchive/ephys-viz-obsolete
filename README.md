# Ephys-Viz

Various widgets for visualizing electrophysiology experiments and the results of spike sorting

Authors: Jeremy Magland

## Installation

Use Linux (should also work in OSX, but not yet tested)


Step 0. Install the following prerequisites

* A recent version of NodeJS
* [mountainlab-js](https://github.com/flatironinstitute/mountainlab-js) with the [ml_ephys](https://github.com/magland/ml_ephys) plugin package

Step 1. Clone this repository

```
git clone https://github.com/flatironinstitute/ephys-viz
```

2. Install using npm:

```
cd ephys-viz
npm install
```

3. Add ephys-viz/bin to your PATH environment variable

## Usage

View a timeseries dataset in mda format:

```
ev-view-timeseries raw.mda
ev-view-timeseries raw.mda.prv
```

See also the example(s) in the ephys-viz/examples directory


