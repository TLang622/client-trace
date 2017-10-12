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

    var xhrProto = XMLHttpRequest.prototype,
        origOpen = xhrProto.open;

    xhrProto.open = function (method, url) {
        this._url = url;
        this._method = method;
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

  function tracer(url, timeStamp, pathname, urlMethod) {
    var key = dealUrl(url);
    var traceId = sessionStorage.getItem(key);
    var dateKey = key + 'time';
    var startTime = sessionStorage.getItem(dateKey);
    var startTimeStr = sessionStorage.getItem(dateKey) + '000';
    var endTime = parseInt(startTime) + parseInt(timeStamp);
    var endTimeStr = endTime + '000';
    var timeStampStr = timeStamp + '000';
    var spanKey = key + 'span';
    var spanId = sessionStorage.getItem(spanKey);
    key = key + ' (' + urlMethod + ')';
    var traceData = {
      "traceId": traceId,
      "name": key,
      "timestamp": startTimeStr,
      "binaryAnnotations": [{
          "endpoint": {
              "serviceName": key,
              "ipv4": "127.0.0.1",
              "port": "8080"
          },
          "value": key,
          "key": pathname
      }],
      "annotations": [{
          "timestamp": startTimeStr,
          "endpoint": {
              "serviceName": key,
              "ipv4": "127.0.0.1",
              "port": "8080"
          },
          "value": "cs"
      }, {
          "timestamp": endTimeStr,
          "endpoint": {
              "serviceName": key,
              "ipv4": "127.0.0.1",
              "port": "8080"
          },
          "value": "cr"
      }],
      "duration": timeStampStr,
      "id": spanId
    };
    return traceData;
  }

  var api = {
    postTrace: function postTrace(traceUrl) {
      ajaxOverride();

      window.addEventListener('ajaxLoadEnd', function (e) {
        //console.log(e);
        var pathname = e.target.location.pathname;
        var url = e.detail._url;
        var urlMethod = e.detail._method;
        var timeStamp = parseInt(e.timeStamp);
        var data = tracer(url, timeStamp, pathname, urlMethod);
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
        traceId: traceId,
        spanId: spanId
      };
    }
  };

  window.pluginTrace = api;
})();