# 文档说明
## API说明
# trace插件

引入:  
import  'ajaxTrace2';  
require ('ajaxTrace2');  
``<script src="ajaxTrace2.js"></script>``

使用：  
在js入口调用: window.pluginTrace.postTrace();

ajax函数设置,下面是jq的例子  
var idObj = window.pluginTrace.createId(url);  
$.ajax(url, {  
  type: 'GET',  
  dataType: 'json',  
  cache: false,  
  headers: {  
    'trace-id': idObj.traceId,  
    'span-id': idObj.spanId  
  },  
  data: params  
}).done((data, textStatus, request) => {  
  callback();  
})