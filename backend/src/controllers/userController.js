const pool = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler'); // Importado de middlewares

const getDados = asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM usuario');
  return res.status(200).json({
    success: true,
    data: rows,
  });
});

module.exports = {
  getDados,
};