const {
  createDesign,
  getDesignById,
  getDesigns,
  updateDesign,
  deleteDesign
} = require('../models/designModel');

async function getAll(req, res) {
  try {
    const designs = await getDesigns({
      scope: req.query.scope,
      mine: req.query.mine === 'true',
      user: req.user
    });
    res.json(designs);
  } catch (error) {
    if (error.message === 'AuthenticationRequired') {
      return res.status(401).json({ error: 'Authentication required to view this data' });
    }
    res.status(500).json({ error: 'Unable to load designs' });
  }
}

async function getOne(req, res) {
  const design = await getDesignById(req.params.id);
  if (!design) {
    return res.status(404).json({ error: 'Design not found' });
  }

  if (design.type === 'premade') {
    return res.json(design);
  }

  if (!req.user) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (['admin', 'baker'].includes(req.user.role) || design.owner === req.user.id) {
    return res.json(design);
  }

  return res.status(403).json({ error: 'Forbidden' });
}

async function create(req, res) {
  const { name, type, design, thumbnail } = req.body;
  if (!name || !design) {
    return res.status(400).json({ error: 'Name and design are required' });
  }

  const designType = type || 'custom';
  if (designType === 'premade' && !['admin', 'baker'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only bakers and admins can create pre-made templates' });
  }

  const saved = await createDesign({
    name,
    type: designType,
    ownerId: req.user.id,
    thumbnail: thumbnail || null,
    design
  });

  res.json(saved);
}

async function update(req, res) {
  try {
    const changes = req.body;
    const updated = await updateDesign(req.params.id, changes, req.user);
    if (!updated) {
      return res.status(404).json({ error: 'Design not found' });
    }
    res.json(updated);
  } catch (error) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.status(500).json({ error: 'Unable to update design' });
  }
}

async function remove(req, res) {
  try {
    const { confirm } = req.body;
    console.log(confirm);
    if (!confirm) {
      return res.status(400).json({
        error: 'Please confirm deletion'
      });
    }

    const deleted = await deleteDesign(req.params.id, req.user, { confirm });

    if (!deleted) {
      return res.status(404).json({
        error: 'Design not found or forbidden'
      });
    }

    return res.json({ success: true });

  } catch (error) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.status(500).json({
      error: 'Unable to delete design'
    });
  }
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove
};
