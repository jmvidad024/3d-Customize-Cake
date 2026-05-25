const { query, execute } = require('./db');

function getTemplateThumbnail(name) {
  const label = (name || 'Cake Design').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="100%" height="100%" fill="#fff7f0"/><text x="50%" y="30" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#333">${label}</text><ellipse cx="160" cy="150" rx="90" ry="18" fill="#e6e6e6"/><ellipse cx="160" cy="130" rx="70" ry="16" fill="#f6deb3"/><ellipse cx="160" cy="112" rx="60" ry="14" fill="#f2c9ab"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function normalizeDesignRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    owner: row.owner_id,
    thumbnail: row.thumbnail || getTemplateThumbnail(row.name),
    design: row.design ? JSON.parse(row.design) : null,
    createdAt: row.created_at
  };
}

async function createDesign({ name, type = 'custom', ownerId = null, thumbnail = null, design }) {
  const [result] = await execute(
    'INSERT INTO designs (name, type, owner_id, thumbnail, design) VALUES (?, ?, ?, ?, ?)',
    [name, type, ownerId, thumbnail, JSON.stringify(design)]
  );
  return getDesignById(result.insertId);
}

async function getDesignById(id) {
  const rows = await query('SELECT * FROM designs WHERE id = ?', [id]);
  return normalizeDesignRow(rows[0]);
}

async function getDesigns({ scope, mine, user }) {
  if (scope === 'templates') {
    const rows = await query('SELECT * FROM designs WHERE type = ? ORDER BY created_at DESC', ['premade']);
    return rows.map(normalizeDesignRow);
  }

  if (mine) {
    if (!user) {
      throw new Error('AuthenticationRequired');
    }
    if (['admin', 'baker'].includes(user.role)) {
      const rows = await query('SELECT * FROM designs ORDER BY created_at DESC');
      return rows.map(normalizeDesignRow);
    }
    const rows = await query(
      'SELECT * FROM designs WHERE type = ? OR owner_id = ? ORDER BY created_at DESC',
      ['premade', user.id]
    );
    return rows.map(normalizeDesignRow);
  }

  if (user && ['admin', 'baker'].includes(user.role)) {
    const rows = await query('SELECT * FROM designs ORDER BY created_at DESC');
    return rows.map(normalizeDesignRow);
  }

  const rows = await query('SELECT * FROM designs WHERE type = ? ORDER BY created_at DESC', ['premade']);
  return rows.map(normalizeDesignRow);
}

async function updateDesign(id, changes, user) {
  const design = await getDesignById(id);
  if (!design) return null;

  if (changes.type && !['admin', 'baker'].includes(user.role)) {
    throw new Error('Forbidden');
  }

  if (changes.owner !== undefined && !['admin', 'baker'].includes(user.role)) {
    throw new Error('Forbidden');
  }

  const updated = {
    name: changes.name || design.name,
    type: changes.type || design.type,
    owner_id: changes.owner !== undefined ? changes.owner : design.owner,
    thumbnail: changes.thumbnail !== undefined ? changes.thumbnail : design.thumbnail,
    design: changes.design ? JSON.stringify(changes.design) : JSON.stringify(design.design)
  };

  await query(
    'UPDATE designs SET name = ?, type = ?, owner_id = ?, thumbnail = ?, design = ? WHERE id = ?',
    [updated.name, updated.type, updated.owner_id, updated.thumbnail, updated.design, id]
  );

  return getDesignById(id);
}

async function deleteDesign(id, user, { confirm = false } = {}) {
  const design = await getDesignById(id);
  if (!design) return false;

  // must explicitly confirm deletion
  if (!confirm) {
    throw new Error('ConfirmRequired');
  }

  // permission check
  if (!['admin', 'baker'].includes(user.role) && design.owner !== user.id) {
    throw new Error('Forbidden');
  }

  const result = await query('DELETE FROM designs WHERE id = ?', [id]);

  return result.affectedRows > 0;
}

async function ensureDefaultDesigns() {
  const countRows = await query('SELECT COUNT(*) AS count FROM designs');
  if (countRows[0].count > 0) {
    return;
  }

  const templates = [
    {
      name: 'Strawberry Bliss',
      type: 'premade',
      ownerId: null,
      thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="100%" height="100%" fill="#fff7f0"/><text x="50%" y="30" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#b33">Strawberry Bliss</text><ellipse cx="160" cy="150" rx="90" ry="18" fill="#e6e6e6"/><ellipse cx="160" cy="130" rx="70" ry="16" fill="#ff6b97"/><ellipse cx="160" cy="112" rx="60" ry="14" fill="#f6deb3"/></svg>')}`,
      design: {
        layers: [
          { index: 0, color: 'ff6b97', radius: 1.2, height: 0.5 },
          { index: 1, color: 'f6deb3', radius: 1.0, height: 0.5 }
        ],
        toppings: [
          { type: 'sprinkles', position: { x: 0, y: 0, z: 0 } }
        ]
      }
    },
    {
      name: 'Classic Chocolate',
      type: 'premade',
      ownerId: null,
      thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="100%" height="100%" fill="#fff7f0"/><text x="50%" y="30" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#432">Classic Chocolate</text><ellipse cx="160" cy="150" rx="90" ry="18" fill="#e6e6e6"/><ellipse cx="160" cy="130" rx="70" ry="16" fill="#6b3f1a"/><ellipse cx="160" cy="112" rx="60" ry="14" fill="#6b3f1a"/></svg>')}`,
      design: {
        layers: [
          { index: 0, color: '6b3f1a', radius: 1.2, height: 0.5 },
          { index: 1, color: '6b3f1a', radius: 1.0, height: 0.5 }
        ],
        toppings: [
          { type: 'chocolateChips', position: { x: 0, y: 0, z: 0 } }
        ]
      }
    }
  ];

  for (const template of templates) {
    await createDesign(template);
  }
}

module.exports = {
  createDesign,
  getDesignById,
  getDesigns,
  updateDesign,
  deleteDesign,
  ensureDefaultDesigns
};
