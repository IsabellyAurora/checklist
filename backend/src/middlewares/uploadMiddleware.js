const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// 1. Armazena temporariamente na memória (RAM)
const storage = multer.memoryStorage();

// 2. Mantém a sua validação de segurança original
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

// 3. Configura o multer com limite de 10MB para evitar travamento do Node
const uploadMemoria = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// 4. Nova função que otimiza e salva a imagem na pasta correta
const otimizarImagem = (pasta) => {
  return async (req, res, next) => {
    if (!req.file) return next(); // Se não mandou foto, segue o fluxo normal

    const dir = path.join(__dirname, `../../uploads/${pasta}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const nomeUnico = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Força a extensão para .webp, padronizando o sistema
    const nomeArquivo = `${req.file.fieldname}-${nomeUnico}.webp`; 
    const caminhoFinal = path.join(dir, nomeArquivo);

    try {
      await sharp(req.file.buffer)
        .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true }) // Redimensiona sem esticar
        .webp({ quality: 80 }) // Compressão eficiente
        .toFile(caminhoFinal);

      // Atualiza o req.file para o controller pegar o nome novo gerado
      req.file.filename = nomeArquivo;
      next();
    } catch (error) {
      console.error('Erro no processamento da imagem pelo Sharp:', error);
      return res.status(500).json({ success: false, error: 'Erro ao processar e otimizar a imagem.' });
    }
  };
};

module.exports = {
  uploadMemoria,
  otimizarImagem
};