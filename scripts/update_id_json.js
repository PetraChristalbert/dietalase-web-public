const fs = require('fs');
const idJsonPath = 'locales/id.json';
const idJson = JSON.parse(fs.readFileSync(idJsonPath, 'utf8'));

// Replacement map
const replacements = {
  "Lingkungan Sekitar Anda, Cukup Sekali Ketuk.": "Berbelanja Jadi Semakin Dekat",
  "Temukan toko lokal unik dan produk premium di kota Anda secara instan.": "Temukan beragam barang yang ingin kamu belidi sekitarmu.",
  "Perjalanan Belanja Hiper-Lokal Anda, Kini Lebih Sederhana.": "Kemudahan Mencari Berbagai Hal",
  "sesederhana dulu kala.": "Belanja sudah semestinya <i>sederhana</i>",
  "Langkah 1: Temukan Sekitar.": "Temukan Barangnya",
  "Gunakan peta pencarian yang intuitif untuk menemukan produk unik, premium, dan toko artisan di radius Anda secara instan.": "Cari nama barangnya di aplikasi.",
  "Langkah 2: Temukan & Kunjungi.": "Kunjungi Tokonya",
  "Ikuti jalur navigasi terintegrasi dengan mulus menuju workshop fisik pengrajin lokal pilihan Anda.": "Lihat alamat tokonya dan datangi ke lokasi",
  "Langkah 3: Beli & Nikmati.": "Beli Segera",
  "Selesaikan transaksi Anda secara langsung dan nikmati pilihan terkurasi Anda segera, tanpa menunggu.": "Pastikan barangnya lalu beli dan bawa pulang."
};

let keyForSederhana = null;

for (const [key, value] of Object.entries(idJson)) {
  for (const [oldStr, newStr] of Object.entries(replacements)) {
    if (value === oldStr) {
      idJson[key] = newStr;
      console.log(`Replaced in ${key}`);
      if (oldStr === "sesederhana dulu kala.") {
        keyForSederhana = key;
      }
    }
  }
}

fs.writeFileSync(idJsonPath, JSON.stringify(idJson, null, 2));

// Update index.ejs for unescaped HTML output
if (keyForSederhana) {
  const ejsPath = 'views/index.ejs';
  let ejsContent = fs.readFileSync(ejsPath, 'utf8');
  ejsContent = ejsContent.replace(`<%= __('${keyForSederhana}') %>`, `<%- __('${keyForSederhana}') %>`);
  fs.writeFileSync(ejsPath, ejsContent);
  console.log(`Updated index.ejs to use unescaped HTML for ${keyForSederhana}`);
}

