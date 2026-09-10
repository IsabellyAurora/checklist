const pool = require('../config/db');

// Gráfico: Top Checklists com mais Não Conformidades (Barras ou Pizza)
const getNcsPorChecklist = async () => {
  const query = `
    SELECT c.titulo AS name, COUNT(e.id_execucao) AS total
    FROM execucao e
    JOIN checklist c ON e.id_checklist = c.id_checklist
    WHERE e.status_nc != 'SEM_NC'
    GROUP BY c.titulo
    ORDER BY total DESC
    LIMIT 10;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// Gráfico Genérico: Distribuição Categórica (ex: Conforme vs Não Conforme)
const getDistribuicaoCategorica = async (idItem) => {
  const query = `
    SELECT r.valor_resposta AS name, COUNT(r.id_resposta) AS total
    FROM resposta r
    JOIN execucao e ON r.id_execucao = e.id_execucao
    WHERE r.id_item = $1 AND r.valor_resposta IS NOT NULL
    GROUP BY r.valor_resposta
    ORDER BY total DESC;
  `;
  const { rows } = await pool.query(query, [idItem]);
  return rows;
};

// Gráfico Genérico: Evolução Numérica no Tempo (Linhas)
const getEvolucaoNumerica = async (idItem) => {
  const query = `
    SELECT 
      e.data_inicio AS data_medicao,
      CAST(NULLIF(regexp_replace(r.valor_resposta, '[^0-9.]', '', 'g'), '') AS NUMERIC) AS valor
    FROM execucao e
    JOIN resposta r ON e.id_execucao = r.id_execucao
    WHERE r.id_item = $1 
      AND e.status_nc = 'SEM_NC' 
      AND r.valor_resposta IS NOT NULL
    ORDER BY e.data_inicio ASC;
  `;
  const { rows } = await pool.query(query, [idItem]);
  return rows;
};

// Gráfico de SLA: Tempo Médio de Resolução de NCs por Checklist
const getTempoMedioResolucao = async () => {
  const query = `
    SELECT 
      c.titulo AS name,
      AVG(EXTRACT(EPOCH FROM (e.data_resolucao - e.data_inicio))) AS tempo_medio_segundos
    FROM execucao e
    JOIN checklist c ON e.id_checklist = c.id_checklist
    WHERE e.status_nc = 'RESOLVIDO' AND e.data_resolucao IS NOT NULL
    GROUP BY c.titulo;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

module.exports = {
  getNcsPorChecklist,
  getDistribuicaoCategorica,
  getEvolucaoNumerica,
  getTempoMedioResolucao
};