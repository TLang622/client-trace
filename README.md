# 文档说明
## API说明
# trace插件

引入:  
import  'ajaxTrace2';  
require ('ajaxTrace2');  
``<script src="ajaxTrace2.js"></script>``

使用：  
在js入口调用(url是接收trace数据的接口): window.pluginTrace.postTrace(url);

ajax函数设置headers,下面是jq的例子  
$.ajaxPrefilter(function(options, originalOptions, jqXHR){  
  let url = options.url;  
  let idObj = window.pluginTrace.createId(url);  
  jqXHR.setRequestHeader("id", idObj.id);  
  jqXHR.setRequestHeader("trace-id", idObj.traceId);  
  jqXHR.setRequestHeader("span-id", idObj.spanId);  
});  