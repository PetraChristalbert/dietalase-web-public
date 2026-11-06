const knex = require("../db/knex");

exports.submitApplication = async (req, res) => {
  try {
    const {
      fullName,
      email,
      whatsapp,
      status,
      domicile,
      position,
      portfolio,
      projectStory,
      mindset1,
      mindset2,
      facilities,
    } = req.body;

    // Basic validation
    if (
      !fullName ||
      !email ||
      !whatsapp ||
      !status ||
      !position ||
      !mindset1 ||
      !mindset2
    ) {
      return res
        .status(400)
        .json({ error: "Mohon lengkapi semua field yang wajib diisi." });
    }

    // Insert into database
    await knex("terminal_guild_applications").insert({
      full_name: fullName,
      email: email,
      whatsapp: whatsapp,
      status: status,
      domicile: domicile || "-",
      position: position,
      portfolio_link: portfolio || null,
      project_story: projectStory,
      problem_statement: mindset1,
      motivation: mindset2,
      facilities: facilities, // Assumes facilities is an array or handled by frontend to be one
    });

    res.status(200).json({ message: "Aplikasi berhasil dikirim!" });
  } catch (error) {
    console.error("Error submitting application:", error);
    res.status(500).json({
      error: "Terjadi kesalahan saat mengirim aplikasi. Silakan coba lagi.",
    });
  }
};
