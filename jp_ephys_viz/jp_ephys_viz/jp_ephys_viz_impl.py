from IPython.display import display
import vdom
import jp_proxy_widget
import os

def ephys_viz_v1(*,params,title='View',external_link=False,height=450):
    if external_link:
        query=''
        for key in params:
            query=query+'{}={}&'.format(key,params[key])
        href='https://ephys-viz.herokuapp.com/?{}'.format(query)
        display(vdom.a(title,href=href,target='_blank'))
    else:
        if title:
            display(vdom.h3(title))
        path0=os.path.dirname(os.path.realpath(__file__))
        W=jp_proxy_widget.JSProxyWidget()
        W.load_js_files([path0+'/javascript/bundle.js'])
        W.load_js_files([path0+'/javascript/d3.min.js'])
        W.load_css(path0+'/css/bootstrap.min.css')
        W.load_css(path0+'/css/ml-layout.css')
        display(W)
        W.js_init('''
            element.empty()
            window.init_ephys_viz(params,element);
            element.css({height:height,overflow:'auto'})
        ''',params=params,height=height)
