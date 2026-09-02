const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = (pasta) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, `../../uploads/${pasta}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const nomeUnico = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extensao = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + nomeUnico + extensao);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem (JPEG, JPG, PNG, WEBP) são permitidos.'));
  }
};

const uploadReferencia = multer({ storage: storage('referencias'), fileFilter });
const uploadEvidencia = multer({ storage: storage('evidencias'), fileFilter });

// A correção principal está aqui: exportar as duas funções como um objeto
module.exports = {
  uploadReferencia,
  uploadEvidencia
};