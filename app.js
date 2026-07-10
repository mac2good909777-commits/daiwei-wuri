(function(){
  "use strict";

  var state = {
    items: [],
    order: [],
    labels: {},
    icons: {},
    activeCat: "all",
    filtered: [],
    lbIndex: -1,
    zoom: 1,
    panX: 0,
    panY: 0,
  };

  var els = {};

  function $(id){ return document.getElementById(id); }

  function init(manifest){
    state.items = manifest.items;
    state.order = manifest.category_order;
    state.labels = manifest.category_labels;
    state.icons = manifest.category_icon;

    els.tabs = $("tabs");
    els.gallery = $("gallery");
    els.heroStats = $("heroStats");
    els.lightbox = $("lightbox");
    els.lbStage = $("lbStage");
    els.lbImg = $("lbImg");
    els.lbVideo = $("lbVideo");
    els.lbCounter = $("lbCounter");
    els.lbPrev = $("lbPrev");
    els.lbNext = $("lbNext");
    els.lbClose = $("lbClose");
    els.lbZoomIn = $("lbZoomIn");
    els.lbZoomOut = $("lbZoomOut");

    renderStats();
    renderTabs();
    renderGallery();
    bindLightbox();
  }

  function countFor(cat){
    if (cat === "all") return state.items.length;
    return state.items.filter(function(it){ return it.category === cat; }).length;
  }

  function renderStats(){
    var photoCount = state.items.filter(function(it){return it.type === "image";}).length;
    var videoCount = state.items.filter(function(it){return it.type === "video";}).length;
    var html = '<span class="hero-stat"><b>' + photoCount + '</b>張現況照片</span>';
    if (videoCount) html += '<span class="hero-stat"><b>' + videoCount + '</b>支影片</span>';
    html += '<span class="hero-stat"><b>' + state.order.length + '</b>個分類區域</span>';
    els.heroStats.innerHTML = html;
  }

  function renderTabs(){
    var cats = ["all"].concat(state.order.filter(function(c){ return countFor(c) > 0; }));
    var html = "";
    cats.forEach(function(cat){
      var label = cat === "all" ? "全部" : (state.icons[cat] + " " + state.labels[cat]);
      var active = cat === state.activeCat ? " active" : "";
      html += '<button class="tab' + active + '" data-cat="' + cat + '">' + label +
        '<span class="count">' + countFor(cat) + '</span></button>';
    });
    els.tabs.innerHTML = html;
    Array.prototype.forEach.call(els.tabs.querySelectorAll(".tab"), function(btn){
      btn.addEventListener("click", function(){
        state.activeCat = btn.getAttribute("data-cat");
        renderTabs();
        renderGallery();
      });
    });
  }

  function renderGallery(){
    var list = state.activeCat === "all" ? state.items :
      state.items.filter(function(it){ return it.category === state.activeCat; });
    state.filtered = list;

    var html = "";
    list.forEach(function(it, i){
      if (it.type === "video"){
        html += '<div class="card video-card" data-idx="' + i + '">' +
          '<div><div class="play-badge">▶</div><div class="cap">' + state.icons.video + ' ' + state.labels.video + '</div></div>' +
          '</div>';
      } else {
        html += '<div class="card" data-idx="' + i + '">' +
          '<img src="' + it.thumb + '" loading="lazy" alt="' + state.labels[it.category] + '">' +
          '<div class="cap">' + state.icons[it.category] + ' ' + state.labels[it.category] + '</div>' +
          '</div>';
      }
    });
    els.gallery.innerHTML = html;

    Array.prototype.forEach.call(els.gallery.querySelectorAll(".card"), function(card){
      card.addEventListener("click", function(){
        openLightbox(parseInt(card.getAttribute("data-idx"), 10));
      });
    });
  }

  // ---------- Lightbox ----------

  function openLightbox(idx){
    state.lbIndex = idx;
    els.lightbox.classList.add("open");
    els.lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    showCurrent();
  }

  function closeLightbox(){
    els.lightbox.classList.remove("open");
    els.lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    els.lbVideo.pause();
    els.lbVideo.removeAttribute("src");
    els.lbVideo.load();
  }

  function resetZoom(){
    state.zoom = 1; state.panX = 0; state.panY = 0;
    applyTransform();
  }

  function applyTransform(){
    els.lbImg.style.transform = "translate(" + state.panX + "px," + state.panY + "px) scale(" + state.zoom + ")";
    els.lbImg.style.cursor = state.zoom > 1 ? "grab" : "zoom-in";
  }

  function showCurrent(){
    var it = state.filtered[state.lbIndex];
    if (!it) return;
    resetZoom();
    if (it.type === "video"){
      els.lbImg.style.display = "none";
      els.lbVideo.style.display = "block";
      els.lbVideo.src = it.full;
      els.lbVideo.load();
    } else {
      els.lbVideo.style.display = "none";
      els.lbVideo.pause();
      els.lbImg.style.display = "block";
      els.lbImg.src = it.full;
    }
    els.lbCounter.textContent = state.labels[it.category] + "　" + (state.lbIndex + 1) + " / " + state.filtered.length;
  }

  function step(delta){
    var n = state.filtered.length;
    state.lbIndex = (state.lbIndex + delta + n) % n;
    showCurrent();
  }

  function bindLightbox(){
    els.lbClose.addEventListener("click", closeLightbox);
    els.lbPrev.addEventListener("click", function(){ step(-1); });
    els.lbNext.addEventListener("click", function(){ step(1); });
    els.lbZoomIn.addEventListener("click", function(){ zoomBy(0.5); });
    els.lbZoomOut.addEventListener("click", function(){ zoomBy(-0.5); });

    els.lightbox.addEventListener("click", function(e){
      if (e.target === els.lightbox || e.target === els.lbStage) closeLightbox();
    });

    document.addEventListener("keydown", function(e){
      if (!els.lightbox.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "+" || e.key === "=") zoomBy(0.5);
      else if (e.key === "-") zoomBy(-0.5);
    });

    // double-click to toggle zoom
    els.lbImg.addEventListener("dblclick", function(e){
      if (state.zoom > 1) { resetZoom(); }
      else { state.zoom = 2.4; applyTransform(); }
    });

    // wheel zoom (desktop)
    els.lbStage.addEventListener("wheel", function(e){
      if (els.lbImg.style.display === "none") return;
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 0.25 : -0.25);
    }, { passive: false });

    // drag to pan when zoomed
    var dragging = false, startX = 0, startY = 0, startPanX = 0, startPanY = 0;
    els.lbImg.addEventListener("pointerdown", function(e){
      if (state.zoom <= 1) return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startPanX = state.panX; startPanY = state.panY;
      els.lbImg.setPointerCapture(e.pointerId);
      els.lbImg.style.cursor = "grabbing";
    });
    els.lbImg.addEventListener("pointermove", function(e){
      if (!dragging) return;
      state.panX = startPanX + (e.clientX - startX);
      state.panY = startPanY + (e.clientY - startY);
      applyTransform();
    });
    ["pointerup","pointercancel","pointerleave"].forEach(function(ev){
      els.lbImg.addEventListener(ev, function(){
        dragging = false;
        applyTransform();
      });
    });

    // swipe navigation on touch when not zoomed
    var touchStartX = null, touchStartY = null;
    els.lbStage.addEventListener("touchstart", function(e){
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    els.lbStage.addEventListener("touchend", function(e){
      if (touchStartX === null || state.zoom > 1) { touchStartX = null; return; }
      var dx = (e.changedTouches[0].clientX - touchStartX);
      var dy = (e.changedTouches[0].clientY - touchStartY);
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        step(dx < 0 ? 1 : -1);
      }
      touchStartX = null;
    });
  }

  function zoomBy(delta){
    if (els.lbImg.style.display === "none") return;
    state.zoom = Math.min(4, Math.max(1, state.zoom + delta));
    if (state.zoom === 1) { state.panX = 0; state.panY = 0; }
    applyTransform();
  }

  fetch("manifest.json")
    .then(function(r){ return r.json(); })
    .then(init)
    .catch(function(err){
      console.error("manifest load failed", err);
      document.getElementById("gallery").innerHTML = "<p style='padding:20px;color:#c00'>相簿資料載入失敗，請重新整理頁面。</p>";
    });
})();
