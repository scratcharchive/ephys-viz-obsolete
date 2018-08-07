import setuptools

setuptools.setup(
    name="jp_ephys_viz",
    version="0.6.9",
    author="Jeremy Magland",
    author_email="jmagland@flatironinstitute.org",
    description="Use ephys-viz in jupyterlab and ipython notebook",
    url="https://github.com/flatironinstitute/ephys-viz",
    packages=setuptools.find_packages(),
    package_data={
        '': ['css/*.css','javascript/*.js']
    },
    install_requires=[
        'ipython',
        'vdom',
        'ipywidgets',
        'jp_proxy_widget'
    ],
    classifiers=(
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
    ),
)
