// OnlineStore.js
// Custom JavaScript for the Premium /online-store Page

let userLatLng = null;
let userCity = null;
let searchTimeout = null;
let currentMarker = null;

// ====== LOCATION MODAL LOGIC ======
function promptForLocation(onSuccess) {
  // Try to use HTML5 Geolocation directly for simplicity
  if (!navigator.geolocation) {
    alert(window.OS_I18N.geo_not_supported);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLatLng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      // Reverse geocode to get city
      if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: userLatLng }, (results, status) => {
        if (status === "OK" && results[0]) {
          for (const c of results[0].address_components) {
            if (c.types.includes("locality") || c.types.includes("administrative_area_level_2")) {
              userCity = c.long_name;
              break;
            }
          }
          if (onSuccess) onSuccess();
        } else {
          if (onSuccess) onSuccess();
        }
      });
      } else {
        if (onSuccess) onSuccess();
      }
    },
    (error) => {
      console.warn("Location error:", error);
      alert(window.OS_I18N.allow_location_alert);
    }
  );
}

// --- Advanced Filter States ---
window.currentScope = 'Lokal & Sekitar';
window.currentRadius = 25;
window.currentCategory = 'Semua';
window.currentSort = 'Relevansi';
window.isOpenNow = false;
window.currentMinPrice = '';
window.currentMaxPrice = '';
window.currentPid = null;
window.currentSid = null;

// Attach to Search Input
$(document).ready(function () {
  const initialProductText = `<div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; color: #888; text-align: center; font-family: 'Inter', sans-serif;">${window.OS_I18N.initial_product_msg}</div>`;
  const initialStoreText = `<div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; color: #888; text-align: center; font-family: 'Inter', sans-serif;">${window.OS_I18N.initial_store_msg}</div>`;
  
  const loadingAnimationHtml = `
    <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 48px;">
      <style>
        .os-linear-progress {
          position: relative;
          width: 150px;
          height: 4px;
          background-color: rgba(139, 94, 60, 0.2);
          overflow: hidden;
          border-radius: 4px;
        }
        .os-linear-progress-bar {
          position: absolute;
          top: 0; bottom: 0;
          background-color: #8b5e3c;
          border-radius: 4px;
          animation: os-indeterminate 1.5s infinite ease-in-out;
        }
        @keyframes os-indeterminate {
          0% { left: -50%; width: 50%; }
          100% { left: 100%; width: 50%; }
        }
      </style>
      <div class="os-linear-progress">
        <div class="os-linear-progress-bar"></div>
      </div>
    </div>
  `;

  // Set Initial State
  $("#os-product-list").html(initialProductText);
  $("#os-store-list").html(initialStoreText);

  // Check for Deep Links
  if (typeof INITIAL_PRODUCT_ID !== 'undefined' && INITIAL_PRODUCT_ID) {
    loadProductDetail(INITIAL_PRODUCT_ID);
    window.history.replaceState({}, document.title, "/online-store");
  } else if (typeof INITIAL_STORE_ID !== 'undefined' && INITIAL_STORE_ID) {
    loadStoreDetail(INITIAL_STORE_ID);
    window.history.replaceState({}, document.title, "/online-store");
  }

  // Custom Toast Notification
  function showToast(message) {
    if (!document.getElementById('toast-keyframes')) {
      $('head').append(`
        <style id="toast-keyframes">
          @keyframes toastGravity {
            0% { bottom: -100px; }
            15% { bottom: 40px; }
            85% { bottom: 40px; }
            100% { bottom: -100px; }
          }
          @media (max-width: 767px) {
            @keyframes toastGravity {
              0% { bottom: -100px; }
              15% { bottom: 100px; }
              85% { bottom: 100px; }
              100% { bottom: -100px; }
            }
          }
        </style>
      `);
    }
    const toast = $(`
      <div style="position: fixed; bottom: -100px; left: 50%; transform: translateX(-50%); background-color: #5c3a20; color: #ffe3d1; padding: 12px 24px; border-radius: 24px; z-index: 10000; font-family: 'Inter', sans-serif; box-shadow: 0 8px 20px rgba(0,0,0,0.3); text-align: center; font-size: 14px; font-weight: 500; white-space: nowrap; pointer-events: none; animation: toastGravity 2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;">
        ${message}
      </div>
    `);
    $('body').append(toast);
    setTimeout(() => toast.remove(), 2100);
  }

  // Handle Share Buttons
  $('#pd-share-btn').on('click', function(e) {
    e.stopPropagation();
    if (window.currentPid) {
      const url = window.location.origin + '/product/' + window.currentPid;
      navigator.clipboard.writeText(url).then(() => {
        showToast(window.OS_I18N.link_copied_product || "Link produk berhasil disalin!");
      }).catch(err => console.error("Gagal menyalin link:", err));
    }
  });

  // Share Options Dropdown Logic
  $(document).on('click', '#sc-share-btn', function(e) {
    if ($(e.target).closest('#share-options-dropdown').length) {
      return;
    }
    e.stopPropagation();
    const dropdown = $('#share-options-dropdown');
    dropdown.css('display', dropdown.css('display') === 'none' ? 'flex' : 'none');
  });

  $(document).on('click', function(e) {
    if (!$(e.target).closest('#sc-share-btn').length) {
      $('#share-options-dropdown').css('display', 'none');
    }
  });

  window.copyStoreLink = function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    $('#share-options-dropdown').css('display', 'none');
    
    if (!window.currentSid) {
      showToast("Gagal: ID Toko tidak ditemukan.");
      return;
    }
    
    const url = window.location.origin + '/store/' + window.currentSid;
    
    function fallbackCopy(text) {
      try {
        const temp = $("<input>");
        $("body").append(temp);
        temp.val(text).select();
        document.execCommand("copy");
        temp.remove();
        showToast("Link toko berhasil disalin!");
      } catch (err) {
        showToast("Gagal menyalin link.");
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showToast("Link toko berhasil disalin!");
      }).catch(err => {
        console.error("Gagal menyalin link:", err);
        fallbackCopy(url);
      });
    } else {
      fallbackCopy(url);
    }
  };

  window.openStoreQR = function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    $('#share-options-dropdown').css('display', 'none');
    
    if (!window.currentSid) {
      showToast("Gagal: ID Toko tidak ditemukan.");
      return;
    }
    
    const url = window.location.origin + '/store/' + window.currentSid;
    
    try {
      // Generate QR Code on the fly using QRious
      const qr = new QRious({
        value: url,
        size: 400,
        foreground: '#6f4627',
        background: '#ffffff',
        level: 'H'
      });
      
      const qrDataUrl = qr.toDataURL('image/png');
      $('#qr-modal-img').attr('src', qrDataUrl);
      $('#qr-modal-download').attr('href', qrDataUrl).attr('download', `store_${window.currentSid}_qr.png`);
      $('#qr-modal').css('display', 'flex').addClass('active');
    } catch (err) {
      console.error("Gagal membuat QR Code:", err);
      showToast("Gagal membuat QR Code.");
    }
  };

  window.closeQRModal = function() {
    $('#qr-modal').removeClass('active').css('display', 'none');
  };

  window.checkAccordion = () => window.innerHeight < 900 || window.innerWidth < 992;

  $('#os-product-header').on('click', function() {
    const container = $('#os-product-container');
    const isExpanding = container.hasClass('is-collapsed');
    
    if (isExpanding && window.checkAccordion()) {
      $('#os-store-container').addClass('is-collapsed');
    }
    container.toggleClass('is-collapsed');
  });
  
  $('#os-store-header').on('click', function() {
    const container = $('#os-store-container');
    const isExpanding = container.hasClass('is-collapsed');
    
    if (isExpanding && window.checkAccordion()) {
      $('#os-product-container').addClass('is-collapsed');
    }
    container.toggleClass('is-collapsed');
  });


  $("#os-search-input").on("input", function (e) {
    // Removed console.log
    clearTimeout(searchTimeout);
    
    const keyword = $(this).val().trim();
    if (keyword !== "") {
      $('#os-sidebar').addClass('is-searching');
    } else {
      $('#os-sidebar').removeClass('is-searching');
    }

    const productContainer = $("#os-product-list");
    const storeContainer = $("#os-store-list");

    if (keyword !== "") {
      productContainer.html(loadingAnimationHtml);
      storeContainer.html(loadingAnimationHtml);

      searchTimeout = setTimeout(() => {
        const currentKeyword = $("#os-search-input").val().trim();
        if (currentKeyword === "") {
          productContainer.html(initialProductText);
          storeContainer.html(initialStoreText);
          return;
        }

        if (currentKeyword.length > 0 && currentKeyword.length < 3) {
          const minCharMsg = `<div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; color: #e74c3c; text-align: center; font-family: 'Inter', sans-serif;">${window.OS_I18N.min_char_msg || 'Ketik minimal 3 huruf untuk mencari'}</div>`;
          productContainer.html(minCharMsg);
          storeContainer.html(minCharMsg);
          return;
        }
        
        if (!userLatLng) {
          promptForLocation(() => {
            executeSearch(currentKeyword);
          });
        } else {
          executeSearch(currentKeyword);
        }
      }, 1000); // 1s delay
    } else {
      productContainer.html(initialProductText);
      storeContainer.html(initialStoreText);
    }
  });

  // Event handlers for dynamic clicks (Product / Store cards)
  $(document).on("click", ".os-item-card[data-pid]", function () {
    const pid = parseInt($(this).attr("data-pid"), 10);
    loadProductDetail(pid);
  });

  $(document).on("click", ".os-item-card[data-sid]:not([data-pid])", function () {
    const sid = parseInt($(this).attr("data-sid"), 10);
    loadStoreDetail(sid);
  });
  
  // Mobile Back Button Logic
  $('#os-back-to-store').on('click', function() {
    $('#os-pd-card').css('display', 'none');
    $('#os-store-card').removeClass('hide-on-mobile');
    
    // If store is also hidden or we just want to close everything on back:
    // actually, in mobile they go back to the store card which is still a modal.
    // So we keep modal-active.
  });

  // Store card close button
  $('#os-close-store-btn').on('click', function() {
    if (history.state && history.state.modalOpen) {
      history.back();
    } else {
      $('#os-pd-card').css('display', 'none');
      $('#os-store-card').css('display', 'none');
      $('.os-main-content').removeClass('modal-active');
    }
  });

  // Mobile modal backdrop click
  $(document).on('click', '.os-main-content.modal-active', function(e) {
    if (e.target === this) {
      if (history.state && history.state.modalOpen) {
        history.back();
      } else {
        $('#os-pd-card').css('display', 'none');
        $('#os-store-card').css('display', 'none');
        $(this).removeClass('modal-active');
      }
    }
  });

  // History popstate listener
  $(window).on('popstate', function(e) {
    if (!history.state || !history.state.modalOpen) {
      // Hardware back was pressed to leave the modal state
      if ($('.os-main-content').hasClass('modal-active')) {
        $('#os-pd-card').css('display', 'none');
        $('#os-store-card').css('display', 'none');
        $('.os-main-content').removeClass('modal-active');
      }
    }
  });

  // Store Card Tabs Logic
  $('.os-sc-tab').on('click', function() {
    $('.os-sc-tab').removeClass('active');
    $(this).addClass('active');
    
    const targetId = $(this).attr('data-target');
    $('.os-sc-tab-pane').removeClass('active');
    $('#' + targetId).addClass('active');
  });

  // Etalase Tab Search
  let etalaseSearchTimeout;
  $('#os-etalase-search-input').on('input', function() {
    clearTimeout(etalaseSearchTimeout);
    const keyword = $(this).val().trim().toLowerCase();
    
    etalaseSearchTimeout = setTimeout(() => {
      if (!window.currentStoreProducts) return;
      if (keyword === '') {
        window.renderEtalaseGrid(window.currentStoreProducts);
        return;
      }
      const filtered = window.currentStoreProducts.filter(p => 
        p.name && p.name.toLowerCase().includes(keyword)
      );
      window.renderEtalaseGrid(filtered);
    }, 300); // Small debounce
  });
});

window.renderEtalaseGrid = function(productsToRender) {
  const etalaseGrid = $('#sc-etalase-grid');
  etalaseGrid.empty();
  if (productsToRender && productsToRender.length > 0) {
    productsToRender.forEach(p => {
      etalaseGrid.append(`
        <div class="os-etalase-item" onclick="loadProductDetail(${p.pid})" style="cursor:pointer;">
          <div class="os-etalase-img-container">
            <img loading="lazy" src="${p.image}" onerror="this.onerror=null;this.src='https://placehold.co/400x400/eee/aaa?text=No+Image';" alt="${p.name}">
          </div>
          <span class="os-etalase-name">${p.name}</span>
          <span class="os-etalase-price">${formatRupiah(p.price)}</span>
        </div>
      `);
    });
  } else {
    etalaseGrid.append(`<div style="grid-column: 1/-1; padding: 24px; text-align: center; color: #888; font-family: 'Inter', sans-serif;">${window.OS_I18N.product_not_found || 'Produk tidak ditemukan.'}</div>`);
  }
}

async function executeSearch(currentKeyword) {
  // Removed console.log
  const productContainer = $("#os-product-list");
  const storeContainer = $("#os-store-list");

  try {
    const payload = {
      keyword: currentKeyword,
      scope: window.currentScope,
      radius: window.currentRadius,
      category: window.currentCategory,
      minPrice: window.currentMinPrice,
      maxPrice: window.currentMaxPrice,
      openNow: window.isOpenNow,
      sortBy: window.currentSort
    };
    
    if (userLatLng) {
      payload.latitude = userLatLng.lat;
      payload.longitude = userLatLng.lng;
      payload.city = userCity;
    }

    const response = await fetch("/api/searchproductstore", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Server responded with error status");
    const data = await response.json();

    productContainer.empty();
    storeContainer.empty();

    window.loadedProducts = Array.isArray(data.products) ? data.products : [];
    window.loadedStores = Array.isArray(data.stores) ? data.stores : [];
    window.productPage = 1;
    window.storePage = 1;

    // Update badges
    $('#os-product-badge').text(`${window.loadedProducts.length} ${window.OS_I18N.results_count_suffix}`);
    $('#os-store-badge').text(`${window.loadedStores.length} ${window.OS_I18N.results_count_suffix}`);

    if (window.loadedProducts.length > 0) {
      renderProducts(false);
    } else {
      productContainer.html(`<div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; color: #888; text-align: center; font-family: 'Inter', sans-serif;">Produk tidak ditemukan.</div>`);
    }

    if (window.loadedStores.length > 0) {
      renderStores(false);
    } else {
      storeContainer.html(`<div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; color: #888; text-align: center; font-family: 'Inter', sans-serif;">Toko tidak ditemukan.</div>`);
    }

    // Auto-expand logic for small screens
    if (window.checkAccordion()) {
      if (window.loadedProducts.length === 0 && window.loadedStores.length > 0) {
        $('#os-product-container').addClass('is-collapsed');
        $('#os-store-container').removeClass('is-collapsed');
      } else {
        $('#os-product-container').removeClass('is-collapsed');
        $('#os-store-container').addClass('is-collapsed');
      }
    }
  } catch (error) {
    console.error("Search failed:", error);
    productContainer.html(`<div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; color: #e74c3c; text-align: center; font-family: 'Inter', sans-serif;">Terjadi kesalahan saat mencari produk.</div>`);
    storeContainer.html(`<div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; color: #e74c3c; text-align: center; font-family: 'Inter', sans-serif;">Terjadi kesalahan saat mencari toko.</div>`);
  }
}

// Setup Intersection Observer for infinite scrolling
if (!window.scrollObserver) {
  window.scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (entry.target.id === 'product-sentinel') {
          window.productPage++;
          renderProducts(true);
        }
        if (entry.target.id === 'store-sentinel') {
          window.storePage++;
          renderStores(true);
        }
      }
    });
  }, { rootMargin: '200px' });
}

function renderProducts(append = false) {
  const container = $("#os-product-list");
  if (!append) container.empty();
  else $("#product-sentinel").remove();

  const PAGE_SIZE = 15;
  const start = (window.productPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const chunk = window.loadedProducts.slice(start, end);

  chunk.forEach((product) => {
    // Generate beautiful OS Item Card HTML
    const element = $(`
      <div class="os-item-card" data-pid="${product.pid}" data-sid="${product.sid}" style="cursor: pointer;">
        <img class="os-item-img" loading="lazy" src="${product.image || 'https://placehold.co/400x400/eee/aaa?text=No+Image'}" onerror="this.onerror=null;this.src='https://placehold.co/400x400/eee/aaa?text=No+Image';" alt="${product.name}">
        <div class="os-item-info">
          <span class="os-item-name">${product.name}</span>
          <span class="os-item-subtitle">${formatRupiah(product.price)}</span>
        </div>
      </div>
    `);
    container.append(element);
  });

  if (end < window.loadedProducts.length) {
    container.append('<div id="product-sentinel" style="height: 1px; width: 100%;"></div>');
    const sentinel = document.getElementById("product-sentinel");
    if (sentinel) window.scrollObserver.observe(sentinel);
  }
}

function renderStores(append = false) {
  const container = $("#os-store-list");
  if (!append) container.empty();
  else $("#store-sentinel").remove();

  const PAGE_SIZE = 15;
  const start = (window.storePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const chunk = window.loadedStores.slice(start, end);

  chunk.forEach((store) => {
    const element = $(`
      <div class="os-item-card" data-sid="${store.sid}" data-city="${store.city}" style="cursor: pointer;">
        <img class="os-item-img" loading="lazy" src="${store.image || 'https://placehold.co/400x400/eee/aaa?text=No+Image'}" onerror="this.onerror=null;this.src='https://placehold.co/400x400/eee/aaa?text=No+Image';" alt="${store.name}">
        <div class="os-item-info">
          <span class="os-item-name">${store.name}</span>
          <span class="os-item-subtitle" style="color: #83746b; font-weight: 500;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${store.distance ? parseFloat(store.distance).toFixed(1) + " " + window.OS_I18N.km_away : store.city || window.OS_I18N.results_stores}
          </span>
        </div>
      </div>
    `);
    container.append(element);
  });
  
  if (end < window.loadedStores.length) {
    container.append('<div id="store-sentinel" style="height: 1px; width: 100%;"></div>');
    const sentinel = document.getElementById("store-sentinel");
    if (sentinel) window.scrollObserver.observe(sentinel);
  }
}

// Format Rupiah
function formatRupiah(angka) {
  const num = Number(angka) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

// ====== PRODUCT AND STORE DETAIL LOGIC ======
window.loadProductDetail = async function(pid) {
  window.currentPid = pid;
  try {
    const response = await fetch("/api/searchproductdetail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: parseInt(pid) })
    });
    
    if (!response.ok) throw new Error("API failed");
    const data = await response.json();
    const products = data.products || [];
    const product = products.find(p => p.pid == pid) || products[0];
    const store = data.store;
    const workTime = data.work_time || [];
    const reviews = data.reviews || [];
    
    if (!product || !store) {
      showNotFoundModal("Produk Tidak Ditemukan", "Maaf, produk yang Anda cari tidak tersedia atau mungkin telah dihapus.");
      return;
    }
    
    // Ensure both IDs are updated for sharing features
    window.currentSid = store.sid;

    // Update Product Card UI
    $('#pd-title').text(product.name);
    $('#pd-price').text(formatRupiah(product.price));
    $('#pd-desc').text(product.description || "Deskripsi tidak tersedia.");
    
    // Populate Carousel
    let images = [];
    try { images = JSON.parse(product.images || "[]"); } catch(e){}
    if (images.length === 0 && product.image) images.push(product.image);
    
    const carouselTrack = $('#product-carousel');
    carouselTrack.empty();
    images.forEach(img => {
      carouselTrack.append(`<img src="${img}" class="os-pd-carousel-slide" alt="Product Image" style="min-width: 100%; object-fit: cover;" onerror="this.onerror=null;this.src='https://placehold.co/400x400/eee/aaa?text=No+Image';">`);
    });
    $('#product-indicator').text('1/' + (images.length || 1));

    // Update Store Info on Store Card
    populateStoreUI(store, products, reviews, workTime);

    // Show Cards (with Mobile Logic) and Animations
    const pdCard = $('#os-pd-card');
    const storeCard = $('#os-store-card');
    
    // Check if only store card was visible before
    const wasOnlyStoreVisible = storeCard.css('display') === 'flex' && pdCard.css('display') === 'none';
    
    pdCard.removeClass('os-anim-slide-down os-anim-slide-up os-anim-slide-right');
    storeCard.removeClass('os-anim-slide-down os-anim-slide-up os-anim-slide-right');
    void pdCard[0].offsetWidth; // trigger reflow
    void storeCard[0].offsetWidth;
    
    // Product always slides from top to down
    pdCard.css('display', 'flex').addClass('os-anim-slide-down');
    
    // Store card animation logic
    if (wasOnlyStoreVisible && $(window).width() >= 1400) {
       storeCard.css('display', 'flex').addClass('hide-on-mobile os-anim-slide-right');
    } else {
       storeCard.css('display', 'flex').addClass('hide-on-mobile os-anim-slide-up');
    }

    if ($(window).width() <= 767) {
      if (!$('.os-main-content').hasClass('modal-active')) {
        history.pushState({ modalOpen: true }, '', '');
      }
      $('.os-main-content').addClass('modal-active');
    }
  } catch (err) {
    console.error(err);
  }
}

window.loadStoreDetail = async function(sid) {
  window.currentSid = sid;
  try {
    const response = await fetch("/api/getstoreandproducts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: parseInt(sid), userLat: window.userLatLng?.lat, userLng: window.userLatLng?.lng })
    });
    
    if (!response.ok) throw new Error("API failed");
    const data = await response.json();
    const store = data.store;
    const products = data.products || [];
    const workTime = data.work_time || [];
    const reviews = data.reviews || [];
    
    if (!store) {
      showNotFoundModal("Toko Tidak Ditemukan", "Maaf, toko yang Anda cari tidak tersedia atau mungkin telah tutup.");
      return;
    }

    populateStoreUI(store, products, reviews, workTime);

    const storeCard = $('#os-store-card');
    storeCard.removeClass('os-anim-slide-down os-anim-slide-up os-anim-slide-right');
    void storeCard[0].offsetWidth; // trigger reflow

    // Show only Store Card
    $('#os-pd-card').css('display', 'none');
    storeCard.css('display', 'flex').removeClass('hide-on-mobile').addClass('os-anim-slide-up');

    if ($(window).width() <= 767) {
      if (!$('.os-main-content').hasClass('modal-active')) {
        history.pushState({ modalOpen: true }, '', '');
      }
      $('.os-main-content').addClass('modal-active');
    }
  } catch (err) {
    console.error(err);
  }
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; 
  var dLat = (lat2 - lat1) * (Math.PI/180);
  var dLon = (lon2 - lon1) * (Math.PI/180); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

function populateStoreUI(store, products, reviews, workTime) {
  $('#sc-hero-img').attr('src', store.hero_image || store.image || "https://placehold.co/600x180/eee/aaa?text=Store");
  $('#sc-title').text(store.name);

  let calculatedDistance = null;
  if (store.distance != null) {
    calculatedDistance = parseFloat(store.distance);
  } else if (typeof userLatLng !== 'undefined' && userLatLng && store.latitude && store.longitude) {
    calculatedDistance = getDistanceFromLatLonInKm(userLatLng.lat, userLatLng.lng, store.latitude, store.longitude);
  }

  let distanceStr = calculatedDistance != null ? calculatedDistance.toFixed(1) + " " + window.OS_I18N.km_away : '';
  let subtitleText = (store.type ? store.type + ' • ' : '') + store.city;
  if (distanceStr) subtitleText += ' • ' + distanceStr;
  
  $('#sc-subtitle').text(subtitleText);
  
  // Etalase Grid
  window.currentStoreProducts = products || [];
  $('#os-etalase-search-input').val(''); // Reset search on load
  window.renderEtalaseGrid(window.currentStoreProducts);

  // Rating Tab Data
  const ratingTab = $('#tab-rating');
  ratingTab.empty();
  
  let avg = '0.0';
  let length = (reviews && reviews.length) ? reviews.length : 0;
  if (length > 0) {
    let sum = 0;
    reviews.forEach(r => sum += (r.rating || 5));
    avg = (sum / length).toFixed(1);
  }
  
  let avgNum = parseFloat(avg);
  let starsHtml = '';
  for (let i = 0; i < 5; i++) {
    if (avgNum >= i + 1) {
      starsHtml += `<svg viewBox="0 0 24 24" width="16" height="16" fill="var(--primary)" style="fill: var(--primary);"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>`;
    } else if (avgNum >= i + 0.5) {
      starsHtml += `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" style="fill: none;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="var(--primary)" stroke-width="2"></path><path d="M12 2v15.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="var(--primary)"></path></svg>`;
    } else {
      starsHtml += `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" style="fill: none;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="var(--primary)" stroke-width="2"></path></svg>`;
    }
  }

  let ratingHtml = `
    <div class="os-rating-summary">
      <div class="os-rating-score">
        <span class="os-rating-number">${avg}</span>
        <div class="os-rating-stars">
          ${starsHtml}
        </div>
        <span class="os-rating-count">${length} ${window.OS_I18N.reviews}</span>
      </div>
      <div class="os-rating-bars">
        <div class="os-rating-bar-item"><div class="os-rating-bar-track"><div class="os-rating-bar-fill" style="width: 0%;"></div></div><span class="os-rating-bar-label">5</span></div>
        <div class="os-rating-bar-item"><div class="os-rating-bar-track"><div class="os-rating-bar-fill" style="width: 0%;"></div></div><span class="os-rating-bar-label">4</span></div>
        <div class="os-rating-bar-item"><div class="os-rating-bar-track"><div class="os-rating-bar-fill" style="width: 0%;"></div></div><span class="os-rating-bar-label">3</span></div>
        <div class="os-rating-bar-item"><div class="os-rating-bar-track"><div class="os-rating-bar-fill" style="width: 0%;"></div></div><span class="os-rating-bar-label">2</span></div>
        <div class="os-rating-bar-item"><div class="os-rating-bar-track"><div class="os-rating-bar-fill" style="width: 0%;"></div></div><span class="os-rating-bar-label">1</span></div>
      </div>
    </div>
    <h3 class="os-review-list-title">${window.OS_I18N.latest_reviews}</h3>
  `;
  
  if (length > 0) {
    reviews.forEach(r => {
      ratingHtml += `
        <div class="os-review-item">
          <div class="os-review-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div class="os-review-content">
            <div class="os-review-header">
              <span class="os-review-name">${r.user_name || 'User'}</span>
              <span class="os-review-date">${r.date || 'recently'}</span>
            </div>
            <p class="os-review-text">${r.comment || 'No comment provided.'}</p>
          </div>
        </div>
      `;
    });
  } else {
    ratingHtml += `<div style="text-align: center; color: #888; padding: 24px; font-family: 'Inter', sans-serif;">${window.OS_I18N.no_reviews}</div>`;
  }
  ratingTab.html(ratingHtml);

  // Update Studio Tab Data (Add IDs if needed in future)
  $('.os-studio-name').text(store.owner_name || store.name);
  
  if (store.owner_image) {
    $('.os-studio-avatar').html(`<img src="${store.owner_image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" onerror="this.onerror=null;this.src='https://placehold.co/100x120/eee/aaa?text=User';" alt="Owner">`);
  } else {
    $('.os-studio-avatar').html(`<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`);
  }
  
  // Profile Information
  $('.os-studio-role').text(store.type || 'Store');
  $('.os-studio-detail').eq(0).text('Email: ' + (store.email || 'Tidak tersedia'));
  
  let joinedText = 'Joined: ';
  if (store.created_at) {
    const d = new Date(store.created_at);
    joinedText += d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  } else {
    joinedText += 'Unknown';
  }
  $('.os-studio-detail').eq(1).text(joinedText);

  // Address
  $('.os-studio-card-text').first().text(store.address || "${window.OS_I18N.address_not_provided}");
  
  // Working Hours
  const daysMap = window.OS_I18N.days;
  let wtHtml = "${window.OS_I18N.hours_not_set}";
  if (workTime && workTime.length > 0) {
    wtHtml = '<div style="display: flex; flex-direction: column; gap: 4px; width: 100%; margin-top: 8px;">';
    
    // Get current day (1-7, where Monday is 1)
    const today = new Date().getDay();
    const currentIsoDay = today === 0 ? 7 : today;

    wtHtml += workTime.map(w => {
      const dayName = daysMap[w.day_of_week] || w.day_of_week;
      const open = w.open_time ? w.open_time.substring(0, 5) : '';
      const close = w.close_time ? w.close_time.substring(0, 5) : '';
      const timeString = (open && close) ? `${open} - ${close}` : 'Closed';
      
      const isToday = (w.day_of_week == currentIsoDay);
      
      const dayColor = isToday ? 'white' : '#888';
      const dayWeight = isToday ? '600' : '500';
      const timeColor = isToday ? 'white' : '#1e1b18';
      const timeWeight = isToday ? '700' : '600';
      const rowStyle = isToday 
        ? 'background-color: var(--primary); padding: 6px 12px; border-radius: 8px; margin: 2px 0;' 
        : 'border-bottom: 1px dashed rgba(0,0,0,0.05); padding: 6px 4px;';
      
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box; ${rowStyle}">
          <span style="color: ${dayColor}; font-weight: ${dayWeight}; font-size: 0.85rem;">${dayName}</span>
          <span style="color: ${timeColor}; font-weight: ${timeWeight}; font-size: 0.85rem; font-family: 'Outfit', sans-serif;">${timeString}</span>
        </div>
      `;
    }).join('');
    wtHtml += '</div>';
  }
  $('.os-studio-card-text').last().css({ 'display': 'block', 'width': '100%' }).html(wtHtml);

  // Social Media
  const socialsContainer = $('.os-studio-socials');
  socialsContainer.empty();
  let hasSocials = false;

  if (store.facebook) {
    socialsContainer.append(`<a href="${store.facebook}" target="_blank" class="os-studio-social-btn" title="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>`);
    hasSocials = true;
  }
  if (store.instagram) {
    socialsContainer.append(`<a href="${store.instagram}" target="_blank" class="os-studio-social-btn" title="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>`);
    hasSocials = true;
  }
  if (store.youtube) {
    socialsContainer.append(`<a href="${store.youtube}" target="_blank" class="os-studio-social-btn" title="YouTube"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg></a>`);
    hasSocials = true;
  }

  if (hasSocials) {
    $('.os-studio-social-title').show();
    socialsContainer.show();
  } else {
    $('.os-studio-social-title').hide();
    socialsContainer.hide();
  }

  // Handle WhatsApp Formatting and Click Events
  let waNumber = store.contact || ""; 
  if (waNumber) {
    waNumber = waNumber.replace(/[^0-9+]/g, ''); // Remove spaces, dashes, etc
    if (waNumber.startsWith('0')) {
      waNumber = '62' + waNumber.substring(1);
    } else if (waNumber.startsWith('+62')) {
      waNumber = '62' + waNumber.substring(3);
    }
  }

  $('#pd-wa-btn, #sc-contact-btn').off('click').on('click', function(e) {
    e.stopPropagation();
    if (waNumber) {
      window.open(`https://wa.me/${waNumber}`, '_blank');
    } else {
      alert(window.OS_I18N.contact_not_available);
    }
  });

  // Handle Route Click Event
  $('#sc-route-btn').off('click').on('click', function(e) {
    e.stopPropagation();
    if (store.latitude && store.longitude) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`, '_blank');
    } else {
      alert(window.OS_I18N.location_not_available);
    }
  });
}

window.showNotFoundModal = function(title, message) {
  $('#os-nf-title').text(title);
  $('#os-nf-message').text(message);
  const modal = $('#os-not-found-modal');
  modal.css('display', 'flex');
  void modal[0].offsetWidth; // trigger reflow
  modal.css('opacity', '1');
  modal.find('.os-nf-content').css('transform', 'scale(1)');
};

window.hideNotFoundModal = function() {
  const modal = $('#os-not-found-modal');
  modal.css('opacity', '0');
  modal.find('.os-nf-content').css('transform', 'scale(0.9)');
  setTimeout(() => {
    modal.css('display', 'none');
  }, 300);
};

$(document).ready(function() {
  $('#os-nf-close').on('click', function(e) {
    e.stopPropagation();
    hideNotFoundModal();
  });

  // Language Selector Logic
  const langBtn = document.getElementById('languageSelectorBtn');
  const langPanel = document.getElementById('languageOptionsPanel');
  const langIcon = document.getElementById('languageSelectorIcon');
  let isLangOpen = false;

  if (langBtn) {
    langBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isLangOpen = !isLangOpen;
      if (isLangOpen) {
        langPanel.style.maxHeight = '250px';
        langIcon.style.transform = 'rotate(180deg)';
      } else {
        langPanel.style.maxHeight = '0px';
        langIcon.style.transform = 'rotate(0deg)';
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (isLangOpen && !document.getElementById('languageSelectorWrapper').contains(e.target)) {
        isLangOpen = false;
        langPanel.style.maxHeight = '0px';
        langIcon.style.transform = 'rotate(0deg)';
      }
    });
  }
});
