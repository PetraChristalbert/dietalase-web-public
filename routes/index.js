var express = require("express");
var router = express.Router();
const knex = require("../db/knex");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "DiEtalase" });
});

/* GET maps page. (from '/maps') */
router.get("/maps", function (req, res, next) {
  // res.render() is the same as view() in Laravel
  res.render("DiEtalase", { pid: "", sid: "" });
});

/* GET /search/store/:sid */
router.get("/search/store/:sid", function (req, res, next) {
  // We get the param 'sid' from req.params.sid
  res.render("DiEtalase", { pid: "", sid: req.params.sid });
});

/* GET /search/product/:pid */
router.get("/search/product/:pid", function (req, res, next) {
  res.render("DiEtalase", { pid: req.params.pid, sid: "" });
});

/* GET /Privacypolicy */
router.get("/Privacypolicy", function (req, res, next) {
  res.render("kebijakan_privasi_dietalase");
});




/* GET /merchant-hub */
router.get("/merchant-hub", function (req, res, next) {
  res.render("merchant_hub", { title: "DiEtalase - Merchant Hub" });
});

/* GET /online-store */
router.get("/online-store", async function (req, res, next) {
  let ogTitle = "DiEtalase - Online Store";
  let ogDescription = "Temukan berbagai produk dan toko lokal terbaik di sekitarmu.";
  let ogImage = "https://dietalase.com/images/dietalase_icon.webp";

  try {
    const sid = req.query.sid;
    const pid = req.query.pid;

    if (pid) {
      const product = await knex("products")
        .select("products.name", "products.price", "products.unit", "products.image", "stores.address", "stores.city")
        .join("stores", "products.sid", "stores.sid")
        .where("products.pid", pid)
        .first();

      if (product) {
        ogTitle = product.name;
        const priceStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price);
        const unitStr = product.unit ? ` / ${product.unit}` : '';
        ogDescription = `${priceStr}${unitStr} • ${product.address || product.city || ''}`;
        if (product.image) ogImage = product.image;
      }
    } else if (sid) {
      const store = await knex("stores").where("sid", sid).first();
      console.log("FETCHED STORE:", store);
      if (store) {
        ogTitle = store.name;
        ogDescription = store.address || ogDescription;
        if (store.image) ogImage = store.image;
      }
    }
  } catch (error) {
    console.error("Error fetching OG data:", error);
  }

  res.render("online_store", { 
    title: ogTitle, 
    ogTitle,
    ogDescription,
    ogImage,
    targetSid: req.query.sid || null, 
    targetPid: req.query.pid || null 
  });
});

/* GET /store/:sid (Deep Link to Online Store) */
router.get("/store/:sid", function (req, res, next) {
  res.redirect(`/online-store?sid=${req.params.sid}`);
});

/* GET /product/:pid (Deep Link to Online Store) */
router.get("/product/:pid", function (req, res, next) {
  res.redirect(`/online-store?pid=${req.params.pid}`);
});

/* GET /closed-testing */
router.get("/closed-testing", function (req, res, next) {
  res.render("closed_testing", { title: "DiEtalase - Closed Testing" });
});

/* GET /change-language/:lang */
router.get("/change-language/:lang", function (req, res, next) {
  const lang = req.params.lang;
  if (['en', 'id', 'jp', 'ph'].includes(lang)) {
    res.cookie('lang', lang, { maxAge: 900000, httpOnly: true });
  }
  // Redirect back to where the user came from or the explicitly provided return URL
  const returnUrl = req.query.returnTo || req.get('referer') || '/';
  res.redirect(returnUrl);
});

module.exports = router;
