---
title: 相册
type: "photos"
comments: false
date: 2018-07-09 13:08:11
---
<link rel="stylesheet" href="../lib/album/ins.css">
<link rel="stylesheet" href="../lib/album/photoswipe.css"> 
<link rel="stylesheet" href="../lib/album/default-skin/default-skin.css"> 
<div class="photos-btn-wrap">
    <a class="photos-btn active" href="javascript:void(0)">Photos</a>
</div>
<div class="instagram itemscope">
    <a href="https://snowynight.top" target="_blank" class="open-ins">图片正在加载中…</a>
</div>

<script>
  (function() {
    var loadScript = function(path) {
      var $script = document.createElement('script')
      document.getElementsByTagName('body')[0].appendChild($script)
      $script.setAttribute('src', path)
    }
    setTimeout(function() {
        loadScript('../lib/album/ins.js')
    }, 0)
  })()
</script>
