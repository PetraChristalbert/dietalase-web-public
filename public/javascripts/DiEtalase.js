// maps.js

let map;
let userMarker;

// ====== LOCATION MODAL LOGIC ======
let locationGranted = false;

function promptForLocation(onSuccess) {
  $('#location-modal').addClass('active');
  
  // Unbind previous to avoid multiple triggers
  $('#loc-btn-allow').off('click').on('click', function() {
    $('#location-modal').removeClass('active');
    if (!navigator.geolocation) {
      alert("Geolocation not supported by browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationGranted = true;
        userLatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        // Geocode and set city
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: userLatLng }, (results, status) => {
          if (status === "OK" && results[0]) {
             for (const c of results[0].address_components) {
               if (c.types.includes("locality") || c.types.includes("administrative_area_level_2")) {
                 userCity = c.long_name; break;
               }
             }
             if (map) map.setCenter(userLatLng);
             if (onSuccess) onSuccess();
          } else {
             if (onSuccess) onSuccess();
          }
        });
      },
      (error) => {
        console.warn("Location error:", error);
      }
    );
  });

  $('#loc-btn-deny').off('click').on('click', function() {
    $('#location-modal').removeClass('active');
    // System doesn't work at all if denied (per user request)
    // Clear search box and reset
    $("#search_textboxt").val('');
  });
}

let userLatLng = null;
let userCity = null;
let hasRequestedLocation = false;
let searchTimeoutLocation = null;
let currentMarker = null;

(function () {
  const pid = window.pid;
  const sid = window.sid;

  if (pid !== "") {
    loadProductDetail(pid);
    $(".w-layout-blockcontainer.tab_product.w-container").css(
      "display",
      "flex"
    );
  } else if (sid !== "") {
    loadStoreDetail(sid);
    $(".w-layout-blockcontainer.tab_store.w-container").css("display", "flex");
  }

  delete window.pid;
  delete window.sid;

  // Remove the injected script from DOM
  const scriptTag = document.getElementById("injected-data");
  if (scriptTag) scriptTag.remove();
})();

// ====== NEW PRODUCT AND STORE DETAIL LOGIC ======
window.loadProductDetail = async function(pid) {
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
    
    if (!product || !store) return;

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
      carouselTrack.append(`<img src="${img}" class="os-pd-carousel-slide" alt="Product Image" style="min-width: 100%; object-fit: cover;">`);
    });
    $('#product-indicator').text(`1/${images.length || 1}`);

    // Update Store Info on Store Card
    populateStoreUI(store, products, reviews, workTime);

    // Show Cards (with Mobile Logic)
    $('#os-pd-card').css('display', 'flex');
    $('#os-store-card').css('display', 'flex').addClass('hide-on-mobile');
  } catch (err) {
    console.error(err);
  }
}

window.loadStoreDetail = async function(sid) {
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
    
    if (!store) return;

    populateStoreUI(store, products, reviews, workTime);

    // Show only Store Card
    $('#os-pd-card').css('display', 'none');
    $('#os-store-card').css('display', 'flex').removeClass('hide-on-mobile');
  } catch (err) {
    console.error(err);
  }
}

function populateStoreUI(store, products, reviews, workTime) {
  $('#sc-hero-img').attr('src', store.hero_image || store.image || "https://placehold.co/600x180/eee/aaa?text=Store");
  $('#sc-title').text(store.name);
  let distanceStr = store.distance ? parseFloat(store.distance).toFixed(1) + ' km away' : '';
  $('#sc-subtitle').text(`${store.city || ""} • ${distanceStr}`);
  
  // Etalase Grid
  const etalaseGrid = $('#sc-etalase-grid');
  etalaseGrid.empty();
  if (products.length > 0) {
    products.forEach(p => {
      etalaseGrid.append(`
        <div class="os-etalase-item" onclick="loadProductDetail(${p.pid})" style="cursor:pointer;">
          <div class="os-etalase-img-container">
            <img src="${p.image}" alt="${p.name}">
          </div>
          <span class="os-etalase-name">${p.name}</span>
          <span class="os-etalase-price">${formatRupiah(p.price)}</span>
        </div>
      `);
    });
  } else {
    etalaseGrid.append(`<div style="width:100%;text-align:center;color:#888;">Belum ada produk.</div>`);
  }

  // Update Map
  if (window.map && store.latitude && store.longitude) {
    const pos = { lat: parseFloat(store.latitude), lng: parseFloat(store.longitude) };
    map.setCenter(pos);
    map.setZoom(15);
    if (window.currentMarker) window.currentMarker.setMap(null);
    window.currentMarker = new google.maps.Marker({ position: pos, map: map, title: store.name });
  }

  // Update Studio Tab Data (Add IDs if needed in future)
  $('.os-studio-name').text(store.name);
  $('.os-studio-card-text').first().text(store.address || "Address not provided");
  
  const wtText = workTime.map(w => `${w.day_of_week}: ${w.open_time} - ${w.close_time}`).join('
') || "Operational hours not set";
  $('.os-studio-card-text').last().text(wtText);
}

// ==========================================


function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 6,
    center: { lat: -2.5489, lng: 118.0149 },
    gestureHandling: "greedy",
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: false,
    styles: [
      { featureType: "poi.business", stylers: [{ visibility: "off" }] },
      { featureType: "poi.attraction", stylers: [{ visibility: "off" }] },
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
    ],
  });
}
window.initMap = initMap; // Allow Google Maps to call it

async function detectUserLocation(callback) {
  if (!navigator.geolocation) {
    console.warn("Geolocation not supported.");
    if (callback) callback();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLatLng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      const geocoder = new google.maps.Geocoder();
      const latlng = { lat: userLatLng.lat, lng: userLatLng.lng };

      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === "OK" && results[0]) {
          const components = results[0].address_components;
          let foundCity = null;

          for (const c of components) {
            if (c.types.includes("locality")) {
              foundCity = c.long_name;
              break;
            }
          }
          if (!foundCity) {
            for (const c of components) {
              if (c.types.includes("administrative_area_level_2")) {
                foundCity = c.long_name;
                break;
              }
            }
          }
          if (!foundCity) {
            for (const c of components) {
              if (c.types.includes("administrative_area_level_1")) {
                foundCity = c.long_name;
                break;
              }
            }
          }

          userCity = foundCity;

          // Smooth zoom into the detected user location
          if (map && userLatLng) {
            map.panTo(userLatLng);

            // Apply a smooth zoom effect
            const currentZoom = map.getZoom();
            const targetZoom = 12; // Adjust to fit the city nicely
            let step = currentZoom;

            const zoomInInterval = setInterval(() => {
              if (step < targetZoom) {
                step += 1;
                map.setZoom(step);
              } else {
                clearInterval(zoomInInterval);
              }
            }, 120); // Adjust speed as needed
          }
        } else {
          console.warn("Geocoder failed:", status);
        }

        if (callback) callback();
      });
    },
    (error) => {
      console.warn("Geolocation error:", error);
      if (callback) callback();
    }
  );
}

let searchTimeout;

// --- Advanced Filter States ---
let currentScope = 'Lokal & Sekitar';
let currentRadius = 25;
let currentCategory = 'Semua';
let currentSort = 'Relevansi';
let isOpenNow = false;
let currentMinPrice = '';
let currentMaxPrice = '';

// Make trigger search globally available for the menu toggle in online_store.ejs
window.executeSearch = executeSearch;

$("#search_textboxt").on("input", function (e) {
  if (!userLatLng) {
    $(this).blur();
    promptForLocation(() => {
      $(this).focus();
    });
    return;
  }
  clearTimeout(searchTimeout);
  const keyword = $(this).val().trim();
  const productContainer = $(".list_searched_product");
  const storeContainer = $(".list_searched_store");

  productContainer.empty().append(`
        <div class="animation_box" style="display:flex;">
            <img src="https://cdn.prod.website-files.com/67e65e418f03b386607833b9/67ee47d2577c88e6ca235c07_loading%20animation.gif"
                loading="lazy" alt="" class="animation_loading" />
        </div>
    `);

  storeContainer.empty().append(`
        <div class="animation_box" style="display:flex;">
            <img src="https://cdn.prod.website-files.com/67e65e418f03b386607833b9/67ee47d2577c88e6ca235c07_loading%20animation.gif"
                loading="lazy" alt="" class="animation_loading" />
        </div>
    `);

  if (keyword !== "") {
    searchTimeout = setTimeout(() => {
      const currentKeyword = $("#search_textboxt").val().trim();
      if (currentKeyword === "") {
        productContainer.empty();
        storeContainer.empty();
        return;
      }

      executeSearch(currentKeyword);
    }, 1500);
  } else {
    productContainer.empty();
    storeContainer.empty();
  }
});

async function executeSearch(currentKeyword) {
  if (!userLatLng) return;

  const productContainer = $(".list_searched_product");
  const storeContainer = $(".list_searched_store");

  if (!userLatLng || !userLatLng.lat || !userLatLng.lng || !userCity) {
    console.warn("User location is not available yet.");
    productContainer.empty();
    storeContainer.empty();
    return;
  }

  try {
    const response = await fetch("/api/searchproductstore", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyword: currentKeyword,
        latitude: userLatLng.lat,
        longitude: userLatLng.lng,
        city: userCity,
        scope: currentScope,
        radius: currentRadius,
        category: currentCategory,
        minPrice: currentMinPrice,
        maxPrice: currentMaxPrice,
        openNow: isOpenNow,
        sortBy: currentSort
      }),
    });

    let data;

    try {
      data = await response.json();
    } catch (err) {
      const errorText = await response.text(); // fallback if not JSON
      console.error("Error parsing JSON response:", errorText);
      throw err; // re-throw to go into the catch below
    }

    if (!response.ok) {
      console.error("Error response from server:", data);
      throw new Error("Server responded with error status");
    }

    productContainer.empty();
    storeContainer.empty();

    const products = Array.isArray(data.products) ? data.products : [];
    const stores = Array.isArray(data.stores) ? data.stores : [];

    if (products.length > 0) {
      renderProducts(products);
    } else {
      productContainer.append(
        `<div class="notif_not_found">Produk tidak ditemukan.</div>`
      );
    }

    if (stores.length > 0) {
      renderStores(stores);
    } else {
      storeContainer.append(
        `<div class="notif_not_found">Toko tidak ditemukan.</div>`
      );
    }
  } catch (error) {
    console.error("Search failed:", error);
    productContainer
      .empty()
      .append(
        `<div class="notif_not_found">Terjadi kesalahan saat mencari produk.</div>`
      );
    storeContainer
      .empty()
      .append(
        `<div class="notif_not_found">Terjadi kesalahan saat mencari toko.</div>`
      );
  }
}

function renderProducts(products) {
  const container = $(".list_searched_product");
  products.forEach((product) => {
    const element = $(`
            <div data-w-id="e3a75c7d-2484-a0dc-8e0c-03be9f3535ee" class="object_product" onclick="loadProductDetail(${product.pid})" style="cursor:pointer;" data-pid="${
              product.pid
            }" data-sid="${product.sid}">
                <img src="${
                  product.image
                }" class="image" loading="lazy" alt="" />
                <div class="w-layout-vflex flex-block">
                    <div class="text-block-3">${product.name}</div>
                    <div class="text-block-2">${formatRupiah(
                      product.price
                    )}</div>
                </div>
            </div>
        `);
    container.append(element);
  });

  // Reinitialize Webflow interactions
  if (window.Webflow && Webflow.require) {
    Webflow.require("ix2").init(); // for Webflow Interactions 2.0
  }
}

function renderStores(stores) {
  const container = $(".list_searched_store");
  stores.forEach((store) => {
    const element = $(`
            <div data-w-id="b21d2ecc-34c5-40f6-2f7e-d85cf13fed5a" class="object_store" onclick="loadStoreDetail(${store.sid})" style="cursor:pointer;" data-sid="${store.sid}" data-city="${store.city}">
                <img src="${store.image}" class="image" loading="lazy" alt="" />
                <div class="w-layout-vflex flex-block">
                    <div class="text-block-3">${store.name}</div>
                    <div class="text-block-2">${store.address}</div>
                </div>
            </div>
        `);
    container.append(element);
  });

  if (window.Webflow && Webflow.require) {
    Webflow.require("ix2").init();
  }
}

// --- Filter Event Bindings ---
$(document).ready(function() {
  // Mobile Back Button Logic
  $('#os-back-to-store').on('click', function() {
    $('#os-pd-card').css('display', 'none');
    $('#os-store-card').removeClass('hide-on-mobile');
  });

  // Store Card Tabs Logic
  $('.os-sc-tab').on('click', function() {
    $('.os-sc-tab').removeClass('active');
    $(this).addClass('active');
    
    const targetId = $(this).attr('data-target');
    $('.os-sc-tab-pane').removeClass('active');
    $('#' + targetId).addClass('active');
  });

  // 1. Scope Chips
  $('#scope-chips .os-chip').on('click', function() {
    $('#scope-chips .os-chip').removeClass('active');
    $(this).addClass('active');
    currentScope = $(this).text().trim();
    
    // Hide/Show radius section based on scope
    const radiusSection = document.getElementById('radius-section');
    if (currentScope === 'Semua Lokasi') {
      if(radiusSection) radiusSection.style.display = 'none';
    } else {
      if(radiusSection) radiusSection.style.display = 'flex';
    }
  });

  // 2. Radius Slider
  $('#radius-slider').on('input', function() {
    currentRadius = $(this).val();
    $('#radius-label').text('Jarak Maksimum: ' + currentRadius + ' KM');
  });

  // 3. Category Chips
  $('#category-chips .os-chip').on('click', function() {
    $('#category-chips .os-chip').removeClass('active');
    $(this).addClass('active');
    currentCategory = $(this).text().trim();
  });

  // 4. Sort Chips
  $('#sort-chips .os-chip').on('click', function() {
    $('#sort-chips .os-chip').removeClass('active');
    $(this).addClass('active');
    currentSort = $(this).text().trim();
  });

  // 5. Open Now Switch
  $('#open-now-switch').on('change', function() {
    isOpenNow = $(this).is(':checked');
  });

  // 6. Price Range
  $('#price-min').on('input', function() {
    currentMinPrice = $(this).val().replace(/[^0-9]/g, '');
  });
  $('#price-max').on('input', function() {
    currentMaxPrice = $(this).val().replace(/[^0-9]/g, '');
  });

  // 7. Reset Button
  $('#filter-reset-btn').on('click', function() {
    // Reset States
    currentScope = 'Lokal & Sekitar';
    currentRadius = 25;
    currentCategory = 'Semua';
    currentSort = 'Relevansi';
    isOpenNow = false;
    currentMinPrice = '';
    currentMaxPrice = '';

    // Reset UI
    $('#scope-chips .os-chip').removeClass('active');
    $('#scope-chips .os-chip:first').addClass('active');
    const radiusSection = document.getElementById('radius-section');
    if(radiusSection) radiusSection.style.display = 'flex';
    
    $('#radius-slider').val(25);
    $('#radius-label').text('Jarak Maksimum: 25 KM');

    $('#category-chips .os-chip').removeClass('active');
    $('#category-chips .os-chip:first').addClass('active');

    $('#sort-chips .os-chip').removeClass('active');
    $('#sort-chips .os-chip:first').addClass('active');

    $('#open-now-switch').prop('checked', false);

    $('#price-min').val('');
    $('#price-max').val('');
  });
});

            </div>
        `);
    container.append(element);
  });

  // Reinitialize Webflow interactions
  if (window.Webflow && Webflow.require) {
    Webflow.require("ix2").init(); // for Webflow Interactions 2.0
  }
}

$(document).on("click", ".object_product", async function () {
  const pid = parseInt($(this).data("pid"), 10);

  loadProductDetail(pid);
});

$(document).on("click", ".object_store", async function () {
  const sid = parseInt($(this).data("sid"), 10);

  loadStoreDetail(sid);
});

$("#search_textboxt-2").on("input", function () {
  const searchValue = $(this).val().trim();

  clearTimeout(searchTimeoutLocation);
  $(".list_searched_location").empty(); // always clear list
  $(".animation_box").remove(); // remove any previous animation
  $(".notif_not_found").remove(); // remove any previous not-found

  if (searchValue.length === 0) {
    return;
  }

  // Show loading animation
  const loading = $(`
        <div class="animation_box">
            <img src="https://cdn.prod.website-files.com/67e65e418f03b386607833b9/67ee47d2577c88e6ca235c07_loading%20animation.gif"
                 loading="lazy" alt="" class="animation_loading" />
        </div>
    `);
  $(".list_searched_location").before(loading);

  searchTimeoutLocation = setTimeout(async () => {
    try {
      const res = await fetch("/api/searchlocation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyword: searchValue }),
      });

      $(".animation_box").remove(); // hide loading

      if (!res.ok) throw new Error("Gagal mengambil lokasi");

      const cities = await res.json(); // [{ city: ..., total: ... }, ...]

      const $list = $(".list_searched_location").empty().show();

      if (!cities.length) {
        const notFound = $(
          `<div class="notif_not_found">Kota tidak ditemukan.</div>`
        );
        $list.after(notFound);
        return;
      }

      cities.forEach(({ city, total }) => {
        const item = $(`
                    <div class="object_location">
                        <img
                            src="https://source.unsplash.com/100x100/?${encodeURIComponent(
                              city
                            )}"
                            loading="lazy" alt="" class="image" />
                        <div class="w-layout-vflex flex-block">
                            <div class="text-block-3">${city}</div>
                            <div class="text-block-2">${total} Toko</div>
                        </div>
                    </div>
                `);
        $list.append(item);
      });
    } catch (err) {
      $(".animation_box").remove(); // ensure animation is hidden on error
      console.error("Error fetching locations:", err);
    }
  }, 1500);
});

function formatRupiah(angka) {
  const number_string = angka.toString().replace(/[^,\d]/g, "");
  const split = number_string.split(",");
  const sisa = split[0].length % 3;
  let rupiah = split[0].substr(0, sisa);
  const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

  if (ribuan) {
    const separator = sisa ? "." : "";
    rupiah += separator + ribuan.join(".");
  }

  rupiah = split[1] !== undefined ? rupiah + "," + split[1] : rupiah;
  return "Rp " + rupiah;
}

(() => {
  var e = {
      5487: function () {
        "use strict";
        window.tram = (function (e) {
          function t(e, t) {
            return new F.Bare().init(e, t);
          }
          function n(e) {
            var t = parseInt(e.slice(1), 16);
            return [(t >> 16) & 255, (t >> 8) & 255, 255 & t];
          }
          function i(e, t, n) {
            return (
              "#" + (0x1000000 | (e << 16) | (t << 8) | n).toString(16).slice(1)
            );
          }
          function a() {}
          function r(e, t, n) {
            if ((void 0 !== t && (n = t), void 0 === e)) return n;
            var i = n;
            return (
              Q.test(e) || !K.test(e)
                ? (i = parseInt(e, 10))
                : K.test(e) && (i = 1e3 * parseFloat(e)),
              0 > i && (i = 0),
              i == i ? i : n
            );
          }
          function o(e) {
            j.debug && window && window.console.warn(e);
          }
          var l,
            c,
            u,
            s = (function (e, t, n) {
              function i(e) {
                return "object" == typeof e;
              }
              function a(e) {
                return "function" == typeof e;
              }
              function r() {}
              return function o(l, c) {
                function u() {
                  var e = new s();
                  return a(e.init) && e.init.apply(e, arguments), e;
                }
                function s() {}
                c === n && ((c = l), (l = Object)), (u.Bare = s);
                var d,
                  f = (r[e] = l[e]),
                  p = (s[e] = u[e] = new r());
                return (
                  (p.constructor = u),
                  (u.mixin = function (t) {
                    return (s[e] = u[e] = o(u, t)[e]), u;
                  }),
                  (u.open = function (e) {
                    if (
                      ((d = {}),
                      a(e) ? (d = e.call(u, p, f, u, l)) : i(e) && (d = e),
                      i(d))
                    )
                      for (var n in d) t.call(d, n) && (p[n] = d[n]);
                    return a(p.init) || (p.init = l), u;
                  }),
                  u.open(c)
                );
              };
            })("prototype", {}.hasOwnProperty),
            d = {
              ease: [
                "ease",
                function (e, t, n, i) {
                  var a = (e /= i) * e,
                    r = a * e;
                  return (
                    t +
                    n *
                      (-2.75 * r * a +
                        11 * a * a +
                        -15.5 * r +
                        8 * a +
                        0.25 * e)
                  );
                },
              ],
              "ease-in": [
                "ease-in",
                function (e, t, n, i) {
                  var a = (e /= i) * e,
                    r = a * e;
                  return t + n * (-1 * r * a + 3 * a * a + -3 * r + 2 * a);
                },
              ],
              "ease-out": [
                "ease-out",
                function (e, t, n, i) {
                  var a = (e /= i) * e,
                    r = a * e;
                  return (
                    t +
                    n *
                      (0.3 * r * a +
                        -1.6 * a * a +
                        2.2 * r +
                        -1.8 * a +
                        1.9 * e)
                  );
                },
              ],
              "ease-in-out": [
                "ease-in-out",
                function (e, t, n, i) {
                  var a = (e /= i) * e,
                    r = a * e;
                  return t + n * (2 * r * a + -5 * a * a + 2 * r + 2 * a);
                },
              ],
              linear: [
                "linear",
                function (e, t, n, i) {
                  return (n * e) / i + t;
                },
              ],
              "ease-in-quad": [
                "cubic-bezier(0.550, 0.085, 0.680, 0.530)",
                function (e, t, n, i) {
                  return n * (e /= i) * e + t;
                },
              ],
              "ease-out-quad": [
                "cubic-bezier(0.250, 0.460, 0.450, 0.940)",
                function (e, t, n, i) {
                  return -n * (e /= i) * (e - 2) + t;
                },
              ],
              "ease-in-out-quad": [
                "cubic-bezier(0.455, 0.030, 0.515, 0.955)",
                function (e, t, n, i) {
                  return (e /= i / 2) < 1
                    ? (n / 2) * e * e + t
                    : (-n / 2) * (--e * (e - 2) - 1) + t;
                },
              ],
              "ease-in-cubic": [
                "cubic-bezier(0.550, 0.055, 0.675, 0.190)",
                function (e, t, n, i) {
                  return n * (e /= i) * e * e + t;
                },
              ],
              "ease-out-cubic": [
                "cubic-bezier(0.215, 0.610, 0.355, 1)",
                function (e, t, n, i) {
                  return n * ((e = e / i - 1) * e * e + 1) + t;
                },
              ],
              "ease-in-out-cubic": [
                "cubic-bezier(0.645, 0.045, 0.355, 1)",
                function (e, t, n, i) {
                  return (e /= i / 2) < 1
                    ? (n / 2) * e * e * e + t
                    : (n / 2) * ((e -= 2) * e * e + 2) + t;
                },
              ],
              "ease-in-quart": [
                "cubic-bezier(0.895, 0.030, 0.685, 0.220)",
                function (e, t, n, i) {
                  return n * (e /= i) * e * e * e + t;
                },
              ],
              "ease-out-quart": [
                "cubic-bezier(0.165, 0.840, 0.440, 1)",
                function (e, t, n, i) {
                  return -n * ((e = e / i - 1) * e * e * e - 1) + t;
                },
              ],
              "ease-in-out-quart": [
                "cubic-bezier(0.770, 0, 0.175, 1)",
                function (e, t, n, i) {
                  return (e /= i / 2) < 1
                    ? (n / 2) * e * e * e * e + t
                    : (-n / 2) * ((e -= 2) * e * e * e - 2) + t;
                },
              ],
              "ease-in-quint": [
                "cubic-bezier(0.755, 0.050, 0.855, 0.060)",
                function (e, t, n, i) {
                  return n * (e /= i) * e * e * e * e + t;
                },
              ],
              "ease-out-quint": [
                "cubic-bezier(0.230, 1, 0.320, 1)",
                function (e, t, n, i) {
                  return n * ((e = e / i - 1) * e * e * e * e + 1) + t;
                },
              ],
              "ease-in-out-quint": [
                "cubic-bezier(0.860, 0, 0.070, 1)",
                function (e, t, n, i) {
                  return (e /= i / 2) < 1
                    ? (n / 2) * e * e * e * e * e + t
                    : (n / 2) * ((e -= 2) * e * e * e * e + 2) + t;
                },
              ],
              "ease-in-sine": [
                "cubic-bezier(0.470, 0, 0.745, 0.715)",
                function (e, t, n, i) {
                  return -n * Math.cos((e / i) * (Math.PI / 2)) + n + t;
                },
              ],
              "ease-out-sine": [
                "cubic-bezier(0.390, 0.575, 0.565, 1)",
                function (e, t, n, i) {
                  return n * Math.sin((e / i) * (Math.PI / 2)) + t;
                },
              ],
              "ease-in-out-sine": [
                "cubic-bezier(0.445, 0.050, 0.550, 0.950)",
                function (e, t, n, i) {
                  return (-n / 2) * (Math.cos((Math.PI * e) / i) - 1) + t;
                },
              ],
              "ease-in-expo": [
                "cubic-bezier(0.950, 0.050, 0.795, 0.035)",
                function (e, t, n, i) {
                  return 0 === e ? t : n * Math.pow(2, 10 * (e / i - 1)) + t;
                },
              ],
              "ease-out-expo": [
                "cubic-bezier(0.190, 1, 0.220, 1)",
                function (e, t, n, i) {
                  return e === i
                    ? t + n
                    : n * (-Math.pow(2, (-10 * e) / i) + 1) + t;
                },
              ],
              "ease-in-out-expo": [
                "cubic-bezier(1, 0, 0, 1)",
                function (e, t, n, i) {
                  return 0 === e
                    ? t
                    : e === i
                    ? t + n
                    : (e /= i / 2) < 1
                    ? (n / 2) * Math.pow(2, 10 * (e - 1)) + t
                    : (n / 2) * (-Math.pow(2, -10 * --e) + 2) + t;
                },
              ],
              "ease-in-circ": [
                "cubic-bezier(0.600, 0.040, 0.980, 0.335)",
                function (e, t, n, i) {
                  return -n * (Math.sqrt(1 - (e /= i) * e) - 1) + t;
                },
              ],
              "ease-out-circ": [
                "cubic-bezier(0.075, 0.820, 0.165, 1)",
                function (e, t, n, i) {
                  return n * Math.sqrt(1 - (e = e / i - 1) * e) + t;
                },
              ],
              "ease-in-out-circ": [
                "cubic-bezier(0.785, 0.135, 0.150, 0.860)",
                function (e, t, n, i) {
                  return (e /= i / 2) < 1
                    ? (-n / 2) * (Math.sqrt(1 - e * e) - 1) + t
                    : (n / 2) * (Math.sqrt(1 - (e -= 2) * e) + 1) + t;
                },
              ],
              "ease-in-back": [
                "cubic-bezier(0.600, -0.280, 0.735, 0.045)",
                function (e, t, n, i, a) {
                  return (
                    void 0 === a && (a = 1.70158),
                    n * (e /= i) * e * ((a + 1) * e - a) + t
                  );
                },
              ],
              "ease-out-back": [
                "cubic-bezier(0.175, 0.885, 0.320, 1.275)",
                function (e, t, n, i, a) {
                  return (
                    void 0 === a && (a = 1.70158),
                    n * ((e = e / i - 1) * e * ((a + 1) * e + a) + 1) + t
                  );
                },
              ],
              "ease-in-out-back": [
                "cubic-bezier(0.680, -0.550, 0.265, 1.550)",
                function (e, t, n, i, a) {
                  return (
                    void 0 === a && (a = 1.70158),
                    (e /= i / 2) < 1
                      ? (n / 2) * e * e * (((a *= 1.525) + 1) * e - a) + t
                      : (n / 2) *
                          ((e -= 2) * e * (((a *= 1.525) + 1) * e + a) + 2) +
                        t
                  );
                },
              ],
            },
            f = {
              "ease-in-back": "cubic-bezier(0.600, 0, 0.735, 0.045)",
              "ease-out-back": "cubic-bezier(0.175, 0.885, 0.320, 1)",
              "ease-in-out-back": "cubic-bezier(0.680, 0, 0.265, 1)",
            },
            p = window,
            g = "bkwld-tram",
            E = /[\-\.0-9]/g,
            y = /[A-Z]/,
            m = "number",
            h = /^(rgb|#)/,
            b = /(em|cm|mm|in|pt|pc|px)$/,
            I = /(em|cm|mm|in|pt|pc|px|%)$/,
            T = /(deg|rad|turn)$/,
            _ = "unitless",
            v = /(all|none) 0s ease 0s/,
            O = /^(width|height)$/,
            A = document.createElement("a"),
            w = ["Webkit", "Moz", "O", "ms"],
            R = ["-webkit-", "-moz-", "-o-", "-ms-"],
            S = function (e) {
              if (e in A.style) return { dom: e, css: e };
              var t,
                n,
                i = "",
                a = e.split("-");
              for (t = 0; t < a.length; t++)
                i += a[t].charAt(0).toUpperCase() + a[t].slice(1);
              for (t = 0; t < w.length; t++)
                if ((n = w[t] + i) in A.style) return { dom: n, css: R[t] + e };
            },
            N = (t.support = {
              bind: Function.prototype.bind,
              transform: S("transform"),
              transition: S("transition"),
              backface: S("backface-visibility"),
              timing: S("transition-timing-function"),
            });
          if (N.transition) {
            var L = N.timing.dom;
            if (((A.style[L] = d["ease-in-back"][0]), !A.style[L]))
              for (var C in f) d[C][0] = f[C];
          }
          var M = (t.frame =
              (l =
                p.requestAnimationFrame ||
                p.webkitRequestAnimationFrame ||
                p.mozRequestAnimationFrame ||
                p.oRequestAnimationFrame ||
                p.msRequestAnimationFrame) && N.bind
                ? l.bind(p)
                : function (e) {
                    p.setTimeout(e, 16);
                  }),
            P = (t.now =
              (u =
                (c = p.performance) &&
                (c.now || c.webkitNow || c.msNow || c.mozNow)) && N.bind
                ? u.bind(c)
                : Date.now ||
                  function () {
                    return +new Date();
                  }),
            x = s(function (t) {
              function n(e, t) {
                var n = (function (e) {
                    for (var t = -1, n = e ? e.length : 0, i = []; ++t < n; ) {
                      var a = e[t];
                      a && i.push(a);
                    }
                    return i;
                  })(("" + e).split(" ")),
                  i = n[0];
                t = t || {};
                var a = $[i];
                if (!a) return o("Unsupported property: " + i);
                if (!t.weak || !this.props[i]) {
                  var r = a[0],
                    l = this.props[i];
                  return (
                    l || (l = this.props[i] = new r.Bare()),
                    l.init(this.$el, n, a, t),
                    l
                  );
                }
              }
              function i(e, t, i) {
                if (e) {
                  var o = typeof e;
                  if (
                    (t ||
                      (this.timer && this.timer.destroy(),
                      (this.queue = []),
                      (this.active = !1)),
                    "number" == o && t)
                  )
                    return (
                      (this.timer = new X({
                        duration: e,
                        context: this,
                        complete: a,
                      })),
                      void (this.active = !0)
                    );
                  if ("string" == o && t) {
                    switch (e) {
                      case "hide":
                        c.call(this);
                        break;
                      case "stop":
                        l.call(this);
                        break;
                      case "redraw":
                        u.call(this);
                        break;
                      default:
                        n.call(this, e, i && i[1]);
                    }
                    return a.call(this);
                  }
                  if ("function" == o) return void e.call(this, this);
                  if ("object" == o) {
                    var f = 0;
                    d.call(
                      this,
                      e,
                      function (e, t) {
                        e.span > f && (f = e.span), e.stop(), e.animate(t);
                      },
                      function (e) {
                        "wait" in e && (f = r(e.wait, 0));
                      }
                    ),
                      s.call(this),
                      f > 0 &&
                        ((this.timer = new X({
                          duration: f,
                          context: this,
                        })),
                        (this.active = !0),
                        t && (this.timer.complete = a));
                    var p = this,
                      g = !1,
                      E = {};
                    M(function () {
                      d.call(p, e, function (e) {
                        e.active && ((g = !0), (E[e.name] = e.nextStyle));
                      }),
                        g && p.$el.css(E);
                    });
                  }
                }
              }
              function a() {
                if (
                  (this.timer && this.timer.destroy(),
                  (this.active = !1),
                  this.queue.length)
                ) {
                  var e = this.queue.shift();
                  i.call(this, e.options, !0, e.args);
                }
              }
              function l(e) {
                var t;
                this.timer && this.timer.destroy(),
                  (this.queue = []),
                  (this.active = !1),
                  "string" == typeof e
                    ? ((t = {})[e] = 1)
                    : (t = "object" == typeof e && null != e ? e : this.props),
                  d.call(this, t, f),
                  s.call(this);
              }
              function c() {
                l.call(this), (this.el.style.display = "none");
              }
              function u() {
                this.el.offsetHeight;
              }
              function s() {
                var e,
                  t,
                  n = [];
                for (e in (this.upstream && n.push(this.upstream), this.props))
                  (t = this.props[e]).active && n.push(t.string);
                (n = n.join(",")),
                  this.style !== n &&
                    ((this.style = n), (this.el.style[N.transition.dom] = n));
              }
              function d(e, t, i) {
                var a,
                  r,
                  o,
                  l,
                  c = t !== f,
                  u = {};
                for (a in e)
                  (o = e[a]),
                    a in H
                      ? (u.transform || (u.transform = {}),
                        (u.transform[a] = o))
                      : (y.test(a) &&
                          (a = a.replace(/[A-Z]/g, function (e) {
                            return "-" + e.toLowerCase();
                          })),
                        a in $ ? (u[a] = o) : (l || (l = {}), (l[a] = o)));
                for (a in u) {
                  if (((o = u[a]), !(r = this.props[a]))) {
                    if (!c) continue;
                    r = n.call(this, a);
                  }
                  t.call(this, r, o);
                }
                i && l && i.call(this, l);
              }
              function f(e) {
                e.stop();
              }
              function p(e, t) {
                e.set(t);
              }
              function E(e) {
                this.$el.css(e);
              }
              function m(e, n) {
                t[e] = function () {
                  return this.children
                    ? h.call(this, n, arguments)
                    : (this.el && n.apply(this, arguments), this);
                };
              }
              function h(e, t) {
                var n,
                  i = this.children.length;
                for (n = 0; i > n; n++) e.apply(this.children[n], t);
                return this;
              }
              (t.init = function (t) {
                if (
                  ((this.$el = e(t)),
                  (this.el = this.$el[0]),
                  (this.props = {}),
                  (this.queue = []),
                  (this.style = ""),
                  (this.active = !1),
                  j.keepInherited && !j.fallback)
                ) {
                  var n = Y(this.el, "transition");
                  n && !v.test(n) && (this.upstream = n);
                }
                N.backface &&
                  j.hideBackface &&
                  z(this.el, N.backface.css, "hidden");
              }),
                m("add", n),
                m("start", i),
                m("wait", function (e) {
                  (e = r(e, 0)),
                    this.active
                      ? this.queue.push({ options: e })
                      : ((this.timer = new X({
                          duration: e,
                          context: this,
                          complete: a,
                        })),
                        (this.active = !0));
                }),
                m("then", function (e) {
                  return this.active
                    ? (this.queue.push({
                        options: e,
                        args: arguments,
                      }),
                      void (this.timer.complete = a))
                    : o(
                        "No active transition timer. Use start() or wait() before then()."
                      );
                }),
                m("next", a),
                m("stop", l),
                m("set", function (e) {
                  l.call(this, e), d.call(this, e, p, E);
                }),
                m("show", function (e) {
                  "string" != typeof e && (e = "block"),
                    (this.el.style.display = e);
                }),
                m("hide", c),
                m("redraw", u),
                m("destroy", function () {
                  l.call(this),
                    e.removeData(this.el, g),
                    (this.$el = this.el = null);
                });
            }),
            F = s(x, function (t) {
              function n(t, n) {
                var i = e.data(t, g) || e.data(t, g, new x.Bare());
                return i.el || i.init(t), n ? i.start(n) : i;
              }
              t.init = function (t, i) {
                var a = e(t);
                if (!a.length) return this;
                if (1 === a.length) return n(a[0], i);
                var r = [];
                return (
                  a.each(function (e, t) {
                    r.push(n(t, i));
                  }),
                  (this.children = r),
                  this
                );
              };
            }),
            U = s(function (e) {
              function t() {
                var e = this.get();
                this.update("auto");
                var t = this.get();
                return this.update(e), t;
              }
              var n = 500,
                a = "ease",
                l = 0;
              (e.init = function (e, t, i, o) {
                (this.$el = e), (this.el = e[0]);
                var c,
                  u,
                  s,
                  f = t[0];
                i[2] && (f = i[2]),
                  W[f] && (f = W[f]),
                  (this.name = f),
                  (this.type = i[1]),
                  (this.duration = r(t[1], this.duration, n)),
                  (this.ease =
                    ((c = t[2]),
                    (u = this.ease),
                    (s = a),
                    void 0 !== u && (s = u),
                    c in d ? c : s)),
                  (this.delay = r(t[3], this.delay, l)),
                  (this.span = this.duration + this.delay),
                  (this.active = !1),
                  (this.nextStyle = null),
                  (this.auto = O.test(this.name)),
                  (this.unit = o.unit || this.unit || j.defaultUnit),
                  (this.angle = o.angle || this.angle || j.defaultAngle),
                  j.fallback || o.fallback
                    ? (this.animate = this.fallback)
                    : ((this.animate = this.transition),
                      (this.string =
                        this.name +
                        " " +
                        this.duration +
                        "ms" +
                        ("ease" != this.ease ? " " + d[this.ease][0] : "") +
                        (this.delay ? " " + this.delay + "ms" : "")));
              }),
                (e.set = function (e) {
                  (e = this.convert(e, this.type)),
                    this.update(e),
                    this.redraw();
                }),
                (e.transition = function (e) {
                  (this.active = !0),
                    (e = this.convert(e, this.type)),
                    this.auto &&
                      ("auto" == this.el.style[this.name] &&
                        (this.update(this.get()), this.redraw()),
                      "auto" == e && (e = t.call(this))),
                    (this.nextStyle = e);
                }),
                (e.fallback = function (e) {
                  var n =
                    this.el.style[this.name] ||
                    this.convert(this.get(), this.type);
                  (e = this.convert(e, this.type)),
                    this.auto &&
                      ("auto" == n && (n = this.convert(this.get(), this.type)),
                      "auto" == e && (e = t.call(this))),
                    (this.tween = new V({
                      from: n,
                      to: e,
                      duration: this.duration,
                      delay: this.delay,
                      ease: this.ease,
                      update: this.update,
                      context: this,
                    }));
                }),
                (e.get = function () {
                  return Y(this.el, this.name);
                }),
                (e.update = function (e) {
                  z(this.el, this.name, e);
                }),
                (e.stop = function () {
                  (this.active || this.nextStyle) &&
                    ((this.active = !1),
                    (this.nextStyle = null),
                    z(this.el, this.name, this.get()));
                  var e = this.tween;
                  e && e.context && e.destroy();
                }),
                (e.convert = function (e, t) {
                  if ("auto" == e && this.auto) return e;
                  var n,
                    a,
                    r,
                    l,
                    c = "number" == typeof e,
                    u = "string" == typeof e;
                  switch (t) {
                    case m:
                      if (c) return e;
                      if (u && "" === e.replace(E, "")) return +e;
                      l = "number(unitless)";
                      break;
                    case h:
                      if (u) {
                        if ("" === e && this.original) return this.original;
                        if (t.test(e)) {
                          return "#" == e.charAt(0) && 7 == e.length
                            ? e
                            : ((n = e),
                              ((a = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(n))
                                ? i(a[1], a[2], a[3])
                                : n
                              ).replace(/#(\w)(\w)(\w)$/, "#$1$1$2$2$3$3"));
                        }
                      }
                      l = "hex or rgb string";
                      break;
                    case b:
                      if (c) return e + this.unit;
                      if (u && t.test(e)) return e;
                      l = "number(px) or string(unit)";
                      break;
                    case I:
                      if (c) return e + this.unit;
                      if (u && t.test(e)) return e;
                      l = "number(px) or string(unit or %)";
                      break;
                    case T:
                      if (c) return e + this.angle;
                      if (u && t.test(e)) return e;
                      l = "number(deg) or string(angle)";
                      break;
                    case _:
                      if (c || (u && I.test(e))) return e;
                      l = "number(unitless) or string(unit or %)";
                  }
                  return (
                    o(
                      "Type warning: Expected: [" +
                        l +
                        "] Got: [" +
                        typeof (r = e) +
                        "] " +
                        r
                    ),
                    e
                  );
                }),
                (e.redraw = function () {
                  this.el.offsetHeight;
                });
            }),
            G = s(U, function (e, t) {
              e.init = function () {
                t.init.apply(this, arguments),
                  this.original ||
                    (this.original = this.convert(this.get(), h));
              };
            }),
            D = s(U, function (e, t) {
              (e.init = function () {
                t.init.apply(this, arguments), (this.animate = this.fallback);
              }),
                (e.get = function () {
                  return this.$el[this.name]();
                }),
                (e.update = function (e) {
                  this.$el[this.name](e);
                });
            }),
            k = s(U, function (e, t) {
              function n(e, t) {
                var n, i, a, r, o;
                for (n in e)
                  (a = (r = H[n])[0]),
                    (i = r[1] || n),
                    (o = this.convert(e[n], a)),
                    t.call(this, i, o, a);
              }
              (e.init = function () {
                t.init.apply(this, arguments),
                  this.current ||
                    ((this.current = {}),
                    H.perspective &&
                      j.perspective &&
                      ((this.current.perspective = j.perspective),
                      z(this.el, this.name, this.style(this.current)),
                      this.redraw()));
              }),
                (e.set = function (e) {
                  n.call(this, e, function (e, t) {
                    this.current[e] = t;
                  }),
                    z(this.el, this.name, this.style(this.current)),
                    this.redraw();
                }),
                (e.transition = function (e) {
                  var t = this.values(e);
                  this.tween = new B({
                    current: this.current,
                    values: t,
                    duration: this.duration,
                    delay: this.delay,
                    ease: this.ease,
                  });
                  var n,
                    i = {};
                  for (n in this.current)
                    i[n] = n in t ? t[n] : this.current[n];
                  (this.active = !0), (this.nextStyle = this.style(i));
                }),
                (e.fallback = function (e) {
                  var t = this.values(e);
                  this.tween = new B({
                    current: this.current,
                    values: t,
                    duration: this.duration,
                    delay: this.delay,
                    ease: this.ease,
                    update: this.update,
                    context: this,
                  });
                }),
                (e.update = function () {
                  z(this.el, this.name, this.style(this.current));
                }),
                (e.style = function (e) {
                  var t,
                    n = "";
                  for (t in e) n += t + "(" + e[t] + ") ";
                  return n;
                }),
                (e.values = function (e) {
                  var t,
                    i = {};
                  return (
                    n.call(this, e, function (e, n, a) {
                      (i[e] = n),
                        void 0 === this.current[e] &&
                          ((t = 0),
                          ~e.indexOf("scale") && (t = 1),
                          (this.current[e] = this.convert(t, a)));
                    }),
                    i
                  );
                });
            }),
            V = s(function (t) {
              function r() {
                var e,
                  t,
                  n,
                  i = c.length;
                if (i)
                  for (M(r), t = P(), e = i; e--; ) (n = c[e]) && n.render(t);
              }
              var l = { ease: d.ease[1], from: 0, to: 1 };
              (t.init = function (e) {
                (this.duration = e.duration || 0), (this.delay = e.delay || 0);
                var t = e.ease || l.ease;
                d[t] && (t = d[t][1]),
                  "function" != typeof t && (t = l.ease),
                  (this.ease = t),
                  (this.update = e.update || a),
                  (this.complete = e.complete || a),
                  (this.context = e.context || this),
                  (this.name = e.name);
                var n = e.from,
                  i = e.to;
                void 0 === n && (n = l.from),
                  void 0 === i && (i = l.to),
                  (this.unit = e.unit || ""),
                  "number" == typeof n && "number" == typeof i
                    ? ((this.begin = n), (this.change = i - n))
                    : this.format(i, n),
                  (this.value = this.begin + this.unit),
                  (this.start = P()),
                  !1 !== e.autoplay && this.play();
              }),
                (t.play = function () {
                  var e;
                  this.active ||
                    (this.start || (this.start = P()),
                    (this.active = !0),
                    (e = this),
                    1 === c.push(e) && M(r));
                }),
                (t.stop = function () {
                  var t, n, i;
                  this.active &&
                    ((this.active = !1),
                    (t = this),
                    (i = e.inArray(t, c)) >= 0 &&
                      ((n = c.slice(i + 1)),
                      (c.length = i),
                      n.length && (c = c.concat(n))));
                }),
                (t.render = function (e) {
                  var t,
                    n = e - this.start;
                  if (this.delay) {
                    if (n <= this.delay) return;
                    n -= this.delay;
                  }
                  if (n < this.duration) {
                    var a,
                      r,
                      o,
                      l = this.ease(n, 0, 1, this.duration);
                    return (
                      (t = this.startRGB
                        ? ((a = this.startRGB),
                          (r = this.endRGB),
                          (o = l),
                          i(
                            a[0] + o * (r[0] - a[0]),
                            a[1] + o * (r[1] - a[1]),
                            a[2] + o * (r[2] - a[2])
                          ))
                        : Math.round((this.begin + l * this.change) * u) / u),
                      (this.value = t + this.unit),
                      void this.update.call(this.context, this.value)
                    );
                  }
                  (t = this.endHex || this.begin + this.change),
                    (this.value = t + this.unit),
                    this.update.call(this.context, this.value),
                    this.complete.call(this.context),
                    this.destroy();
                }),
                (t.format = function (e, t) {
                  if (((t += ""), "#" == (e += "").charAt(0)))
                    return (
                      (this.startRGB = n(t)),
                      (this.endRGB = n(e)),
                      (this.endHex = e),
                      (this.begin = 0),
                      void (this.change = 1)
                    );
                  if (!this.unit) {
                    var i = t.replace(E, "");
                    i !== e.replace(E, "") &&
                      o("Units do not match [tween]: " + t + ", " + e),
                      (this.unit = i);
                  }
                  (t = parseFloat(t)),
                    (e = parseFloat(e)),
                    (this.begin = this.value = t),
                    (this.change = e - t);
                }),
                (t.destroy = function () {
                  this.stop(),
                    (this.context = null),
                    (this.ease = this.update = this.complete = a);
                });
              var c = [],
                u = 1e3;
            }),
            X = s(V, function (e) {
              (e.init = function (e) {
                (this.duration = e.duration || 0),
                  (this.complete = e.complete || a),
                  (this.context = e.context),
                  this.play();
              }),
                (e.render = function (e) {
                  e - this.start < this.duration ||
                    (this.complete.call(this.context), this.destroy());
                });
            }),
            B = s(V, function (e, t) {
              (e.init = function (e) {
                var t, n;
                for (t in ((this.context = e.context),
                (this.update = e.update),
                (this.tweens = []),
                (this.current = e.current),
                e.values))
                  (n = e.values[t]),
                    this.current[t] !== n &&
                      this.tweens.push(
                        new V({
                          name: t,
                          from: this.current[t],
                          to: n,
                          duration: e.duration,
                          delay: e.delay,
                          ease: e.ease,
                          autoplay: !1,
                        })
                      );
                this.play();
              }),
                (e.render = function (e) {
                  var t,
                    n,
                    i = this.tweens.length,
                    a = !1;
                  for (t = i; t--; )
                    (n = this.tweens[t]).context &&
                      (n.render(e), (this.current[n.name] = n.value), (a = !0));
                  return a
                    ? void (this.update && this.update.call(this.context))
                    : this.destroy();
                }),
                (e.destroy = function () {
                  if ((t.destroy.call(this), this.tweens)) {
                    var e, n;
                    for (e = this.tweens.length; e--; )
                      this.tweens[e].destroy();
                    (this.tweens = null), (this.current = null);
                  }
                });
            }),
            j = (t.config = {
              debug: !1,
              defaultUnit: "px",
              defaultAngle: "deg",
              keepInherited: !1,
              hideBackface: !1,
              perspective: "",
              fallback: !N.transition,
              agentTests: [],
            });
          (t.fallback = function (e) {
            if (!N.transition) return (j.fallback = !0);
            j.agentTests.push("(" + e + ")");
            var t = RegExp(j.agentTests.join("|"), "i");
            j.fallback = t.test(navigator.userAgent);
          }),
            t.fallback("6.0.[2-5] Safari"),
            (t.tween = function (e) {
              return new V(e);
            }),
            (t.delay = function (e, t, n) {
              return new X({
                complete: t,
                duration: e,
                context: n,
              });
            }),
            (e.fn.tram = function (e) {
              return t.call(null, this, e);
            });
          var z = e.style,
            Y = e.css,
            W = { transform: N.transform && N.transform.css },
            $ = {
              color: [G, h],
              background: [G, h, "background-color"],
              "outline-color": [G, h],
              "border-color": [G, h],
              "border-top-color": [G, h],
              "border-right-color": [G, h],
              "border-bottom-color": [G, h],
              "border-left-color": [G, h],
              "border-width": [U, b],
              "border-top-width": [U, b],
              "border-right-width": [U, b],
              "border-bottom-width": [U, b],
              "border-left-width": [U, b],
              "border-spacing": [U, b],
              "letter-spacing": [U, b],
              margin: [U, b],
              "margin-top": [U, b],
              "margin-right": [U, b],
              "margin-bottom": [U, b],
              "margin-left": [U, b],
              padding: [U, b],
              "padding-top": [U, b],
              "padding-right": [U, b],
              "padding-bottom": [U, b],
              "padding-left": [U, b],
              "outline-width": [U, b],
              opacity: [U, m],
              top: [U, I],
              right: [U, I],
              bottom: [U, I],
              left: [U, I],
              "font-size": [U, I],
              "text-indent": [U, I],
              "word-spacing": [U, I],
              width: [U, I],
              "min-width": [U, I],
              "max-width": [U, I],
              height: [U, I],
              "min-height": [U, I],
              "max-height": [U, I],
              "line-height": [U, _],
              "scroll-top": [D, m, "scrollTop"],
              "scroll-left": [D, m, "scrollLeft"],
            },
            H = {};
          N.transform &&
            (($.transform = [k]),
            (H = {
              x: [I, "translateX"],
              y: [I, "translateY"],
              rotate: [T],
              rotateX: [T],
              rotateY: [T],
              scale: [m],
              scaleX: [m],
              scaleY: [m],
              skew: [T],
              skewX: [T],
              skewY: [T],
            })),
            N.transform &&
              N.backface &&
              ((H.z = [I, "translateZ"]),
              (H.rotateZ = [T]),
              (H.scaleZ = [m]),
              (H.perspective = [b]));
          var Q = /ms/,
            K = /s|\./;
          return (e.tram = t);
        })(window.jQuery);
      },
      5756: function (e, t, n) {
        "use strict";
        var i,
          a,
          r,
          o,
          l,
          c,
          u,
          s,
          d,
          f,
          p,
          g,
          E,
          y,
          m,
          h,
          b,
          I,
          T,
          _,
          v = window.$,
          O = n(5487) && v.tram;
        e.exports =
          (((i = {}).VERSION = "1.6.0-Webflow"),
          (a = {}),
          (r = Array.prototype),
          (o = Object.prototype),
          (l = Function.prototype),
          r.push,
          (c = r.slice),
          (u = (r.concat, o.toString, o.hasOwnProperty)),
          (s = r.forEach),
          (d = r.map),
          (f = (r.reduce, r.reduceRight, r.filter)),
          (p = (r.every, r.some)),
          (g = r.indexOf),
          (E = (r.lastIndexOf, Object.keys)),
          l.bind,
          (y =
            i.each =
            i.forEach =
              function (e, t, n) {
                if (null == e) return e;
                if (s && e.forEach === s) e.forEach(t, n);
                else if (e.length === +e.length) {
                  for (var r = 0, o = e.length; r < o; r++)
                    if (t.call(n, e[r], r, e) === a) return;
                } else {
                  for (var l = i.keys(e), r = 0, o = l.length; r < o; r++)
                    if (t.call(n, e[l[r]], l[r], e) === a) return;
                }
                return e;
              }),
          (i.map = i.collect =
            function (e, t, n) {
              var i = [];
              return null == e
                ? i
                : d && e.map === d
                ? e.map(t, n)
                : (y(e, function (e, a, r) {
                    i.push(t.call(n, e, a, r));
                  }),
                  i);
            }),
          (i.find = i.detect =
            function (e, t, n) {
              var i;
              return (
                m(e, function (e, a, r) {
                  if (t.call(n, e, a, r)) return (i = e), !0;
                }),
                i
              );
            }),
          (i.filter = i.select =
            function (e, t, n) {
              var i = [];
              return null == e
                ? i
                : f && e.filter === f
                ? e.filter(t, n)
                : (y(e, function (e, a, r) {
                    t.call(n, e, a, r) && i.push(e);
                  }),
                  i);
            }),
          (m =
            i.some =
            i.any =
              function (e, t, n) {
                t || (t = i.identity);
                var r = !1;
                return null == e
                  ? r
                  : p && e.some === p
                  ? e.some(t, n)
                  : (y(e, function (e, i, o) {
                      if (r || (r = t.call(n, e, i, o))) return a;
                    }),
                    !!r);
              }),
          (i.contains = i.include =
            function (e, t) {
              return (
                null != e &&
                (g && e.indexOf === g
                  ? -1 != e.indexOf(t)
                  : m(e, function (e) {
                      return e === t;
                    }))
              );
            }),
          (i.delay = function (e, t) {
            var n = c.call(arguments, 2);
            return setTimeout(function () {
              return e.apply(null, n);
            }, t);
          }),
          (i.defer = function (e) {
            return i.delay.apply(i, [e, 1].concat(c.call(arguments, 1)));
          }),
          (i.throttle = function (e) {
            var t, n, i;
            return function () {
              !t &&
                ((t = !0),
                (n = arguments),
                (i = this),
                O.frame(function () {
                  (t = !1), e.apply(i, n);
                }));
            };
          }),
          (i.debounce = function (e, t, n) {
            var a,
              r,
              o,
              l,
              c,
              u = function () {
                var s = i.now() - l;
                s < t
                  ? (a = setTimeout(u, t - s))
                  : ((a = null), !n && ((c = e.apply(o, r)), (o = r = null)));
              };
            return function () {
              (o = this), (r = arguments), (l = i.now());
              var s = n && !a;
              return (
                !a && (a = setTimeout(u, t)),
                s && ((c = e.apply(o, r)), (o = r = null)),
                c
              );
            };
          }),
          (i.defaults = function (e) {
            if (!i.isObject(e)) return e;
            for (var t = 1, n = arguments.length; t < n; t++) {
              var a = arguments[t];
              for (var r in a) void 0 === e[r] && (e[r] = a[r]);
            }
            return e;
          }),
          (i.keys = function (e) {
            if (!i.isObject(e)) return [];
            if (E) return E(e);
            var t = [];
            for (var n in e) i.has(e, n) && t.push(n);
            return t;
          }),
          (i.has = function (e, t) {
            return u.call(e, t);
          }),
          (i.isObject = function (e) {
            return e === Object(e);
          }),
          (i.now =
            Date.now ||
            function () {
              return new Date().getTime();
            }),
          (i.templateSettings = {
            evaluate: /<%([\s\S]+?)%>/g,
            interpolate: /<%=([\s\S]+?)%>/g,
            escape: /<%-([\s\S]+?)%>/g,
          }),
          (h = /(.)^/),
          (b = {
            "'": "'",
            "\\": "\\",
            "\r": "r",
            "\n": "n",
            "\u2028": "u2028",
            "\u2029": "u2029",
          }),
          (I = /\\|'|\r|\n|\u2028|\u2029/g),
          (T = function (e) {
            return "\\" + b[e];
          }),
          (_ = /^\s*(\w|\$)+\s*$/),
          (i.template = function (e, t, n) {
            !t && n && (t = n);
            var a,
              r = RegExp(
                [
                  ((t = i.defaults({}, t, i.templateSettings)).escape || h)
                    .source,
                  (t.interpolate || h).source,
                  (t.evaluate || h).source,
                ].join("|") + "|$",
                "g"
              ),
              o = 0,
              l = "__p+='";
            e.replace(r, function (t, n, i, a, r) {
              return (
                (l += e.slice(o, r).replace(I, T)),
                (o = r + t.length),
                n
                  ? (l += "'+\n((__t=(" + n + "))==null?'':_.escape(__t))+\n'")
                  : i
                  ? (l += "'+\n((__t=(" + i + "))==null?'':__t)+\n'")
                  : a && (l += "';\n" + a + "\n__p+='"),
                t
              );
            }),
              (l += "';\n");
            var c = t.variable;
            if (c) {
              if (!_.test(c))
                throw Error("variable is not a bare identifier: " + c);
            } else (l = "with(obj||{}){\n" + l + "}\n"), (c = "obj");
            l =
              "var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\n" +
              l +
              "return __p;\n";
            try {
              a = Function(t.variable || "obj", "_", l);
            } catch (e) {
              throw ((e.source = l), e);
            }
            var u = function (e) {
              return a.call(this, e, i);
            };
            return (u.source = "function(" + c + "){\n" + l + "}"), u;
          }),
          i);
      },
      9461: function (e, t, n) {
        "use strict";
        var i = n(3949);
        i.define(
          "brand",
          (e.exports = function (e) {
            var t,
              n = {},
              a = document,
              r = e("html"),
              o = e("body"),
              l = window.location,
              c = /PhantomJS/i.test(navigator.userAgent),
              u =
                "fullscreenchange webkitfullscreenchange mozfullscreenchange msfullscreenchange";
            function s() {
              var n =
                a.fullScreen ||
                a.mozFullScreen ||
                a.webkitIsFullScreen ||
                a.msFullscreenElement ||
                !!a.webkitFullscreenElement;
              e(t).attr("style", n ? "display: none !important;" : "");
            }
            n.ready = function () {
              var n = r.attr("data-wf-status"),
                i = r.attr("data-wf-domain") || "";
              /\.webflow\.io$/i.test(i) && l.hostname !== i && (n = !0),
                n &&
                  !c &&
                  ((t =
                    t ||
                    (function () {
                      var t = e('<a class="w-webflow-badge"></a>').attr(
                          "href",
                          "https://webflow.com?utm_campaign=brandjs"
                        ),
                        n = e("<img>")
                          .attr(
                            "src",
                            "https://d3e54v103j8qbb.cloudfront.net/img/webflow-badge-icon-d2.89e12c322e.svg"
                          )
                          .attr("alt", "")
                          .css({
                            marginRight: "4px",
                            width: "26px",
                          }),
                        i = e("<img>")
                          .attr(
                            "src",
                            "https://d3e54v103j8qbb.cloudfront.net/img/webflow-badge-text-d2.c82cec3b78.svg"
                          )
                          .attr("alt", "Made in Webflow");
                      return;
                    })()),
                  d(),
                  setTimeout(d, 500),
                  e(a).off(u, s).on(u, s));
            };
            function d() {
              var e = o.children(".w-webflow-badge"),
                n = e.length && e.get(0) === t,
                a = i.env("editor");
              if (n) {
                a && e.remove();
                return;
              }
              e.length && e.remove(), !a && o.append(t);
            }
            return n;
          })
        );
      },
      322: function (e, t, n) {
        "use strict";
        var i = n(3949);
        i.define(
          "edit",
          (e.exports = function (e, t, n) {
            if (
              ((n = n || {}),
              (i.env("test") || i.env("frame")) &&
                !n.fixture &&
                !(function () {
                  try {
                    return !!(window.top.__Cypress__ || window.PLAYWRIGHT_TEST);
                  } catch (e) {
                    return !1;
                  }
                })())
            )
              return { exit: 1 };
            var a,
              r = e(window),
              o = e(document.documentElement),
              l = document.location,
              c = "hashchange",
              u =
                n.load ||
                function () {
                  (a = !0),
                    (window.WebflowEditor = !0),
                    r.off(c, d),
                    (function (e) {
                      var t = window.document.createElement("iframe");
                      (t.src =
                        "https://webflow.com/site/third-party-cookie-check.html"),
                        (t.style.display = "none"),
                        (t.sandbox = "allow-scripts allow-same-origin");
                      var n = function (i) {
                        "WF_third_party_cookies_unsupported" === i.data
                          ? (g(t, n), e(!1))
                          : "WF_third_party_cookies_supported" === i.data &&
                            (g(t, n), e(!0));
                      };
                      (t.onerror = function () {
                        g(t, n), e(!1);
                      }),
                        window.addEventListener("message", n, !1),
                        window.document.body.appendChild(t);
                    })(function (t) {
                      e.ajax({
                        url: p(
                          "https://editor-api.webflow.com/api/editor/view"
                        ),
                        data: {
                          siteId: o.attr("data-wf-site"),
                        },
                        xhrFields: {
                          withCredentials: !0,
                        },
                        dataType: "json",
                        crossDomain: !0,
                        success: (function (t) {
                          return function (n) {
                            if (!n) {
                              console.error("Could not load editor data");
                              return;
                            }
                            (n.thirdPartyCookiesSupported = t),
                              (function (t, n) {
                                e.ajax({
                                  type: "GET",
                                  url: t,
                                  dataType: "script",
                                  cache: !0,
                                }).then(n, f);
                              })(
                                (function (e) {
                                  return e.indexOf("//") >= 0
                                    ? e
                                    : p("https://editor-api.webflow.com" + e);
                                })(n.scriptPath),
                                function () {
                                  window.WebflowEditor(n);
                                }
                              );
                          };
                        })(t),
                      });
                    });
                },
              s = !1;
            try {
              s =
                localStorage &&
                localStorage.getItem &&
                localStorage.getItem("WebflowEditor");
            } catch (e) {}
            function d() {
              if (!a) /\?edit/.test(l.hash) && u();
            }
            s
              ? u()
              : l.search
              ? (/[?&](edit)(?:[=&?]|$)/.test(l.search) ||
                  /\?edit$/.test(l.href)) &&
                u()
              : r.on(c, d).triggerHandler(c);
            function f(e, t, n) {
              throw (console.error("Could not load editor script: " + t), n);
            }
            function p(e) {
              return e.replace(/([^:])\/\//g, "$1/");
            }
            function g(e, t) {
              window.removeEventListener("message", t, !1), e.remove();
            }
            return {};
          })
        );
      },
      2338: function (e, t, n) {
        "use strict";
        n(3949).define(
          "focus-visible",
          (e.exports = function () {
            return {
              ready: function () {
                if ("undefined" != typeof document)
                  try {
                    document.querySelector(":focus-visible");
                  } catch (e) {
                    !(function (e) {
                      var t = !0,
                        n = !1,
                        i = null,
                        a = {
                          text: !0,
                          search: !0,
                          url: !0,
                          tel: !0,
                          email: !0,
                          password: !0,
                          number: !0,
                          date: !0,
                          month: !0,
                          week: !0,
                          time: !0,
                          datetime: !0,
                          "datetime-local": !0,
                        };
                      function r(e) {
                        return (
                          (!!e &&
                            e !== document &&
                            "HTML" !== e.nodeName &&
                            "BODY" !== e.nodeName &&
                            "classList" in e &&
                            "contains" in e.classList) ||
                          !1
                        );
                      }
                      function o(e) {
                        if (!e.getAttribute("data-wf-focus-visible"))
                          e.setAttribute("data-wf-focus-visible", "true");
                      }
                      function l() {
                        t = !1;
                      }
                      function c() {
                        document.addEventListener("mousemove", u),
                          document.addEventListener("mousedown", u),
                          document.addEventListener("mouseup", u),
                          document.addEventListener("pointermove", u),
                          document.addEventListener("pointerdown", u),
                          document.addEventListener("pointerup", u),
                          document.addEventListener("touchmove", u),
                          document.addEventListener("touchstart", u),
                          document.addEventListener("touchend", u);
                      }
                      function u(e) {
                        if (
                          !e.target.nodeName ||
                          "html" !== e.target.nodeName.toLowerCase()
                        )
                          (t = !1),
                            document.removeEventListener("mousemove", u),
                            document.removeEventListener("mousedown", u),
                            document.removeEventListener("mouseup", u),
                            document.removeEventListener("pointermove", u),
                            document.removeEventListener("pointerdown", u),
                            document.removeEventListener("pointerup", u),
                            document.removeEventListener("touchmove", u),
                            document.removeEventListener("touchstart", u),
                            document.removeEventListener("touchend", u);
                      }
                      document.addEventListener(
                        "keydown",
                        function (n) {
                          if (!n.metaKey && !n.altKey && !n.ctrlKey)
                            r(e.activeElement) && o(e.activeElement), (t = !0);
                        },
                        !0
                      ),
                        document.addEventListener("mousedown", l, !0),
                        document.addEventListener("pointerdown", l, !0),
                        document.addEventListener("touchstart", l, !0),
                        document.addEventListener(
                          "visibilitychange",
                          function () {
                            "hidden" === document.visibilityState &&
                              (n && (t = !0), c());
                          },
                          !0
                        ),
                        c(),
                        e.addEventListener(
                          "focus",
                          function (e) {
                            var n, i, l;
                            if (!!r(e.target)) {
                              if (
                                t ||
                                ((i = (n = e.target).type),
                                ("INPUT" === (l = n.tagName) &&
                                  a[i] &&
                                  !n.readOnly) ||
                                  ("TEXTAREA" === l && !n.readOnly) ||
                                  n.isContentEditable)
                              )
                                o(e.target);
                            }
                          },
                          !0
                        ),
                        e.addEventListener(
                          "blur",
                          function (e) {
                            if (!!r(e.target))
                              e.target.hasAttribute("data-wf-focus-visible") &&
                                ((n = !0),
                                window.clearTimeout(i),
                                (i = window.setTimeout(function () {
                                  n = !1;
                                }, 100)),
                                !(function (e) {
                                  if (!!e.getAttribute("data-wf-focus-visible"))
                                    e.removeAttribute("data-wf-focus-visible");
                                })(e.target));
                          },
                          !0
                        );
                    })(document);
                  }
              },
            };
          })
        );
      },
      8334: function (e, t, n) {
        "use strict";
        var i = n(3949);
        i.define(
          "focus",
          (e.exports = function () {
            var e = [],
              t = !1;
            function n(n) {
              t &&
                (n.preventDefault(),
                n.stopPropagation(),
                n.stopImmediatePropagation(),
                e.unshift(n));
            }
            function a(n) {
              var i, a;
              if (
                ((a = (i = n.target).tagName),
                (/^a$/i.test(a) && null != i.href) ||
                  (/^(button|textarea)$/i.test(a) && !0 !== i.disabled) ||
                  (/^input$/i.test(a) &&
                    /^(button|reset|submit|radio|checkbox)$/i.test(i.type) &&
                    !i.disabled) ||
                  (!/^(button|input|textarea|select|a)$/i.test(a) &&
                    !Number.isNaN(Number.parseFloat(i.tabIndex))) ||
                  /^audio$/i.test(a) ||
                  (/^video$/i.test(a) && !0 === i.controls))
              )
                (t = !0),
                  setTimeout(() => {
                    for (t = !1, n.target.focus(); e.length > 0; ) {
                      var i = e.pop();
                      i.target.dispatchEvent(new MouseEvent(i.type, i));
                    }
                  }, 0);
            }
            return {
              ready: function () {
                "undefined" != typeof document &&
                  document.body.hasAttribute("data-wf-focus-within") &&
                  i.env.safari &&
                  (document.addEventListener("mousedown", a, !0),
                  document.addEventListener("mouseup", n, !0),
                  document.addEventListener("click", n, !0));
              },
            };
          })
        );
      },
      7199: function (e) {
        "use strict";
        var t = window.jQuery,
          n = {},
          i = [],
          a = ".w-ix",
          r = {
            reset: function (e, t) {
              t.__wf_intro = null;
            },
            intro: function (e, i) {
              if (!i.__wf_intro)
                (i.__wf_intro = !0), t(i).triggerHandler(n.types.INTRO);
            },
            outro: function (e, i) {
              if (!!i.__wf_intro)
                (i.__wf_intro = null), t(i).triggerHandler(n.types.OUTRO);
            },
          };
        (n.triggers = {}),
          (n.types = {
            INTRO: "w-ix-intro" + a,
            OUTRO: "w-ix-outro" + a,
          }),
          (n.init = function () {
            for (var e = i.length, a = 0; a < e; a++) {
              var o = i[a];
              o[0](0, o[1]);
            }
            (i = []), t.extend(n.triggers, r);
          }),
          (n.async = function () {
            for (var e in r) {
              var t = r[e];
              if (!!r.hasOwnProperty(e))
                n.triggers[e] = function (e, n) {
                  i.push([t, n]);
                };
            }
          }),
          n.async(),
          (e.exports = n);
      },
      5134: function (e, t, n) {
        "use strict";
        var i = n(7199);
        function a(e, t) {
          var n = document.createEvent("CustomEvent");
          n.initCustomEvent(t, !0, !0, null), e.dispatchEvent(n);
        }
        var r = window.jQuery,
          o = {},
          l = ".w-ix";
        (o.triggers = {}),
          (o.types = {
            INTRO: "w-ix-intro" + l,
            OUTRO: "w-ix-outro" + l,
          }),
          r.extend(o.triggers, {
            reset: function (e, t) {
              i.triggers.reset(e, t);
            },
            intro: function (e, t) {
              i.triggers.intro(e, t), a(t, "COMPONENT_ACTIVE");
            },
            outro: function (e, t) {
              i.triggers.outro(e, t), a(t, "COMPONENT_INACTIVE");
            },
          }),
          (e.exports = o);
      },
      941: function (e, t, n) {
        "use strict";
        var i = n(3949),
          a = n(6011);
        a.setEnv(i.env),
          i.define(
            "ix2",
            (e.exports = function () {
              return a;
            })
          );
      },
      3949: function (e, t, n) {
        "use strict";
        var i,
          a,
          r = {},
          o = {},
          l = [],
          c = window.Webflow || [],
          u = window.jQuery,
          s = u(window),
          d = u(document),
          f = u.isFunction,
          p = (r._ = n(5756)),
          g = (r.tram = n(5487) && u.tram),
          E = !1,
          y = !1;
        function m(e) {
          r.env() &&
            (f(e.design) && s.on("__wf_design", e.design),
            f(e.preview) && s.on("__wf_preview", e.preview)),
            f(e.destroy) && s.on("__wf_destroy", e.destroy),
            e.ready &&
              f(e.ready) &&
              (function (e) {
                if (E) {
                  e.ready();
                  return;
                }
                if (!p.contains(l, e.ready)) l.push(e.ready);
              })(e);
        }
        (g.config.hideBackface = !1),
          (g.config.keepInherited = !0),
          (r.define = function (e, t, n) {
            o[e] && h(o[e]);
            var i = (o[e] = t(u, p, n) || {});
            return m(i), i;
          }),
          (r.require = function (e) {
            return o[e];
          });
        function h(e) {
          f(e.design) && s.off("__wf_design", e.design),
            f(e.preview) && s.off("__wf_preview", e.preview),
            f(e.destroy) && s.off("__wf_destroy", e.destroy),
            e.ready &&
              f(e.ready) &&
              (function (e) {
                l = p.filter(l, function (t) {
                  return t !== e.ready;
                });
              })(e);
        }
        (r.push = function (e) {
          if (E) {
            f(e) && e();
            return;
          }
          c.push(e);
        }),
          (r.env = function (e) {
            var t = window.__wf_design,
              n = void 0 !== t;
            return e
              ? "design" === e
                ? n && t
                : "preview" === e
                ? n && !t
                : "slug" === e
                ? n && window.__wf_slug
                : "editor" === e
                ? window.WebflowEditor
                : "test" === e
                ? window.__wf_test
                : "frame" === e
                ? window !== window.top
                : void 0
              : n;
          });
        var b = navigator.userAgent.toLowerCase(),
          I = (r.env.touch =
            "ontouchstart" in window ||
            (window.DocumentTouch && document instanceof window.DocumentTouch)),
          T = (r.env.chrome =
            /chrome/.test(b) &&
            /Google/.test(navigator.vendor) &&
            parseInt(b.match(/chrome\/(\d+)\./)[1], 10)),
          _ = (r.env.ios = /(ipod|iphone|ipad)/.test(b));
        (r.env.safari = /safari/.test(b) && !T && !_),
          I &&
            d.on("touchstart mousedown", function (e) {
              i = e.target;
            }),
          (r.validClick = I
            ? function (e) {
                return e === i || u.contains(e, i);
              }
            : function () {
                return !0;
              });
        var v = "resize.webflow orientationchange.webflow load.webflow",
          O = "scroll.webflow " + v;
        function A(e, t) {
          var n = [],
            i = {};
          return (
            (i.up = p.throttle(function (e) {
              p.each(n, function (t) {
                t(e);
              });
            })),
            e && t && e.on(t, i.up),
            (i.on = function (e) {
              if (!("function" != typeof e || p.contains(n, e))) n.push(e);
            }),
            (i.off = function (e) {
              if (!arguments.length) {
                n = [];
                return;
              }
              n = p.filter(n, function (t) {
                return t !== e;
              });
            }),
            i
          );
        }
        function w(e) {
          f(e) && e();
        }
        (r.resize = A(s, v)),
          (r.scroll = A(s, O)),
          (r.redraw = A()),
          (r.location = function (e) {
            window.location = e;
          }),
          r.env() && (r.location = function () {}),
          (r.ready = function () {
            (E = !0),
              y
                ? (function () {
                    (y = !1), p.each(o, m);
                  })()
                : p.each(l, w),
              p.each(c, w),
              r.resize.up();
          });
        function R() {
          a && (a.reject(), s.off("load", a.resolve)),
            (a = new u.Deferred()),
            s.on("load", a.resolve);
        }
        (r.load = function (e) {
          a.then(e);
        }),
          (r.destroy = function (e) {
            (e = e || {}),
              (y = !0),
              s.triggerHandler("__wf_destroy"),
              null != e.domready && (E = e.domready),
              p.each(o, h),
              r.resize.off(),
              r.scroll.off(),
              r.redraw.off(),
              (l = []),
              (c = []),
              "pending" === a.state() && R();
          }),
          u(r.ready),
          R(),
          (e.exports = window.Webflow = r);
      },
      7624: function (e, t, n) {
        "use strict";
        var i = n(3949);
        i.define(
          "links",
          (e.exports = function (e, t) {
            var n,
              a,
              r,
              o = {},
              l = e(window),
              c = i.env(),
              u = window.location,
              s = document.createElement("a"),
              d = "w--current",
              f = /index\.(html|php)$/,
              p = /\/$/;
            o.ready =
              o.design =
              o.preview =
                function () {
                  (n = c && i.env("design")),
                    (r = i.env("slug") || u.pathname || ""),
                    i.scroll.off(g),
                    (a = []);
                  for (var t = document.links, o = 0; o < t.length; ++o)
                    (function (t) {
                      if (t.getAttribute("hreflang")) return;
                      var i =
                        (n && t.getAttribute("href-disabled")) ||
                        t.getAttribute("href");
                      if (((s.href = i), i.indexOf(":") >= 0)) return;
                      var o = e(t);
                      if (
                        s.hash.length > 1 &&
                        s.host + s.pathname === u.host + u.pathname
                      ) {
                        if (!/^#[a-zA-Z0-9\-\_]+$/.test(s.hash)) return;
                        var l = e(s.hash);
                        l.length &&
                          a.push({
                            link: o,
                            sec: l,
                            active: !1,
                          });
                        return;
                      }
                      if ("#" !== i && "" !== i)
                        E(
                          o,
                          d,
                          s.href === u.href ||
                            i === r ||
                            (f.test(i) && p.test(r))
                        );
                    })(t[o]);
                  a.length && (i.scroll.on(g), g());
                };
            function g() {
              var e = l.scrollTop(),
                n = l.height();
              t.each(a, function (t) {
                if (t.link.attr("hreflang")) return;
                var i = t.link,
                  a = t.sec,
                  r = a.offset().top,
                  o = a.outerHeight(),
                  l = 0.5 * n,
                  c = a.is(":visible") && r + o - l >= e && r + l <= e + n;
                if (t.active !== c) (t.active = c), E(i, d, c);
              });
            }
            function E(e, t, n) {
              var i = e.hasClass(t);
              if ((!n || !i) && (!!n || !!i))
                n ? e.addClass(t) : e.removeClass(t);
            }
            return o;
          })
        );
      },
      286: function (e, t, n) {
        "use strict";
        var i = n(3949);
        i.define(
          "scroll",
          (e.exports = function (e) {
            var t = {
                WF_CLICK_EMPTY: "click.wf-empty-link",
                WF_CLICK_SCROLL: "click.wf-scroll",
              },
              n = window.location,
              a = (function () {
                try {
                  return !!window.frameElement;
                } catch (e) {
                  return !0;
                }
              })()
                ? null
                : window.history,
              r = e(window),
              o = e(document),
              l = e(document.body),
              c =
                window.requestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                function (e) {
                  window.setTimeout(e, 15);
                },
              u = i.env("editor") ? ".w-editor-body" : "body",
              s =
                "header, " +
                u +
                " > .header, " +
                u +
                " > .w-nav:not([data-no-scroll])",
              d = 'a[href="#"]',
              f = 'a[href*="#"]:not(.w-tab-link):not(' + d + ")",
              p = document.createElement("style");
            p.appendChild(
              document.createTextNode(
                '.wf-force-outline-none[tabindex="-1"]:focus{outline:none;}'
              )
            );
            var g = /^#[a-zA-Z0-9][\w:.-]*$/;
            let E =
              "function" == typeof window.matchMedia &&
              window.matchMedia("(prefers-reduced-motion: reduce)");
            function y(e, t) {
              var n;
              switch (t) {
                case "add":
                  (n = e.attr("tabindex"))
                    ? e.attr("data-wf-tabindex-swap", n)
                    : e.attr("tabindex", "-1");
                  break;
                case "remove":
                  (n = e.attr("data-wf-tabindex-swap"))
                    ? (e.attr("tabindex", n),
                      e.removeAttr("data-wf-tabindex-swap"))
                    : e.removeAttr("tabindex");
              }
              e.toggleClass("wf-force-outline-none", "add" === t);
            }
            function m(t) {
              var o,
                u = t.currentTarget;
              if (
                !(
                  i.env("design") ||
                  (window.$.mobile &&
                    /(?:^|\s)ui-link(?:$|\s)/.test(u.className))
                )
              ) {
                var d = ((o = u),
                g.test(o.hash) && o.host + o.pathname === n.host + n.pathname)
                  ? u.hash
                  : "";
                if ("" !== d) {
                  var f = e(d);
                  if (!f.length) return;
                  t && (t.preventDefault(), t.stopPropagation()),
                    (function (e) {
                      n.hash !== e &&
                        a &&
                        a.pushState &&
                        !(i.env.chrome && "file:" === n.protocol) &&
                        (a.state && a.state.hash) !== e &&
                        a.pushState({ hash: e }, "", e);
                    })(d, t),
                    window.setTimeout(
                      function () {
                        (function (t, n) {
                          var i = r.scrollTop(),
                            a = (function (t) {
                              var n = e(s),
                                i =
                                  "fixed" === n.css("position")
                                    ? n.outerHeight()
                                    : 0,
                                a = t.offset().top - i;
                              if ("mid" === t.data("scroll")) {
                                var o = r.height() - i,
                                  l = t.outerHeight();
                                l < o && (a -= Math.round((o - l) / 2));
                              }
                              return a;
                            })(t);
                          if (i !== a) {
                            var o = (function (e, t, n) {
                                if (
                                  "none" ===
                                    document.body.getAttribute(
                                      "data-wf-scroll-motion"
                                    ) ||
                                  E.matches
                                )
                                  return 0;
                                var i = 1;
                                return (
                                  l.add(e).each(function (e, t) {
                                    var n = parseFloat(
                                      t.getAttribute("data-scroll-time")
                                    );
                                    !isNaN(n) && n >= 0 && (i = n);
                                  }),
                                  (472.143 * Math.log(Math.abs(t - n) + 125) -
                                    2e3) *
                                    i
                                );
                              })(t, i, a),
                              u = Date.now(),
                              d = function () {
                                var e = Date.now() - u;
                                window.scroll(
                                  0,
                                  (function (e, t, n, i) {
                                    return n > i
                                      ? t
                                      : e +
                                          (t - e) *
                                            (function (e) {
                                              return e < 0.5
                                                ? 4 * e * e * e
                                                : (e - 1) *
                                                    (2 * e - 2) *
                                                    (2 * e - 2) +
                                                    1;
                                            })(n / i);
                                  })(i, a, e, o)
                                ),
                                  e <= o ? c(d) : "function" == typeof n && n();
                              };
                            c(d);
                          }
                        })(f, function () {
                          y(f, "add"),
                            f.get(0).focus({
                              preventScroll: !0,
                            }),
                            y(f, "remove");
                        });
                      },
                      t ? 0 : 300
                    );
                }
              }
            }
            return {
              ready: function () {
                var { WF_CLICK_EMPTY: e, WF_CLICK_SCROLL: n } = t;
                o.on(n, f, m),
                  o.on(e, d, function (e) {
                    e.preventDefault();
                  }),
                  document.head.insertBefore(p, document.head.firstChild);
              },
            };
          })
        );
      },
      3695: function (e, t, n) {
        "use strict";
        n(3949).define(
          "touch",
          (e.exports = function (e) {
            var t = {},
              n = window.getSelection;
            function i(t) {
              var i,
                a,
                r = !1,
                o = !1,
                l = Math.min(Math.round(0.04 * window.innerWidth), 40);
              function c(e) {
                var t = e.touches;
                if (!t || !(t.length > 1))
                  (r = !0),
                    t ? ((o = !0), (i = t[0].clientX)) : (i = e.clientX),
                    (a = i);
              }
              function u(t) {
                if (!!r) {
                  if (o && "mousemove" === t.type) {
                    t.preventDefault(), t.stopPropagation();
                    return;
                  }
                  var i = t.touches,
                    c = i ? i[0].clientX : t.clientX,
                    u = c - a;
                  (a = c),
                    Math.abs(u) > l &&
                      n &&
                      "" === String(n()) &&
                      ((function (t, n, i) {
                        var a = e.Event(t, {
                          originalEvent: n,
                        });
                        e(n.target).trigger(a, i);
                      })("swipe", t, {
                        direction: u > 0 ? "right" : "left",
                      }),
                      d());
                }
              }
              function s(e) {
                if (!!r) {
                  if (((r = !1), o && "mouseup" === e.type)) {
                    e.preventDefault(), e.stopPropagation(), (o = !1);
                    return;
                  }
                }
              }
              function d() {
                r = !1;
              }
              t.addEventListener("touchstart", c, !1),
                t.addEventListener("touchmove", u, !1),
                t.addEventListener("touchend", s, !1),
                t.addEventListener("touchcancel", d, !1),
                t.addEventListener("mousedown", c, !1),
                t.addEventListener("mousemove", u, !1),
                t.addEventListener("mouseup", s, !1),
                t.addEventListener("mouseout", d, !1);
              this.destroy = function () {
                t.removeEventListener("touchstart", c, !1),
                  t.removeEventListener("touchmove", u, !1),
                  t.removeEventListener("touchend", s, !1),
                  t.removeEventListener("touchcancel", d, !1),
                  t.removeEventListener("mousedown", c, !1),
                  t.removeEventListener("mousemove", u, !1),
                  t.removeEventListener("mouseup", s, !1),
                  t.removeEventListener("mouseout", d, !1),
                  (t = null);
              };
            }
            return (
              (e.event.special.tap = {
                bindType: "click",
                delegateType: "click",
              }),
              (t.init = function (t) {
                return (t = "string" == typeof t ? e(t).get(0) : t)
                  ? new i(t)
                  : null;
              }),
              (t.instance = t.init(document)),
              t
            );
          })
        );
      },
      6524: function (e, t) {
        "use strict";
        function n(e, t, n, i, a, r, o, l, c, u, s, d, f) {
          return function (p) {
            e(p);
            var g = p.form,
              E = {
                name: g.attr("data-name") || g.attr("name") || "Untitled Form",
                pageId: g.attr("data-wf-page-id") || "",
                elementId: g.attr("data-wf-element-id") || "",
                domain: d("html").attr("data-wf-domain") || null,
                source: t.href,
                test: n.env(),
                fields: {},
                fileUploads: {},
                dolphin:
                  /pass[\s-_]?(word|code)|secret|login|credentials/i.test(
                    g.html()
                  ),
                trackingCookies: i(),
              };
            let y = g.attr("data-wf-flow");
            y && (E.wfFlow = y), a(p);
            var m = r(g, E.fields);
            if (m) return o(m);
            if (((E.fileUploads = l(g)), c(p), !u)) {
              s(p);
              return;
            }
            d.ajax({
              url: f,
              type: "POST",
              data: E,
              dataType: "json",
              crossDomain: !0,
            })
              .done(function (e) {
                e && 200 === e.code && (p.success = !0), s(p);
              })
              .fail(function () {
                s(p);
              });
          };
        }
        Object.defineProperty(t, "default", {
          enumerable: !0,
          get: function () {
            return n;
          },
        });
      },
      7527: function (e, t, n) {
        "use strict";
        var i = n(3949);
        let a = (e, t, n, i) => {
          let a = document.createElement("div");
          t.appendChild(a),
            turnstile.render(a, {
              sitekey: e,
              callback: function (e) {
                n(e);
              },
              "error-callback": function () {
                i();
              },
            });
        };
        i.define(
          "forms",
          (e.exports = function (e, t) {
            let r;
            let o = "TURNSTILE_LOADED";
            var l,
              c,
              u,
              s,
              d,
              f = {},
              p = e(document),
              g = window.location,
              E = window.XDomainRequest && !window.atob,
              y = ".w-form",
              m = /e(-)?mail/i,
              h = /^\S+@\S+$/,
              b = window.alert,
              I = i.env();
            let T = p
              .find("[data-turnstile-sitekey]")
              .data("turnstile-sitekey");
            var _ = /list-manage[1-9]?.com/i,
              v = t.debounce(function () {
                b(
                  "Oops! This page has improperly configured forms. Please contact your website administrator to fix this issue."
                );
              }, 100);
            f.ready =
              f.design =
              f.preview =
                function () {
                  (function () {
                    // T &&
                    //     (((r =
                    //         document.createElement(
                    //             "script"
                    //         )).src =
                    //         "https://challenges.cloudflare.com/turnstile/v0/api.js"),
                    //     document.head.appendChild(r),
                    //     (r.onload = () => {
                    //         p.trigger(o);
                    //     }));
                  })(),
                    (function () {
                      if (
                        ((s =
                          "https://webflow.com/api/v1/form/" +
                          (c = e("html").attr("data-wf-site"))),
                        E &&
                          s.indexOf("https://webflow.com") >= 0 &&
                          (s = s.replace(
                            "https://webflow.com",
                            "https://formdata.webflow.com"
                          )),
                        (d = `${s}/signFile`),
                        !!(l = e(y + " form")).length)
                      )
                        l.each(O);
                    })(),
                    !I &&
                      !u &&
                      (function () {
                        (u = !0),
                          p.on("submit", y + " form", function (t) {
                            var n = e.data(this, y);
                            n.handler && ((n.evt = t), n.handler(n));
                          });
                        let t = ".w-checkbox-input",
                          n = ".w-radio-input",
                          i = "w--redirected-checked",
                          a = "w--redirected-focus",
                          r = "w--redirected-focus-visible",
                          o = [
                            ["checkbox", t],
                            ["radio", n],
                          ];
                        p.on(
                          "change",
                          y + ' form input[type="checkbox"]:not(' + t + ")",
                          (n) => {
                            e(n.target).siblings(t).toggleClass(i);
                          }
                        ),
                          p.on(
                            "change",
                            y + ' form input[type="radio"]',
                            (a) => {
                              e(`input[name="${a.target.name}"]:not(${t})`).map(
                                (t, a) => e(a).siblings(n).removeClass(i)
                              );
                              let r = e(a.target);
                              !r.hasClass("w-radio-input") &&
                                r.siblings(n).addClass(i);
                            }
                          ),
                          o.forEach(([t, n]) => {
                            p.on(
                              "focus",
                              y + ` form input[type="${t}"]:not(` + n + ")",
                              (t) => {
                                e(t.target).siblings(n).addClass(a),
                                  e(t.target)
                                    .filter(
                                      ":focus-visible, [data-wf-focus-visible]"
                                    )
                                    .siblings(n)
                                    .addClass(r);
                              }
                            ),
                              p.on(
                                "blur",
                                y + ` form input[type="${t}"]:not(` + n + ")",
                                (t) => {
                                  e(t.target)
                                    .siblings(n)
                                    .removeClass(`${a} ${r}`);
                                }
                              );
                          });
                      })();
                };
            function O(t, r) {
              var l = e(r),
                u = e.data(r, y);
              !u && (u = e.data(r, y, { form: l })), A(u);
              var f = l.closest("div.w-form");
              (u.done = f.find("> .w-form-done")),
                (u.fail = f.find("> .w-form-fail")),
                (u.fileUploads = f.find(".w-file-upload")),
                u.fileUploads.each(function (t) {
                  (function (t, n) {
                    if (!!n.fileUploads && !!n.fileUploads[t]) {
                      var i,
                        a = e(n.fileUploads[t]),
                        r = a.find("> .w-file-upload-default"),
                        o = a.find("> .w-file-upload-uploading"),
                        l = a.find("> .w-file-upload-success"),
                        c = a.find("> .w-file-upload-error"),
                        u = r.find(".w-file-upload-input"),
                        s = r.find(".w-file-upload-label"),
                        f = s.children(),
                        p = c.find(".w-file-upload-error-msg"),
                        g = l.find(".w-file-upload-file"),
                        E = l.find(".w-file-remove-link"),
                        y = g.find(".w-file-upload-file-name"),
                        m = p.attr("data-w-size-error"),
                        h = p.attr("data-w-type-error"),
                        b = p.attr("data-w-generic-error");
                      if (
                        (!I &&
                          s.on("click keydown", function (e) {
                            if (
                              "keydown" !== e.type ||
                              13 === e.which ||
                              32 === e.which
                            )
                              e.preventDefault(), u.click();
                          }),
                        s
                          .find(".w-icon-file-upload-icon")
                          .attr("aria-hidden", "true"),
                        E.find(".w-icon-file-upload-remove").attr(
                          "aria-hidden",
                          "true"
                        ),
                        I)
                      )
                        u.on("click", function (e) {
                          e.preventDefault();
                        }),
                          s.on("click", function (e) {
                            e.preventDefault();
                          }),
                          f.on("click", function (e) {
                            e.preventDefault();
                          });
                      else {
                        E.on("click keydown", function (e) {
                          if ("keydown" === e.type) {
                            if (13 !== e.which && 32 !== e.which) return;
                            e.preventDefault();
                          }
                          u.removeAttr("data-value"),
                            u.val(""),
                            y.html(""),
                            r.toggle(!0),
                            l.toggle(!1),
                            s.focus();
                        }),
                          u.on("change", function (a) {
                            if (
                              !!(i =
                                a.target && a.target.files && a.target.files[0])
                            )
                              r.toggle(!1),
                                c.toggle(!1),
                                o.toggle(!0),
                                o.focus(),
                                y.text(i.name),
                                !R() && w(n),
                                (n.fileUploads[t].uploading = !0),
                                (function (t, n) {
                                  var i = new URLSearchParams({
                                    name: t.name,
                                    size: t.size,
                                  });
                                  e.ajax({
                                    type: "GET",
                                    url: `${d}?${i}`,
                                    crossDomain: !0,
                                  })
                                    .done(function (e) {
                                      n(null, e);
                                    })
                                    .fail(function (e) {
                                      n(e);
                                    });
                                })(i, v);
                          });
                        var T = s.outerHeight();
                        u.height(T), u.width(1);
                      }
                    }
                    function _(e) {
                      var i = e.responseJSON && e.responseJSON.msg,
                        a = b;
                      "string" == typeof i &&
                      0 === i.indexOf("InvalidFileTypeError")
                        ? (a = h)
                        : "string" == typeof i &&
                          0 === i.indexOf("MaxFileSizeError") &&
                          (a = m),
                        p.text(a),
                        u.removeAttr("data-value"),
                        u.val(""),
                        o.toggle(!1),
                        r.toggle(!0),
                        c.toggle(!0),
                        c.focus(),
                        (n.fileUploads[t].uploading = !1),
                        !R() && A(n);
                    }
                    function v(t, n) {
                      if (t) return _(t);
                      var a = n.fileName,
                        r = n.postData,
                        o = n.fileId,
                        l = n.s3Url;
                      u.attr("data-value", o),
                        (function (t, n, i, a, r) {
                          var o = new FormData();
                          for (var l in n) o.append(l, n[l]);
                          o.append("file", i, a),
                            e
                              .ajax({
                                type: "POST",
                                url: t,
                                data: o,
                                processData: !1,
                                contentType: !1,
                              })
                              .done(function () {
                                r(null);
                              })
                              .fail(function (e) {
                                r(e);
                              });
                        })(l, r, i, a, O);
                    }
                    function O(e) {
                      if (e) return _(e);
                      o.toggle(!1),
                        l.css("display", "inline-block"),
                        l.focus(),
                        (n.fileUploads[t].uploading = !1),
                        !R() && A(n);
                    }
                    function R() {
                      return (
                        (n.fileUploads && n.fileUploads.toArray()) ||
                        []
                      ).some(function (e) {
                        return e.uploading;
                      });
                    }
                  })(t, u);
                }),
                T &&
                  ((u.wait = !1),
                  w(u),
                  p.on(
                    "undefined" != typeof turnstile ? "ready" : o,
                    function () {
                      a(
                        T,
                        r,
                        (e) => {
                          (u.turnstileToken = e), A(u);
                        },
                        () => {
                          w(u);
                        }
                      );
                    }
                  ));
              var E =
                u.form.attr("aria-label") || u.form.attr("data-name") || "Form";
              !u.done.attr("aria-label") && u.form.attr("aria-label", E),
                u.done.attr("tabindex", "-1"),
                u.done.attr("role", "region"),
                !u.done.attr("aria-label") &&
                  u.done.attr("aria-label", E + " success"),
                u.fail.attr("tabindex", "-1"),
                u.fail.attr("role", "region"),
                !u.fail.attr("aria-label") &&
                  u.fail.attr("aria-label", E + " failure");
              var m = (u.action = l.attr("action"));
              if (
                ((u.handler = null),
                (u.redirect = l.attr("data-redirect")),
                _.test(m))
              ) {
                u.handler = C;
                return;
              }
              if (!m) {
                if (c) {
                  u.handler = (0, n(6524).default)(
                    A,
                    g,
                    i,
                    L,
                    P,
                    R,
                    b,
                    S,
                    w,
                    c,
                    M,
                    e,
                    s
                  );
                  return;
                }
                v();
              }
            }
            function A(e) {
              var t = (e.btn = e.form.find(':input[type="submit"]'));
              (e.wait = e.btn.attr("data-wait") || null),
                (e.success = !1),
                t.prop("disabled", !!(T && !e.turnstileToken)),
                e.label && t.val(e.label);
            }
            function w(e) {
              var t = e.btn,
                n = e.wait;
              t.prop("disabled", !0), n && ((e.label = t.val()), t.val(n));
            }
            function R(t, n) {
              var i = null;
              return (
                (n = n || {}),
                t
                  .find(
                    ':input:not([type="submit"]):not([type="file"]):not([type="button"])'
                  )
                  .each(function (a, r) {
                    var o = e(r),
                      l = o.attr("type"),
                      c =
                        o.attr("data-name") ||
                        o.attr("name") ||
                        "Field " + (a + 1);
                    c = encodeURIComponent(c);
                    var u = o.val();
                    if ("checkbox" === l) u = o.is(":checked");
                    else if ("radio" === l) {
                      if (null === n[c] || "string" == typeof n[c]) return;
                      u =
                        t
                          .find('input[name="' + o.attr("name") + '"]:checked')
                          .val() || null;
                    }
                    "string" == typeof u && (u = e.trim(u)),
                      (n[c] = u),
                      (i =
                        i ||
                        (function (e, t, n, i) {
                          var a = null;
                          return (
                            "password" === t
                              ? (a = "Passwords cannot be submitted.")
                              : e.attr("required")
                              ? i
                                ? m.test(e.attr("type")) &&
                                  !h.test(i) &&
                                  (a =
                                    "Please enter a valid email address for: " +
                                    n)
                                : (a =
                                    "Please fill out the required field: " + n)
                              : "g-recaptcha-response" === n &&
                                !i &&
                                (a = "Please confirm youâ€™re not a robot."),
                            a
                          );
                        })(o, l, c, u));
                  }),
                i
              );
            }
            function S(t) {
              var n = {};
              return (
                t.find(':input[type="file"]').each(function (t, i) {
                  var a = e(i),
                    r =
                      a.attr("data-name") ||
                      a.attr("name") ||
                      "File " + (t + 1),
                    o = a.attr("data-value");
                  "string" == typeof o && (o = e.trim(o)), (n[r] = o);
                }),
                n
              );
            }
            let N = { _mkto_trk: "marketo" };
            function L() {
              return document.cookie.split("; ").reduce(function (e, t) {
                let n = t.split("="),
                  i = n[0];
                if (i in N) {
                  let t = N[i],
                    a = n.slice(1).join("=");
                  e[t] = a;
                }
                return e;
              }, {});
            }
            function C(n) {
              A(n);
              var i,
                a = n.form,
                r = {};
              if (/^https/.test(g.href) && !/^https/.test(n.action)) {
                a.attr("method", "post");
                return;
              }
              P(n);
              var o = R(a, r);
              if (o) return b(o);
              w(n),
                t.each(r, function (e, t) {
                  m.test(t) && (r.EMAIL = e),
                    /^((full[ _-]?)?name)$/i.test(t) && (i = e),
                    /^(first[ _-]?name)$/i.test(t) && (r.FNAME = e),
                    /^(last[ _-]?name)$/i.test(t) && (r.LNAME = e);
                }),
                i &&
                  !r.FNAME &&
                  ((i = i.split(" ")),
                  (r.FNAME = i[0]),
                  (r.LNAME = r.LNAME || i[1]));
              var l = n.action.replace("/post?", "/post-json?") + "&c=?",
                c = l.indexOf("u=") + 2;
              c = l.substring(c, l.indexOf("&", c));
              var u = l.indexOf("id=") + 3;
              (r["b_" + c + "_" + (u = l.substring(u, l.indexOf("&", u)))] =
                ""),
                e
                  .ajax({
                    url: l,
                    data: r,
                    dataType: "jsonp",
                  })
                  .done(function (e) {
                    (n.success =
                      "success" === e.result || /already/.test(e.msg)),
                      !n.success && console.info("MailChimp error: " + e.msg),
                      M(n);
                  })
                  .fail(function () {
                    M(n);
                  });
            }
            function M(e) {
              var t = e.form,
                n = e.redirect,
                a = e.success;
              if (a && n) {
                i.location(n);
                return;
              }
              e.done.toggle(a),
                e.fail.toggle(!a),
                a ? e.done.focus() : e.fail.focus(),
                t.toggle(!a),
                A(e);
            }
            function P(e) {
              e.evt && e.evt.preventDefault(), (e.evt = null);
            }
            return f;
          })
        );
      },
      4345: function (e, t, n) {
        "use strict";
        var i = n(3949),
          a = n(5134);
        let r = {
            ARROW_LEFT: 37,
            ARROW_UP: 38,
            ARROW_RIGHT: 39,
            ARROW_DOWN: 40,
            SPACE: 32,
            ENTER: 13,
            HOME: 36,
            END: 35,
          },
          o =
            'a[href], area[href], [role="button"], input, select, textarea, button, iframe, object, embed, *[tabindex], *[contenteditable]';
        i.define(
          "slider",
          (e.exports = function (e, t) {
            var n,
              l,
              c,
              u = {},
              s = e.tram,
              d = e(document),
              f = i.env(),
              p = ".w-slider",
              g = "w-slider-force-show",
              E = a.triggers,
              y = !1;
            function m() {
              if (!(n = d.find(p)).length) return;
              if ((n.each(I), !c))
                h(),
                  (function () {
                    i.resize.on(b), i.redraw.on(u.redraw);
                  })();
            }
            function h() {
              i.resize.off(b), i.redraw.off(u.redraw);
            }
            (u.ready = function () {
              (l = i.env("design")), m();
            }),
              (u.design = function () {
                (l = !0), setTimeout(m, 1e3);
              }),
              (u.preview = function () {
                (l = !1), m();
              }),
              (u.redraw = function () {
                (y = !0), m(), (y = !1);
              }),
              (u.destroy = h);
            function b() {
              n.filter(":visible").each(M);
            }
            function I(t, n) {
              var i = e(n),
                a = e.data(n, p);
              !a &&
                (a = e.data(n, p, {
                  index: 0,
                  depth: 1,
                  hasFocus: { keyboard: !1, mouse: !1 },
                  el: i,
                  config: {},
                })),
                (a.mask = i.children(".w-slider-mask")),
                (a.left = i.children(".w-slider-arrow-left")),
                (a.right = i.children(".w-slider-arrow-right")),
                (a.nav = i.children(".w-slider-nav")),
                (a.slides = a.mask.children(".w-slide")),
                a.slides.each(E.reset),
                y && (a.maskWidth = 0),
                void 0 === i.attr("role") && i.attr("role", "region"),
                void 0 === i.attr("aria-label") &&
                  i.attr("aria-label", "carousel");
              var r = a.mask.attr("id");
              if (
                (!r && ((r = "w-slider-mask-" + t), a.mask.attr("id", r)),
                !l &&
                  !a.ariaLiveLabel &&
                  (a.ariaLiveLabel = e(
                    '<div aria-live="off" aria-atomic="true" class="w-slider-aria-label" data-wf-ignore />'
                  ).appendTo(a.mask)),
                a.left.attr("role", "button"),
                a.left.attr("tabindex", "0"),
                a.left.attr("aria-controls", r),
                void 0 === a.left.attr("aria-label") &&
                  a.left.attr("aria-label", "previous slide"),
                a.right.attr("role", "button"),
                a.right.attr("tabindex", "0"),
                a.right.attr("aria-controls", r),
                void 0 === a.right.attr("aria-label") &&
                  a.right.attr("aria-label", "next slide"),
                !s.support.transform)
              ) {
                a.left.hide(), a.right.hide(), a.nav.hide(), (c = !0);
                return;
              }
              a.el.off(p),
                a.left.off(p),
                a.right.off(p),
                a.nav.off(p),
                T(a),
                l
                  ? (a.el.on("setting" + p, N(a)), S(a), (a.hasTimer = !1))
                  : (a.el.on("swipe" + p, N(a)),
                    a.left.on("click" + p, A(a)),
                    a.right.on("click" + p, w(a)),
                    a.left.on("keydown" + p, O(a, A)),
                    a.right.on("keydown" + p, O(a, w)),
                    a.nav.on("keydown" + p, "> div", N(a)),
                    a.config.autoplay &&
                      !a.hasTimer &&
                      ((a.hasTimer = !0), (a.timerCount = 1), R(a)),
                    a.el.on("mouseenter" + p, v(a, !0, "mouse")),
                    a.el.on("focusin" + p, v(a, !0, "keyboard")),
                    a.el.on("mouseleave" + p, v(a, !1, "mouse")),
                    a.el.on("focusout" + p, v(a, !1, "keyboard"))),
                a.nav.on("click" + p, "> div", N(a)),
                !f &&
                  a.mask
                    .contents()
                    .filter(function () {
                      return 3 === this.nodeType;
                    })
                    .remove();
              var o = i.filter(":hidden");
              o.addClass(g);
              var u = i.parents(":hidden");
              u.addClass(g), !y && M(t, n), o.removeClass(g), u.removeClass(g);
            }
            function T(e) {
              var t = {};
              (t.crossOver = 0),
                (t.animation = e.el.attr("data-animation") || "slide"),
                "outin" === t.animation &&
                  ((t.animation = "cross"), (t.crossOver = 0.5)),
                (t.easing = e.el.attr("data-easing") || "ease");
              var n = e.el.attr("data-duration");
              if (
                ((t.duration = null != n ? parseInt(n, 10) : 500),
                _(e.el.attr("data-infinite")) && (t.infinite = !0),
                _(e.el.attr("data-disable-swipe")) && (t.disableSwipe = !0),
                _(e.el.attr("data-hide-arrows"))
                  ? (t.hideArrows = !0)
                  : e.config.hideArrows && (e.left.show(), e.right.show()),
                _(e.el.attr("data-autoplay")))
              ) {
                (t.autoplay = !0),
                  (t.delay = parseInt(e.el.attr("data-delay"), 10) || 2e3),
                  (t.timerMax = parseInt(e.el.attr("data-autoplay-limit"), 10));
                var i = "mousedown" + p + " touchstart" + p;
                !l &&
                  e.el.off(i).one(i, function () {
                    S(e);
                  });
              }
              var a = e.right.width();
              (t.edge = a ? a + 40 : 100), (e.config = t);
            }
            function _(e) {
              return "1" === e || "true" === e;
            }
            function v(t, n, i) {
              return function (a) {
                if (n) t.hasFocus[i] = n;
                else {
                  if (e.contains(t.el.get(0), a.relatedTarget)) return;
                  if (
                    ((t.hasFocus[i] = n),
                    (t.hasFocus.mouse && "keyboard" === i) ||
                      (t.hasFocus.keyboard && "mouse" === i))
                  )
                    return;
                }
                n
                  ? (t.ariaLiveLabel.attr("aria-live", "polite"),
                    t.hasTimer && S(t))
                  : (t.ariaLiveLabel.attr("aria-live", "off"),
                    t.hasTimer && R(t));
              };
            }
            function O(e, t) {
              return function (n) {
                switch (n.keyCode) {
                  case r.SPACE:
                  case r.ENTER:
                    return t(e)(), n.preventDefault(), n.stopPropagation();
                }
              };
            }
            function A(e) {
              return function () {
                C(e, { index: e.index - 1, vector: -1 });
              };
            }
            function w(e) {
              return function () {
                C(e, { index: e.index + 1, vector: 1 });
              };
            }
            function R(e) {
              S(e);
              var t = e.config,
                n = t.timerMax;
              if (!(n && e.timerCount++ > n))
                e.timerId = window.setTimeout(function () {
                  if (null != e.timerId && !l) w(e)(), R(e);
                }, t.delay);
            }
            function S(e) {
              window.clearTimeout(e.timerId), (e.timerId = null);
            }
            function N(n) {
              return function (a, o) {
                o = o || {};
                var c,
                  u,
                  s,
                  d = n.config;
                if (l && "setting" === a.type) {
                  if ("prev" === o.select) return A(n)();
                  if ("next" === o.select) return w(n)();
                  if ((T(n), P(n), null == o.select)) return;
                  return (
                    (c = n),
                    (u = o.select),
                    (s = null),
                    u === c.slides.length && (m(), P(c)),
                    t.each(c.anchors, function (t, n) {
                      e(t.els).each(function (t, i) {
                        e(i).index() === u && (s = n);
                      });
                    }),
                    null != s && C(c, { index: s, immediate: !0 }),
                    void 0
                  );
                }
                if ("swipe" === a.type)
                  return d.disableSwipe || i.env("editor")
                    ? void 0
                    : "left" === o.direction
                    ? w(n)()
                    : "right" === o.direction
                    ? A(n)()
                    : void 0;
                if (n.nav.has(a.target).length) {
                  var f = e(a.target).index();
                  if (
                    ("click" === a.type && C(n, { index: f }),
                    "keydown" === a.type)
                  )
                    switch (a.keyCode) {
                      case r.ENTER:
                      case r.SPACE:
                        C(n, { index: f }), a.preventDefault();
                        break;
                      case r.ARROW_LEFT:
                      case r.ARROW_UP:
                        L(n.nav, Math.max(f - 1, 0)), a.preventDefault();
                        break;
                      case r.ARROW_RIGHT:
                      case r.ARROW_DOWN:
                        L(n.nav, Math.min(f + 1, n.pages)), a.preventDefault();
                        break;
                      case r.HOME:
                        L(n.nav, 0), a.preventDefault();
                        break;
                      case r.END:
                        L(n.nav, n.pages), a.preventDefault();
                        break;
                      default:
                        return;
                    }
                }
              };
            }
            function L(e, t) {
              var n = e.children().eq(t).focus();
              e.children().not(n);
            }
            function C(t, n) {
              n = n || {};
              var i = t.config,
                a = t.anchors;
              t.previous = t.index;
              var r = n.index,
                c = {};
              r < 0
                ? ((r = a.length - 1),
                  i.infinite &&
                    ((c.x = -t.endX), (c.from = 0), (c.to = a[0].width)))
                : r >= a.length &&
                  ((r = 0),
                  i.infinite &&
                    ((c.x = a[a.length - 1].width),
                    (c.from = -a[a.length - 1].x),
                    (c.to = c.from - c.x))),
                (t.index = r);
              var u = t.nav
                .children()
                .eq(r)
                .addClass("w-active")
                .attr("aria-pressed", "true")
                .attr("tabindex", "0");
              t.nav
                .children()
                .not(u)
                .removeClass("w-active")
                .attr("aria-pressed", "false")
                .attr("tabindex", "-1"),
                i.hideArrows &&
                  (t.index === a.length - 1 ? t.right.hide() : t.right.show(),
                  0 === t.index ? t.left.hide() : t.left.show());
              var d = t.offsetX || 0,
                f = (t.offsetX = -a[t.index].x),
                p = { x: f, opacity: 1, visibility: "" },
                g = e(a[t.index].els),
                m = e(a[t.previous] && a[t.previous].els),
                h = t.slides.not(g),
                b = i.animation,
                I = i.easing,
                T = Math.round(i.duration),
                _ = n.vector || (t.index > t.previous ? 1 : -1),
                v = "opacity " + T + "ms " + I,
                O = "transform " + T + "ms " + I;
              if (
                (g.find(o).removeAttr("tabindex"),
                g.removeAttr("aria-hidden"),
                g.find("*").removeAttr("aria-hidden"),
                h.find(o).attr("tabindex", "-1"),
                h.attr("aria-hidden", "true"),
                h.find("*").attr("aria-hidden", "true"),
                !l && (g.each(E.intro), h.each(E.outro)),
                n.immediate && !y)
              ) {
                s(g).set(p), R();
                return;
              }
              if (t.index !== t.previous) {
                if (
                  (!l && t.ariaLiveLabel.text(`Slide ${r + 1} of ${a.length}.`),
                  "cross" === b)
                ) {
                  var A = Math.round(T - T * i.crossOver),
                    w = Math.round(T - A);
                  (v = "opacity " + A + "ms " + I),
                    s(m).set({ visibility: "" }).add(v).start({ opacity: 0 }),
                    s(g)
                      .set({
                        visibility: "",
                        x: f,
                        opacity: 0,
                        zIndex: t.depth++,
                      })
                      .add(v)
                      .wait(w)
                      .then({ opacity: 1 })
                      .then(R);
                  return;
                }
                if ("fade" === b) {
                  s(m).set({ visibility: "" }).stop(),
                    s(g)
                      .set({
                        visibility: "",
                        x: f,
                        opacity: 0,
                        zIndex: t.depth++,
                      })
                      .add(v)
                      .start({ opacity: 1 })
                      .then(R);
                  return;
                }
                if ("over" === b) {
                  (p = { x: t.endX }),
                    s(m).set({ visibility: "" }).stop(),
                    s(g)
                      .set({
                        visibility: "",
                        zIndex: t.depth++,
                        x: f + a[t.index].width * _,
                      })
                      .add(O)
                      .start({ x: f })
                      .then(R);
                  return;
                }
                i.infinite && c.x
                  ? (s(t.slides.not(m))
                      .set({ visibility: "", x: c.x })
                      .add(O)
                      .start({ x: f }),
                    s(m)
                      .set({ visibility: "", x: c.from })
                      .add(O)
                      .start({ x: c.to }),
                    (t.shifted = m))
                  : (i.infinite &&
                      t.shifted &&
                      (s(t.shifted).set({
                        visibility: "",
                        x: d,
                      }),
                      (t.shifted = null)),
                    s(t.slides).set({ visibility: "" }).add(O).start({ x: f }));
              }
              function R() {
                (g = e(a[t.index].els)),
                  (h = t.slides.not(g)),
                  "slide" !== b && (p.visibility = "hidden"),
                  s(h).set(p);
              }
            }
            function M(t, n) {
              var i = e.data(n, p);
              if (!!i) {
                if (
                  (function (e) {
                    var t = e.mask.width();
                    return e.maskWidth !== t && ((e.maskWidth = t), !0);
                  })(i)
                )
                  return P(i);
                l &&
                  (function (t) {
                    var n = 0;
                    return (
                      t.slides.each(function (t, i) {
                        n += e(i).outerWidth(!0);
                      }),
                      t.slidesWidth !== n && ((t.slidesWidth = n), !0)
                    );
                  })(i) &&
                  P(i);
              }
            }
            function P(t) {
              var n = 1,
                i = 0,
                a = 0,
                r = 0,
                o = t.maskWidth,
                c = o - t.config.edge;
              c < 0 && (c = 0),
                (t.anchors = [{ els: [], x: 0, width: 0 }]),
                t.slides.each(function (l, u) {
                  a - i > c &&
                    (n++,
                    (i += o),
                    (t.anchors[n - 1] = {
                      els: [],
                      x: a,
                      width: 0,
                    })),
                    (r = e(u).outerWidth(!0)),
                    (a += r),
                    (t.anchors[n - 1].width += r),
                    t.anchors[n - 1].els.push(u);
                  var s = l + 1 + " of " + t.slides.length;
                  e(u).attr("aria-label", s), e(u).attr("role", "group");
                }),
                (t.endX = a),
                l && (t.pages = null),
                t.nav.length &&
                  t.pages !== n &&
                  ((t.pages = n),
                  (function (t) {
                    var n,
                      i = [],
                      a = t.el.attr("data-nav-spacing");
                    a && (a = parseFloat(a) + "px");
                    for (var r = 0, o = t.pages; r < o; r++)
                      (n = e('<div class="w-slider-dot" data-wf-ignore />'))
                        .attr(
                          "aria-label",
                          "Show slide " + (r + 1) + " of " + o
                        )
                        .attr("aria-pressed", "false")
                        .attr("role", "button")
                        .attr("tabindex", "-1"),
                        t.nav.hasClass("w-num") && n.text(r + 1),
                        null != a &&
                          n.css({
                            "margin-left": a,
                            "margin-right": a,
                          }),
                        i.push(n);
                    t.nav.empty().append(i);
                  })(t));
              var u = t.index;
              u >= n && (u = n - 1), C(t, { immediate: !0, index: u });
            }
            return u;
          })
        );
      },
      9078: function (e, t, n) {
        "use strict";
        var i = n(3949),
          a = n(5134);
        i.define(
          "tabs",
          (e.exports = function (e) {
            var t,
              n,
              r = {},
              o = e.tram,
              l = e(document),
              c = i.env,
              u = c.safari,
              s = c(),
              d = "data-w-tab",
              f = ".w-tabs",
              p = "w--current",
              g = "w--tab-active",
              E = a.triggers,
              y = !1;
            function m() {
              if (((n = s && i.env("design")), !!(t = l.find(f)).length))
                t.each(I),
                  i.env("preview") && !y && t.each(b),
                  h(),
                  (function () {
                    i.redraw.on(r.redraw);
                  })();
            }
            function h() {
              i.redraw.off(r.redraw);
            }
            (r.ready = r.design = r.preview = m),
              (r.redraw = function () {
                (y = !0), m(), (y = !1);
              }),
              (r.destroy = function () {
                if (!!(t = l.find(f)).length) t.each(b), h();
              });
            function b(t, n) {
              var i = e.data(n, f);
              if (!!i)
                i.links && i.links.each(E.reset),
                  i.panes && i.panes.each(E.reset);
            }
            function I(t, i) {
              var a = f.substr(1) + "-" + t,
                r = e(i),
                o = e.data(i, f);
              if (
                (!o && (o = e.data(i, f, { el: r, config: {} })),
                (o.current = null),
                (o.tabIdentifier = a + "-" + d),
                (o.paneIdentifier = a + "-data-w-pane"),
                (o.menu = r.children(".w-tab-menu")),
                (o.links = o.menu.children(".w-tab-link")),
                (o.content = r.children(".w-tab-content")),
                (o.panes = o.content.children(".w-tab-pane")),
                o.el.off(f),
                o.links.off(f),
                o.menu.attr("role", "tablist"),
                o.links.attr("tabindex", "-1"),
                (function (e) {
                  var t = {};
                  t.easing = e.el.attr("data-easing") || "ease";
                  var n = parseInt(e.el.attr("data-duration-in"), 10);
                  n = t.intro = n == n ? n : 0;
                  var i = parseInt(e.el.attr("data-duration-out"), 10);
                  (i = t.outro = i == i ? i : 0),
                    (t.immediate = !n && !i),
                    (e.config = t);
                })(o),
                !n)
              ) {
                o.links.on(
                  "click" + f,
                  (function (e) {
                    return function (t) {
                      t.preventDefault();
                      var n = t.currentTarget.getAttribute(d);
                      n && T(e, { tab: n });
                    };
                  })(o)
                ),
                  o.links.on(
                    "keydown" + f,
                    (function (e) {
                      return function (t) {
                        var n,
                          i,
                          a =
                            ((i = (n = e).current),
                            Array.prototype.findIndex.call(
                              n.links,
                              (e) => e.getAttribute(d) === i,
                              null
                            )),
                          r = t.key,
                          o = {
                            ArrowLeft: a - 1,
                            ArrowUp: a - 1,
                            ArrowRight: a + 1,
                            ArrowDown: a + 1,
                            End: e.links.length - 1,
                            Home: 0,
                          };
                        if (r in o) {
                          t.preventDefault();
                          var l = o[r];
                          -1 === l && (l = e.links.length - 1),
                            l === e.links.length && (l = 0);
                          var c = e.links[l].getAttribute(d);
                          c && T(e, { tab: c });
                        }
                      };
                    })(o)
                  );
                var l = o.links.filter("." + p).attr(d);
                l && T(o, { tab: l, immediate: !0 });
              }
            }
            function T(t, n) {
              n = n || {};
              var a,
                r = t.config,
                l = r.easing,
                c = n.tab;
              if (c !== t.current) {
                (t.current = c),
                  t.links.each(function (i, o) {
                    var l = e(o);
                    if (n.immediate || r.immediate) {
                      var u = t.panes[i];
                      !o.id && (o.id = t.tabIdentifier + "-" + i),
                        !u.id && (u.id = t.paneIdentifier + "-" + i),
                        (o.href = "#" + u.id),
                        o.setAttribute("role", "tab"),
                        o.setAttribute("aria-controls", u.id),
                        o.setAttribute("aria-selected", "false"),
                        u.setAttribute("role", "tabpanel"),
                        u.setAttribute("aria-labelledby", o.id);
                    }
                    o.getAttribute(d) === c
                      ? ((a = o),
                        l
                          .addClass(p)
                          .removeAttr("tabindex")
                          .attr({
                            "aria-selected": "true",
                          })
                          .each(E.intro))
                      : l.hasClass(p) &&
                        l
                          .removeClass(p)
                          .attr({
                            tabindex: "-1",
                            "aria-selected": "false",
                          })
                          .each(E.outro);
                  });
                var s = [],
                  f = [];
                t.panes.each(function (t, n) {
                  var i = e(n);
                  n.getAttribute(d) === c
                    ? s.push(n)
                    : i.hasClass(g) && f.push(n);
                });
                var m = e(s),
                  h = e(f);
                if (n.immediate || r.immediate) {
                  m.addClass(g).each(E.intro),
                    h.removeClass(g),
                    !y && i.redraw.up();
                  return;
                }
                var b = window.scrollX,
                  I = window.scrollY;
                a.focus(), window.scrollTo(b, I);
                h.length && r.outro
                  ? (h.each(E.outro),
                    o(h)
                      .add("opacity " + r.outro + "ms " + l, { fallback: u })
                      .start({ opacity: 0 })
                      .then(() => _(r, h, m)))
                  : _(r, h, m);
              }
            }
            function _(e, t, n) {
              if (
                (t.removeClass(g).css({
                  opacity: "",
                  transition: "",
                  transform: "",
                  width: "",
                  height: "",
                }),
                n.addClass(g).each(E.intro),
                i.redraw.up(),
                !e.intro)
              )
                return o(n).set({ opacity: 1 });
              o(n)
                .set({ opacity: 0 })
                .redraw()
                .add("opacity " + e.intro + "ms " + e.easing, {
                  fallback: u,
                })
                .start({ opacity: 1 });
            }
            return r;
          })
        );
      },
      3946: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          actionListPlaybackChanged: function () {
            return j;
          },
          animationFrameChanged: function () {
            return G;
          },
          clearRequested: function () {
            return P;
          },
          elementStateChanged: function () {
            return B;
          },
          eventListenerAdded: function () {
            return x;
          },
          eventStateChanged: function () {
            return U;
          },
          instanceAdded: function () {
            return k;
          },
          instanceRemoved: function () {
            return X;
          },
          instanceStarted: function () {
            return V;
          },
          mediaQueriesDefined: function () {
            return Y;
          },
          parameterChanged: function () {
            return D;
          },
          playbackRequested: function () {
            return C;
          },
          previewRequested: function () {
            return L;
          },
          rawDataImported: function () {
            return w;
          },
          sessionInitialized: function () {
            return R;
          },
          sessionStarted: function () {
            return S;
          },
          sessionStopped: function () {
            return N;
          },
          stopRequested: function () {
            return M;
          },
          testFrameRendered: function () {
            return F;
          },
          viewportWidthChanged: function () {
            return z;
          },
        });
        let i = n(7087),
          a = n(9468),
          {
            IX2_RAW_DATA_IMPORTED: r,
            IX2_SESSION_INITIALIZED: o,
            IX2_SESSION_STARTED: l,
            IX2_SESSION_STOPPED: c,
            IX2_PREVIEW_REQUESTED: u,
            IX2_PLAYBACK_REQUESTED: s,
            IX2_STOP_REQUESTED: d,
            IX2_CLEAR_REQUESTED: f,
            IX2_EVENT_LISTENER_ADDED: p,
            IX2_TEST_FRAME_RENDERED: g,
            IX2_EVENT_STATE_CHANGED: E,
            IX2_ANIMATION_FRAME_CHANGED: y,
            IX2_PARAMETER_CHANGED: m,
            IX2_INSTANCE_ADDED: h,
            IX2_INSTANCE_STARTED: b,
            IX2_INSTANCE_REMOVED: I,
            IX2_ELEMENT_STATE_CHANGED: T,
            IX2_ACTION_LIST_PLAYBACK_CHANGED: _,
            IX2_VIEWPORT_WIDTH_CHANGED: v,
            IX2_MEDIA_QUERIES_DEFINED: O,
          } = i.IX2EngineActionTypes,
          { reifyState: A } = a.IX2VanillaUtils,
          w = (e) => ({ type: r, payload: { ...A(e) } }),
          R = ({ hasBoundaryNodes: e, reducedMotion: t }) => ({
            type: o,
            payload: { hasBoundaryNodes: e, reducedMotion: t },
          }),
          S = () => ({ type: l }),
          N = () => ({ type: c }),
          L = ({ rawData: e, defer: t }) => ({
            type: u,
            payload: { defer: t, rawData: e },
          }),
          C = ({
            actionTypeId: e = i.ActionTypeConsts.GENERAL_START_ACTION,
            actionListId: t,
            actionItemId: n,
            eventId: a,
            allowEvents: r,
            immediate: o,
            testManual: l,
            verbose: c,
            rawData: u,
          }) => ({
            type: s,
            payload: {
              actionTypeId: e,
              actionListId: t,
              actionItemId: n,
              testManual: l,
              eventId: a,
              allowEvents: r,
              immediate: o,
              verbose: c,
              rawData: u,
            },
          }),
          M = (e) => ({ type: d, payload: { actionListId: e } }),
          P = () => ({ type: f }),
          x = (e, t) => ({
            type: p,
            payload: { target: e, listenerParams: t },
          }),
          F = (e = 1) => ({ type: g, payload: { step: e } }),
          U = (e, t) => ({
            type: E,
            payload: { stateKey: e, newState: t },
          }),
          G = (e, t) => ({
            type: y,
            payload: { now: e, parameters: t },
          }),
          D = (e, t) => ({ type: m, payload: { key: e, value: t } }),
          k = (e) => ({ type: h, payload: { ...e } }),
          V = (e, t) => ({
            type: b,
            payload: { instanceId: e, time: t },
          }),
          X = (e) => ({ type: I, payload: { instanceId: e } }),
          B = (e, t, n, i) => ({
            type: T,
            payload: {
              elementId: e,
              actionTypeId: t,
              current: n,
              actionItem: i,
            },
          }),
          j = ({ actionListId: e, isPlaying: t }) => ({
            type: _,
            payload: { actionListId: e, isPlaying: t },
          }),
          z = ({ width: e, mediaQueries: t }) => ({
            type: v,
            payload: { width: e, mediaQueries: t },
          }),
          Y = () => ({ type: O });
      },
      6011: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          actions: function () {
            return o;
          },
          destroy: function () {
            return d;
          },
          init: function () {
            return s;
          },
          setEnv: function () {
            return u;
          },
          store: function () {
            return c;
          },
        });
        let i = n(9516),
          a = (function (e) {
            return e && e.__esModule ? e : { default: e };
          })(n(7243)),
          r = n(1970),
          o = (function (e, t) {
            if (!t && e && e.__esModule) return e;
            if (null === e || ("object" != typeof e && "function" != typeof e))
              return { default: e };
            var n = l(t);
            if (n && n.has(e)) return n.get(e);
            var i = { __proto__: null },
              a = Object.defineProperty && Object.getOwnPropertyDescriptor;
            for (var r in e)
              if (
                "default" !== r &&
                Object.prototype.hasOwnProperty.call(e, r)
              ) {
                var o = a ? Object.getOwnPropertyDescriptor(e, r) : null;
                o && (o.get || o.set)
                  ? Object.defineProperty(i, r, o)
                  : (i[r] = e[r]);
              }
            return (i.default = e), n && n.set(e, i), i;
          })(n(3946));
        function l(e) {
          if ("function" != typeof WeakMap) return null;
          var t = new WeakMap(),
            n = new WeakMap();
          return (l = function (e) {
            return e ? n : t;
          })(e);
        }
        let c = (0, i.createStore)(a.default);
        function u(e) {
          e() && (0, r.observeRequests)(c);
        }
        function s(e) {
          d(),
            (0, r.startEngine)({
              store: c,
              rawData: e,
              allowEvents: !0,
            });
        }
        function d() {
          (0, r.stopEngine)(c);
        }
      },
      5012: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          elementContains: function () {
            return m;
          },
          getChildElements: function () {
            return b;
          },
          getClosestElement: function () {
            return T;
          },
          getProperty: function () {
            return f;
          },
          getQuerySelector: function () {
            return g;
          },
          getRefType: function () {
            return _;
          },
          getSiblingElements: function () {
            return I;
          },
          getStyle: function () {
            return d;
          },
          getValidDocument: function () {
            return E;
          },
          isSiblingNode: function () {
            return h;
          },
          matchSelector: function () {
            return p;
          },
          queryDocument: function () {
            return y;
          },
          setStyle: function () {
            return s;
          },
        });
        let i = n(9468),
          a = n(7087),
          { ELEMENT_MATCHES: r } = i.IX2BrowserSupport,
          {
            IX2_ID_DELIMITER: o,
            HTML_ELEMENT: l,
            PLAIN_OBJECT: c,
            WF_PAGE: u,
          } = a.IX2EngineConstants;
        function s(e, t, n) {
          e.style[t] = n;
        }
        function d(e, t) {
          return t.startsWith("--")
            ? window
                .getComputedStyle(document.documentElement)
                .getPropertyValue(t)
            : e.style instanceof CSSStyleDeclaration
            ? e.style[t]
            : void 0;
        }
        function f(e, t) {
          return e[t];
        }
        function p(e) {
          return (t) => t[r](e);
        }
        function g({ id: e, selector: t }) {
          if (e) {
            let t = e;
            if (-1 !== e.indexOf(o)) {
              let n = e.split(o),
                i = n[0];
              if (((t = n[1]), i !== document.documentElement.getAttribute(u)))
                return null;
            }
            return `[data-w-id="${t}"], [data-w-id^="${t}_instance"]`;
          }
          return t;
        }
        function E(e) {
          return null == e || e === document.documentElement.getAttribute(u)
            ? document
            : null;
        }
        function y(e, t) {
          return Array.prototype.slice.call(
            document.querySelectorAll(t ? e + " " + t : e)
          );
        }
        function m(e, t) {
          return e.contains(t);
        }
        function h(e, t) {
          return e !== t && e.parentNode === t.parentNode;
        }
        function b(e) {
          let t = [];
          for (let n = 0, { length: i } = e || []; n < i; n++) {
            let { children: i } = e[n],
              { length: a } = i;
            if (!!a) for (let e = 0; e < a; e++) t.push(i[e]);
          }
          return t;
        }
        function I(e = []) {
          let t = [],
            n = [];
          for (let i = 0, { length: a } = e; i < a; i++) {
            let { parentNode: a } = e[i];
            if (!a || !a.children || !a.children.length || -1 !== n.indexOf(a))
              continue;
            n.push(a);
            let r = a.firstElementChild;
            for (; null != r; )
              -1 === e.indexOf(r) && t.push(r), (r = r.nextElementSibling);
          }
          return t;
        }
        let T = Element.prototype.closest
          ? (e, t) =>
              document.documentElement.contains(e) ? e.closest(t) : null
          : (e, t) => {
              if (!document.documentElement.contains(e)) return null;
              let n = e;
              do {
                if (n[r] && n[r](t)) return n;
                n = n.parentNode;
              } while (null != n);
              return null;
            };
        function _(e) {
          return null != e && "object" == typeof e
            ? e instanceof Element
              ? l
              : c
            : null;
        }
      },
      1970: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          observeRequests: function () {
            return Q;
          },
          startActionGroup: function () {
            return ef;
          },
          startEngine: function () {
            return et;
          },
          stopActionGroup: function () {
            return ed;
          },
          stopAllActionGroups: function () {
            return es;
          },
          stopEngine: function () {
            return en;
          },
        });
        let i = y(n(9777)),
          a = y(n(4738)),
          r = y(n(4659)),
          o = y(n(3452)),
          l = y(n(6633)),
          c = y(n(3729)),
          u = y(n(2397)),
          s = y(n(5082)),
          d = n(7087),
          f = n(9468),
          p = n(3946),
          g = (function (e, t) {
            if (!t && e && e.__esModule) return e;
            if (null === e || ("object" != typeof e && "function" != typeof e))
              return { default: e };
            var n = m(t);
            if (n && n.has(e)) return n.get(e);
            var i = { __proto__: null },
              a = Object.defineProperty && Object.getOwnPropertyDescriptor;
            for (var r in e)
              if (
                "default" !== r &&
                Object.prototype.hasOwnProperty.call(e, r)
              ) {
                var o = a ? Object.getOwnPropertyDescriptor(e, r) : null;
                o && (o.get || o.set)
                  ? Object.defineProperty(i, r, o)
                  : (i[r] = e[r]);
              }
            return (i.default = e), n && n.set(e, i), i;
          })(n(5012)),
          E = y(n(8955));
        function y(e) {
          return e && e.__esModule ? e : { default: e };
        }
        function m(e) {
          if ("function" != typeof WeakMap) return null;
          var t = new WeakMap(),
            n = new WeakMap();
          return (m = function (e) {
            return e ? n : t;
          })(e);
        }
        let h = Object.keys(d.QuickEffectIds),
          b = (e) => h.includes(e),
          {
            COLON_DELIMITER: I,
            BOUNDARY_SELECTOR: T,
            HTML_ELEMENT: _,
            RENDER_GENERAL: v,
            W_MOD_IX: O,
          } = d.IX2EngineConstants,
          {
            getAffectedElements: A,
            getElementId: w,
            getDestinationValues: R,
            observeStore: S,
            getInstanceId: N,
            renderHTMLElement: L,
            clearAllStyles: C,
            getMaxDurationItemIndex: M,
            getComputedStyle: P,
            getInstanceOrigin: x,
            reduceListToGroup: F,
            shouldNamespaceEventParameter: U,
            getNamespacedParameterId: G,
            shouldAllowMediaQuery: D,
            cleanupHTMLElement: k,
            clearObjectCache: V,
            stringifyTarget: X,
            mediaQueriesEqual: B,
            shallowEqual: j,
          } = f.IX2VanillaUtils,
          {
            isPluginType: z,
            createPluginInstance: Y,
            getPluginDuration: W,
          } = f.IX2VanillaPlugins,
          $ = navigator.userAgent,
          H = $.match(/iPad/i) || $.match(/iPhone/);
        function Q(e) {
          S({
            store: e,
            select: ({ ixRequest: e }) => e.preview,
            onChange: K,
          }),
            S({
              store: e,
              select: ({ ixRequest: e }) => e.playback,
              onChange: Z,
            }),
            S({
              store: e,
              select: ({ ixRequest: e }) => e.stop,
              onChange: J,
            }),
            S({
              store: e,
              select: ({ ixRequest: e }) => e.clear,
              onChange: ee,
            });
        }
        function K({ rawData: e, defer: t }, n) {
          let i = () => {
            et({ store: n, rawData: e, allowEvents: !0 }), q();
          };
          t ? setTimeout(i, 0) : i();
        }
        function q() {
          document.dispatchEvent(new CustomEvent("IX2_PAGE_UPDATE"));
        }
        function Z(e, t) {
          let {
              actionTypeId: n,
              actionListId: i,
              actionItemId: a,
              eventId: r,
              allowEvents: o,
              immediate: l,
              testManual: c,
              verbose: u = !0,
            } = e,
            { rawData: s } = e;
          if (i && a && s && l) {
            let e = s.actionLists[i];
            e &&
              (s = F({
                actionList: e,
                actionItemId: a,
                rawData: s,
              }));
          }
          if (
            (et({
              store: t,
              rawData: s,
              allowEvents: o,
              testManual: c,
            }),
            (i && n === d.ActionTypeConsts.GENERAL_START_ACTION) || b(n))
          ) {
            ed({ store: t, actionListId: i }),
              eu({ store: t, actionListId: i, eventId: r });
            let e = ef({
              store: t,
              eventId: r,
              actionListId: i,
              immediate: l,
              verbose: u,
            });
            u &&
              e &&
              t.dispatch(
                (0, p.actionListPlaybackChanged)({
                  actionListId: i,
                  isPlaying: !l,
                })
              );
          }
        }
        function J({ actionListId: e }, t) {
          e ? ed({ store: t, actionListId: e }) : es({ store: t }), en(t);
        }
        function ee(e, t) {
          en(t), C({ store: t, elementApi: g });
        }
        function et({ store: e, rawData: t, allowEvents: n, testManual: o }) {
          let { ixSession: l } = e.getState();
          if ((t && e.dispatch((0, p.rawDataImported)(t)), !l.active)) {
            if (
              (e.dispatch(
                (0, p.sessionInitialized)({
                  hasBoundaryNodes: !!document.querySelector(T),
                  reducedMotion:
                    document.body.hasAttribute("data-wf-ix-vacation") &&
                    window.matchMedia("(prefers-reduced-motion)").matches,
                })
              ),
              n &&
                ((function (e) {
                  let { ixData: t } = e.getState(),
                    { eventTypeMap: n } = t;
                  er(e),
                    (0, u.default)(n, (t, n) => {
                      let o = E.default[n];
                      if (!o) {
                        console.warn(`IX2 event type not configured: ${n}`);
                        return;
                      }
                      (function ({ logic: e, store: t, events: n }) {
                        (function (e) {
                          if (!H) return;
                          let t = {},
                            n = "";
                          for (let i in e) {
                            let { eventTypeId: a, target: r } = e[i],
                              o = g.getQuerySelector(r);
                            if (!t[o])
                              (a === d.EventTypeConsts.MOUSE_CLICK ||
                                a === d.EventTypeConsts.MOUSE_SECOND_CLICK) &&
                                ((t[o] = !0),
                                (n +=
                                  o +
                                  "{cursor: pointer;touch-action: manipulation;}"));
                          }
                          if (n) {
                            let e = document.createElement("style");
                            (e.textContent = n), document.body.appendChild(e);
                          }
                        })(n);
                        let { types: o, handler: l } = e,
                          { ixData: c } = t.getState(),
                          { actionLists: f } = c,
                          E = eo(n, ec);
                        if (!(0, r.default)(E)) return;
                        (0, u.default)(E, (e, r) => {
                          let o = n[r],
                            {
                              action: l,
                              id: u,
                              mediaQueries: s = c.mediaQueryKeys,
                            } = o,
                            { actionListId: E } = l.config;
                          !B(s, c.mediaQueryKeys) &&
                            t.dispatch((0, p.mediaQueriesDefined)()),
                            l.actionTypeId ===
                              d.ActionTypeConsts.GENERAL_CONTINUOUS_ACTION &&
                              (Array.isArray(o.config)
                                ? o.config
                                : [o.config]
                              ).forEach((n) => {
                                let { continuousParameterGroupId: r } = n,
                                  o = (0, a.default)(
                                    f,
                                    `${E}.continuousParameterGroups`,
                                    []
                                  ),
                                  l = (0, i.default)(o, ({ id: e }) => e === r),
                                  c = (n.smoothing || 0) / 100,
                                  s = (n.restingState || 0) / 100;
                                if (!!l)
                                  e.forEach((e, i) => {
                                    !(function ({
                                      store: e,
                                      eventStateKey: t,
                                      eventTarget: n,
                                      eventId: i,
                                      eventConfig: r,
                                      actionListId: o,
                                      parameterGroup: l,
                                      smoothing: c,
                                      restingValue: u,
                                    }) {
                                      let { ixData: s, ixSession: f } =
                                          e.getState(),
                                        { events: p } = s,
                                        E = p[i],
                                        { eventTypeId: y } = E,
                                        m = {},
                                        h = {},
                                        b = [],
                                        { continuousActionGroups: _ } = l,
                                        { id: v } = l;
                                      U(y, r) && (v = G(t, v));
                                      let O =
                                        f.hasBoundaryNodes && n
                                          ? g.getClosestElement(n, T)
                                          : null;
                                      _.forEach((e) => {
                                        let { keyframe: t, actionItems: i } = e;
                                        i.forEach((e) => {
                                          let { actionTypeId: i } = e,
                                            { target: a } = e.config;
                                          if (!a) return;
                                          let r = a.boundaryMode ? O : null,
                                            o = X(a) + I + i;
                                          if (
                                            ((h[o] = (function (e = [], t, n) {
                                              let i;
                                              let a = [...e];
                                              return (
                                                a.some(
                                                  (e, n) =>
                                                    e.keyframe === t &&
                                                    ((i = n), !0)
                                                ),
                                                null == i &&
                                                  ((i = a.length),
                                                  a.push({
                                                    keyframe: t,
                                                    actionItems: [],
                                                  })),
                                                a[i].actionItems.push(n),
                                                a
                                              );
                                            })(h[o], t, e)),
                                            !m[o])
                                          ) {
                                            m[o] = !0;
                                            let { config: t } = e;
                                            A({
                                              config: t,
                                              event: E,
                                              eventTarget: n,
                                              elementRoot: r,
                                              elementApi: g,
                                            }).forEach((e) => {
                                              b.push({
                                                element: e,
                                                key: o,
                                              });
                                            });
                                          }
                                        });
                                      }),
                                        b.forEach(({ element: t, key: n }) => {
                                          let r = h[n],
                                            l = (0, a.default)(
                                              r,
                                              "[0].actionItems[0]",
                                              {}
                                            ),
                                            { actionTypeId: s } = l,
                                            f = (
                                              s ===
                                              d.ActionTypeConsts.PLUGIN_RIVE
                                                ? 0 ===
                                                  (
                                                    l.config?.target
                                                      ?.selectorGuids || []
                                                  ).length
                                                : z(s)
                                            )
                                              ? Y(s)?.(t, l)
                                              : null,
                                            p = R(
                                              {
                                                element: t,
                                                actionItem: l,
                                                elementApi: g,
                                              },
                                              f
                                            );
                                          ep({
                                            store: e,
                                            element: t,
                                            eventId: i,
                                            actionListId: o,
                                            actionItem: l,
                                            destination: p,
                                            continuous: !0,
                                            parameterId: v,
                                            actionGroups: r,
                                            smoothing: c,
                                            restingValue: u,
                                            pluginInstance: f,
                                          });
                                        });
                                    })({
                                      store: t,
                                      eventStateKey: u + I + i,
                                      eventTarget: e,
                                      eventId: u,
                                      eventConfig: n,
                                      actionListId: E,
                                      parameterGroup: l,
                                      smoothing: c,
                                      restingValue: s,
                                    });
                                  });
                              }),
                            (l.actionTypeId ===
                              d.ActionTypeConsts.GENERAL_START_ACTION ||
                              b(l.actionTypeId)) &&
                              eu({
                                store: t,
                                actionListId: E,
                                eventId: u,
                              });
                        });
                        let y = (e) => {
                            let { ixSession: i } = t.getState();
                            el(E, (a, r, o) => {
                              let u = n[r],
                                s = i.eventState[o],
                                {
                                  action: f,
                                  mediaQueries: g = c.mediaQueryKeys,
                                } = u;
                              if (!D(g, i.mediaQueryKey)) return;
                              let E = (n = {}) => {
                                let i = l(
                                  {
                                    store: t,
                                    element: a,
                                    event: u,
                                    eventConfig: n,
                                    nativeEvent: e,
                                    eventStateKey: o,
                                  },
                                  s
                                );
                                !j(i, s) &&
                                  t.dispatch((0, p.eventStateChanged)(o, i));
                              };
                              f.actionTypeId ===
                              d.ActionTypeConsts.GENERAL_CONTINUOUS_ACTION
                                ? (Array.isArray(u.config)
                                    ? u.config
                                    : [u.config]
                                  ).forEach(E)
                                : E();
                            });
                          },
                          m = (0, s.default)(y, 12),
                          h = ({
                            target: e = document,
                            types: n,
                            throttle: i,
                          }) => {
                            n.split(" ")
                              .filter(Boolean)
                              .forEach((n) => {
                                let a = i ? m : y;
                                e.addEventListener(n, a),
                                  t.dispatch(
                                    (0, p.eventListenerAdded)(e, [n, a])
                                  );
                              });
                          };
                        Array.isArray(o)
                          ? o.forEach(h)
                          : "string" == typeof o && h(e);
                      })({
                        logic: o,
                        store: e,
                        events: t,
                      });
                    });
                  let { ixSession: o } = e.getState();
                  o.eventListeners.length &&
                    (function (e) {
                      let t = () => {
                        er(e);
                      };
                      ea.forEach((n) => {
                        window.addEventListener(n, t),
                          e.dispatch((0, p.eventListenerAdded)(window, [n, t]));
                      }),
                        t();
                    })(e);
                })(e),
                (function () {
                  let { documentElement: e } = document;
                  -1 === e.className.indexOf(O) && (e.className += ` ${O}`);
                })(),
                e.getState().ixSession.hasDefinedMediaQueries))
            ) {
              var c;
              S({
                store: (c = e),
                select: ({ ixSession: e }) => e.mediaQueryKey,
                onChange: () => {
                  en(c),
                    C({ store: c, elementApi: g }),
                    et({ store: c, allowEvents: !0 }),
                    q();
                },
              });
            }
            e.dispatch((0, p.sessionStarted)()),
              (function (e, t) {
                let n = (i) => {
                  let { ixSession: a, ixParameters: r } = e.getState();
                  a.active &&
                    (e.dispatch((0, p.animationFrameChanged)(i, r)),
                    t
                      ? !(function (e, t) {
                          let n = S({
                            store: e,
                            select: ({ ixSession: e }) => e.tick,
                            onChange: (e) => {
                              t(e), n();
                            },
                          });
                        })(e, n)
                      : requestAnimationFrame(n));
                };
                n(window.performance.now());
              })(e, o);
          }
        }
        function en(e) {
          let { ixSession: t } = e.getState();
          if (t.active) {
            let { eventListeners: n } = t;
            n.forEach(ei), V(), e.dispatch((0, p.sessionStopped)());
          }
        }
        function ei({ target: e, listenerParams: t }) {
          e.removeEventListener.apply(e, t);
        }
        let ea = ["resize", "orientationchange"];
        function er(e) {
          let { ixSession: t, ixData: n } = e.getState(),
            i = window.innerWidth;
          if (i !== t.viewportWidth) {
            let { mediaQueries: t } = n;
            e.dispatch(
              (0, p.viewportWidthChanged)({
                width: i,
                mediaQueries: t,
              })
            );
          }
        }
        let eo = (e, t) => (0, o.default)((0, c.default)(e, t), l.default),
          el = (e, t) => {
            (0, u.default)(e, (e, n) => {
              e.forEach((e, i) => {
                t(e, n, n + I + i);
              });
            });
          },
          ec = (e) =>
            A({
              config: { target: e.target, targets: e.targets },
              elementApi: g,
            });
        function eu({ store: e, actionListId: t, eventId: n }) {
          let { ixData: i, ixSession: r } = e.getState(),
            { actionLists: o, events: l } = i,
            c = l[n],
            u = o[t];
          if (u && u.useFirstGroupAsInitialState) {
            let o = (0, a.default)(u, "actionItemGroups[0].actionItems", []);
            if (
              !D(
                (0, a.default)(c, "mediaQueries", i.mediaQueryKeys),
                r.mediaQueryKey
              )
            )
              return;
            o.forEach((i) => {
              let { config: a, actionTypeId: r } = i,
                o = A({
                  config:
                    a?.target?.useEventTarget === !0 &&
                    a?.target?.objectId == null
                      ? {
                          target: c.target,
                          targets: c.targets,
                        }
                      : a,
                  event: c,
                  elementApi: g,
                }),
                l = z(r);
              o.forEach((a) => {
                let o = l ? Y(r)?.(a, i) : null;
                ep({
                  destination: R(
                    {
                      element: a,
                      actionItem: i,
                      elementApi: g,
                    },
                    o
                  ),
                  immediate: !0,
                  store: e,
                  element: a,
                  eventId: n,
                  actionItem: i,
                  actionListId: t,
                  pluginInstance: o,
                });
              });
            });
          }
        }
        function es({ store: e }) {
          let { ixInstances: t } = e.getState();
          (0, u.default)(t, (t) => {
            if (!t.continuous) {
              let { actionListId: n, verbose: i } = t;
              eg(t, e),
                i &&
                  e.dispatch(
                    (0, p.actionListPlaybackChanged)({
                      actionListId: n,
                      isPlaying: !1,
                    })
                  );
            }
          });
        }
        function ed({
          store: e,
          eventId: t,
          eventTarget: n,
          eventStateKey: i,
          actionListId: r,
        }) {
          let { ixInstances: o, ixSession: l } = e.getState(),
            c = l.hasBoundaryNodes && n ? g.getClosestElement(n, T) : null;
          (0, u.default)(o, (n) => {
            let o = (0, a.default)(n, "actionItem.config.target.boundaryMode"),
              l = !i || n.eventStateKey === i;
            if (n.actionListId === r && n.eventId === t && l) {
              if (c && o && !g.elementContains(c, n.element)) return;
              eg(n, e),
                n.verbose &&
                  e.dispatch(
                    (0, p.actionListPlaybackChanged)({
                      actionListId: r,
                      isPlaying: !1,
                    })
                  );
            }
          });
        }
        function ef({
          store: e,
          eventId: t,
          eventTarget: n,
          eventStateKey: i,
          actionListId: r,
          groupIndex: o = 0,
          immediate: l,
          verbose: c,
        }) {
          let { ixData: u, ixSession: s } = e.getState(),
            { events: d } = u,
            f = d[t] || {},
            { mediaQueries: p = u.mediaQueryKeys } = f,
            { actionItemGroups: E, useFirstGroupAsInitialState: y } = (0,
            a.default)(u, `actionLists.${r}`, {});
          if (!E || !E.length) return !1;
          o >= E.length && (0, a.default)(f, "config.loop") && (o = 0),
            0 === o && y && o++;
          let m =
              (0 === o || (1 === o && y)) && b(f.action?.actionTypeId)
                ? f.config.delay
                : void 0,
            h = (0, a.default)(E, [o, "actionItems"], []);
          if (!h.length || !D(p, s.mediaQueryKey)) return !1;
          let I = s.hasBoundaryNodes && n ? g.getClosestElement(n, T) : null,
            _ = M(h),
            v = !1;
          return (
            h.forEach((a, u) => {
              let { config: s, actionTypeId: d } = a,
                p = z(d),
                { target: E } = s;
              if (!!E)
                A({
                  config: s,
                  event: f,
                  eventTarget: n,
                  elementRoot: E.boundaryMode ? I : null,
                  elementApi: g,
                }).forEach((s, f) => {
                  let E = p ? Y(d)?.(s, a) : null,
                    y = p ? W(d)(s, a) : null;
                  v = !0;
                  let h = P({ element: s, actionItem: a }),
                    b = R(
                      {
                        element: s,
                        actionItem: a,
                        elementApi: g,
                      },
                      E
                    );
                  ep({
                    store: e,
                    element: s,
                    actionItem: a,
                    eventId: t,
                    eventTarget: n,
                    eventStateKey: i,
                    actionListId: r,
                    groupIndex: o,
                    isCarrier: _ === u && 0 === f,
                    computedStyle: h,
                    destination: b,
                    immediate: l,
                    verbose: c,
                    pluginInstance: E,
                    pluginDuration: y,
                    instanceDelay: m,
                  });
                });
            }),
            v
          );
        }
        function ep(e) {
          let t;
          let { store: n, computedStyle: i, ...a } = e,
            {
              element: r,
              actionItem: o,
              immediate: l,
              pluginInstance: c,
              continuous: u,
              restingValue: s,
              eventId: f,
            } = a,
            E = N(),
            { ixElements: y, ixSession: m, ixData: h } = n.getState(),
            b = w(y, r),
            { refState: I } = y[b] || {},
            T = g.getRefType(r),
            _ = m.reducedMotion && d.ReducedMotionTypes[o.actionTypeId];
          if (_ && u)
            switch (h.events[f]?.eventTypeId) {
              case d.EventTypeConsts.MOUSE_MOVE:
              case d.EventTypeConsts.MOUSE_MOVE_IN_VIEWPORT:
                t = s;
                break;
              default:
                t = 0.5;
            }
          let v = x(r, I, i, o, g, c);
          if (
            (n.dispatch(
              (0, p.instanceAdded)({
                instanceId: E,
                elementId: b,
                origin: v,
                refType: T,
                skipMotion: _,
                skipToValue: t,
                ...a,
              })
            ),
            eE(document.body, "ix2-animation-started", E),
            l)
          ) {
            (function (e, t) {
              let { ixParameters: n } = e.getState();
              e.dispatch((0, p.instanceStarted)(t, 0)),
                e.dispatch((0, p.animationFrameChanged)(performance.now(), n));
              let { ixInstances: i } = e.getState();
              ey(i[t], e);
            })(n, E);
            return;
          }
          S({
            store: n,
            select: ({ ixInstances: e }) => e[E],
            onChange: ey,
          }),
            !u && n.dispatch((0, p.instanceStarted)(E, m.tick));
        }
        function eg(e, t) {
          eE(document.body, "ix2-animation-stopping", {
            instanceId: e.id,
            state: t.getState(),
          });
          let { elementId: n, actionItem: i } = e,
            { ixElements: a } = t.getState(),
            { ref: r, refType: o } = a[n] || {};
          o === _ && k(r, i, g), t.dispatch((0, p.instanceRemoved)(e.id));
        }
        function eE(e, t, n) {
          let i = document.createEvent("CustomEvent");
          i.initCustomEvent(t, !0, !0, n), e.dispatchEvent(i);
        }
        function ey(e, t) {
          let {
              active: n,
              continuous: i,
              complete: a,
              elementId: r,
              actionItem: o,
              actionTypeId: l,
              renderType: c,
              current: u,
              groupIndex: s,
              eventId: d,
              eventTarget: f,
              eventStateKey: E,
              actionListId: y,
              isCarrier: m,
              styleProp: h,
              verbose: b,
              pluginInstance: I,
            } = e,
            { ixData: T, ixSession: O } = t.getState(),
            { events: A } = T,
            { mediaQueries: w = T.mediaQueryKeys } = A && A[d] ? A[d] : {};
          if (!!D(w, O.mediaQueryKey)) {
            if (i || n || a) {
              if (u || (c === v && a)) {
                t.dispatch((0, p.elementStateChanged)(r, l, u, o));
                let { ixElements: e } = t.getState(),
                  { ref: n, refType: i, refState: a } = e[r] || {},
                  s = a && a[l];
                (i === _ || z(l)) && L(n, a, s, d, o, h, g, c, I);
              }
              if (a) {
                if (m) {
                  let e = ef({
                    store: t,
                    eventId: d,
                    eventTarget: f,
                    eventStateKey: E,
                    actionListId: y,
                    groupIndex: s + 1,
                    verbose: b,
                  });
                  b &&
                    !e &&
                    t.dispatch(
                      (0, p.actionListPlaybackChanged)({
                        actionListId: y,
                        isPlaying: !1,
                      })
                    );
                }
                eg(e, t);
              }
            }
          }
        }
      },
      8955: function (e, t, n) {
        "use strict";
        let i, a, r;
        Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "default", {
            enumerable: !0,
            get: function () {
              return eE;
            },
          });
        let o = p(n(5801)),
          l = p(n(4738)),
          c = p(n(3789)),
          u = n(7087),
          s = n(1970),
          d = n(3946),
          f = n(9468);
        function p(e) {
          return e && e.__esModule ? e : { default: e };
        }
        let {
            MOUSE_CLICK: g,
            MOUSE_SECOND_CLICK: E,
            MOUSE_DOWN: y,
            MOUSE_UP: m,
            MOUSE_OVER: h,
            MOUSE_OUT: b,
            DROPDOWN_CLOSE: I,
            DROPDOWN_OPEN: T,
            SLIDER_ACTIVE: _,
            SLIDER_INACTIVE: v,
            TAB_ACTIVE: O,
            TAB_INACTIVE: A,
            NAVBAR_CLOSE: w,
            NAVBAR_OPEN: R,
            MOUSE_MOVE: S,
            PAGE_SCROLL_DOWN: N,
            SCROLL_INTO_VIEW: L,
            SCROLL_OUT_OF_VIEW: C,
            PAGE_SCROLL_UP: M,
            SCROLLING_IN_VIEW: P,
            PAGE_FINISH: x,
            ECOMMERCE_CART_CLOSE: F,
            ECOMMERCE_CART_OPEN: U,
            PAGE_START: G,
            PAGE_SCROLL: D,
          } = u.EventTypeConsts,
          k = "COMPONENT_ACTIVE",
          V = "COMPONENT_INACTIVE",
          { COLON_DELIMITER: X } = u.IX2EngineConstants,
          { getNamespacedParameterId: B } = f.IX2VanillaUtils,
          j = (e) => (t) => !!("object" == typeof t && e(t)) || t,
          z = j(({ element: e, nativeEvent: t }) => e === t.target),
          Y = j(({ element: e, nativeEvent: t }) => e.contains(t.target)),
          W = (0, o.default)([z, Y]),
          $ = (e, t) => {
            if (t) {
              let { ixData: n } = e.getState(),
                { events: i } = n,
                a = i[t];
              if (a && !en[a.eventTypeId]) return a;
            }
            return null;
          },
          H = ({ store: e, event: t }) => {
            let { action: n } = t,
              { autoStopEventId: i } = n.config;
            return !!$(e, i);
          },
          Q = ({ store: e, event: t, element: n, eventStateKey: i }, a) => {
            let { action: r, id: o } = t,
              { actionListId: c, autoStopEventId: u } = r.config,
              d = $(e, u);
            return (
              d &&
                (0, s.stopActionGroup)({
                  store: e,
                  eventId: u,
                  eventTarget: n,
                  eventStateKey: u + X + i.split(X)[1],
                  actionListId: (0, l.default)(d, "action.config.actionListId"),
                }),
              (0, s.stopActionGroup)({
                store: e,
                eventId: o,
                eventTarget: n,
                eventStateKey: i,
                actionListId: c,
              }),
              (0, s.startActionGroup)({
                store: e,
                eventId: o,
                eventTarget: n,
                eventStateKey: i,
                actionListId: c,
              }),
              a
            );
          },
          K = (e, t) => (n, i) => !0 === e(n, i) ? t(n, i) : i,
          q = { handler: K(W, Q) },
          Z = { ...q, types: [k, V].join(" ") },
          J = [
            {
              target: window,
              types: "resize orientationchange",
              throttle: !0,
            },
            {
              target: document,
              types: "scroll wheel readystatechange IX2_PAGE_UPDATE",
              throttle: !0,
            },
          ],
          ee = "mouseover mouseout",
          et = { types: J },
          en = { PAGE_START: G, PAGE_FINISH: x },
          ei = (() => {
            let e = void 0 !== window.pageXOffset,
              t =
                "CSS1Compat" === document.compatMode
                  ? document.documentElement
                  : document.body;
            return () => ({
              scrollLeft: e ? window.pageXOffset : t.scrollLeft,
              scrollTop: e ? window.pageYOffset : t.scrollTop,
              stiffScrollTop: (0, c.default)(
                e ? window.pageYOffset : t.scrollTop,
                0,
                t.scrollHeight - window.innerHeight
              ),
              scrollWidth: t.scrollWidth,
              scrollHeight: t.scrollHeight,
              clientWidth: t.clientWidth,
              clientHeight: t.clientHeight,
              innerWidth: window.innerWidth,
              innerHeight: window.innerHeight,
            });
          })(),
          ea = (e, t) =>
            !(
              e.left > t.right ||
              e.right < t.left ||
              e.top > t.bottom ||
              e.bottom < t.top
            ),
          er = ({ element: e, nativeEvent: t }) => {
            let { type: n, target: i, relatedTarget: a } = t,
              r = e.contains(i);
            if ("mouseover" === n && r) return !0;
            let o = e.contains(a);
            return ("mouseout" === n && !!r && !!o) || !1;
          },
          eo = (e) => {
            let {
                element: t,
                event: { config: n },
              } = e,
              { clientWidth: i, clientHeight: a } = ei(),
              r = n.scrollOffsetValue,
              o = n.scrollOffsetUnit,
              l = "PX" === o ? r : (a * (r || 0)) / 100;
            return ea(t.getBoundingClientRect(), {
              left: 0,
              top: l,
              right: i,
              bottom: a - l,
            });
          },
          el = (e) => (t, n) => {
            let { type: i } = t.nativeEvent,
              a = -1 !== [k, V].indexOf(i) ? i === k : n.isActive,
              r = { ...n, isActive: a };
            return n && r.isActive === n.isActive ? r : e(t, r) || r;
          },
          ec = (e) => (t, n) => {
            let i = { elementHovered: er(t) };
            return (
              ((n ? i.elementHovered !== n.elementHovered : i.elementHovered) &&
                e(t, i)) ||
              i
            );
          },
          eu =
            (e) =>
            (t, n = {}) => {
              let i, a;
              let { stiffScrollTop: r, scrollHeight: o, innerHeight: l } = ei(),
                {
                  event: { config: c, eventTypeId: u },
                } = t,
                { scrollOffsetValue: s, scrollOffsetUnit: d } = c,
                f = o - l,
                p = Number((r / f).toFixed(2));
              if (n && n.percentTop === p) return n;
              let g = ("PX" === d ? s : (l * (s || 0)) / 100) / f,
                E = 0;
              n &&
                ((i = p > n.percentTop),
                (E = (a = n.scrollingDown !== i) ? p : n.anchorTop));
              let y = u === N ? p >= E + g : p <= E - g,
                m = {
                  ...n,
                  percentTop: p,
                  inBounds: y,
                  anchorTop: E,
                  scrollingDown: i,
                };
              return (
                (n && y && (a || m.inBounds !== n.inBounds) && e(t, m)) || m
              );
            },
          es = (e, t) =>
            e.left > t.left &&
            e.left < t.right &&
            e.top > t.top &&
            e.top < t.bottom,
          ed =
            (e) =>
            (t, n = { clickCount: 0 }) => {
              let i = { clickCount: (n.clickCount % 2) + 1 };
              return (i.clickCount !== n.clickCount && e(t, i)) || i;
            },
          ef = (e = !0) => ({
            ...Z,
            handler: K(
              e ? W : z,
              el((e, t) => (t.isActive ? q.handler(e, t) : t))
            ),
          }),
          ep = (e = !0) => ({
            ...Z,
            handler: K(
              e ? W : z,
              el((e, t) => (t.isActive ? t : q.handler(e, t)))
            ),
          });
        let eg = {
          ...et,
          handler:
            ((i = (e, t) => {
              let { elementVisible: n } = t,
                { event: i, store: a } = e,
                { ixData: r } = a.getState(),
                { events: o } = r;
              return !o[i.action.config.autoStopEventId] && t.triggered
                ? t
                : (i.eventTypeId === L) === n
                ? (Q(e), { ...t, triggered: !0 })
                : t;
            }),
            (e, t) => {
              let n = { ...t, elementVisible: eo(e) };
              return (
                ((t
                  ? n.elementVisible !== t.elementVisible
                  : n.elementVisible) &&
                  i(e, n)) ||
                n
              );
            }),
        };
        let eE = {
          [_]: ef(),
          [v]: ep(),
          [T]: ef(),
          [I]: ep(),
          [R]: ef(!1),
          [w]: ep(!1),
          [O]: ef(),
          [A]: ep(),
          [U]: { types: "ecommerce-cart-open", handler: K(W, Q) },
          [F]: { types: "ecommerce-cart-close", handler: K(W, Q) },
          [g]: {
            types: "click",
            handler: K(
              W,
              ed((e, { clickCount: t }) => {
                H(e) ? 1 === t && Q(e) : Q(e);
              })
            ),
          },
          [E]: {
            types: "click",
            handler: K(
              W,
              ed((e, { clickCount: t }) => {
                2 === t && Q(e);
              })
            ),
          },
          [y]: { ...q, types: "mousedown" },
          [m]: { ...q, types: "mouseup" },
          [h]: {
            types: ee,
            handler: K(
              W,
              ec((e, t) => {
                t.elementHovered && Q(e);
              })
            ),
          },
          [b]: {
            types: ee,
            handler: K(
              W,
              ec((e, t) => {
                !t.elementHovered && Q(e);
              })
            ),
          },
          [S]: {
            types: "mousemove mouseout scroll",
            handler: (
              {
                store: e,
                element: t,
                eventConfig: n,
                nativeEvent: i,
                eventStateKey: a,
              },
              r = { clientX: 0, clientY: 0, pageX: 0, pageY: 0 }
            ) => {
              let {
                  basedOn: o,
                  selectedAxis: l,
                  continuousParameterGroupId: c,
                  reverse: s,
                  restingState: f = 0,
                } = n,
                {
                  clientX: p = r.clientX,
                  clientY: g = r.clientY,
                  pageX: E = r.pageX,
                  pageY: y = r.pageY,
                } = i,
                m = "X_AXIS" === l,
                h = "mouseout" === i.type,
                b = f / 100,
                I = c,
                T = !1;
              switch (o) {
                case u.EventBasedOn.VIEWPORT:
                  b = m
                    ? Math.min(p, window.innerWidth) / window.innerWidth
                    : Math.min(g, window.innerHeight) / window.innerHeight;
                  break;
                case u.EventBasedOn.PAGE: {
                  let {
                    scrollLeft: e,
                    scrollTop: t,
                    scrollWidth: n,
                    scrollHeight: i,
                  } = ei();
                  b = m ? Math.min(e + E, n) / n : Math.min(t + y, i) / i;
                  break;
                }
                case u.EventBasedOn.ELEMENT:
                default: {
                  I = B(a, c);
                  let e = 0 === i.type.indexOf("mouse");
                  if (e && !0 !== W({ element: t, nativeEvent: i })) break;
                  let n = t.getBoundingClientRect(),
                    { left: r, top: o, width: l, height: u } = n;
                  if (!e && !es({ left: p, top: g }, n)) break;
                  (T = !0), (b = m ? (p - r) / l : (g - o) / u);
                }
              }
              return (
                h && (b > 0.95 || b < 0.05) && (b = Math.round(b)),
                (o !== u.EventBasedOn.ELEMENT || T || T !== r.elementHovered) &&
                  ((b = s ? 1 - b : b),
                  e.dispatch((0, d.parameterChanged)(I, b))),
                {
                  elementHovered: T,
                  clientX: p,
                  clientY: g,
                  pageX: E,
                  pageY: y,
                }
              );
            },
          },
          [D]: {
            types: J,
            handler: ({ store: e, eventConfig: t }) => {
              let { continuousParameterGroupId: n, reverse: i } = t,
                { scrollTop: a, scrollHeight: r, clientHeight: o } = ei(),
                l = a / (r - o);
              (l = i ? 1 - l : l), e.dispatch((0, d.parameterChanged)(n, l));
            },
          },
          [P]: {
            types: J,
            handler: (
              { element: e, store: t, eventConfig: n, eventStateKey: i },
              a = { scrollPercent: 0 }
            ) => {
              let {
                  scrollLeft: r,
                  scrollTop: o,
                  scrollWidth: l,
                  scrollHeight: c,
                  clientHeight: s,
                } = ei(),
                {
                  basedOn: f,
                  selectedAxis: p,
                  continuousParameterGroupId: g,
                  startsEntering: E,
                  startsExiting: y,
                  addEndOffset: m,
                  addStartOffset: h,
                  addOffsetValue: b = 0,
                  endOffsetValue: I = 0,
                } = n;
              if (f === u.EventBasedOn.VIEWPORT) {
                let e = "X_AXIS" === p ? r / l : o / c;
                return (
                  e !== a.scrollPercent &&
                    t.dispatch((0, d.parameterChanged)(g, e)),
                  { scrollPercent: e }
                );
              }
              {
                let n = B(i, g),
                  r = e.getBoundingClientRect(),
                  o = (h ? b : 0) / 100,
                  l = (m ? I : 0) / 100;
                (o = E ? o : 1 - o), (l = y ? l : 1 - l);
                let u = r.top + Math.min(r.height * o, s),
                  f = r.top + r.height * l,
                  p = Math.min(s + (f - u), c),
                  T = Math.min(Math.max(0, s - u), p) / p;
                return (
                  T !== a.scrollPercent &&
                    t.dispatch((0, d.parameterChanged)(n, T)),
                  { scrollPercent: T }
                );
              }
            },
          },
          [L]: eg,
          [C]: eg,
          [N]: {
            ...et,
            handler: eu((e, t) => {
              t.scrollingDown && Q(e);
            }),
          },
          [M]: {
            ...et,
            handler: eu((e, t) => {
              !t.scrollingDown && Q(e);
            }),
          },
          [x]: {
            types: "readystatechange IX2_PAGE_UPDATE",
            handler: K(
              z,
              ((a = Q),
              (e, t) => {
                let n = {
                  finished: "complete" === document.readyState,
                };
                return n.finished && !(t && t.finshed) && a(e), n;
              })
            ),
          },
          [G]: {
            types: "readystatechange IX2_PAGE_UPDATE",
            handler: K(z, ((r = Q), (e, t) => (t || r(e), { started: !0 }))),
          },
        };
      },
      4609: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "ixData", {
            enumerable: !0,
            get: function () {
              return a;
            },
          });
        let { IX2_RAW_DATA_IMPORTED: i } = n(7087).IX2EngineActionTypes,
          a = (e = Object.freeze({}), t) => {
            if (t.type === i) return t.payload.ixData || Object.freeze({});
            return e;
          };
      },
      7718: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "ixInstances", {
            enumerable: !0,
            get: function () {
              return T;
            },
          });
        let i = n(7087),
          a = n(9468),
          r = n(1185),
          {
            IX2_RAW_DATA_IMPORTED: o,
            IX2_SESSION_STOPPED: l,
            IX2_INSTANCE_ADDED: c,
            IX2_INSTANCE_STARTED: u,
            IX2_INSTANCE_REMOVED: s,
            IX2_ANIMATION_FRAME_CHANGED: d,
          } = i.IX2EngineActionTypes,
          {
            optimizeFloat: f,
            applyEasing: p,
            createBezierEasing: g,
          } = a.IX2EasingUtils,
          { RENDER_GENERAL: E } = i.IX2EngineConstants,
          {
            getItemConfigByKey: y,
            getRenderType: m,
            getStyleProp: h,
          } = a.IX2VanillaUtils,
          b = (e, t) => {
            let n, i, a, o;
            let {
                position: l,
                parameterId: c,
                actionGroups: u,
                destinationKeys: s,
                smoothing: d,
                restingValue: g,
                actionTypeId: E,
                customEasingFn: m,
                skipMotion: h,
                skipToValue: b,
              } = e,
              { parameters: I } = t.payload,
              T = Math.max(1 - d, 0.01),
              _ = I[c];
            null == _ && ((T = 1), (_ = g));
            let v = f((Math.max(_, 0) || 0) - l),
              O = h ? b : f(l + v * T),
              A = 100 * O;
            if (O === l && e.current) return e;
            for (let e = 0, { length: t } = u; e < t; e++) {
              let { keyframe: t, actionItems: r } = u[e];
              if ((0 === e && (n = r[0]), A >= t)) {
                n = r[0];
                let l = u[e + 1],
                  c = l && A !== t;
                (i = c ? l.actionItems[0] : null),
                  c && ((a = t / 100), (o = (l.keyframe - t) / 100));
              }
            }
            let w = {};
            if (n && !i)
              for (let e = 0, { length: t } = s; e < t; e++) {
                let t = s[e];
                w[t] = y(E, t, n.config);
              }
            else if (n && i && void 0 !== a && void 0 !== o) {
              let e = (O - a) / o,
                t = p(n.config.easing, e, m);
              for (let e = 0, { length: a } = s; e < a; e++) {
                let a = s[e],
                  r = y(E, a, n.config),
                  o = (y(E, a, i.config) - r) * t + r;
                w[a] = o;
              }
            }
            return (0, r.merge)(e, { position: O, current: w });
          },
          I = (e, t) => {
            let {
                active: n,
                origin: i,
                start: a,
                immediate: o,
                renderType: l,
                verbose: c,
                actionItem: u,
                destination: s,
                destinationKeys: d,
                pluginDuration: g,
                instanceDelay: y,
                customEasingFn: m,
                skipMotion: h,
              } = e,
              b = u.config.easing,
              { duration: I, delay: T } = u.config;
            null != g && (I = g),
              (T = null != y ? y : T),
              l === E ? (I = 0) : (o || h) && (I = T = 0);
            let { now: _ } = t.payload;
            if (n && i) {
              let t = _ - (a + T);
              if (c) {
                let t = I + T,
                  n = f(Math.min(Math.max(0, (_ - a) / t), 1));
                e = (0, r.set)(e, "verboseTimeElapsed", t * n);
              }
              if (t < 0) return e;
              let n = f(Math.min(Math.max(0, t / I), 1)),
                o = p(b, n, m),
                l = {},
                u = null;
              return (
                d.length &&
                  (u = d.reduce((e, t) => {
                    let n = s[t],
                      a = parseFloat(i[t]) || 0,
                      r = parseFloat(n) - a;
                    return (e[t] = r * o + a), e;
                  }, {})),
                (l.current = u),
                (l.position = n),
                1 === n && ((l.active = !1), (l.complete = !0)),
                (0, r.merge)(e, l)
              );
            }
            return e;
          },
          T = (e = Object.freeze({}), t) => {
            switch (t.type) {
              case o:
                return t.payload.ixInstances || Object.freeze({});
              case l:
                return Object.freeze({});
              case c: {
                let {
                    instanceId: n,
                    elementId: i,
                    actionItem: a,
                    eventId: o,
                    eventTarget: l,
                    eventStateKey: c,
                    actionListId: u,
                    groupIndex: s,
                    isCarrier: d,
                    origin: f,
                    destination: p,
                    immediate: E,
                    verbose: y,
                    continuous: b,
                    parameterId: I,
                    actionGroups: T,
                    smoothing: _,
                    restingValue: v,
                    pluginInstance: O,
                    pluginDuration: A,
                    instanceDelay: w,
                    skipMotion: R,
                    skipToValue: S,
                  } = t.payload,
                  { actionTypeId: N } = a,
                  L = m(N),
                  C = h(L, N),
                  M = Object.keys(p).filter(
                    (e) => null != p[e] && "string" != typeof p[e]
                  ),
                  { easing: P } = a.config;
                return (0, r.set)(e, n, {
                  id: n,
                  elementId: i,
                  active: !1,
                  position: 0,
                  start: 0,
                  origin: f,
                  destination: p,
                  destinationKeys: M,
                  immediate: E,
                  verbose: y,
                  current: null,
                  actionItem: a,
                  actionTypeId: N,
                  eventId: o,
                  eventTarget: l,
                  eventStateKey: c,
                  actionListId: u,
                  groupIndex: s,
                  renderType: L,
                  isCarrier: d,
                  styleProp: C,
                  continuous: b,
                  parameterId: I,
                  actionGroups: T,
                  smoothing: _,
                  restingValue: v,
                  pluginInstance: O,
                  pluginDuration: A,
                  instanceDelay: w,
                  skipMotion: R,
                  skipToValue: S,
                  customEasingFn:
                    Array.isArray(P) && 4 === P.length ? g(P) : void 0,
                });
              }
              case u: {
                let { instanceId: n, time: i } = t.payload;
                return (0, r.mergeIn)(e, [n], {
                  active: !0,
                  complete: !1,
                  start: i,
                });
              }
              case s: {
                let { instanceId: n } = t.payload;
                if (!e[n]) return e;
                let i = {},
                  a = Object.keys(e),
                  { length: r } = a;
                for (let t = 0; t < r; t++) {
                  let r = a[t];
                  r !== n && (i[r] = e[r]);
                }
                return i;
              }
              case d: {
                let n = e,
                  i = Object.keys(e),
                  { length: a } = i;
                for (let o = 0; o < a; o++) {
                  let a = i[o],
                    l = e[a],
                    c = l.continuous ? b : I;
                  n = (0, r.set)(n, a, c(l, t));
                }
                return n;
              }
              default:
                return e;
            }
          };
      },
      1540: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "ixParameters", {
            enumerable: !0,
            get: function () {
              return o;
            },
          });
        let {
            IX2_RAW_DATA_IMPORTED: i,
            IX2_SESSION_STOPPED: a,
            IX2_PARAMETER_CHANGED: r,
          } = n(7087).IX2EngineActionTypes,
          o = (e = {}, t) => {
            switch (t.type) {
              case i:
                return t.payload.ixParameters || {};
              case a:
                return {};
              case r: {
                let { key: n, value: i } = t.payload;
                return (e[n] = i), e;
              }
              default:
                return e;
            }
          };
      },
      7243: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "default", {
            enumerable: !0,
            get: function () {
              return d;
            },
          });
        let i = n(9516),
          a = n(4609),
          r = n(628),
          o = n(5862),
          l = n(9468),
          c = n(7718),
          u = n(1540),
          { ixElements: s } = l.IX2ElementsReducer,
          d = (0, i.combineReducers)({
            ixData: a.ixData,
            ixRequest: r.ixRequest,
            ixSession: o.ixSession,
            ixElements: s,
            ixInstances: c.ixInstances,
            ixParameters: u.ixParameters,
          });
      },
      628: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "ixRequest", {
            enumerable: !0,
            get: function () {
              return d;
            },
          });
        let i = n(7087),
          a = n(1185),
          {
            IX2_PREVIEW_REQUESTED: r,
            IX2_PLAYBACK_REQUESTED: o,
            IX2_STOP_REQUESTED: l,
            IX2_CLEAR_REQUESTED: c,
          } = i.IX2EngineActionTypes,
          u = { preview: {}, playback: {}, stop: {}, clear: {} },
          s = Object.create(null, {
            [r]: { value: "preview" },
            [o]: { value: "playback" },
            [l]: { value: "stop" },
            [c]: { value: "clear" },
          }),
          d = (e = u, t) => {
            if (t.type in s) {
              let n = [s[t.type]];
              return (0, a.setIn)(e, [n], { ...t.payload });
            }
            return e;
          };
      },
      5862: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "ixSession", {
            enumerable: !0,
            get: function () {
              return y;
            },
          });
        let i = n(7087),
          a = n(1185),
          {
            IX2_SESSION_INITIALIZED: r,
            IX2_SESSION_STARTED: o,
            IX2_TEST_FRAME_RENDERED: l,
            IX2_SESSION_STOPPED: c,
            IX2_EVENT_LISTENER_ADDED: u,
            IX2_EVENT_STATE_CHANGED: s,
            IX2_ANIMATION_FRAME_CHANGED: d,
            IX2_ACTION_LIST_PLAYBACK_CHANGED: f,
            IX2_VIEWPORT_WIDTH_CHANGED: p,
            IX2_MEDIA_QUERIES_DEFINED: g,
          } = i.IX2EngineActionTypes,
          E = {
            active: !1,
            tick: 0,
            eventListeners: [],
            eventState: {},
            playbackState: {},
            viewportWidth: 0,
            mediaQueryKey: null,
            hasBoundaryNodes: !1,
            hasDefinedMediaQueries: !1,
            reducedMotion: !1,
          },
          y = (e = E, t) => {
            switch (t.type) {
              case r: {
                let { hasBoundaryNodes: n, reducedMotion: i } = t.payload;
                return (0, a.merge)(e, {
                  hasBoundaryNodes: n,
                  reducedMotion: i,
                });
              }
              case o:
                return (0, a.set)(e, "active", !0);
              case l: {
                let {
                  payload: { step: n = 20 },
                } = t;
                return (0, a.set)(e, "tick", e.tick + n);
              }
              case c:
                return E;
              case d: {
                let {
                  payload: { now: n },
                } = t;
                return (0, a.set)(e, "tick", n);
              }
              case u: {
                let n = (0, a.addLast)(e.eventListeners, t.payload);
                return (0, a.set)(e, "eventListeners", n);
              }
              case s: {
                let { stateKey: n, newState: i } = t.payload;
                return (0, a.setIn)(e, ["eventState", n], i);
              }
              case f: {
                let { actionListId: n, isPlaying: i } = t.payload;
                return (0, a.setIn)(e, ["playbackState", n], i);
              }
              case p: {
                let { width: n, mediaQueries: i } = t.payload,
                  r = i.length,
                  o = null;
                for (let e = 0; e < r; e++) {
                  let { key: t, min: a, max: r } = i[e];
                  if (n >= a && n <= r) {
                    o = t;
                    break;
                  }
                }
                return (0, a.merge)(e, {
                  viewportWidth: n,
                  mediaQueryKey: o,
                });
              }
              case g:
                return (0, a.set)(e, "hasDefinedMediaQueries", !0);
              default:
                return e;
            }
          };
      },
      7377: function (e, t) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          clearPlugin: function () {
            return c;
          },
          createPluginInstance: function () {
            return o;
          },
          getPluginConfig: function () {
            return n;
          },
          getPluginDestination: function () {
            return r;
          },
          getPluginDuration: function () {
            return i;
          },
          getPluginOrigin: function () {
            return a;
          },
          renderPlugin: function () {
            return l;
          },
        });
        let n = (e) => e.value,
          i = (e, t) => {
            if ("auto" !== t.config.duration) return null;
            let n = parseFloat(e.getAttribute("data-duration"));
            return n > 0
              ? 1e3 * n
              : 1e3 * parseFloat(e.getAttribute("data-default-duration"));
          },
          a = (e) => e || { value: 0 },
          r = (e) => ({ value: e.value }),
          o = (e) => {
            let t = window.Webflow.require("lottie");
            if (!t) return null;
            let n = t.createInstance(e);
            return n.stop(), n.setSubframe(!0), n;
          },
          l = (e, t, n) => {
            if (!e) return;
            let i = t[n.actionTypeId].value / 100;
            e.goToFrame(e.frames * i);
          },
          c = (e) => {
            let t = window.Webflow.require("lottie");
            t && t.createInstance(e).stop();
          };
      },
      2570: function (e, t) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          clearPlugin: function () {
            return f;
          },
          createPluginInstance: function () {
            return s;
          },
          getPluginConfig: function () {
            return o;
          },
          getPluginDestination: function () {
            return u;
          },
          getPluginDuration: function () {
            return l;
          },
          getPluginOrigin: function () {
            return c;
          },
          renderPlugin: function () {
            return d;
          },
        });
        let n = "--wf-rive-fit",
          i = "--wf-rive-alignment",
          a = (e) => document.querySelector(`[data-w-id="${e}"]`),
          r = () => window.Webflow.require("rive"),
          o = (e, t) => e.value.inputs[t],
          l = () => null,
          c = (e, t) => {
            if (e) return e;
            let n = {},
              { inputs: i = {} } = t.config.value;
            for (let e in i) null == i[e] && (n[e] = 0);
            return n;
          },
          u = (e) => e.value.inputs ?? {},
          s = (e, t) => {
            if ((t.config?.target?.selectorGuids || []).length > 0) return e;
            let n = t?.config?.target?.pluginElement;
            return n ? a(n) : null;
          },
          d = (e, { PLUGIN_RIVE: t }, a) => {
            let o = r();
            if (!o) return;
            let l = o.getInstance(e),
              c = o.rive.StateMachineInputType,
              { name: u, inputs: s = {} } = a.config.value || {};
            function d(e) {
              if (e.loaded) a();
              else {
                let t = () => {
                  a(), e?.off("load", t);
                };
                e?.on("load", t);
              }
              function a() {
                let a = e.stateMachineInputs(u);
                if (null != a) {
                  if ((!e.isPlaying && e.play(u, !1), n in s || i in s)) {
                    let t = e.layout,
                      a = s[n] ?? t.fit,
                      r = s[i] ?? t.alignment;
                    (a !== t.fit || r !== t.alignment) &&
                      (e.layout = t.copyWith({
                        fit: a,
                        alignment: r,
                      }));
                  }
                  for (let e in s) {
                    if (e === n || e === i) continue;
                    let r = a.find((t) => t.name === e);
                    if (null != r)
                      switch (r.type) {
                        case c.Boolean:
                          if (null != s[e]) {
                            let t = !!s[e];
                            r.value = t;
                          }
                          break;
                        case c.Number: {
                          let n = t[e];
                          null != n && (r.value = n);
                          break;
                        }
                        case c.Trigger:
                          s[e] && r.fire();
                      }
                  }
                }
              }
            }
            l?.rive ? d(l.rive) : o.setLoadHandler(e, d);
          },
          f = (e, t) => null;
      },
      2866: function (e, t) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          clearPlugin: function () {
            return f;
          },
          createPluginInstance: function () {
            return s;
          },
          getPluginConfig: function () {
            return r;
          },
          getPluginDestination: function () {
            return u;
          },
          getPluginDuration: function () {
            return o;
          },
          getPluginOrigin: function () {
            return c;
          },
          renderPlugin: function () {
            return d;
          },
        });
        let n = (e) => document.querySelector(`[data-w-id="${e}"]`),
          i = () => window.Webflow.require("spline"),
          a = (e, t) => e.filter((e) => !t.includes(e)),
          r = (e, t) => e.value[t],
          o = () => null,
          l = Object.freeze({
            positionX: 0,
            positionY: 0,
            positionZ: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
          }),
          c = (e, t) => {
            let n = Object.keys(t.config.value);
            if (e) {
              let t = a(n, Object.keys(e));
              return t.length ? t.reduce((e, t) => ((e[t] = l[t]), e), e) : e;
            }
            return n.reduce((e, t) => ((e[t] = l[t]), e), {});
          },
          u = (e) => e.value,
          s = (e, t) => {
            let i = t?.config?.target?.pluginElement;
            return i ? n(i) : null;
          },
          d = (e, t, n) => {
            let a = i();
            if (!a) return;
            let r = a.getInstance(e),
              o = n.config.target.objectId,
              l = (e) => {
                if (!e)
                  throw Error("Invalid spline app passed to renderSpline");
                let n = o && e.findObjectById(o);
                if (!n) return;
                let { PLUGIN_SPLINE: i } = t;
                null != i.positionX && (n.position.x = i.positionX),
                  null != i.positionY && (n.position.y = i.positionY),
                  null != i.positionZ && (n.position.z = i.positionZ),
                  null != i.rotationX && (n.rotation.x = i.rotationX),
                  null != i.rotationY && (n.rotation.y = i.rotationY),
                  null != i.rotationZ && (n.rotation.z = i.rotationZ),
                  null != i.scaleX && (n.scale.x = i.scaleX),
                  null != i.scaleY && (n.scale.y = i.scaleY),
                  null != i.scaleZ && (n.scale.z = i.scaleZ);
              };
            r ? l(r.spline) : a.setLoadHandler(e, l);
          },
          f = () => null;
      },
      1407: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          clearPlugin: function () {
            return d;
          },
          createPluginInstance: function () {
            return c;
          },
          getPluginConfig: function () {
            return a;
          },
          getPluginDestination: function () {
            return l;
          },
          getPluginDuration: function () {
            return r;
          },
          getPluginOrigin: function () {
            return o;
          },
          renderPlugin: function () {
            return s;
          },
        });
        let i = n(380),
          a = (e, t) => e.value[t],
          r = () => null,
          o = (e, t) => {
            if (e) return e;
            let n = t.config.value,
              a = t.config.target.objectId,
              r = getComputedStyle(document.documentElement).getPropertyValue(
                a
              );
            return null != n.size
              ? { size: parseInt(r, 10) }
              : "%" === n.unit || "-" === n.unit
              ? { size: parseFloat(r) }
              : null != n.red && null != n.green && null != n.blue
              ? (0, i.normalizeColor)(r)
              : void 0;
          },
          l = (e) => e.value,
          c = () => null,
          u = {
            color: {
              match: ({ red: e, green: t, blue: n, alpha: i }) =>
                [e, t, n, i].every((e) => null != e),
              getValue: ({ red: e, green: t, blue: n, alpha: i }) =>
                `rgba(${e}, ${t}, ${n}, ${i})`,
            },
            size: {
              match: ({ size: e }) => null != e,
              getValue: ({ size: e }, t) => {
                if ("-" === t) return e;
                return `${e}${t}`;
              },
            },
          },
          s = (e, t, n) => {
            let {
                target: { objectId: i },
                value: { unit: a },
              } = n.config,
              r = t.PLUGIN_VARIABLE,
              o = Object.values(u).find((e) => e.match(r, a));
            o &&
              document.documentElement.style.setProperty(i, o.getValue(r, a));
          },
          d = (e, t) => {
            let n = t.config.target.objectId;
            document.documentElement.style.removeProperty(n);
          };
      },
      3690: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "pluginMethodMap", {
            enumerable: !0,
            get: function () {
              return s;
            },
          });
        let i = n(7087),
          a = u(n(7377)),
          r = u(n(2866)),
          o = u(n(2570)),
          l = u(n(1407));
        function c(e) {
          if ("function" != typeof WeakMap) return null;
          var t = new WeakMap(),
            n = new WeakMap();
          return (c = function (e) {
            return e ? n : t;
          })(e);
        }
        function u(e, t) {
          if (!t && e && e.__esModule) return e;
          if (null === e || ("object" != typeof e && "function" != typeof e))
            return { default: e };
          var n = c(t);
          if (n && n.has(e)) return n.get(e);
          var i = { __proto__: null },
            a = Object.defineProperty && Object.getOwnPropertyDescriptor;
          for (var r in e)
            if ("default" !== r && Object.prototype.hasOwnProperty.call(e, r)) {
              var o = a ? Object.getOwnPropertyDescriptor(e, r) : null;
              o && (o.get || o.set)
                ? Object.defineProperty(i, r, o)
                : (i[r] = e[r]);
            }
          return (i.default = e), n && n.set(e, i), i;
        }
        let s = new Map([
          [i.ActionTypeConsts.PLUGIN_LOTTIE, { ...a }],
          [i.ActionTypeConsts.PLUGIN_SPLINE, { ...r }],
          [i.ActionTypeConsts.PLUGIN_RIVE, { ...o }],
          [i.ActionTypeConsts.PLUGIN_VARIABLE, { ...l }],
        ]);
      },
      8023: function (e, t) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          IX2_ACTION_LIST_PLAYBACK_CHANGED: function () {
            return h;
          },
          IX2_ANIMATION_FRAME_CHANGED: function () {
            return f;
          },
          IX2_CLEAR_REQUESTED: function () {
            return u;
          },
          IX2_ELEMENT_STATE_CHANGED: function () {
            return m;
          },
          IX2_EVENT_LISTENER_ADDED: function () {
            return s;
          },
          IX2_EVENT_STATE_CHANGED: function () {
            return d;
          },
          IX2_INSTANCE_ADDED: function () {
            return g;
          },
          IX2_INSTANCE_REMOVED: function () {
            return y;
          },
          IX2_INSTANCE_STARTED: function () {
            return E;
          },
          IX2_MEDIA_QUERIES_DEFINED: function () {
            return I;
          },
          IX2_PARAMETER_CHANGED: function () {
            return p;
          },
          IX2_PLAYBACK_REQUESTED: function () {
            return l;
          },
          IX2_PREVIEW_REQUESTED: function () {
            return o;
          },
          IX2_RAW_DATA_IMPORTED: function () {
            return n;
          },
          IX2_SESSION_INITIALIZED: function () {
            return i;
          },
          IX2_SESSION_STARTED: function () {
            return a;
          },
          IX2_SESSION_STOPPED: function () {
            return r;
          },
          IX2_STOP_REQUESTED: function () {
            return c;
          },
          IX2_TEST_FRAME_RENDERED: function () {
            return T;
          },
          IX2_VIEWPORT_WIDTH_CHANGED: function () {
            return b;
          },
        });
        let n = "IX2_RAW_DATA_IMPORTED",
          i = "IX2_SESSION_INITIALIZED",
          a = "IX2_SESSION_STARTED",
          r = "IX2_SESSION_STOPPED",
          o = "IX2_PREVIEW_REQUESTED",
          l = "IX2_PLAYBACK_REQUESTED",
          c = "IX2_STOP_REQUESTED",
          u = "IX2_CLEAR_REQUESTED",
          s = "IX2_EVENT_LISTENER_ADDED",
          d = "IX2_EVENT_STATE_CHANGED",
          f = "IX2_ANIMATION_FRAME_CHANGED",
          p = "IX2_PARAMETER_CHANGED",
          g = "IX2_INSTANCE_ADDED",
          E = "IX2_INSTANCE_STARTED",
          y = "IX2_INSTANCE_REMOVED",
          m = "IX2_ELEMENT_STATE_CHANGED",
          h = "IX2_ACTION_LIST_PLAYBACK_CHANGED",
          b = "IX2_VIEWPORT_WIDTH_CHANGED",
          I = "IX2_MEDIA_QUERIES_DEFINED",
          T = "IX2_TEST_FRAME_RENDERED";
      },
      2686: function (e, t) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          ABSTRACT_NODE: function () {
            return J;
          },
          AUTO: function () {
            return B;
          },
          BACKGROUND: function () {
            return U;
          },
          BACKGROUND_COLOR: function () {
            return F;
          },
          BAR_DELIMITER: function () {
            return Y;
          },
          BORDER_COLOR: function () {
            return G;
          },
          BOUNDARY_SELECTOR: function () {
            return o;
          },
          CHILDREN: function () {
            return W;
          },
          COLON_DELIMITER: function () {
            return z;
          },
          COLOR: function () {
            return D;
          },
          COMMA_DELIMITER: function () {
            return j;
          },
          CONFIG_UNIT: function () {
            return g;
          },
          CONFIG_VALUE: function () {
            return s;
          },
          CONFIG_X_UNIT: function () {
            return d;
          },
          CONFIG_X_VALUE: function () {
            return l;
          },
          CONFIG_Y_UNIT: function () {
            return f;
          },
          CONFIG_Y_VALUE: function () {
            return c;
          },
          CONFIG_Z_UNIT: function () {
            return p;
          },
          CONFIG_Z_VALUE: function () {
            return u;
          },
          DISPLAY: function () {
            return k;
          },
          FILTER: function () {
            return C;
          },
          FLEX: function () {
            return V;
          },
          FONT_VARIATION_SETTINGS: function () {
            return M;
          },
          HEIGHT: function () {
            return x;
          },
          HTML_ELEMENT: function () {
            return q;
          },
          IMMEDIATE_CHILDREN: function () {
            return $;
          },
          IX2_ID_DELIMITER: function () {
            return n;
          },
          OPACITY: function () {
            return L;
          },
          PARENT: function () {
            return Q;
          },
          PLAIN_OBJECT: function () {
            return Z;
          },
          PRESERVE_3D: function () {
            return K;
          },
          RENDER_GENERAL: function () {
            return et;
          },
          RENDER_PLUGIN: function () {
            return ei;
          },
          RENDER_STYLE: function () {
            return en;
          },
          RENDER_TRANSFORM: function () {
            return ee;
          },
          ROTATE_X: function () {
            return O;
          },
          ROTATE_Y: function () {
            return A;
          },
          ROTATE_Z: function () {
            return w;
          },
          SCALE_3D: function () {
            return v;
          },
          SCALE_X: function () {
            return I;
          },
          SCALE_Y: function () {
            return T;
          },
          SCALE_Z: function () {
            return _;
          },
          SIBLINGS: function () {
            return H;
          },
          SKEW: function () {
            return R;
          },
          SKEW_X: function () {
            return S;
          },
          SKEW_Y: function () {
            return N;
          },
          TRANSFORM: function () {
            return E;
          },
          TRANSLATE_3D: function () {
            return b;
          },
          TRANSLATE_X: function () {
            return y;
          },
          TRANSLATE_Y: function () {
            return m;
          },
          TRANSLATE_Z: function () {
            return h;
          },
          WF_PAGE: function () {
            return i;
          },
          WIDTH: function () {
            return P;
          },
          WILL_CHANGE: function () {
            return X;
          },
          W_MOD_IX: function () {
            return r;
          },
          W_MOD_JS: function () {
            return a;
          },
        });
        let n = "|",
          i = "data-wf-page",
          a = "w-mod-js",
          r = "w-mod-ix",
          o = ".w-dyn-item",
          l = "xValue",
          c = "yValue",
          u = "zValue",
          s = "value",
          d = "xUnit",
          f = "yUnit",
          p = "zUnit",
          g = "unit",
          E = "transform",
          y = "translateX",
          m = "translateY",
          h = "translateZ",
          b = "translate3d",
          I = "scaleX",
          T = "scaleY",
          _ = "scaleZ",
          v = "scale3d",
          O = "rotateX",
          A = "rotateY",
          w = "rotateZ",
          R = "skew",
          S = "skewX",
          N = "skewY",
          L = "opacity",
          C = "filter",
          M = "font-variation-settings",
          P = "width",
          x = "height",
          F = "backgroundColor",
          U = "background",
          G = "borderColor",
          D = "color",
          k = "display",
          V = "flex",
          X = "willChange",
          B = "AUTO",
          j = ",",
          z = ":",
          Y = "|",
          W = "CHILDREN",
          $ = "IMMEDIATE_CHILDREN",
          H = "SIBLINGS",
          Q = "PARENT",
          K = "preserve-3d",
          q = "HTML_ELEMENT",
          Z = "PLAIN_OBJECT",
          J = "ABSTRACT_NODE",
          ee = "RENDER_TRANSFORM",
          et = "RENDER_GENERAL",
          en = "RENDER_STYLE",
          ei = "RENDER_PLUGIN";
      },
      262: function (e, t) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          ActionAppliesTo: function () {
            return i;
          },
          ActionTypeConsts: function () {
            return n;
          },
        });
        let n = {
            TRANSFORM_MOVE: "TRANSFORM_MOVE",
            TRANSFORM_SCALE: "TRANSFORM_SCALE",
            TRANSFORM_ROTATE: "TRANSFORM_ROTATE",
            TRANSFORM_SKEW: "TRANSFORM_SKEW",
            STYLE_OPACITY: "STYLE_OPACITY",
            STYLE_SIZE: "STYLE_SIZE",
            STYLE_FILTER: "STYLE_FILTER",
            STYLE_FONT_VARIATION: "STYLE_FONT_VARIATION",
            STYLE_BACKGROUND_COLOR: "STYLE_BACKGROUND_COLOR",
            STYLE_BORDER: "STYLE_BORDER",
            STYLE_TEXT_COLOR: "STYLE_TEXT_COLOR",
            OBJECT_VALUE: "OBJECT_VALUE",
            PLUGIN_LOTTIE: "PLUGIN_LOTTIE",
            PLUGIN_SPLINE: "PLUGIN_SPLINE",
            PLUGIN_RIVE: "PLUGIN_RIVE",
            PLUGIN_VARIABLE: "PLUGIN_VARIABLE",
            GENERAL_DISPLAY: "GENERAL_DISPLAY",
            GENERAL_START_ACTION: "GENERAL_START_ACTION",
            GENERAL_CONTINUOUS_ACTION: "GENERAL_CONTINUOUS_ACTION",
            GENERAL_COMBO_CLASS: "GENERAL_COMBO_CLASS",
            GENERAL_STOP_ACTION: "GENERAL_STOP_ACTION",
            GENERAL_LOOP: "GENERAL_LOOP",
            STYLE_BOX_SHADOW: "STYLE_BOX_SHADOW",
          },
          i = {
            ELEMENT: "ELEMENT",
            ELEMENT_CLASS: "ELEMENT_CLASS",
            TRIGGER_ELEMENT: "TRIGGER_ELEMENT",
          };
      },
      7087: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          ActionTypeConsts: function () {
            return a.ActionTypeConsts;
          },
          IX2EngineActionTypes: function () {
            return r;
          },
          IX2EngineConstants: function () {
            return o;
          },
          QuickEffectIds: function () {
            return i.QuickEffectIds;
          },
        });
        let i = l(n(1833), t),
          a = l(n(262), t);
        l(n(8704), t), l(n(3213), t);
        let r = u(n(8023)),
          o = u(n(2686));
        function l(e, t) {
          return (
            Object.keys(e).forEach(function (n) {
              "default" !== n &&
                !Object.prototype.hasOwnProperty.call(t, n) &&
                Object.defineProperty(t, n, {
                  enumerable: !0,
                  get: function () {
                    return e[n];
                  },
                });
            }),
            e
          );
        }
        function c(e) {
          if ("function" != typeof WeakMap) return null;
          var t = new WeakMap(),
            n = new WeakMap();
          return (c = function (e) {
            return e ? n : t;
          })(e);
        }
        function u(e, t) {
          if (!t && e && e.__esModule) return e;
          if (null === e || ("object" != typeof e && "function" != typeof e))
            return { default: e };
          var n = c(t);
          if (n && n.has(e)) return n.get(e);
          var i = { __proto__: null },
            a = Object.defineProperty && Object.getOwnPropertyDescriptor;
          for (var r in e)
            if ("default" !== r && Object.prototype.hasOwnProperty.call(e, r)) {
              var o = a ? Object.getOwnPropertyDescriptor(e, r) : null;
              o && (o.get || o.set)
                ? Object.defineProperty(i, r, o)
                : (i[r] = e[r]);
            }
          return (i.default = e), n && n.set(e, i), i;
        }
      },
      3213: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "ReducedMotionTypes", {
            enumerable: !0,
            get: function () {
              return s;
            },
          });
        let {
            TRANSFORM_MOVE: i,
            TRANSFORM_SCALE: a,
            TRANSFORM_ROTATE: r,
            TRANSFORM_SKEW: o,
            STYLE_SIZE: l,
            STYLE_FILTER: c,
            STYLE_FONT_VARIATION: u,
          } = n(262).ActionTypeConsts,
          s = {
            [i]: !0,
            [a]: !0,
            [r]: !0,
            [o]: !0,
            [l]: !0,
            [c]: !0,
            [u]: !0,
          };
      },
      1833: function (e, t) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          EventAppliesTo: function () {
            return i;
          },
          EventBasedOn: function () {
            return a;
          },
          EventContinuousMouseAxes: function () {
            return r;
          },
          EventLimitAffectedElements: function () {
            return o;
          },
          EventTypeConsts: function () {
            return n;
          },
          QuickEffectDirectionConsts: function () {
            return c;
          },
          QuickEffectIds: function () {
            return l;
          },
        });
        let n = {
            NAVBAR_OPEN: "NAVBAR_OPEN",
            NAVBAR_CLOSE: "NAVBAR_CLOSE",
            TAB_ACTIVE: "TAB_ACTIVE",
            TAB_INACTIVE: "TAB_INACTIVE",
            SLIDER_ACTIVE: "SLIDER_ACTIVE",
            SLIDER_INACTIVE: "SLIDER_INACTIVE",
            DROPDOWN_OPEN: "DROPDOWN_OPEN",
            DROPDOWN_CLOSE: "DROPDOWN_CLOSE",
            MOUSE_CLICK: "MOUSE_CLICK",
            MOUSE_SECOND_CLICK: "MOUSE_SECOND_CLICK",
            MOUSE_DOWN: "MOUSE_DOWN",
            MOUSE_UP: "MOUSE_UP",
            MOUSE_OVER: "MOUSE_OVER",
            MOUSE_OUT: "MOUSE_OUT",
            MOUSE_MOVE: "MOUSE_MOVE",
            MOUSE_MOVE_IN_VIEWPORT: "MOUSE_MOVE_IN_VIEWPORT",
            SCROLL_INTO_VIEW: "SCROLL_INTO_VIEW",
            SCROLL_OUT_OF_VIEW: "SCROLL_OUT_OF_VIEW",
            SCROLLING_IN_VIEW: "SCROLLING_IN_VIEW",
            ECOMMERCE_CART_OPEN: "ECOMMERCE_CART_OPEN",
            ECOMMERCE_CART_CLOSE: "ECOMMERCE_CART_CLOSE",
            PAGE_START: "PAGE_START",
            PAGE_FINISH: "PAGE_FINISH",
            PAGE_SCROLL_UP: "PAGE_SCROLL_UP",
            PAGE_SCROLL_DOWN: "PAGE_SCROLL_DOWN",
            PAGE_SCROLL: "PAGE_SCROLL",
          },
          i = { ELEMENT: "ELEMENT", CLASS: "CLASS", PAGE: "PAGE" },
          a = { ELEMENT: "ELEMENT", VIEWPORT: "VIEWPORT" },
          r = { X_AXIS: "X_AXIS", Y_AXIS: "Y_AXIS" },
          o = {
            CHILDREN: "CHILDREN",
            SIBLINGS: "SIBLINGS",
            IMMEDIATE_CHILDREN: "IMMEDIATE_CHILDREN",
          },
          l = {
            FADE_EFFECT: "FADE_EFFECT",
            SLIDE_EFFECT: "SLIDE_EFFECT",
            GROW_EFFECT: "GROW_EFFECT",
            SHRINK_EFFECT: "SHRINK_EFFECT",
            SPIN_EFFECT: "SPIN_EFFECT",
            FLY_EFFECT: "FLY_EFFECT",
            POP_EFFECT: "POP_EFFECT",
            FLIP_EFFECT: "FLIP_EFFECT",
            JIGGLE_EFFECT: "JIGGLE_EFFECT",
            PULSE_EFFECT: "PULSE_EFFECT",
            DROP_EFFECT: "DROP_EFFECT",
            BLINK_EFFECT: "BLINK_EFFECT",
            BOUNCE_EFFECT: "BOUNCE_EFFECT",
            FLIP_LEFT_TO_RIGHT_EFFECT: "FLIP_LEFT_TO_RIGHT_EFFECT",
            FLIP_RIGHT_TO_LEFT_EFFECT: "FLIP_RIGHT_TO_LEFT_EFFECT",
            RUBBER_BAND_EFFECT: "RUBBER_BAND_EFFECT",
            JELLO_EFFECT: "JELLO_EFFECT",
            GROW_BIG_EFFECT: "GROW_BIG_EFFECT",
            SHRINK_BIG_EFFECT: "SHRINK_BIG_EFFECT",
            PLUGIN_LOTTIE_EFFECT: "PLUGIN_LOTTIE_EFFECT",
          },
          c = {
            LEFT: "LEFT",
            RIGHT: "RIGHT",
            BOTTOM: "BOTTOM",
            TOP: "TOP",
            BOTTOM_LEFT: "BOTTOM_LEFT",
            BOTTOM_RIGHT: "BOTTOM_RIGHT",
            TOP_RIGHT: "TOP_RIGHT",
            TOP_LEFT: "TOP_LEFT",
            CLOCKWISE: "CLOCKWISE",
            COUNTER_CLOCKWISE: "COUNTER_CLOCKWISE",
          };
      },
      8704: function (e, t) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "InteractionTypeConsts", {
            enumerable: !0,
            get: function () {
              return n;
            },
          });
        let n = {
          MOUSE_CLICK_INTERACTION: "MOUSE_CLICK_INTERACTION",
          MOUSE_HOVER_INTERACTION: "MOUSE_HOVER_INTERACTION",
          MOUSE_MOVE_INTERACTION: "MOUSE_MOVE_INTERACTION",
          SCROLL_INTO_VIEW_INTERACTION: "SCROLL_INTO_VIEW_INTERACTION",
          SCROLLING_IN_VIEW_INTERACTION: "SCROLLING_IN_VIEW_INTERACTION",
          MOUSE_MOVE_IN_VIEWPORT_INTERACTION:
            "MOUSE_MOVE_IN_VIEWPORT_INTERACTION",
          PAGE_IS_SCROLLING_INTERACTION: "PAGE_IS_SCROLLING_INTERACTION",
          PAGE_LOAD_INTERACTION: "PAGE_LOAD_INTERACTION",
          PAGE_SCROLLED_INTERACTION: "PAGE_SCROLLED_INTERACTION",
          NAVBAR_INTERACTION: "NAVBAR_INTERACTION",
          DROPDOWN_INTERACTION: "DROPDOWN_INTERACTION",
          ECOMMERCE_CART_INTERACTION: "ECOMMERCE_CART_INTERACTION",
          TAB_INTERACTION: "TAB_INTERACTION",
          SLIDER_INTERACTION: "SLIDER_INTERACTION",
        };
      },
      380: function (e, t) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "normalizeColor", {
            enumerable: !0,
            get: function () {
              return i;
            },
          });
        let n = {
          aliceblue: "#F0F8FF",
          antiquewhite: "#FAEBD7",
          aqua: "#00FFFF",
          aquamarine: "#7FFFD4",
          azure: "#F0FFFF",
          beige: "#F5F5DC",
          bisque: "#FFE4C4",
          black: "#000000",
          blanchedalmond: "#FFEBCD",
          blue: "#0000FF",
          blueviolet: "#8A2BE2",
          brown: "#A52A2A",
          burlywood: "#DEB887",
          cadetblue: "#5F9EA0",
          chartreuse: "#7FFF00",
          chocolate: "#D2691E",
          coral: "#FF7F50",
          cornflowerblue: "#6495ED",
          cornsilk: "#FFF8DC",
          crimson: "#DC143C",
          cyan: "#00FFFF",
          darkblue: "#00008B",
          darkcyan: "#008B8B",
          darkgoldenrod: "#B8860B",
          darkgray: "#A9A9A9",
          darkgreen: "#006400",
          darkgrey: "#A9A9A9",
          darkkhaki: "#BDB76B",
          darkmagenta: "#8B008B",
          darkolivegreen: "#556B2F",
          darkorange: "#FF8C00",
          darkorchid: "#9932CC",
          darkred: "#8B0000",
          darksalmon: "#E9967A",
          darkseagreen: "#8FBC8F",
          darkslateblue: "#483D8B",
          darkslategray: "#2F4F4F",
          darkslategrey: "#2F4F4F",
          darkturquoise: "#00CED1",
          darkviolet: "#9400D3",
          deeppink: "#FF1493",
          deepskyblue: "#00BFFF",
          dimgray: "#696969",
          dimgrey: "#696969",
          dodgerblue: "#1E90FF",
          firebrick: "#B22222",
          floralwhite: "#FFFAF0",
          forestgreen: "#228B22",
          fuchsia: "#FF00FF",
          gainsboro: "#DCDCDC",
          ghostwhite: "#F8F8FF",
          gold: "#FFD700",
          goldenrod: "#DAA520",
          gray: "#808080",
          green: "#008000",
          greenyellow: "#ADFF2F",
          grey: "#808080",
          honeydew: "#F0FFF0",
          hotpink: "#FF69B4",
          indianred: "#CD5C5C",
          indigo: "#4B0082",
          ivory: "#FFFFF0",
          khaki: "#F0E68C",
          lavender: "#E6E6FA",
          lavenderblush: "#FFF0F5",
          lawngreen: "#7CFC00",
          lemonchiffon: "#FFFACD",
          lightblue: "#ADD8E6",
          lightcoral: "#F08080",
          lightcyan: "#E0FFFF",
          lightgoldenrodyellow: "#FAFAD2",
          lightgray: "#D3D3D3",
          lightgreen: "#90EE90",
          lightgrey: "#D3D3D3",
          lightpink: "#FFB6C1",
          lightsalmon: "#FFA07A",
          lightseagreen: "#20B2AA",
          lightskyblue: "#87CEFA",
          lightslategray: "#778899",
          lightslategrey: "#778899",
          lightsteelblue: "#B0C4DE",
          lightyellow: "#FFFFE0",
          lime: "#00FF00",
          limegreen: "#32CD32",
          linen: "#FAF0E6",
          magenta: "#FF00FF",
          maroon: "#800000",
          mediumaquamarine: "#66CDAA",
          mediumblue: "#0000CD",
          mediumorchid: "#BA55D3",
          mediumpurple: "#9370DB",
          mediumseagreen: "#3CB371",
          mediumslateblue: "#7B68EE",
          mediumspringgreen: "#00FA9A",
          mediumturquoise: "#48D1CC",
          mediumvioletred: "#C71585",
          midnightblue: "#191970",
          mintcream: "#F5FFFA",
          mistyrose: "#FFE4E1",
          moccasin: "#FFE4B5",
          navajowhite: "#FFDEAD",
          navy: "#000080",
          oldlace: "#FDF5E6",
          olive: "#808000",
          olivedrab: "#6B8E23",
          orange: "#FFA500",
          orangered: "#FF4500",
          orchid: "#DA70D6",
          palegoldenrod: "#EEE8AA",
          palegreen: "#98FB98",
          paleturquoise: "#AFEEEE",
          palevioletred: "#DB7093",
          papayawhip: "#FFEFD5",
          peachpuff: "#FFDAB9",
          peru: "#CD853F",
          pink: "#FFC0CB",
          plum: "#DDA0DD",
          powderblue: "#B0E0E6",
          purple: "#800080",
          rebeccapurple: "#663399",
          red: "#FF0000",
          rosybrown: "#BC8F8F",
          royalblue: "#4169E1",
          saddlebrown: "#8B4513",
          salmon: "#FA8072",
          sandybrown: "#F4A460",
          seagreen: "#2E8B57",
          seashell: "#FFF5EE",
          sienna: "#A0522D",
          silver: "#C0C0C0",
          skyblue: "#87CEEB",
          slateblue: "#6A5ACD",
          slategray: "#708090",
          slategrey: "#708090",
          snow: "#FFFAFA",
          springgreen: "#00FF7F",
          steelblue: "#4682B4",
          tan: "#D2B48C",
          teal: "#008080",
          thistle: "#D8BFD8",
          tomato: "#FF6347",
          turquoise: "#40E0D0",
          violet: "#EE82EE",
          wheat: "#F5DEB3",
          white: "#FFFFFF",
          whitesmoke: "#F5F5F5",
          yellow: "#FFFF00",
          yellowgreen: "#9ACD32",
        };
        function i(e) {
          let t, i, a;
          let r = 1,
            o = e.replace(/\s/g, "").toLowerCase(),
            l = ("string" == typeof n[o] ? n[o].toLowerCase() : null) || o;
          if (l.startsWith("#")) {
            let e = l.substring(1);
            3 === e.length || 4 === e.length
              ? ((t = parseInt(e[0] + e[0], 16)),
                (i = parseInt(e[1] + e[1], 16)),
                (a = parseInt(e[2] + e[2], 16)),
                4 === e.length && (r = parseInt(e[3] + e[3], 16) / 255))
              : (6 === e.length || 8 === e.length) &&
                ((t = parseInt(e.substring(0, 2), 16)),
                (i = parseInt(e.substring(2, 4), 16)),
                (a = parseInt(e.substring(4, 6), 16)),
                8 === e.length && (r = parseInt(e.substring(6, 8), 16) / 255));
          } else if (l.startsWith("rgba")) {
            let e = l.match(/rgba\(([^)]+)\)/)[1].split(",");
            (t = parseInt(e[0], 10)),
              (i = parseInt(e[1], 10)),
              (a = parseInt(e[2], 10)),
              (r = parseFloat(e[3]));
          } else if (l.startsWith("rgb")) {
            let e = l.match(/rgb\(([^)]+)\)/)[1].split(",");
            (t = parseInt(e[0], 10)),
              (i = parseInt(e[1], 10)),
              (a = parseInt(e[2], 10));
          } else if (l.startsWith("hsla")) {
            let e, n, o;
            let c = l.match(/hsla\(([^)]+)\)/)[1].split(","),
              u = parseFloat(c[0]),
              s = parseFloat(c[1].replace("%", "")) / 100,
              d = parseFloat(c[2].replace("%", "")) / 100;
            r = parseFloat(c[3]);
            let f = (1 - Math.abs(2 * d - 1)) * s,
              p = f * (1 - Math.abs(((u / 60) % 2) - 1)),
              g = d - f / 2;
            u >= 0 && u < 60
              ? ((e = f), (n = p), (o = 0))
              : u >= 60 && u < 120
              ? ((e = p), (n = f), (o = 0))
              : u >= 120 && u < 180
              ? ((e = 0), (n = f), (o = p))
              : u >= 180 && u < 240
              ? ((e = 0), (n = p), (o = f))
              : u >= 240 && u < 300
              ? ((e = p), (n = 0), (o = f))
              : ((e = f), (n = 0), (o = p)),
              (t = Math.round((e + g) * 255)),
              (i = Math.round((n + g) * 255)),
              (a = Math.round((o + g) * 255));
          } else if (l.startsWith("hsl")) {
            let e, n, r;
            let o = l.match(/hsl\(([^)]+)\)/)[1].split(","),
              c = parseFloat(o[0]),
              u = parseFloat(o[1].replace("%", "")) / 100,
              s = parseFloat(o[2].replace("%", "")) / 100,
              d = (1 - Math.abs(2 * s - 1)) * u,
              f = d * (1 - Math.abs(((c / 60) % 2) - 1)),
              p = s - d / 2;
            c >= 0 && c < 60
              ? ((e = d), (n = f), (r = 0))
              : c >= 60 && c < 120
              ? ((e = f), (n = d), (r = 0))
              : c >= 120 && c < 180
              ? ((e = 0), (n = d), (r = f))
              : c >= 180 && c < 240
              ? ((e = 0), (n = f), (r = d))
              : c >= 240 && c < 300
              ? ((e = f), (n = 0), (r = d))
              : ((e = d), (n = 0), (r = f)),
              (t = Math.round((e + p) * 255)),
              (i = Math.round((n + p) * 255)),
              (a = Math.round((r + p) * 255));
          }
          if (Number.isNaN(t) || Number.isNaN(i) || Number.isNaN(a))
            throw Error(
              `Invalid color in [ix2/shared/utils/normalizeColor.js] '${e}'`
            );
          return { red: t, green: i, blue: a, alpha: r };
        }
      },
      9468: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          IX2BrowserSupport: function () {
            return i;
          },
          IX2EasingUtils: function () {
            return r;
          },
          IX2Easings: function () {
            return a;
          },
          IX2ElementsReducer: function () {
            return o;
          },
          IX2VanillaPlugins: function () {
            return l;
          },
          IX2VanillaUtils: function () {
            return c;
          },
        });
        let i = s(n(2662)),
          a = s(n(8686)),
          r = s(n(3767)),
          o = s(n(5861)),
          l = s(n(1799)),
          c = s(n(4124));
        function u(e) {
          if ("function" != typeof WeakMap) return null;
          var t = new WeakMap(),
            n = new WeakMap();
          return (u = function (e) {
            return e ? n : t;
          })(e);
        }
        function s(e, t) {
          if (!t && e && e.__esModule) return e;
          if (null === e || ("object" != typeof e && "function" != typeof e))
            return { default: e };
          var n = u(t);
          if (n && n.has(e)) return n.get(e);
          var i = { __proto__: null },
            a = Object.defineProperty && Object.getOwnPropertyDescriptor;
          for (var r in e)
            if ("default" !== r && Object.prototype.hasOwnProperty.call(e, r)) {
              var o = a ? Object.getOwnPropertyDescriptor(e, r) : null;
              o && (o.get || o.set)
                ? Object.defineProperty(i, r, o)
                : (i[r] = e[r]);
            }
          return (i.default = e), n && n.set(e, i), i;
        }
      },
      2662: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          ELEMENT_MATCHES: function () {
            return o;
          },
          FLEX_PREFIXED: function () {
            return l;
          },
          IS_BROWSER_ENV: function () {
            return a;
          },
          TRANSFORM_PREFIXED: function () {
            return c;
          },
          TRANSFORM_STYLE_PREFIXED: function () {
            return s;
          },
          withBrowser: function () {
            return r;
          },
        });
        let i = (function (e) {
            return e && e.__esModule ? e : { default: e };
          })(n(9777)),
          a = "undefined" != typeof window,
          r = (e, t) => (a ? e() : t),
          o = r(() =>
            (0, i.default)(
              [
                "matches",
                "matchesSelector",
                "mozMatchesSelector",
                "msMatchesSelector",
                "oMatchesSelector",
                "webkitMatchesSelector",
              ],
              (e) => e in Element.prototype
            )
          ),
          l = r(() => {
            let e = document.createElement("i"),
              t = [
                "flex",
                "-webkit-flex",
                "-ms-flexbox",
                "-moz-box",
                "-webkit-box",
              ];
            try {
              let { length: n } = t;
              for (let i = 0; i < n; i++) {
                let n = t[i];
                if (((e.style.display = n), e.style.display === n)) return n;
              }
              return "";
            } catch (e) {
              return "";
            }
          }, "flex"),
          c = r(() => {
            let e = document.createElement("i");
            if (null == e.style.transform) {
              let t = ["Webkit", "Moz", "ms"],
                { length: n } = t;
              for (let i = 0; i < n; i++) {
                let n = t[i] + "Transform";
                if (void 0 !== e.style[n]) return n;
              }
            }
            return "transform";
          }, "transform"),
          u = c.split("transform")[0],
          s = u ? u + "TransformStyle" : "transformStyle";
      },
      3767: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          applyEasing: function () {
            return c;
          },
          createBezierEasing: function () {
            return l;
          },
          optimizeFloat: function () {
            return o;
          },
        });
        let i = (function (e, t) {
            if (!t && e && e.__esModule) return e;
            if (null === e || ("object" != typeof e && "function" != typeof e))
              return { default: e };
            var n = r(t);
            if (n && n.has(e)) return n.get(e);
            var i = { __proto__: null },
              a = Object.defineProperty && Object.getOwnPropertyDescriptor;
            for (var o in e)
              if (
                "default" !== o &&
                Object.prototype.hasOwnProperty.call(e, o)
              ) {
                var l = a ? Object.getOwnPropertyDescriptor(e, o) : null;
                l && (l.get || l.set)
                  ? Object.defineProperty(i, o, l)
                  : (i[o] = e[o]);
              }
            return (i.default = e), n && n.set(e, i), i;
          })(n(8686)),
          a = (function (e) {
            return e && e.__esModule ? e : { default: e };
          })(n(1361));
        function r(e) {
          if ("function" != typeof WeakMap) return null;
          var t = new WeakMap(),
            n = new WeakMap();
          return (r = function (e) {
            return e ? n : t;
          })(e);
        }
        function o(e, t = 5, n = 10) {
          let i = Math.pow(n, t),
            a = Number(Math.round(e * i) / i);
          return Math.abs(a) > 1e-4 ? a : 0;
        }
        function l(e) {
          return (0, a.default)(...e);
        }
        function c(e, t, n) {
          return 0 === t
            ? 0
            : 1 === t
            ? 1
            : n
            ? o(t > 0 ? n(t) : t)
            : o(t > 0 && e && i[e] ? i[e](t) : t);
        }
      },
      8686: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          bounce: function () {
            return k;
          },
          bouncePast: function () {
            return V;
          },
          ease: function () {
            return a;
          },
          easeIn: function () {
            return r;
          },
          easeInOut: function () {
            return l;
          },
          easeOut: function () {
            return o;
          },
          inBack: function () {
            return L;
          },
          inCirc: function () {
            return w;
          },
          inCubic: function () {
            return d;
          },
          inElastic: function () {
            return P;
          },
          inExpo: function () {
            return v;
          },
          inOutBack: function () {
            return M;
          },
          inOutCirc: function () {
            return S;
          },
          inOutCubic: function () {
            return p;
          },
          inOutElastic: function () {
            return F;
          },
          inOutExpo: function () {
            return A;
          },
          inOutQuad: function () {
            return s;
          },
          inOutQuart: function () {
            return y;
          },
          inOutQuint: function () {
            return b;
          },
          inOutSine: function () {
            return _;
          },
          inQuad: function () {
            return c;
          },
          inQuart: function () {
            return g;
          },
          inQuint: function () {
            return m;
          },
          inSine: function () {
            return I;
          },
          outBack: function () {
            return C;
          },
          outBounce: function () {
            return N;
          },
          outCirc: function () {
            return R;
          },
          outCubic: function () {
            return f;
          },
          outElastic: function () {
            return x;
          },
          outExpo: function () {
            return O;
          },
          outQuad: function () {
            return u;
          },
          outQuart: function () {
            return E;
          },
          outQuint: function () {
            return h;
          },
          outSine: function () {
            return T;
          },
          swingFrom: function () {
            return G;
          },
          swingFromTo: function () {
            return U;
          },
          swingTo: function () {
            return D;
          },
        });
        let i = (function (e) {
            return e && e.__esModule ? e : { default: e };
          })(n(1361)),
          a = (0, i.default)(0.25, 0.1, 0.25, 1),
          r = (0, i.default)(0.42, 0, 1, 1),
          o = (0, i.default)(0, 0, 0.58, 1),
          l = (0, i.default)(0.42, 0, 0.58, 1);
        function c(e) {
          return Math.pow(e, 2);
        }
        function u(e) {
          return -(Math.pow(e - 1, 2) - 1);
        }
        function s(e) {
          return (e /= 0.5) < 1
            ? 0.5 * Math.pow(e, 2)
            : -0.5 * ((e -= 2) * e - 2);
        }
        function d(e) {
          return Math.pow(e, 3);
        }
        function f(e) {
          return Math.pow(e - 1, 3) + 1;
        }
        function p(e) {
          return (e /= 0.5) < 1
            ? 0.5 * Math.pow(e, 3)
            : 0.5 * (Math.pow(e - 2, 3) + 2);
        }
        function g(e) {
          return Math.pow(e, 4);
        }
        function E(e) {
          return -(Math.pow(e - 1, 4) - 1);
        }
        function y(e) {
          return (e /= 0.5) < 1
            ? 0.5 * Math.pow(e, 4)
            : -0.5 * ((e -= 2) * Math.pow(e, 3) - 2);
        }
        function m(e) {
          return Math.pow(e, 5);
        }
        function h(e) {
          return Math.pow(e - 1, 5) + 1;
        }
        function b(e) {
          return (e /= 0.5) < 1
            ? 0.5 * Math.pow(e, 5)
            : 0.5 * (Math.pow(e - 2, 5) + 2);
        }
        function I(e) {
          return -Math.cos((Math.PI / 2) * e) + 1;
        }
        function T(e) {
          return Math.sin((Math.PI / 2) * e);
        }
        function _(e) {
          return -0.5 * (Math.cos(Math.PI * e) - 1);
        }
        function v(e) {
          return 0 === e ? 0 : Math.pow(2, 10 * (e - 1));
        }
        function O(e) {
          return 1 === e ? 1 : -Math.pow(2, -10 * e) + 1;
        }
        function A(e) {
          return 0 === e
            ? 0
            : 1 === e
            ? 1
            : (e /= 0.5) < 1
            ? 0.5 * Math.pow(2, 10 * (e - 1))
            : 0.5 * (-Math.pow(2, -10 * --e) + 2);
        }
        function w(e) {
          return -(Math.sqrt(1 - e * e) - 1);
        }
        function R(e) {
          return Math.sqrt(1 - Math.pow(e - 1, 2));
        }
        function S(e) {
          return (e /= 0.5) < 1
            ? -0.5 * (Math.sqrt(1 - e * e) - 1)
            : 0.5 * (Math.sqrt(1 - (e -= 2) * e) + 1);
        }
        function N(e) {
          if (e < 1 / 2.75) return 7.5625 * e * e;
          if (e < 2 / 2.75) return 7.5625 * (e -= 1.5 / 2.75) * e + 0.75;
          if (e < 2.5 / 2.75) return 7.5625 * (e -= 2.25 / 2.75) * e + 0.9375;
          else return 7.5625 * (e -= 2.625 / 2.75) * e + 0.984375;
        }
        function L(e) {
          return e * e * (2.70158 * e - 1.70158);
        }
        function C(e) {
          return (e -= 1) * e * (2.70158 * e + 1.70158) + 1;
        }
        function M(e) {
          let t = 1.70158;
          return (e /= 0.5) < 1
            ? 0.5 * (e * e * (((t *= 1.525) + 1) * e - t))
            : 0.5 * ((e -= 2) * e * (((t *= 1.525) + 1) * e + t) + 2);
        }
        function P(e) {
          let t = 1.70158,
            n = 0,
            i = 1;
          return 0 === e
            ? 0
            : 1 === e
            ? 1
            : (!n && (n = 0.3),
              i < 1
                ? ((i = 1), (t = n / 4))
                : (t = (n / (2 * Math.PI)) * Math.asin(1 / i)),
              -(
                i *
                Math.pow(2, 10 * (e -= 1)) *
                Math.sin((2 * Math.PI * (e - t)) / n)
              ));
        }
        function x(e) {
          let t = 1.70158,
            n = 0,
            i = 1;
          return 0 === e
            ? 0
            : 1 === e
            ? 1
            : (!n && (n = 0.3),
              i < 1
                ? ((i = 1), (t = n / 4))
                : (t = (n / (2 * Math.PI)) * Math.asin(1 / i)),
              i * Math.pow(2, -10 * e) * Math.sin((2 * Math.PI * (e - t)) / n) +
                1);
        }
        function F(e) {
          let t = 1.70158,
            n = 0,
            i = 1;
          return 0 === e
            ? 0
            : 2 == (e /= 0.5)
            ? 1
            : (!n && (n = 0.3 * 1.5),
              i < 1
                ? ((i = 1), (t = n / 4))
                : (t = (n / (2 * Math.PI)) * Math.asin(1 / i)),
              e < 1)
            ? -0.5 *
              (i *
                Math.pow(2, 10 * (e -= 1)) *
                Math.sin((2 * Math.PI * (e - t)) / n))
            : i *
                Math.pow(2, -10 * (e -= 1)) *
                Math.sin((2 * Math.PI * (e - t)) / n) *
                0.5 +
              1;
        }
        function U(e) {
          let t = 1.70158;
          return (e /= 0.5) < 1
            ? 0.5 * (e * e * (((t *= 1.525) + 1) * e - t))
            : 0.5 * ((e -= 2) * e * (((t *= 1.525) + 1) * e + t) + 2);
        }
        function G(e) {
          return e * e * (2.70158 * e - 1.70158);
        }
        function D(e) {
          return (e -= 1) * e * (2.70158 * e + 1.70158) + 1;
        }
        function k(e) {
          if (e < 1 / 2.75) return 7.5625 * e * e;
          if (e < 2 / 2.75) return 7.5625 * (e -= 1.5 / 2.75) * e + 0.75;
          if (e < 2.5 / 2.75) return 7.5625 * (e -= 2.25 / 2.75) * e + 0.9375;
          else return 7.5625 * (e -= 2.625 / 2.75) * e + 0.984375;
        }
        function V(e) {
          if (e < 1 / 2.75) return 7.5625 * e * e;
          if (e < 2 / 2.75) return 2 - (7.5625 * (e -= 1.5 / 2.75) * e + 0.75);
          if (e < 2.5 / 2.75)
            return 2 - (7.5625 * (e -= 2.25 / 2.75) * e + 0.9375);
          else return 2 - (7.5625 * (e -= 2.625 / 2.75) * e + 0.984375);
        }
      },
      1799: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          clearPlugin: function () {
            return p;
          },
          createPluginInstance: function () {
            return d;
          },
          getPluginConfig: function () {
            return l;
          },
          getPluginDestination: function () {
            return s;
          },
          getPluginDuration: function () {
            return u;
          },
          getPluginOrigin: function () {
            return c;
          },
          isPluginType: function () {
            return r;
          },
          renderPlugin: function () {
            return f;
          },
        });
        let i = n(2662),
          a = n(3690);
        function r(e) {
          return a.pluginMethodMap.has(e);
        }
        let o = (e) => (t) => {
            if (!i.IS_BROWSER_ENV) return () => null;
            let n = a.pluginMethodMap.get(t);
            if (!n) throw Error(`IX2 no plugin configured for: ${t}`);
            let r = n[e];
            if (!r) throw Error(`IX2 invalid plugin method: ${e}`);
            return r;
          },
          l = o("getPluginConfig"),
          c = o("getPluginOrigin"),
          u = o("getPluginDuration"),
          s = o("getPluginDestination"),
          d = o("createPluginInstance"),
          f = o("renderPlugin"),
          p = o("clearPlugin");
      },
      4124: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          cleanupHTMLElement: function () {
            return ej;
          },
          clearAllStyles: function () {
            return eV;
          },
          clearObjectCache: function () {
            return eu;
          },
          getActionListProgress: function () {
            return e$;
          },
          getAffectedElements: function () {
            return eh;
          },
          getComputedStyle: function () {
            return eb;
          },
          getDestinationValues: function () {
            return eR;
          },
          getElementId: function () {
            return ep;
          },
          getInstanceId: function () {
            return ed;
          },
          getInstanceOrigin: function () {
            return ev;
          },
          getItemConfigByKey: function () {
            return ew;
          },
          getMaxDurationItemIndex: function () {
            return eW;
          },
          getNamespacedParameterId: function () {
            return eK;
          },
          getRenderType: function () {
            return eS;
          },
          getStyleProp: function () {
            return eN;
          },
          mediaQueriesEqual: function () {
            return eZ;
          },
          observeStore: function () {
            return ey;
          },
          reduceListToGroup: function () {
            return eH;
          },
          reifyState: function () {
            return eg;
          },
          renderHTMLElement: function () {
            return eL;
          },
          shallowEqual: function () {
            return c.default;
          },
          shouldAllowMediaQuery: function () {
            return eq;
          },
          shouldNamespaceEventParameter: function () {
            return eQ;
          },
          stringifyTarget: function () {
            return eJ;
          },
        });
        let i = p(n(4075)),
          a = p(n(1455)),
          r = p(n(5720)),
          o = n(1185),
          l = n(7087),
          c = p(n(7164)),
          u = n(3767),
          s = n(380),
          d = n(1799),
          f = n(2662);
        function p(e) {
          return e && e.__esModule ? e : { default: e };
        }
        let {
            BACKGROUND: g,
            TRANSFORM: E,
            TRANSLATE_3D: y,
            SCALE_3D: m,
            ROTATE_X: h,
            ROTATE_Y: b,
            ROTATE_Z: I,
            SKEW: T,
            PRESERVE_3D: _,
            FLEX: v,
            OPACITY: O,
            FILTER: A,
            FONT_VARIATION_SETTINGS: w,
            WIDTH: R,
            HEIGHT: S,
            BACKGROUND_COLOR: N,
            BORDER_COLOR: L,
            COLOR: C,
            CHILDREN: M,
            IMMEDIATE_CHILDREN: P,
            SIBLINGS: x,
            PARENT: F,
            DISPLAY: U,
            WILL_CHANGE: G,
            AUTO: D,
            COMMA_DELIMITER: k,
            COLON_DELIMITER: V,
            BAR_DELIMITER: X,
            RENDER_TRANSFORM: B,
            RENDER_GENERAL: j,
            RENDER_STYLE: z,
            RENDER_PLUGIN: Y,
          } = l.IX2EngineConstants,
          {
            TRANSFORM_MOVE: W,
            TRANSFORM_SCALE: $,
            TRANSFORM_ROTATE: H,
            TRANSFORM_SKEW: Q,
            STYLE_OPACITY: K,
            STYLE_FILTER: q,
            STYLE_FONT_VARIATION: Z,
            STYLE_SIZE: J,
            STYLE_BACKGROUND_COLOR: ee,
            STYLE_BORDER: et,
            STYLE_TEXT_COLOR: en,
            GENERAL_DISPLAY: ei,
            OBJECT_VALUE: ea,
          } = l.ActionTypeConsts,
          er = (e) => e.trim(),
          eo = Object.freeze({ [ee]: N, [et]: L, [en]: C }),
          el = Object.freeze({
            [f.TRANSFORM_PREFIXED]: E,
            [N]: g,
            [O]: O,
            [A]: A,
            [R]: R,
            [S]: S,
            [w]: w,
          }),
          ec = new Map();
        function eu() {
          ec.clear();
        }
        let es = 1;
        function ed() {
          return "i" + es++;
        }
        let ef = 1;
        function ep(e, t) {
          for (let n in e) {
            let i = e[n];
            if (i && i.ref === t) return i.id;
          }
          return "e" + ef++;
        }
        function eg({ events: e, actionLists: t, site: n } = {}) {
          let i = (0, a.default)(
              e,
              (e, t) => {
                let { eventTypeId: n } = t;
                return !e[n] && (e[n] = {}), (e[n][t.id] = t), e;
              },
              {}
            ),
            r = n && n.mediaQueries,
            o = [];
          return (
            r
              ? (o = r.map((e) => e.key))
              : ((r = []),
                console.warn("IX2 missing mediaQueries in site data")),
            {
              ixData: {
                events: e,
                actionLists: t,
                eventTypeMap: i,
                mediaQueries: r,
                mediaQueryKeys: o,
              },
            }
          );
        }
        let eE = (e, t) => e === t;
        function ey({ store: e, select: t, onChange: n, comparator: i = eE }) {
          let { getState: a, subscribe: r } = e,
            o = r(function () {
              let r = t(a());
              if (null == r) {
                o();
                return;
              }
              !i(r, l) && n((l = r), e);
            }),
            l = t(a());
          return o;
        }
        function em(e) {
          let t = typeof e;
          if ("string" === t) return { id: e };
          if (null != e && "object" === t) {
            let {
              id: t,
              objectId: n,
              selector: i,
              selectorGuids: a,
              appliesTo: r,
              useEventTarget: o,
            } = e;
            return {
              id: t,
              objectId: n,
              selector: i,
              selectorGuids: a,
              appliesTo: r,
              useEventTarget: o,
            };
          }
          return {};
        }
        function eh({
          config: e,
          event: t,
          eventTarget: n,
          elementRoot: i,
          elementApi: a,
        }) {
          let r, o, c;
          if (!a) throw Error("IX2 missing elementApi");
          let { targets: u } = e;
          if (Array.isArray(u) && u.length > 0)
            return u.reduce(
              (e, r) =>
                e.concat(
                  eh({
                    config: { target: r },
                    event: t,
                    eventTarget: n,
                    elementRoot: i,
                    elementApi: a,
                  })
                ),
              []
            );
          let {
              getValidDocument: s,
              getQuerySelector: d,
              queryDocument: p,
              getChildElements: g,
              getSiblingElements: E,
              matchSelector: y,
              elementContains: m,
              isSiblingNode: h,
            } = a,
            { target: b } = e;
          if (!b) return [];
          let {
            id: I,
            objectId: T,
            selector: _,
            selectorGuids: v,
            appliesTo: O,
            useEventTarget: A,
          } = em(b);
          if (T) return [ec.has(T) ? ec.get(T) : ec.set(T, {}).get(T)];
          if (O === l.EventAppliesTo.PAGE) {
            let e = s(I);
            return e ? [e] : [];
          }
          let w = (t?.action?.config?.affectedElements ?? {})[I || _] || {},
            R = !!(w.id || w.selector),
            S = t && d(em(t.target));
          if (
            (R
              ? ((r = w.limitAffectedElements), (o = S), (c = d(w)))
              : (o = c = d({ id: I, selector: _, selectorGuids: v })),
            t && A)
          ) {
            let e = n && (c || !0 === A) ? [n] : p(S);
            if (c) {
              if (A === F) return p(c).filter((t) => e.some((e) => m(t, e)));
              if (A === M) return p(c).filter((t) => e.some((e) => m(e, t)));
              if (A === x) return p(c).filter((t) => e.some((e) => h(e, t)));
            }
            return e;
          }
          if (null == o || null == c) return [];
          if (f.IS_BROWSER_ENV && i) return p(c).filter((e) => i.contains(e));
          if (r === M) return p(o, c);
          if (r === P) return g(p(o)).filter(y(c));
          if (r === x) return E(p(o)).filter(y(c));
          else return p(c);
        }
        function eb({ element: e, actionItem: t }) {
          if (!f.IS_BROWSER_ENV) return {};
          let { actionTypeId: n } = t;
          switch (n) {
            case J:
            case ee:
            case et:
            case en:
            case ei:
              return window.getComputedStyle(e);
            default:
              return {};
          }
        }
        let eI = /px/,
          eT = (e, t) =>
            t.reduce(
              (e, t) => (null == e[t.type] && (e[t.type] = eM[t.type]), e),
              e || {}
            ),
          e_ = (e, t) =>
            t.reduce(
              (e, t) => (
                null == e[t.type] &&
                  (e[t.type] = eP[t.type] || t.defaultValue || 0),
                e
              ),
              e || {}
            );
        function ev(e, t = {}, n = {}, a, r) {
          let { getStyle: o } = r,
            { actionTypeId: l } = a;
          if ((0, d.isPluginType)(l)) return (0, d.getPluginOrigin)(l)(t[l], a);
          switch (a.actionTypeId) {
            case W:
            case $:
            case H:
            case Q:
              return t[a.actionTypeId] || eC[a.actionTypeId];
            case q:
              return eT(t[a.actionTypeId], a.config.filters);
            case Z:
              return e_(t[a.actionTypeId], a.config.fontVariations);
            case K:
              return {
                value: (0, i.default)(parseFloat(o(e, O)), 1),
              };
            case J: {
              let t, r;
              let l = o(e, R),
                c = o(e, S);
              return (
                (t =
                  a.config.widthUnit === D
                    ? eI.test(l)
                      ? parseFloat(l)
                      : parseFloat(n.width)
                    : (0, i.default)(parseFloat(l), parseFloat(n.width))),
                {
                  widthValue: t,
                  heightValue: (r =
                    a.config.heightUnit === D
                      ? eI.test(c)
                        ? parseFloat(c)
                        : parseFloat(n.height)
                      : (0, i.default)(parseFloat(c), parseFloat(n.height))),
                }
              );
            }
            case ee:
            case et:
            case en:
              return (function ({
                element: e,
                actionTypeId: t,
                computedStyle: n,
                getStyle: a,
              }) {
                let r = eo[t],
                  o = a(e, r),
                  l = (function (e, t) {
                    let n = e.exec(t);
                    return n ? n[1] : "";
                  })(eG, eU.test(o) ? o : n[r]).split(k);
                return {
                  rValue: (0, i.default)(parseInt(l[0], 10), 255),
                  gValue: (0, i.default)(parseInt(l[1], 10), 255),
                  bValue: (0, i.default)(parseInt(l[2], 10), 255),
                  aValue: (0, i.default)(parseFloat(l[3]), 1),
                };
              })({
                element: e,
                actionTypeId: a.actionTypeId,
                computedStyle: n,
                getStyle: o,
              });
            case ei:
              return {
                value: (0, i.default)(o(e, U), n.display),
              };
            case ea:
              return t[a.actionTypeId] || { value: 0 };
            default:
              return;
          }
        }
        let eO = (e, t) => (t && (e[t.type] = t.value || 0), e),
          eA = (e, t) => (t && (e[t.type] = t.value || 0), e),
          ew = (e, t, n) => {
            if ((0, d.isPluginType)(e)) return (0, d.getPluginConfig)(e)(n, t);
            switch (e) {
              case q: {
                let e = (0, r.default)(n.filters, ({ type: e }) => e === t);
                return e ? e.value : 0;
              }
              case Z: {
                let e = (0, r.default)(
                  n.fontVariations,
                  ({ type: e }) => e === t
                );
                return e ? e.value : 0;
              }
              default:
                return n[t];
            }
          };
        function eR({ element: e, actionItem: t, elementApi: n }) {
          if ((0, d.isPluginType)(t.actionTypeId))
            return (0, d.getPluginDestination)(t.actionTypeId)(t.config);
          switch (t.actionTypeId) {
            case W:
            case $:
            case H:
            case Q: {
              let { xValue: e, yValue: n, zValue: i } = t.config;
              return { xValue: e, yValue: n, zValue: i };
            }
            case J: {
              let { getStyle: i, setStyle: a, getProperty: r } = n,
                { widthUnit: o, heightUnit: l } = t.config,
                { widthValue: c, heightValue: u } = t.config;
              if (!f.IS_BROWSER_ENV) return { widthValue: c, heightValue: u };
              if (o === D) {
                let t = i(e, R);
                a(e, R, ""), (c = r(e, "offsetWidth")), a(e, R, t);
              }
              if (l === D) {
                let t = i(e, S);
                a(e, S, ""), (u = r(e, "offsetHeight")), a(e, S, t);
              }
              return { widthValue: c, heightValue: u };
            }
            case ee:
            case et:
            case en: {
              let {
                rValue: i,
                gValue: a,
                bValue: r,
                aValue: o,
                globalSwatchId: l,
              } = t.config;
              if (l && l.startsWith("--")) {
                let { getStyle: t } = n,
                  i = t(e, l),
                  a = (0, s.normalizeColor)(i);
                return {
                  rValue: a.red,
                  gValue: a.green,
                  bValue: a.blue,
                  aValue: a.alpha,
                };
              }
              return {
                rValue: i,
                gValue: a,
                bValue: r,
                aValue: o,
              };
            }
            case q:
              return t.config.filters.reduce(eO, {});
            case Z:
              return t.config.fontVariations.reduce(eA, {});
            default: {
              let { value: e } = t.config;
              return { value: e };
            }
          }
        }
        function eS(e) {
          return /^TRANSFORM_/.test(e)
            ? B
            : /^STYLE_/.test(e)
            ? z
            : /^GENERAL_/.test(e)
            ? j
            : /^PLUGIN_/.test(e)
            ? Y
            : void 0;
        }
        function eN(e, t) {
          return e === z ? t.replace("STYLE_", "").toLowerCase() : null;
        }
        function eL(e, t, n, i, r, o, l, c, u) {
          switch (c) {
            case B:
              return (function (e, t, n, i, a) {
                let r = eF
                    .map((e) => {
                      let n = eC[e],
                        {
                          xValue: i = n.xValue,
                          yValue: a = n.yValue,
                          zValue: r = n.zValue,
                          xUnit: o = "",
                          yUnit: l = "",
                          zUnit: c = "",
                        } = t[e] || {};
                      switch (e) {
                        case W:
                          return `${y}(${i}${o}, ${a}${l}, ${r}${c})`;
                        case $:
                          return `${m}(${i}${o}, ${a}${l}, ${r}${c})`;
                        case H:
                          return `${h}(${i}${o}) ${b}(${a}${l}) ${I}(${r}${c})`;
                        case Q:
                          return `${T}(${i}${o}, ${a}${l})`;
                        default:
                          return "";
                      }
                    })
                    .join(" "),
                  { setStyle: o } = a;
                eD(e, f.TRANSFORM_PREFIXED, a),
                  o(e, f.TRANSFORM_PREFIXED, r),
                  (function (
                    { actionTypeId: e },
                    { xValue: t, yValue: n, zValue: i }
                  ) {
                    return (
                      (e === W && void 0 !== i) ||
                      (e === $ && void 0 !== i) ||
                      (e === H && (void 0 !== t || void 0 !== n))
                    );
                  })(i, n) && o(e, f.TRANSFORM_STYLE_PREFIXED, _);
              })(e, t, n, r, l);
            case z:
              return (function (e, t, n, i, r, o) {
                let { setStyle: l } = o;
                switch (i.actionTypeId) {
                  case J: {
                    let { widthUnit: t = "", heightUnit: a = "" } = i.config,
                      { widthValue: r, heightValue: c } = n;
                    void 0 !== r &&
                      (t === D && (t = "px"), eD(e, R, o), l(e, R, r + t)),
                      void 0 !== c &&
                        (a === D && (a = "px"), eD(e, S, o), l(e, S, c + a));
                    break;
                  }
                  case q:
                    !(function (e, t, n, i) {
                      let r = (0, a.default)(
                          t,
                          (e, t, i) => `${e} ${i}(${t}${ex(i, n)})`,
                          ""
                        ),
                        { setStyle: o } = i;
                      eD(e, A, i), o(e, A, r);
                    })(e, n, i.config, o);
                    break;
                  case Z:
                    !(function (e, t, n, i) {
                      let r = (0, a.default)(
                          t,
                          (e, t, n) => (e.push(`"${n}" ${t}`), e),
                          []
                        ).join(", "),
                        { setStyle: o } = i;
                      eD(e, w, i), o(e, w, r);
                    })(e, n, i.config, o);
                    break;
                  case ee:
                  case et:
                  case en: {
                    let t = eo[i.actionTypeId],
                      a = Math.round(n.rValue),
                      r = Math.round(n.gValue),
                      c = Math.round(n.bValue),
                      u = n.aValue;
                    eD(e, t, o),
                      l(
                        e,
                        t,
                        u >= 1
                          ? `rgb(${a},${r},${c})`
                          : `rgba(${a},${r},${c},${u})`
                      );
                    break;
                  }
                  default: {
                    let { unit: t = "" } = i.config;
                    eD(e, r, o), l(e, r, n.value + t);
                  }
                }
              })(e, t, n, r, o, l);
            case j:
              return (function (e, t, n) {
                let { setStyle: i } = n;
                if (t.actionTypeId === ei) {
                  let { value: n } = t.config;
                  i(e, U, n === v && f.IS_BROWSER_ENV ? f.FLEX_PREFIXED : n);
                  return;
                }
              })(e, r, l);
            case Y: {
              let { actionTypeId: e } = r;
              if ((0, d.isPluginType)(e))
                return (0, d.renderPlugin)(e)(u, t, r);
            }
          }
        }
        let eC = {
            [W]: Object.freeze({ xValue: 0, yValue: 0, zValue: 0 }),
            [$]: Object.freeze({ xValue: 1, yValue: 1, zValue: 1 }),
            [H]: Object.freeze({ xValue: 0, yValue: 0, zValue: 0 }),
            [Q]: Object.freeze({ xValue: 0, yValue: 0 }),
          },
          eM = Object.freeze({
            blur: 0,
            "hue-rotate": 0,
            invert: 0,
            grayscale: 0,
            saturate: 100,
            sepia: 0,
            contrast: 100,
            brightness: 100,
          }),
          eP = Object.freeze({ wght: 0, opsz: 0, wdth: 0, slnt: 0 }),
          ex = (e, t) => {
            let n = (0, r.default)(t.filters, ({ type: t }) => t === e);
            if (n && n.unit) return n.unit;
            switch (e) {
              case "blur":
                return "px";
              case "hue-rotate":
                return "deg";
              default:
                return "%";
            }
          },
          eF = Object.keys(eC),
          eU = /^rgb/,
          eG = RegExp("rgba?\\(([^)]+)\\)");
        function eD(e, t, n) {
          if (!f.IS_BROWSER_ENV) return;
          let i = el[t];
          if (!i) return;
          let { getStyle: a, setStyle: r } = n,
            o = a(e, G);
          if (!o) {
            r(e, G, i);
            return;
          }
          let l = o.split(k).map(er);
          -1 === l.indexOf(i) && r(e, G, l.concat(i).join(k));
        }
        function ek(e, t, n) {
          if (!f.IS_BROWSER_ENV) return;
          let i = el[t];
          if (!i) return;
          let { getStyle: a, setStyle: r } = n,
            o = a(e, G);
          if (!!o && -1 !== o.indexOf(i))
            r(
              e,
              G,
              o
                .split(k)
                .map(er)
                .filter((e) => e !== i)
                .join(k)
            );
        }
        function eV({ store: e, elementApi: t }) {
          let { ixData: n } = e.getState(),
            { events: i = {}, actionLists: a = {} } = n;
          Object.keys(i).forEach((e) => {
            let n = i[e],
              { config: r } = n.action,
              { actionListId: o } = r,
              l = a[o];
            l && eX({ actionList: l, event: n, elementApi: t });
          }),
            Object.keys(a).forEach((e) => {
              eX({ actionList: a[e], elementApi: t });
            });
        }
        function eX({ actionList: e = {}, event: t, elementApi: n }) {
          let { actionItemGroups: i, continuousParameterGroups: a } = e;
          i &&
            i.forEach((e) => {
              eB({ actionGroup: e, event: t, elementApi: n });
            }),
            a &&
              a.forEach((e) => {
                let { continuousActionGroups: i } = e;
                i.forEach((e) => {
                  eB({
                    actionGroup: e,
                    event: t,
                    elementApi: n,
                  });
                });
              });
        }
        function eB({ actionGroup: e, event: t, elementApi: n }) {
          let { actionItems: i } = e;
          i.forEach((e) => {
            let i;
            let { actionTypeId: a, config: r } = e;
            (i = (0, d.isPluginType)(a)
              ? (t) => (0, d.clearPlugin)(a)(t, e)
              : ez({
                  effect: eY,
                  actionTypeId: a,
                  elementApi: n,
                })),
              eh({ config: r, event: t, elementApi: n }).forEach(i);
          });
        }
        function ej(e, t, n) {
          let { setStyle: i, getStyle: a } = n,
            { actionTypeId: r } = t;
          if (r === J) {
            let { config: n } = t;
            n.widthUnit === D && i(e, R, ""), n.heightUnit === D && i(e, S, "");
          }
          a(e, G) && ez({ effect: ek, actionTypeId: r, elementApi: n })(e);
        }
        let ez =
          ({ effect: e, actionTypeId: t, elementApi: n }) =>
          (i) => {
            switch (t) {
              case W:
              case $:
              case H:
              case Q:
                e(i, f.TRANSFORM_PREFIXED, n);
                break;
              case q:
                e(i, A, n);
                break;
              case Z:
                e(i, w, n);
                break;
              case K:
                e(i, O, n);
                break;
              case J:
                e(i, R, n), e(i, S, n);
                break;
              case ee:
              case et:
              case en:
                e(i, eo[t], n);
                break;
              case ei:
                e(i, U, n);
            }
          };
        function eY(e, t, n) {
          let { setStyle: i } = n;
          ek(e, t, n),
            i(e, t, ""),
            t === f.TRANSFORM_PREFIXED && i(e, f.TRANSFORM_STYLE_PREFIXED, "");
        }
        function eW(e) {
          let t = 0,
            n = 0;
          return (
            e.forEach((e, i) => {
              let { config: a } = e,
                r = a.delay + a.duration;
              r >= t && ((t = r), (n = i));
            }),
            n
          );
        }
        function e$(e, t) {
          let { actionItemGroups: n, useFirstGroupAsInitialState: i } = e,
            { actionItem: a, verboseTimeElapsed: r = 0 } = t,
            o = 0,
            l = 0;
          return (
            n.forEach((e, t) => {
              if (i && 0 === t) return;
              let { actionItems: n } = e,
                c = n[eW(n)],
                { config: u, actionTypeId: s } = c;
              a.id === c.id && (l = o + r);
              let d = eS(s) === j ? 0 : u.duration;
              o += u.delay + d;
            }),
            o > 0 ? (0, u.optimizeFloat)(l / o) : 0
          );
        }
        function eH({ actionList: e, actionItemId: t, rawData: n }) {
          let { actionItemGroups: i, continuousParameterGroups: a } = e,
            r = [],
            l = (e) => (
              r.push(
                (0, o.mergeIn)(e, ["config"], {
                  delay: 0,
                  duration: 0,
                })
              ),
              e.id === t
            );
          return (
            i && i.some(({ actionItems: e }) => e.some(l)),
            a &&
              a.some((e) => {
                let { continuousActionGroups: t } = e;
                return t.some(({ actionItems: e }) => e.some(l));
              }),
            (0, o.setIn)(n, ["actionLists"], {
              [e.id]: {
                id: e.id,
                actionItemGroups: [{ actionItems: r }],
              },
            })
          );
        }
        function eQ(e, { basedOn: t }) {
          return (
            (e === l.EventTypeConsts.SCROLLING_IN_VIEW &&
              (t === l.EventBasedOn.ELEMENT || null == t)) ||
            (e === l.EventTypeConsts.MOUSE_MOVE && t === l.EventBasedOn.ELEMENT)
          );
        }
        function eK(e, t) {
          return e + V + t;
        }
        function eq(e, t) {
          return null == t || -1 !== e.indexOf(t);
        }
        function eZ(e, t) {
          return (0, c.default)(e && e.sort(), t && t.sort());
        }
        function eJ(e) {
          if ("string" == typeof e) return e;
          if (e.pluginElement && e.objectId)
            return e.pluginElement + X + e.objectId;
          if (e.objectId) return e.objectId;
          let { id: t = "", selector: n = "", useEventTarget: i = "" } = e;
          return t + X + n + X + i;
        }
      },
      7164: function (e, t) {
        "use strict";
        function n(e, t) {
          return e === t
            ? 0 !== e || 0 !== t || 1 / e == 1 / t
            : e != e && t != t;
        }
        Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "default", {
            enumerable: !0,
            get: function () {
              return i;
            },
          });
        let i = function (e, t) {
          if (n(e, t)) return !0;
          if (
            "object" != typeof e ||
            null === e ||
            "object" != typeof t ||
            null === t
          )
            return !1;
          let i = Object.keys(e),
            a = Object.keys(t);
          if (i.length !== a.length) return !1;
          for (let a = 0; a < i.length; a++)
            if (!Object.hasOwn(t, i[a]) || !n(e[i[a]], t[i[a]])) return !1;
          return !0;
        };
      },
      5861: function (e, t, n) {
        "use strict";
        Object.defineProperty(t, "__esModule", { value: !0 });
        !(function (e, t) {
          for (var n in t)
            Object.defineProperty(e, n, {
              enumerable: !0,
              get: t[n],
            });
        })(t, {
          createElementState: function () {
            return T;
          },
          ixElements: function () {
            return I;
          },
          mergeActionState: function () {
            return _;
          },
        });
        let i = n(1185),
          a = n(7087),
          {
            HTML_ELEMENT: r,
            PLAIN_OBJECT: o,
            ABSTRACT_NODE: l,
            CONFIG_X_VALUE: c,
            CONFIG_Y_VALUE: u,
            CONFIG_Z_VALUE: s,
            CONFIG_VALUE: d,
            CONFIG_X_UNIT: f,
            CONFIG_Y_UNIT: p,
            CONFIG_Z_UNIT: g,
            CONFIG_UNIT: E,
          } = a.IX2EngineConstants,
          {
            IX2_SESSION_STOPPED: y,
            IX2_INSTANCE_ADDED: m,
            IX2_ELEMENT_STATE_CHANGED: h,
          } = a.IX2EngineActionTypes,
          b = {},
          I = (e = b, t = {}) => {
            switch (t.type) {
              case y:
                return b;
              case m: {
                let {
                    elementId: n,
                    element: a,
                    origin: r,
                    actionItem: o,
                    refType: l,
                  } = t.payload,
                  { actionTypeId: c } = o,
                  u = e;
                return (
                  (0, i.getIn)(u, [n, a]) !== a && (u = T(u, a, l, n, o)),
                  _(u, n, c, r, o)
                );
              }
              case h: {
                let {
                  elementId: n,
                  actionTypeId: i,
                  current: a,
                  actionItem: r,
                } = t.payload;
                return _(e, n, i, a, r);
              }
              default:
                return e;
            }
          };
        function T(e, t, n, a, r) {
          let l =
            n === o ? (0, i.getIn)(r, ["config", "target", "objectId"]) : null;
          return (0, i.mergeIn)(e, [a], {
            id: a,
            ref: t,
            refId: l,
            refType: n,
          });
        }
        function _(e, t, n, a, r) {
          let o = (function (e) {
            let { config: t } = e;
            return v.reduce((e, n) => {
              let i = n[0],
                a = n[1],
                r = t[i],
                o = t[a];
              return null != r && null != o && (e[a] = o), e;
            }, {});
          })(r);
          return (0, i.mergeIn)(e, [t, "refState", n], a, o);
        }
        let v = [
          [c, f],
          [u, p],
          [s, g],
          [d, E],
        ];
      },
      8055: function () {
        Webflow.require("ix2").init({
          events: {
            e: {
              id: "e",
              name: "",
              animationType: "preset",
              eventTypeId: "MOUSE_OVER",
              action: {
                id: "",
                actionTypeId: "JELLO_EFFECT",
                instant: !1,
                config: {
                  actionListId: "jello",
                  autoStopEventId: "e-2",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|68f86f70-8ed8-1a60-87a1-97173a3e7e6e",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|68f86f70-8ed8-1a60-87a1-97173a3e7e6e",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: 0,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195dc157ac2,
            },
            "e-3": {
              id: "e-3",
              name: "",
              animationType: "preset",
              eventTypeId: "MOUSE_OVER",
              action: {
                id: "",
                actionTypeId: "JELLO_EFFECT",
                instant: !1,
                config: {
                  actionListId: "jello",
                  autoStopEventId: "e-4",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|38ba444d-84d1-fbf1-625c-1a0bf66b7798",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|38ba444d-84d1-fbf1-625c-1a0bf66b7798",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: 0,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195dc2052f0,
            },
            "e-5": {
              id: "e-5",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-3",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-6",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|68f86f70-8ed8-1a60-87a1-97173a3e7e6e",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|68f86f70-8ed8-1a60-87a1-97173a3e7e6e",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195dd3019d8,
            },
            "e-6": {
              id: "e-6",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_SECOND_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-15",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-5",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|68f86f70-8ed8-1a60-87a1-97173a3e7e6e",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|68f86f70-8ed8-1a60-87a1-97173a3e7e6e",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195dd3019d8,
            },
            "e-7": {
              id: "e-7",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-4",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-8",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|38ba444d-84d1-fbf1-625c-1a0bf66b7798",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|38ba444d-84d1-fbf1-625c-1a0bf66b7798",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195dd717d84,
            },
            "e-8": {
              id: "e-8",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_SECOND_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-16",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-7",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|38ba444d-84d1-fbf1-625c-1a0bf66b7798",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|38ba444d-84d1-fbf1-625c-1a0bf66b7798",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195dd717d84,
            },
            "e-9": {
              id: "e-9",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-6",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-10",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|19dedb9e-9d8b-deeb-be6d-1c516038884c",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|19dedb9e-9d8b-deeb-be6d-1c516038884c",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195e2eaffe0,
            },
            "e-10": {
              id: "e-10",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_SECOND_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-7",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-9",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|19dedb9e-9d8b-deeb-be6d-1c516038884c",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|19dedb9e-9d8b-deeb-be6d-1c516038884c",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195e2eaffe1,
            },
            "e-11": {
              id: "e-11",
              name: "",
              animationType: "custom",
              eventTypeId: "TAB_ACTIVE",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-8",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-12",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|d880266b-015d-2977-f841-f7d68351078f",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|d880266b-015d-2977-f841-f7d68351078f",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195e7921122,
            },
            "e-12": {
              id: "e-12",
              name: "",
              animationType: "custom",
              eventTypeId: "TAB_INACTIVE",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-9",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-11",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|d880266b-015d-2977-f841-f7d68351078f",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|d880266b-015d-2977-f841-f7d68351078f",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195e7921122,
            },
            "e-13": {
              id: "e-13",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-10",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-14",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|e30d9b8b-1b12-e063-c4ee-6faf16e7a3e5",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|e30d9b8b-1b12-e063-c4ee-6faf16e7a3e5",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195e822b2b6,
            },
            "e-15": {
              id: "e-15",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-11",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-16",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|52a7a429-cb0d-515b-5b55-f2af60237281",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|52a7a429-cb0d-515b-5b55-f2af60237281",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195eb13b1dd,
            },
            "e-19": {
              id: "e-19",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-13",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-20",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|b21d2ecc-34c5-40f6-2f7e-d85cf13fed5a",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|b21d2ecc-34c5-40f6-2f7e-d85cf13fed5a",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195eb39df7e,
            },
            "e-21": {
              id: "e-21",
              name: "",
              animationType: "preset",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-11",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-22",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|6f8ae2e7-d356-2eb8-1fa0-b1ae57951902",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|6f8ae2e7-d356-2eb8-1fa0-b1ae57951902",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195ebac0706,
            },
            "e-23": {
              id: "e-23",
              name: "",
              animationType: "preset",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-11",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-24",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|1fbe2ce7-66e0-c25a-b102-2a356967b61c",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|1fbe2ce7-66e0-c25a-b102-2a356967b61c",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195ebac08ae,
            },
            "e-25": {
              id: "e-25",
              name: "",
              animationType: "preset",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-11",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-26",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|f3b4618c-c027-6eda-10e3-9de04491eecf",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|f3b4618c-c027-6eda-10e3-9de04491eecf",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195ebac0a53,
            },
            "e-27": {
              id: "e-27",
              name: "",
              animationType: "preset",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-11",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-28",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|f049d1eb-4252-254f-0ea3-e983c3a7017b",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|f049d1eb-4252-254f-0ea3-e983c3a7017b",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195ebac0bf3,
            },
            "e-29": {
              id: "e-29",
              name: "",
              animationType: "preset",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-11",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-30",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|b8e38c83-e9f6-7134-9005-7dd638338331",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|b8e38c83-e9f6-7134-9005-7dd638338331",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195ebac0df5,
            },
            "e-31": {
              id: "e-31",
              name: "",
              animationType: "preset",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-11",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-32",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|6a56e0c4-e7ff-ff90-23e8-c217ad104e6f",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|6a56e0c4-e7ff-ff90-23e8-c217ad104e6f",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195ebac0f5f,
            },
            "e-33": {
              id: "e-33",
              name: "",
              animationType: "preset",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-11",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-34",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|ee6cfd21-7aca-6e55-7702-cf859da27f54",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|ee6cfd21-7aca-6e55-7702-cf859da27f54",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195ebac112d,
            },
            "e-35": {
              id: "e-35",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-14",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-36",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|e3a75c7d-2484-a0dc-8e0c-03be9f3535ee",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|e3a75c7d-2484-a0dc-8e0c-03be9f3535ee",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195ebb5d316,
            },
            "e-41": {
              id: "e-41",
              name: "",
              animationType: "preset",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-12",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-42",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|60f7f221-b3fa-1663-d5fc-b4995bbbce85",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|60f7f221-b3fa-1663-d5fc-b4995bbbce85",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195f11c3615,
            },
            "e-44": {
              id: "e-44",
              name: "",
              animationType: "custom",
              eventTypeId: "PAGE_FINISH",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-3",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-43",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf",
                appliesTo: "PAGE",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf",
                  appliesTo: "PAGE",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x195fb0d7595,
            },
            "e-45": {
              id: "e-45",
              name: "",
              animationType: "preset",
              eventTypeId: "MOUSE_OVER",
              action: {
                id: "",
                actionTypeId: "JELLO_EFFECT",
                instant: !1,
                config: {
                  actionListId: "jello",
                  autoStopEventId: "e-46",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|22a3e614-42d9-7f57-3a42-b6342b387d85",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|22a3e614-42d9-7f57-3a42-b6342b387d85",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: 0,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x1961f461a94,
            },
            "e-47": {
              id: "e-47",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-19",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-48",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|22a3e614-42d9-7f57-3a42-b6342b387d85",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|22a3e614-42d9-7f57-3a42-b6342b387d85",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x19620656073,
            },
            "e-48": {
              id: "e-48",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_SECOND_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-18",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-47",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                id: "67e65e418f03b386607833bf|22a3e614-42d9-7f57-3a42-b6342b387d85",
                appliesTo: "ELEMENT",
                styleBlockIds: [],
              },
              targets: [
                {
                  id: "67e65e418f03b386607833bf|22a3e614-42d9-7f57-3a42-b6342b387d85",
                  appliesTo: "ELEMENT",
                  styleBlockIds: [],
                },
              ],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x19620656074,
            },
            "e-49": {
              id: "e-49",
              name: "",
              animationType: "custom",
              eventTypeId: "MOUSE_CLICK",
              action: {
                id: "",
                actionTypeId: "GENERAL_START_ACTION",
                config: {
                  delay: 0,
                  easing: "",
                  duration: 0,
                  actionListId: "a-20",
                  affectedElements: {},
                  playInReverse: !1,
                  autoStopEventId: "e-50",
                },
              },
              mediaQueries: ["main", "medium", "small", "tiny"],
              target: {
                appliesTo: "ELEMENT",
                styleBlockIds: [],
                id: "67e65e418f03b386607833bf|60f7f221-b3fa-1663-d5fc-b4995bbbcea2",
              },
              targets: [],
              config: {
                loop: !1,
                playInReverse: !1,
                scrollOffsetValue: null,
                scrollOffsetUnit: null,
                delay: null,
                direction: null,
                effectIn: null,
              },
              createdOn: 0x19620a09c88,
            },
          },
          actionLists: {
            "a-3": {
              id: "a-3",
              title: "open_drawer_search",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-3-n-14",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_location",
                          selectorGuids: [
                            "a3f900c3-faa7-d2c1-c107-8b949020dc75",
                          ],
                        },
                        value: "none",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-3-n-15",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_platform",
                          selectorGuids: [
                            "698332d4-685f-b075-b433-da0fcc2467be",
                          ],
                        },
                        value: "none",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-3-n-2",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".product_store_search_bar_box",
                          selectorGuids: [
                            "ae46c12f-6b16-6a7c-122e-81c30b60dc3c",
                          ],
                        },
                        xValue: 100,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-3-n-5",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".product_store_search_bar_box",
                          selectorGuids: [
                            "ae46c12f-6b16-6a7c-122e-81c30b60dc3c",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-3-n-3",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".product_form_container",
                          selectorGuids: [
                            "ec7d8146-4849-ef4f-3739-46c0673f66a9",
                          ],
                        },
                        xValue: 100,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-3-n-6",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".product_form_container",
                          selectorGuids: [
                            "ec7d8146-4849-ef4f-3739-46c0673f66a9",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-3-n-4",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".store_form_container",
                          selectorGuids: [
                            "d3b075e8-86f9-34d7-ec30-044a7181d865",
                          ],
                        },
                        xValue: 100,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-3-n-7",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".store_form_container",
                          selectorGuids: [
                            "d3b075e8-86f9-34d7-ec30-044a7181d865",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-3-n",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_search",
                          selectorGuids: [
                            "7e8340b1-e3eb-18c5-0455-17d9accb2656",
                          ],
                        },
                        value: "flex",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-3-n-8",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".product_store_search_bar_box",
                          selectorGuids: [
                            "ae46c12f-6b16-6a7c-122e-81c30b60dc3c",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-3-n-9",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".product_store_search_bar_box",
                          selectorGuids: [
                            "ae46c12f-6b16-6a7c-122e-81c30b60dc3c",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                    {
                      id: "a-3-n-11",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 100,
                        easing: "",
                        duration: 500,
                        target: {
                          selector: ".product_form_container",
                          selectorGuids: [
                            "ec7d8146-4849-ef4f-3739-46c0673f66a9",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                    {
                      id: "a-3-n-10",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 100,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".product_form_container",
                          selectorGuids: [
                            "ec7d8146-4849-ef4f-3739-46c0673f66a9",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-3-n-12",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 200,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".store_form_container",
                          selectorGuids: [
                            "d3b075e8-86f9-34d7-ec30-044a7181d865",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                    {
                      id: "a-3-n-13",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 200,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".store_form_container",
                          selectorGuids: [
                            "d3b075e8-86f9-34d7-ec30-044a7181d865",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195dd3082ae,
            },
            "a-15": {
              id: "a-15",
              title: "close_drawer_search",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-15-n-9",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".product_store_search_bar_box",
                          selectorGuids: [
                            "ae46c12f-6b16-6a7c-122e-81c30b60dc3c",
                          ],
                        },
                        xValue: 100,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-15-n-10",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".product_store_search_bar_box",
                          selectorGuids: [
                            "ae46c12f-6b16-6a7c-122e-81c30b60dc3c",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                    {
                      id: "a-15-n-11",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 100,
                        easing: "",
                        duration: 500,
                        target: {
                          selector: ".product_form_container",
                          selectorGuids: [
                            "ec7d8146-4849-ef4f-3739-46c0673f66a9",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                    {
                      id: "a-15-n-12",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 100,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".product_form_container",
                          selectorGuids: [
                            "ec7d8146-4849-ef4f-3739-46c0673f66a9",
                          ],
                        },
                        xValue: 100,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-15-n-13",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 200,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".store_form_container",
                          selectorGuids: [
                            "d3b075e8-86f9-34d7-ec30-044a7181d865",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                    {
                      id: "a-15-n-14",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 200,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".store_form_container",
                          selectorGuids: [
                            "d3b075e8-86f9-34d7-ec30-044a7181d865",
                          ],
                        },
                        xValue: 100,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-15-n",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_search",
                          selectorGuids: [
                            "7e8340b1-e3eb-18c5-0455-17d9accb2656",
                          ],
                        },
                        value: "none",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-15-n-2",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".product_store_search_bar_box",
                          selectorGuids: [
                            "ae46c12f-6b16-6a7c-122e-81c30b60dc3c",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-15-n-3",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".product_store_search_bar_box",
                          selectorGuids: [
                            "ae46c12f-6b16-6a7c-122e-81c30b60dc3c",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-15-n-4",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".product_form_container",
                          selectorGuids: [
                            "ec7d8146-4849-ef4f-3739-46c0673f66a9",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-15-n-5",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".product_form_container",
                          selectorGuids: [
                            "ec7d8146-4849-ef4f-3739-46c0673f66a9",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-15-n-6",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".store_form_container",
                          selectorGuids: [
                            "d3b075e8-86f9-34d7-ec30-044a7181d865",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-15-n-7",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".store_form_container",
                          selectorGuids: [
                            "d3b075e8-86f9-34d7-ec30-044a7181d865",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195dd3082ae,
            },
            "a-4": {
              id: "a-4",
              title: "open_drawer_location",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-4-n-11",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_search",
                          selectorGuids: [
                            "7e8340b1-e3eb-18c5-0455-17d9accb2656",
                          ],
                        },
                        value: "none",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-4-n-12",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_platform",
                          selectorGuids: [
                            "698332d4-685f-b075-b433-da0fcc2467be",
                          ],
                        },
                        value: "none",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-4-n",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".location_search_bar_box",
                          selectorGuids: [
                            "60b13775-f72f-7733-06fb-8d0102b237d8",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-4-n-2",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".location_search_bar_box",
                          selectorGuids: [
                            "60b13775-f72f-7733-06fb-8d0102b237d8",
                          ],
                        },
                        xValue: 100,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-4-n-3",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".location_form_container",
                          selectorGuids: [
                            "f8028332-39e2-6cee-a648-2fab60a39227",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-4-n-4",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".location_form_container",
                          selectorGuids: [
                            "f8028332-39e2-6cee-a648-2fab60a39227",
                          ],
                        },
                        xValue: 100,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-4-n-5",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_location",
                          selectorGuids: [
                            "a3f900c3-faa7-d2c1-c107-8b949020dc75",
                          ],
                        },
                        value: "flex",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-4-n-6",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".location_search_bar_box",
                          selectorGuids: [
                            "60b13775-f72f-7733-06fb-8d0102b237d8",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                    {
                      id: "a-4-n-7",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".location_search_bar_box",
                          selectorGuids: [
                            "60b13775-f72f-7733-06fb-8d0102b237d8",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-4-n-9",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 100,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".location_form_container",
                          selectorGuids: [
                            "f8028332-39e2-6cee-a648-2fab60a39227",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                    {
                      id: "a-4-n-10",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 100,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".location_form_container",
                          selectorGuids: [
                            "f8028332-39e2-6cee-a648-2fab60a39227",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195dd7233e5,
            },
            "a-16": {
              id: "a-16",
              title: "close_drawer_location",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-16-n-7",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".location_search_bar_box",
                          selectorGuids: [
                            "60b13775-f72f-7733-06fb-8d0102b237d8",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                    {
                      id: "a-16-n-8",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".location_search_bar_box",
                          selectorGuids: [
                            "60b13775-f72f-7733-06fb-8d0102b237d8",
                          ],
                        },
                        xValue: 100,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-16-n-9",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 100,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".location_form_container",
                          selectorGuids: [
                            "f8028332-39e2-6cee-a648-2fab60a39227",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                    {
                      id: "a-16-n-10",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 100,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".location_form_container",
                          selectorGuids: [
                            "f8028332-39e2-6cee-a648-2fab60a39227",
                          ],
                        },
                        xValue: 100,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-16-n-6",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_location",
                          selectorGuids: [
                            "a3f900c3-faa7-d2c1-c107-8b949020dc75",
                          ],
                        },
                        value: "none",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-16-n-2",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".location_search_bar_box",
                          selectorGuids: [
                            "60b13775-f72f-7733-06fb-8d0102b237d8",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-16-n-3",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".location_search_bar_box",
                          selectorGuids: [
                            "60b13775-f72f-7733-06fb-8d0102b237d8",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-16-n-4",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".location_form_container",
                          selectorGuids: [
                            "f8028332-39e2-6cee-a648-2fab60a39227",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-16-n-5",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".location_form_container",
                          selectorGuids: [
                            "f8028332-39e2-6cee-a648-2fab60a39227",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195dd7233e5,
            },
            "a-6": {
              id: "a-6",
              title: "open_etalase_search",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-6-n",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "swingFromTo",
                        duration: 300,
                        target: {
                          selector: ".etalase_search_bar",
                          selectorGuids: [
                            "78ed73e5-53a8-01ee-d6f7-95fb3c1a3d2f",
                          ],
                        },
                        yValue: -20,
                        xUnit: "PX",
                        yUnit: "px",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-6-n-2",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "bouncePast",
                        duration: 300,
                        target: {
                          selector: ".etalase_search_bar",
                          selectorGuids: [
                            "78ed73e5-53a8-01ee-d6f7-95fb3c1a3d2f",
                          ],
                        },
                        yValue: 0,
                        xUnit: "PX",
                        yUnit: "px",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-6-n-5",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          useEventTarget: "SIBLINGS",
                          selector: ".etalase_search_div",
                          selectorGuids: [
                            "ba0a84bf-e0f3-2135-d83b-dfa01d09ec6f",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-6-n-4",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          useEventTarget: "SIBLINGS",
                          selector: ".etalase_search_div",
                          selectorGuids: [
                            "ba0a84bf-e0f3-2135-d83b-dfa01d09ec6f",
                          ],
                        },
                        value: "flex",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-6-n-6",
                      actionTypeId: "STYLE_SIZE",
                      config: {
                        delay: 0,
                        easing: [0.785, 0.135, 0.15, 0.86],
                        duration: 1e3,
                        target: {
                          useEventTarget: "SIBLINGS",
                          selector: ".etalase_search_div",
                          selectorGuids: [
                            "ba0a84bf-e0f3-2135-d83b-dfa01d09ec6f",
                          ],
                        },
                        widthValue: 327,
                        widthUnit: "px",
                        heightUnit: "PX",
                        locked: !1,
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-6-n-7",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: [0.25, 0.1, 0.25, 1],
                        duration: 500,
                        target: {
                          useEventTarget: "SIBLINGS",
                          selector: ".etalase_search_div",
                          selectorGuids: [
                            "ba0a84bf-e0f3-2135-d83b-dfa01d09ec6f",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195e2cc2bbd,
            },
            "a-7": {
              id: "a-7",
              title: "close_etalase_search",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-7-n-6",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: [0.25, 0.1, 0.25, 1],
                        duration: 500,
                        target: {
                          useEventTarget: "SIBLINGS",
                          selector: ".etalase_search_div",
                          selectorGuids: [
                            "ba0a84bf-e0f3-2135-d83b-dfa01d09ec6f",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-7-n-5",
                      actionTypeId: "STYLE_SIZE",
                      config: {
                        delay: 0,
                        easing: [0.785, 0.135, 0.15, 0.86],
                        duration: 1e3,
                        target: {
                          useEventTarget: "SIBLINGS",
                          selector: ".etalase_search_div",
                          selectorGuids: [
                            "ba0a84bf-e0f3-2135-d83b-dfa01d09ec6f",
                          ],
                        },
                        widthValue: 0,
                        widthUnit: "px",
                        heightUnit: "PX",
                        locked: !1,
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-7-n-4",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          useEventTarget: "SIBLINGS",
                          selector: ".etalase_search_div",
                          selectorGuids: [
                            "ba0a84bf-e0f3-2135-d83b-dfa01d09ec6f",
                          ],
                        },
                        value: "none",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-7-n-7",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "bounce",
                        duration: 100,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".etalase_search_bar",
                          selectorGuids: [
                            "78ed73e5-53a8-01ee-d6f7-95fb3c1a3d2f",
                          ],
                        },
                        xValue: 4,
                        yValue: -4,
                        xUnit: "px",
                        yUnit: "px",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-7-n-8",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "bounce",
                        duration: 100,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".etalase_search_bar",
                          selectorGuids: [
                            "78ed73e5-53a8-01ee-d6f7-95fb3c1a3d2f",
                          ],
                        },
                        xValue: -3,
                        yValue: 3,
                        xUnit: "px",
                        yUnit: "px",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-7-n-9",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "bounce",
                        duration: 100,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".etalase_search_bar",
                          selectorGuids: [
                            "78ed73e5-53a8-01ee-d6f7-95fb3c1a3d2f",
                          ],
                        },
                        xValue: 2,
                        yValue: -2,
                        xUnit: "px",
                        yUnit: "px",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-7-n-10",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "bounce",
                        duration: 100,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".etalase_search_bar",
                          selectorGuids: [
                            "78ed73e5-53a8-01ee-d6f7-95fb3c1a3d2f",
                          ],
                        },
                        xValue: -1,
                        yValue: 1,
                        xUnit: "px",
                        yUnit: "px",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-7-n-11",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "bounce",
                        duration: 100,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".etalase_search_bar",
                          selectorGuids: [
                            "78ed73e5-53a8-01ee-d6f7-95fb3c1a3d2f",
                          ],
                        },
                        xValue: 0,
                        yValue: 0,
                        xUnit: "px",
                        yUnit: "px",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195e2cc2bbd,
            },
            "a-8": {
              id: "a-8",
              title: "display_etalase_search",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-8-n",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          useEventTarget: "CHILDREN",
                          selector: ".etalase_search_bar",
                          selectorGuids: [
                            "78ed73e5-53a8-01ee-d6f7-95fb3c1a3d2f",
                          ],
                        },
                        value: "flex",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195e792f253,
            },
            "a-9": {
              id: "a-9",
              title: "hide_etalase_search",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-9-n",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          useEventTarget: "CHILDREN",
                          selector: ".etalase_search_bar",
                          selectorGuids: [
                            "78ed73e5-53a8-01ee-d6f7-95fb3c1a3d2f",
                          ],
                        },
                        value: "none",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195e7947e85,
            },
            "a-10": {
              id: "a-10",
              title: "close_store",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-10-n",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: [0.19, 1, 0.22, 1],
                        duration: 1200,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        xValue: null,
                        yValue: null,
                        zValue: -5,
                        xUnit: "deg",
                        yUnit: "deg",
                        zUnit: "deg",
                      },
                    },
                    {
                      id: "a-10-n-2",
                      actionTypeId: "TRANSFORM_SCALE",
                      config: {
                        delay: 0,
                        easing: [0.19, 1, 0.22, 1],
                        duration: 1200,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        xValue: 0.45,
                        yValue: 0.45,
                        locked: !0,
                      },
                    },
                    {
                      id: "a-10-n-4",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: [1, -0.485, 0.485, 0.784],
                        duration: 2500,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        yValue: 75,
                        xUnit: "PX",
                        yUnit: "vw",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-10-n-5",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 530,
                        easing: [0.23, 1, 0.32, 1],
                        duration: 900,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        yValue: null,
                        zValue: -15,
                        xUnit: "DEG",
                        yUnit: "deg",
                        zUnit: "deg",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-10-n-6",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        value: "none",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-10-n-7",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        xValue: 0,
                        yValue: 0,
                        zValue: 0,
                        xUnit: "deg",
                        yUnit: "deg",
                        zUnit: "deg",
                      },
                    },
                    {
                      id: "a-10-n-8",
                      actionTypeId: "TRANSFORM_SCALE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        xValue: 1,
                        yValue: 1,
                        zValue: 1,
                        locked: !0,
                      },
                    },
                    {
                      id: "a-10-n-9",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          useEventTarget: "PARENT",
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        xValue: 0,
                        yValue: 0,
                        zValue: 0,
                        xUnit: "px",
                        yUnit: "px",
                        zUnit: "px",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195e822bf5e,
            },
            "a-11": {
              id: "a-11",
              title: "open_product",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-11-n",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        xValue: null,
                        yValue: -90,
                        xUnit: "deg",
                        yUnit: "deg",
                        zUnit: "DEG",
                      },
                    },
                    {
                      id: "a-11-n-2",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        xValue: 180,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-11-n-3",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 200,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        value: "flex",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-11-n-4",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: [0.614, -0.801, 0.269, 1.86],
                        duration: 1250,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-11-n-5",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: [0.649, -0.584, 0.14, 1.702],
                        duration: 1250,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        xValue: null,
                        yValue: 0,
                        xUnit: "deg",
                        yUnit: "deg",
                        zUnit: "DEG",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195eb13c5bb,
            },
            "a-13": {
              id: "a-13",
              title: "open_store",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-13-n-6",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        value: "none",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-13-n-2",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        xValue: null,
                        yValue: null,
                        zValue: 9,
                        xUnit: "deg",
                        yUnit: "deg",
                        zUnit: "deg",
                      },
                    },
                    {
                      id: "a-13-n",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        xValue: 500,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-13-n-3",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        value: "flex",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-13-n-4",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: [0.491, 1.118, 0.772, 1.346],
                        duration: 750,
                        target: {
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-13-n-5",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: [0.485, -0.76, 0.819, 2.1],
                        duration: 750,
                        target: {
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        zValue: 0,
                        xUnit: "DEG",
                        yUnit: "DEG",
                        zUnit: "deg",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195eb39edd9,
            },
            "a-14": {
              id: "a-14",
              title: "open_store_product",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-14-n",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        xValue: null,
                        yValue: null,
                        zValue: 9,
                        xUnit: "deg",
                        yUnit: "deg",
                        zUnit: "deg",
                      },
                    },
                    {
                      id: "a-14-n-2",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        xValue: 500,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-14-n-3",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        value: "flex",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-14-n-4",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: [0.491, 1.118, 0.772, 1.346],
                        duration: 750,
                        target: {
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-14-n-5",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: [0.485, -0.76, 0.819, 2.1],
                        duration: 750,
                        target: {
                          selector: ".tab_store",
                          selectorGuids: [
                            "796f691b-5c93-45c7-1861-55590abe6510",
                          ],
                        },
                        zValue: 0,
                        xUnit: "DEG",
                        yUnit: "DEG",
                        zUnit: "deg",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-14-n-7",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 500,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        xValue: 180,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-14-n-6",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 500,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        yValue: -90,
                        xUnit: "DEG",
                        yUnit: "deg",
                        zUnit: "DEG",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-14-n-8",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        value: "flex",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-14-n-9",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: [0.614, -0.801, 0.269, 1.86],
                        duration: 1250,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-14-n-10",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: [0.649, -0.584, 0.14, 1.702],
                        duration: 1250,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        yValue: 0,
                        xUnit: "DEG",
                        yUnit: "deg",
                        zUnit: "DEG",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195eb39edd9,
            },
            "a-12": {
              id: "a-12",
              title: "close_product",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-12-n-4",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: [0.567, -0.45, 0.117, 1.784],
                        duration: 750,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        xValue: 180,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-12-n-5",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: [0.69, -0.561, 0.012, 1.392],
                        duration: 750,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        xValue: null,
                        yValue: -90,
                        xUnit: "deg",
                        yUnit: "deg",
                        zUnit: "DEG",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-12-n-3",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 200,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        value: "none",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-12-n",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        xValue: null,
                        yValue: 0,
                        xUnit: "deg",
                        yUnit: "deg",
                        zUnit: "DEG",
                      },
                    },
                    {
                      id: "a-12-n-2",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".tab_product",
                          selectorGuids: [
                            "69d1dcc8-9e30-9031-28f8-b18d3143ec06",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195eb13c5bb,
            },
            "a-19": {
              id: "a-19",
              title: "open_drawer_platform",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-19-n",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        value: "none",
                        target: {
                          selector: ".drawer_search",
                          selectorGuids: [
                            "7e8340b1-e3eb-18c5-0455-17d9accb2656",
                          ],
                        },
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-19-n-2",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        value: "none",
                        target: {
                          selector: ".drawer_location",
                          selectorGuids: [
                            "a3f900c3-faa7-d2c1-c107-8b949020dc75",
                          ],
                        },
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-19-n-3",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_platform",
                          selectorGuids: [
                            "698332d4-685f-b075-b433-da0fcc2467be",
                          ],
                        },
                        xValue: 100,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-19-n-4",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_platform",
                          selectorGuids: [
                            "698332d4-685f-b075-b433-da0fcc2467be",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-19-n-5",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        value: "flex",
                        target: {
                          selector: ".drawer_platform",
                          selectorGuids: [
                            "698332d4-685f-b075-b433-da0fcc2467be",
                          ],
                        },
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-19-n-6",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".drawer_platform",
                          selectorGuids: [
                            "698332d4-685f-b075-b433-da0fcc2467be",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-19-n-7",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".drawer_platform",
                          selectorGuids: [
                            "698332d4-685f-b075-b433-da0fcc2467be",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                  ],
                },
              ],
              createdOn: 0x19620890909,
              useFirstGroupAsInitialState: !1,
            },
            "a-18": {
              id: "a-18",
              title: "close_drawer_platform",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-18-n",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".drawer_platform",
                          selectorGuids: [
                            "698332d4-685f-b075-b433-da0fcc2467be",
                          ],
                        },
                        xValue: 100,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-18-n-2",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "easeIn",
                        duration: 500,
                        target: {
                          selector: ".drawer_platform",
                          selectorGuids: [
                            "698332d4-685f-b075-b433-da0fcc2467be",
                          ],
                        },
                        value: 0,
                        unit: "",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-18-n-7",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_platform",
                          selectorGuids: [
                            "698332d4-685f-b075-b433-da0fcc2467be",
                          ],
                        },
                        value: "none",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-18-n-8",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_platform",
                          selectorGuids: [
                            "698332d4-685f-b075-b433-da0fcc2467be",
                          ],
                        },
                        xValue: 0,
                        xUnit: "px",
                        yUnit: "PX",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-18-n-9",
                      actionTypeId: "STYLE_OPACITY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".drawer_platform",
                          selectorGuids: [
                            "698332d4-685f-b075-b433-da0fcc2467be",
                          ],
                        },
                        value: 1,
                        unit: "",
                      },
                    },
                  ],
                },
              ],
              useFirstGroupAsInitialState: !1,
              createdOn: 0x195dd3082ae,
            },
            "a-20": {
              id: "a-20",
              title: "share_product",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      id: "a-20-n",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        value: "none",
                        target: {
                          selector: ".popup_product_copy",
                          selectorGuids: [
                            "01fbbaee-bb13-2542-9d8e-9f6d02a726a3",
                          ],
                        },
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-20-n-2",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".popup_product_copy",
                          selectorGuids: [
                            "01fbbaee-bb13-2542-9d8e-9f6d02a726a3",
                          ],
                        },
                        xValue: null,
                        yValue: 80,
                        xUnit: "px",
                        yUnit: "px",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-20-n-6",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        target: {
                          selector: ".popup_product_copy",
                          selectorGuids: [
                            "01fbbaee-bb13-2542-9d8e-9f6d02a726a3",
                          ],
                        },
                        xValue: null,
                        yValue: null,
                        zValue: 12,
                        xUnit: "deg",
                        yUnit: "deg",
                        zUnit: "deg",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-20-n-3",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        value: "flex",
                        target: {
                          selector: ".popup_product_copy",
                          selectorGuids: [
                            "01fbbaee-bb13-2542-9d8e-9f6d02a726a3",
                          ],
                        },
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-20-n-4",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: [0.123, 1.264, 0.62, 1.708],
                        duration: 1e3,
                        target: {
                          selector: ".popup_product_copy",
                          selectorGuids: [
                            "01fbbaee-bb13-2542-9d8e-9f6d02a726a3",
                          ],
                        },
                        yValue: 0,
                        xUnit: "PX",
                        yUnit: "px",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-20-n-7",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: [0.215, 0.61, 0.374, 1.17],
                        duration: 1e3,
                        target: {
                          selector: ".popup_product_copy",
                          selectorGuids: [
                            "01fbbaee-bb13-2542-9d8e-9f6d02a726a3",
                          ],
                        },
                        xValue: null,
                        zValue: -3,
                        xUnit: "deg",
                        yUnit: "DEG",
                        zUnit: "deg",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-20-n-5",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: [0.23, 1, 0.32, 1],
                        duration: 700,
                        target: {
                          selector: ".popup_product_copy",
                          selectorGuids: [
                            "01fbbaee-bb13-2542-9d8e-9f6d02a726a3",
                          ],
                        },
                        yValue: 80,
                        xUnit: "PX",
                        yUnit: "px",
                        zUnit: "PX",
                      },
                    },
                    {
                      id: "a-20-n-8",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: [0.165, 0.84, 0.44, 1],
                        duration: 700,
                        target: {
                          selector: ".popup_product_copy",
                          selectorGuids: [
                            "01fbbaee-bb13-2542-9d8e-9f6d02a726a3",
                          ],
                        },
                        zValue: -12,
                        xUnit: "DEG",
                        yUnit: "DEG",
                        zUnit: "deg",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-20-n-9",
                      actionTypeId: "GENERAL_DISPLAY",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 0,
                        value: "none",
                        target: {
                          selector: ".popup_product_copy",
                          selectorGuids: [
                            "01fbbaee-bb13-2542-9d8e-9f6d02a726a3",
                          ],
                        },
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-20-n-10",
                      actionTypeId: "TRANSFORM_MOVE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 500,
                        target: {
                          selector: ".popup_product_copy",
                          selectorGuids: [
                            "01fbbaee-bb13-2542-9d8e-9f6d02a726a3",
                          ],
                        },
                        yValue: 0,
                        xUnit: "PX",
                        yUnit: "px",
                        zUnit: "PX",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      id: "a-20-n-11",
                      actionTypeId: "TRANSFORM_ROTATE",
                      config: {
                        delay: 0,
                        easing: "",
                        duration: 500,
                        target: {
                          selector: ".popup_product_copy",
                          selectorGuids: [
                            "01fbbaee-bb13-2542-9d8e-9f6d02a726a3",
                          ],
                        },
                        zValue: 0,
                        xUnit: "DEG",
                        yUnit: "DEG",
                        zUnit: "deg",
                      },
                    },
                  ],
                },
              ],
              createdOn: 0x19620a15f38,
              useFirstGroupAsInitialState: !1,
            },
            jello: {
              id: "jello",
              actionItemGroups: [
                {
                  actionItems: [
                    {
                      actionTypeId: "TRANSFORM_SKEW",
                      config: {
                        delay: 0,
                        easing: "outQuart",
                        duration: 100,
                        target: {
                          id: "N/A",
                          appliesTo: "TRIGGER_ELEMENT",
                          useEventTarget: !0,
                        },
                        xValue: -12,
                        yValue: -12,
                        xUnit: "DEG",
                        yUnit: "DEG",
                        zUnit: "DEG",
                      },
                    },
                  ],
                },
                {
                  actionItems: [
                    {
                      actionTypeId: "TRANSFORM_SKEW",
                      config: {
                        delay: 0,
                        easing: "outElastic",
                        duration: 1e3,
                        target: {
                          id: "N/A",
                          appliesTo: "TRIGGER_ELEMENT",
                          useEventTarget: !0,
                        },
                        xValue: 0,
                        yValue: 0,
                        xUnit: "DEG",
                        yUnit: "DEG",
                        zUnit: "DEG",
                      },
                    },
                  ],
                },
              ],
            },
          },
          site: {
            mediaQueries: [
              { key: "main", min: 992, max: 1e4 },
              { key: "medium", min: 768, max: 991 },
              { key: "small", min: 480, max: 767 },
              { key: "tiny", min: 0, max: 479 },
            ],
          },
        });
      },
      961: function (e, t, n) {
        n(9461),
          n(7624),
          n(286),
          n(8334),
          n(2338),
          n(3695),
          n(322),
          n(941),
          n(5134),
          n(7527),
          n(4345),
          n(9078),
          n(8055);
      },
    },
    t = {};
  function n(i) {
    var a = t[i];
    if (void 0 !== a) return a.exports;
    var r = (t[i] = { id: i, loaded: !1, exports: {} });
    return e[i](r, r.exports, n), (r.loaded = !0), r.exports;
  }
  (n.m = e),
    (n.d = function (e, t) {
      for (var i in t)
        n.o(t, i) &&
          !n.o(e, i) &&
          Object.defineProperty(e, i, { enumerable: !0, get: t[i] });
    }),
    (n.hmd = function (e) {
      return (
        !(e = Object.create(e)).children && (e.children = []),
        Object.defineProperty(e, "exports", {
          enumerable: !0,
          set: function () {
            throw Error(
              "ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: " +
                e.id
            );
          },
        }),
        e
      );
    }),
    (n.g = (function () {
      if ("object" == typeof globalThis) return globalThis;
      try {
        return this || Function("return this")();
      } catch (e) {
        if ("object" == typeof window) return window;
      }
    })()),
    (n.o = function (e, t) {
      return Object.prototype.hasOwnProperty.call(e, t);
    }),
    (n.r = function (e) {
      "undefined" != typeof Symbol &&
        Symbol.toStringTag &&
        Object.defineProperty(e, Symbol.toStringTag, {
          value: "Module",
        }),
        Object.defineProperty(e, "__esModule", { value: !0 });
    }),
    (n.nmd = function (e) {
      return (e.paths = []), !e.children && (e.children = []), e;
    }),
    (() => {
      var e = [];
      n.O = function (t, i, a, r) {
        if (i) {
          r = r || 0;
          for (var o = e.length; o > 0 && e[o - 1][2] > r; o--) e[o] = e[o - 1];
          e[o] = [i, a, r];
          return;
        }
        for (var l = 1 / 0, o = 0; o < e.length; o++) {
          for (
            var i = e[o][0], a = e[o][1], r = e[o][2], c = !0, u = 0;
            u < i.length;
            u++
          )
            (!1 & r || l >= r) &&
            Object.keys(n.O).every(function (e) {
              return n.O[e](i[u]);
            })
              ? i.splice(u--, 1)
              : ((c = !1), r < l && (l = r));
          if (c) {
            e.splice(o--, 1);
            var s = a();
            void 0 !== s && (t = s);
          }
        }
        return t;
      };
    })(),
    (n.rv = function () {
      return "1.1.8";
    }),
    (() => {
      var e = { 355: 0 };
      n.O.j = function (t) {
        return 0 === e[t];
      };
      var t = function (t, i) {
          var a = i[0],
            r = i[1],
            o = i[2],
            l,
            c,
            u = 0;
          if (
            a.some(function (t) {
              return 0 !== e[t];
            })
          ) {
            for (l in r) n.o(r, l) && (n.m[l] = r[l]);
            if (o) var s = o(n);
          }
          for (t && t(i); u < a.length; u++)
            (c = a[u]), n.o(e, c) && e[c] && e[c][0](), (e[c] = 0);
          return n.O(s);
        },
        i = (self.webpackChunk = self.webpackChunk || []);
      i.forEach(t.bind(null, 0)), (i.push = t.bind(null, i.push.bind(i)));
    })(),
    (n.ruid = "bundler=rspack@1.1.8");
  var i = n.O(void 0, ["87"], function () {
    return n("961");
  });
  i = n.O(i);
})();
