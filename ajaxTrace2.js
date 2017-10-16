(function() {
  function ajaxOverride() {

    function CustomEvent ( event, params ) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      var evt = document.createEvent( 'CustomEvent' );
      evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail);
      return evt;
     }

    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;

    function ajaxEventTrigger(event) {
      var ajaxEvent = new CustomEvent(event, { detail: this });
      window.dispatchEvent(ajaxEvent);
     }

    var xhrProto = XMLHttpRequest.prototype;
    var origOpen = xhrProto.open;
    var urlRecord;

    xhrProto.open = function (method, url) {
        this._url = url;
        this._method = method;
        urlRecord = url;
        return origOpen.apply(this, arguments);
    };

    var oldXHR = window.XMLHttpRequest;

    function newXHR(e) {
      var realXHR = new oldXHR();
      if(e && e.tag && e.tag == 'trace') {
        return realXHR;
      }
      realXHR.addEventListener('abort', function () { ajaxEventTrigger.call(this, 'ajaxAbort'); }, false);
      realXHR.addEventListener('error', function () { ajaxEventTrigger.call(this, 'ajaxError'); }, false);
      realXHR.addEventListener('load', function () { ajaxEventTrigger.call(this, 'ajaxLoad'); }, false);
      realXHR.addEventListener('loadstart', function () { ajaxEventTrigger.call(this, 'ajaxLoadStart'); }, false);
      realXHR.addEventListener('progress', function () { ajaxEventTrigger.call(this, 'ajaxProgress'); }, false);
      realXHR.addEventListener('timeout', function () { ajaxEventTrigger.call(this, 'ajaxTimeout'); }, false);
      realXHR.addEventListener('loadend', function () { ajaxEventTrigger.call(this, 'ajaxLoadEnd'); }, false);
      realXHR.addEventListener('readystatechange', function() { ajaxEventTrigger.call(this, 'ajaxReadyStateChange'); }, false);

      realXHR.onreadystatechange = function (evt) {
        switch(realXHR.readyState){
          case 1://OPENED
            var idObj = window.pluginTrace.createId(urlRecord);
            realXHR.setRequestHeader('id', idObj.id);
            realXHR.setRequestHeader('trace-id', idObj.traceId);
            realXHR.setRequestHeader('span-id', idObj.spanId);
            break;
          case 2://HEADERS_RECEIVED
            //do something
            break;
          case 3://LOADING
            //do something
            break;
          case 4://DONE
            //do something
            break;
        }
      };

      return realXHR;
    }

    window.XMLHttpRequest = newXHR;
  }

  function dealUrl(url) {
    var urlArray = url.split('/');
    var endUrl;
    if(urlArray.length >= 2) {
      endUrl = urlArray[urlArray.length-2] + '/' + urlArray[urlArray.length-1];
    }else if(urlArray.length == 1) {
      endUrl = urlArray[urlArray.length-1];
    }else {
      endUrl = 'traceError';
    }
    
    if(endUrl.match(/\?/)) {
      endUrl = endUrl.split('?');
      endUrl = endUrl[0];
    }
    return endUrl;
  }

  function tracer(params) {
    var key = dealUrl(params.api);
    var traceId = sessionStorage.getItem(key);
    var dateKey = key + 'time';
    var startTime = sessionStorage.getItem(dateKey);
    var startTimeStr = sessionStorage.getItem(dateKey) + '000';
    var endTime = parseInt(startTime) + parseInt(params.timeStamp);
    var endTimeStr = endTime + '000';
    var timeStampStr = params.timeStamp + '000';
    var spanKey = key + 'span';
    var spanId = sessionStorage.getItem(spanKey);
    var api = params.api.split('?');
    api = api[0];
    var binaryAnnotations = [
      {'key': 'http.host', 'value': params.host},
      {'key': 'http.location', 'value': params.location},
      {'key': 'http.api', 'value': api},
      {'key': 'http.path', 'value': key},
      {'key': 'http.method', 'value': params.method},
    ];
    var traceData = {
      "traceId": traceId,
      "name": key,
      "timestamp": startTimeStr,
      "serviceName": key,
      "binaryAnnotations":binaryAnnotations,
      "astartTimestamp": startTimeStr,
      "aendTimestamp": endTimeStr,
      "duration": timeStampStr,
      "spanId": spanId,
      "id": params.id
    };
    return traceData;
  }

  var id = '';
  for (var i = 0; i < 16; i++) {
    id += Math.floor(Math.random()*10);
  }

  var api = {
    init: function postTrace(traceUrl) {
      ajaxOverride();
      window.addEventListener('ajaxLoadEnd', function (e) {
        //console.log(e);
        var params = {};
        params.host = e.target.location.host;
        params.location = e.target.location.pathname;
        params.api = e.detail._url;
        params.method = e.detail._method;
        params.timeStamp = parseInt(e.timeStamp);
        params.id = id;
        var data = tracer(params);
        var xmlHttp=new XMLHttpRequest({tag:'trace'});
        var method="POST";
        xmlHttp.open(method,traceUrl, true);
        xmlHttp.setRequestHeader("Content-Type", "application/json");
        data = JSON.stringify(data);
        xmlHttp.send(data);
      });
    },
    createId: function createId(url) {
      if(!url) { return false }
      var key = dealUrl(url);
      var date = new Date().getTime();
      var randomStr = '';
      for (var i = 0; i < 3; i++) {
        randomStr += Math.floor(Math.random()*10);
      }
      var traceId = date + randomStr;
      sessionStorage.setItem(key, traceId);
      var dateKey = key + 'time';
      sessionStorage.setItem(dateKey, date);
      var randomStr2 = '';
      for (var i = 0; i < 16; i++) {
        randomStr2 += Math.floor(Math.random()*10);
      }
      var spanId = randomStr2;
      var spanKey = key + 'span';
      sessionStorage.setItem(spanKey, spanId);
      return {
        id: id,
        traceId: traceId,
        spanId: spanId
      };
    }
  };

  window.pluginTrace = api;
})();